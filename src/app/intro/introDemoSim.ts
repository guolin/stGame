import type { Vec2 } from "../../game/types";
import { clamp, normalizeDeg } from "../../game/utils/math";
import type { BoatMotionState, LocalWind, Tack } from "../../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../../sim/boat/units";

/**
 * Intro-demo simulation, all real boat physics.
 *
 * Acts 1+2 (recorded race): two identical boats — same hull, same polar,
 * so the same speed — race one upwind leg while the wind veers 355° → 20°.
 * The race is recorded once; the "dark" page plays it with no wind drawn
 * (the on-the-water experience) and the next page replays the exact same
 * frames with the wind painted on.
 *
 * Act 3 (live duel): the presenter helms red against the same blue AI,
 * reading the same scripted veer.
 */

export type DemoBoat = {
  motion: BoatMotionState;
  track: Vec2[];
  /** The tack the boat's strategy wants, independent of mid-tack heading. */
  tackHeld: Tack;
};

export const DEMO_BASE_WIND_DEG = 0;
export const DEMO_WIND_SPEED_KNOTS = 12;
/** The veer runs from 355° through to 020°. */
export const DEMO_SHIFT_FROM_DEG = -5;
export const DEMO_SHIFT_TO_DEG = 20;
/** Playback compression for the recorded race. */
export const DEMO_TIME_SCALE = 3;
/** The live duel runs gentler so a human can steer. */
export const DUEL_TIME_SCALE = 2;
export const DEMO_MARK: Vec2 = { x: 1400, y: 300 };
export const DEMO_START_Y = 1620;

const DT = 1 / 60;
const SHIFT_GRACE_SEC = 4;
const SHIFT_RATE_DEG_PER_SEC = 1.2;
/** Boats commit to their side off the line before sailing the shifts. */
const SPLIT_HOLD_SEC = 14;
const CLOSE_HAULED_DEG = 45;
const TACK_HYSTERESIS_DEG = 12;
const ARENA_LEFT = 380;
const ARENA_RIGHT = 2420;
const FINISH_RADIUS = 240;
const STEER_GAIN = 0.045;
const TRACK_SPACING = 24;
const TRACK_LIMIT = 900;
const MAX_RACE_SEC = 220;

/** 1 knot ≈ 0.5144 m/s, so world pixels per real-world meter. */
export const PIXELS_PER_METER = PIXELS_PER_KNOT / 0.5144;

function startingBoats(): { red: DemoBoat; blue: DemoBoat } {
  const speed = 3.2 * PIXELS_PER_KNOT;
  return {
    red: {
      motion: createBoatMotionState({ position: { x: 1450, y: DEMO_START_Y }, headingDeg: 45, speed }),
      track: [],
      tackHeld: "port"
    },
    blue: {
      motion: createBoatMotionState({ position: { x: 1350, y: DEMO_START_Y }, headingDeg: 315, speed }),
      track: [],
      tackHeld: "starboard"
    }
  };
}

/** One continuous veer from 355° to 20°, starting right away after a short grace. */
export function demoWindOscDeg(timeSec: number): number {
  const swing = DEMO_SHIFT_TO_DEG - DEMO_SHIFT_FROM_DEG;
  const progressed = Math.max(0, timeSec - SHIFT_GRACE_SEC) * SHIFT_RATE_DEG_PER_SEC;
  return DEMO_SHIFT_FROM_DEG + Math.min(swing, progressed);
}

// ---------- recorded race (acts 1 and 2) ----------

export type RaceFrame = {
  timeSec: number;
  windDeg: number;
  windOscDeg: number;
  red: BoatMotionState;
  blue: BoatMotionState;
  redTrackLen: number;
  blueTrackLen: number;
};

export type RaceRecording = {
  frames: RaceFrame[];
  redTrack: Vec2[];
  blueTrack: Vec2[];
  redAtMarkSec: number;
  blueAtMarkSec: number;
};

