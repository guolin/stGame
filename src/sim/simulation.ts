import { INITIAL_BOATS, INITIAL_RACE, INITIAL_WIND_FIELD, INITIAL_WIND_ZONES, WORLD } from "../game/constants";
import type { WindFieldConfig } from "./wind/windField";
import { getLocalWind, globalWindAt } from "./wind/windField";
import type { BoatControls, BoatId, BoatState, RaceEvent, RaceState, WindState, WindZoneState } from "../game/types";
import { getCourse } from "./course/courses";
import type { CourseDefinition, CourseId } from "./course/types";
import { stepBoatPhysics } from "./boat/boatPhysics";
import { updateBoatRace } from "./race/raceProgress";
import { createRulesEngineState, stepRules } from "./rules/rulesEngine";
import type { RulesEngineState } from "./rules/rulesEngine";
import { updateWindZones } from "../game/systems/windZoneSystem";

const MAX_TRACK_POINTS = 260;
const TRACK_SAMPLE_INTERVAL_MS = 420;

function appendTrackPoint(
  track: { x: number; y: number }[],
  position: { x: number; y: number },
  elapsedMs: number,
  lastTrackSampleMs?: number
) {
  if (lastTrackSampleMs !== undefined && elapsedMs - lastTrackSampleMs < TRACK_SAMPLE_INTERVAL_MS) {
    return { track, lastTrackSampleMs };
  }

  const next = [...track, position];
  return {
    track: next.length > MAX_TRACK_POINTS ? next.slice(next.length - MAX_TRACK_POINTS) : next,
    lastTrackSampleMs: elapsedMs
  };
}

export const SIM_DT = 1 / 60;

const PENALTY_DURATION_MS = 3000;

export type SimState = {
  boats: BoatState[];
  activeBoatIds: BoatId[];
  race: RaceState;
  course: CourseDefinition;
  windField: WindFieldConfig;
  /** Derived global wind for the current tick; recomputed from windField each step. */
  wind: WindState;
  windZones: WindZoneState[];
  rulesState: RulesEngineState;
};

export function createInitialSimState(activeBoatIds: BoatId[] = ["red", "blue"], courseId: CourseId = "simple"): SimState {
  const course = getCourse(courseId);
  return {
    boats: cloneInitialBoats(course),
    activeBoatIds,
    course,
    race: cloneInitialRace(),
    windField: INITIAL_WIND_FIELD,
    wind: globalWindAt(INITIAL_WIND_FIELD, 0),
    windZones: INITIAL_WIND_ZONES.map((zone) => ({ ...zone, bounds: { ...zone.bounds } })),
    rulesState: createRulesEngineState()
  };
}

export function cloneInitialBoats(course?: CourseDefinition): BoatState[] {
  return INITIAL_BOATS.map((boat, index) => {
    const spawn = course?.spawnPoints[index];
    return {
      ...boat,
      position: spawn ? { ...spawn.position } : { ...boat.position },
      headingDeg: spawn ? spawn.headingDeg : boat.headingDeg,
      velocity: { ...boat.velocity },
      legIndex: 0,
      finished: false,
      penaltyUntilMs: undefined,
      track: [],
      lastTrackSampleMs: undefined
    };
  });
}

export function cloneInitialRace(): RaceState {
  return { ...INITIAL_RACE, ruleEvents: [], events: [], finishOrder: [] };
}