/** Run the whole race once, deterministically, and keep every sim frame. */
export function recordIntroRace(): RaceRecording {
  let { red, blue } = startingBoats();
  let redAtMarkSec: number | undefined;
  let blueAtMarkSec: number | undefined;
  const frames: RaceFrame[] = [];
  let timeSec = 0;

  while (timeSec < MAX_RACE_SEC) {
    timeSec += DT;
    const windOscDeg = demoWindOscDeg(timeSec);
    const windDeg = normalizeDeg(DEMO_BASE_WIND_DEG + windOscDeg);
    const wind: LocalWind = { directionDeg: windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS };

    if (redAtMarkSec === undefined) {
      red = stepDemoBoat(red, chooseMarkTack(red, windDeg, timeSec), wind, DT);
      if (isAtMark(red.motion.position)) redAtMarkSec = timeSec;
    }
    if (blueAtMarkSec === undefined) {
      blue = stepDemoBoat(blue, chooseMarkTack(blue, windDeg, timeSec), wind, DT);
      if (isAtMark(blue.motion.position)) blueAtMarkSec = timeSec;
    }

    frames.push({
      timeSec,
      windDeg,
      windOscDeg,
      red: red.motion,
      blue: blue.motion,
      redTrackLen: red.track.length,
      blueTrackLen: blue.track.length
    });

    // Hold the final tableau for a moment, then stop recording.
    if (redAtMarkSec !== undefined && blueAtMarkSec !== undefined && timeSec > blueAtMarkSec + 1) break;
  }

  return {
    frames,
    redTrack: red.track,
    blueTrack: blue.track,
    redAtMarkSec: redAtMarkSec ?? MAX_RACE_SEC,
    blueAtMarkSec: blueAtMarkSec ?? MAX_RACE_SEC
  };
}

// ---------- live duel (act 3) ----------

export type DuelState = {
  simTimeSec: number;
  windDeg: number;
  windOscDeg: number;
  red: DemoBoat;
  blue: DemoBoat;
  redAtMarkSec?: number;
  blueAtMarkSec?: number;
  finished: boolean;
  /** Emergency stand-in helm if the hardware dies mid-pitch. */
  autopilot: boolean;
};

export function createDuelState(): DuelState {
  return {
    simTimeSec: 0,
    windDeg: normalizeDeg(DEMO_BASE_WIND_DEG + DEMO_SHIFT_FROM_DEG),
    windOscDeg: DEMO_SHIFT_FROM_DEG,
    ...startingBoats(),
    finished: false,
    autopilot: false
  };
}

export function stepDuel(state: DuelState, playerRudder: number, dt: number): DuelState {
  if (state.finished) return state;

  let { simTimeSec, windDeg, windOscDeg, red, blue, redAtMarkSec, blueAtMarkSec } = state;
  let finished: boolean = state.finished;

  for (let i = 0; i < DUEL_TIME_SCALE && !finished; i += 1) {
    simTimeSec += dt;
    windOscDeg = demoWindOscDeg(simTimeSec);
    windDeg = normalizeDeg(DEMO_BASE_WIND_DEG + windOscDeg);
    const wind: LocalWind = { directionDeg: windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS };

    if (redAtMarkSec === undefined) {
      red = state.autopilot
        ? stepDemoBoat(red, chooseMarkTack(red, windDeg, simTimeSec), wind, dt)
        : stepPlayerBoat(red, playerRudder, wind, dt);
      if (isAtMark(red.motion.position)) redAtMarkSec = simTimeSec;
    }
    if (blueAtMarkSec === undefined) {
      blue = stepDemoBoat(blue, chooseMarkTack(blue, windDeg, simTimeSec), wind, dt);
      if (isAtMark(blue.motion.position)) blueAtMarkSec = simTimeSec;
    }
    finished = redAtMarkSec !== undefined && blueAtMarkSec !== undefined;
  }

  return { ...state, simTimeSec, windDeg, windOscDeg, red, blue, redAtMarkSec, blueAtMarkSec, finished };
}

function stepPlayerBoat(boat: DemoBoat, rudder: number, wind: LocalWind, dt: number): DemoBoat {
  const motion = stepBoatPhysics({
    motion: boat.motion,
    rudder: clamp(rudder, -1, 1),
    boatType: "op",
    wind,
    current: { x: 0, y: 0 },
    penaltyFactor: 1,
    dt
  });
  motion.position.x = clamp(motion.position.x, 60, 2740);
  motion.position.y = clamp(motion.position.y, 60, 1740);
  return { motion, track: appendTrack(boat.track, motion.position), tackHeld: motion.tack };
}