export function stepSimulation(state: SimState, controls: Record<BoatId, BoatControls>): SimState {
  if (state.race.phase === "paused" || state.race.phase === "finished") return state;

  const dt = SIM_DT;
  const elapsedMs = state.race.phase === "racing" ? state.race.elapsedMs + dt * 1000 : state.race.elapsedMs;
  const elapsedSec = elapsedMs / 1000;
  const wind = globalWindAt(state.windField, elapsedSec);
  const windZones = updateWindZones(state.windZones, dt);
  let race: RaceState = {
    ...state.race,
    elapsedMs,
    countdownMs: state.race.phase === "prestart" ? Math.max(0, state.race.countdownMs - dt * 1000) : state.race.countdownMs
  };

  let startSignal = false;
  if (race.phase === "prestart" && race.countdownMs <= 0) {
    race = { ...race, phase: "racing", countdownMs: 0 };
    startSignal = true;
  }

  const raceEvents: RaceEvent[] = [];

  let boats = state.boats.map((boat) => {
    if (!state.activeBoatIds.includes(boat.id)) return boat;
    const prevPosition = boat.position;
    const local = getLocalWind(state.windField, boat.position, elapsedSec);
    const wasPenalized = Boolean(boat.penaltyUntilMs && boat.penaltyUntilMs > state.race.elapsedMs);
    const isPenalized = Boolean(boat.penaltyUntilMs && boat.penaltyUntilMs > elapsedMs);
    if (wasPenalized && !isPenalized) {
      raceEvents.push({
        id: `penalty-end-${boat.id}-${Math.round(elapsedMs)}`,
        timeMs: elapsedMs,
        kind: "penalty-end",
        boatId: boat.id,
        message: `${boat.name} 处罚结束，恢复正常航速`
      });
    }

    const motion = stepBoatPhysics({
      motion: {
        position: boat.position,
        headingDeg: boat.headingDeg,
        speed: boat.speed,
        velocity: boat.velocity,
        rudderAngleDeg: boat.rudderAngleDeg,
        sailAngleDeg: boat.sailAngleDeg,
        twaDeg: boat.twaDeg,
        tack: boat.tack,
        tackTimerSec: boat.tackTimerSec,
        sailEfficiency: boat.sailEfficiency
      },
      rudder: controls[boat.id].rudder,
      boatType: boat.boatType,
      wind: local,
      penaltyFactor: isPenalized ? 0.4 : 1,
      dt
    });

    const position = {
      x: Math.max(32, Math.min(WORLD.width - 32, motion.position.x)),
      y: Math.max(32, Math.min(WORLD.height - 32, motion.position.y))
    };

    const sampledTrack = appendTrackPoint(boat.track, position, elapsedMs, boat.lastTrackSampleMs);
    let next: BoatState = {
      ...boat,
      ...motion,
      position,
      tackCount: motion.tack !== boat.tack ? boat.tackCount + 1 : boat.tackCount,
      track: sampledTrack.track,
      lastTrackSampleMs: sampledTrack.lastTrackSampleMs
    };

    if (race.phase === "racing") {
      const progress = updateBoatRace({ boat: next, prevPosition, course: state.course, elapsedMs, startSignal });
      next = progress.boat;
      raceEvents.push(...progress.events);
    }

    return next;
  });

  let rulesState = state.rulesState;
  if (race.phase === "racing") {
    const rules = stepRules({
      boats,
      activeBoatIds: state.activeBoatIds,
      windFromDeg: wind.directionDeg,
      elapsedMs,
      state: rulesState
    });
    rulesState = rules.state;

    for (const judgement of rules.events) {
      const ruleEvent = {
        id: `rule${judgement.rule}-${judgement.type}-${Math.round(elapsedMs)}-${judgement.offenderId}`,
        timeMs: elapsedMs,
        rule: judgement.rule,
        severity: judgement.type,
        offenderId: judgement.offenderId,
        rightOfWayId: judgement.rightOfWayId,
        message: judgement.message
      };
      race = { ...race, ruleEvents: [ruleEvent, ...race.ruleEvents].slice(0, 8) };

      if (judgement.type === "breach") {
        race = {
          ...race,
          events: [
            { id: `evt-${ruleEvent.id}`, timeMs: elapsedMs, kind: "rule" as const, boatId: judgement.offenderId, message: judgement.message },
            ...race.events
          ].slice(0, 50)
        };
        boats = boats.map((boat) =>
          boat.id === judgement.offenderId
            ? {
                ...boat,
                speed: boat.speed * 0.25,
                penaltyCount: boat.penaltyCount + 1,
                penaltyUntilMs: elapsedMs + PENALTY_DURATION_MS
              }
            : boat
        );
      }
    }

    // --- finish bookkeeping ---
    const activeBoats = boats.filter((boat) => state.activeBoatIds.includes(boat.id));
    const alreadyRecorded = new Set(race.finishOrder.map((entry) => entry.boatId));
    const newlyFinished = activeBoats.filter((boat) => boat.finished && !alreadyRecorded.has(boat.id));
    if (newlyFinished.length > 0) {
      const finishOrder = [...race.finishOrder, ...newlyFinished.map((boat) => ({ boatId: boat.id, timeMs: elapsedMs }))];
      race = { ...race, finishOrder, winner: race.winner ?? finishOrder[0].boatId };
    }
    if (activeBoats.length > 0 && activeBoats.every((boat) => boat.finished)) {
      race = { ...race, phase: "finished" };
    }
  }

  if (raceEvents.length > 0) {
    race = { ...race, events: [...raceEvents.reverse(), ...race.events].slice(0, 50) };
  }

  return { ...state, boats, race, wind, windZones, rulesState };
}