// ---------- shared helm logic ----------

/** Close-hauled compass heading for a tack: wind over port side means heading right of the wind. */
export function targetHeadingForTack(tack: Tack, windDeg: number): number {
  return normalizeDeg(windDeg + (tack === "port" ? CLOSE_HAULED_DEG : -CLOSE_HAULED_DEG));
}

/**
 * Hold the tack whose close-hauled heading points closer at the target,
 * with hysteresis so the boat doesn't flap when the target is dead upwind.
 */
export function chooseAdaptiveTack(input: {
  position: Vec2;
  currentTack: Tack;
  windDeg: number;
  mark: Vec2;
  hysteresisDeg: number;
}): Tack {
  const { position, currentTack, windDeg, mark, hysteresisDeg } = input;
  const bearing = bearingDeg(position, mark);
  const other: Tack = currentTack === "port" ? "starboard" : "port";
  const currentDiff = angleDistance(targetHeadingForTack(currentTack, windDeg), bearing);
  const otherDiff = angleDistance(targetHeadingForTack(other, windDeg), bearing);
  return otherDiff + hysteresisDeg < currentDiff ? other : currentTack;
}

/** Only tack when running out of water at the arena edges. */
export function chooseCornerTack(x: number, currentTack: Tack): Tack {
  if (x < ARENA_LEFT) return "port";
  if (x > ARENA_RIGHT) return "starboard";
  return currentTack;
}

/** Sail for the mark, holding the chosen side off the line, with an arena guard. */
function chooseMarkTack(boat: DemoBoat, windDeg: number, simTimeSec: number): Tack {
  const guarded = chooseCornerTack(boat.motion.position.x, boat.tackHeld);
  if (guarded !== boat.tackHeld) return guarded;
  if (simTimeSec < SPLIT_HOLD_SEC) return boat.tackHeld;
  return chooseAdaptiveTack({
    position: boat.motion.position,
    currentTack: boat.tackHeld,
    windDeg,
    mark: DEMO_MARK,
    hysteresisDeg: TACK_HYSTERESIS_DEG
  });
}

/** Race-truth lead: how many meters further from the mark blue is than red. */
export function leadMeters(red: Vec2, blue: Vec2, mark: Vec2 = DEMO_MARK): number {
  const redDist = Math.hypot(mark.x - red.x, mark.y - red.y);
  const blueDist = Math.hypot(mark.x - blue.x, mark.y - blue.y);
  return (blueDist - redDist) / PIXELS_PER_METER;
}

export function speedKnotsOf(motion: BoatMotionState): number {
  return motion.speed / PIXELS_PER_KNOT;
}

export function stepDemoBoat(boat: DemoBoat, tack: Tack, wind: LocalWind, dt: number): DemoBoat {
  const target = targetHeadingForTack(tack, wind.directionDeg);
  const rudder = clamp(signedDelta(boat.motion.headingDeg, target) * STEER_GAIN, -1, 1);
  const motion = stepBoatPhysics({
    motion: boat.motion,
    rudder,
    boatType: "op",
    wind,
    penaltyFactor: 1,
    dt
  });
  return { motion, track: appendTrack(boat.track, motion.position), tackHeld: tack };
}

function appendTrack(track: Vec2[], position: Vec2): Vec2[] {
  const last = track[track.length - 1];
  if (last && Math.hypot(position.x - last.x, position.y - last.y) <= TRACK_SPACING) return track;
  const next = [...track, { ...position }];
  return next.length > TRACK_LIMIT ? next.slice(next.length - TRACK_LIMIT) : next;
}

function isAtMark(position: Vec2): boolean {
  return Math.hypot(position.x - DEMO_MARK.x, position.y - DEMO_MARK.y) < FINISH_RADIUS;
}

function bearingDeg(from: Vec2, to: Vec2): number {
  return normalizeDeg((Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI);
}

function angleDistance(aDeg: number, bDeg: number): number {
  const diff = Math.abs(normalizeDeg(aDeg) - normalizeDeg(bDeg)) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function signedDelta(fromDeg: number, toDeg: number): number {
  let delta = normalizeDeg(toDeg) - normalizeDeg(fromDeg);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}
