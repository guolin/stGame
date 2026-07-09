import type { Vec2, WindZoneState } from "../../game/types";
import { clamp, normalizeDeg } from "../../game/utils/math";
import type { BoatMotionState, LocalWind, Tack } from "../../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../../sim/boat/units";
import type { WindFieldConfig } from "../../sim/wind/windField";
import { getLocalWind } from "../../sim/wind/windField";

/**
 * Scripted intro-demo simulations, all driven by real boat physics.
 *
 * Act 1 (shift demo): one continuous upwind leg from the start line to
 * mark 1. The wind veers once and stays; red went right and plays the
 * shift, blue banged the left corner — a clear gap at the mark.
 *
 * Act 2 (zone demo): steady wind, but the field has wind zones. Red's
 * route threads the strong/lifted zone, blue's runs through the soft
 * patch — planning beats pointing.
 */

export type IntroDemoMode = "split" | "shift";

export type DemoBoat = {
  motion: BoatMotionState;
  track: Vec2[];
  /** The tack the boat's strategy wants, independent of mid-tack heading. */
  tackHeld: Tack;
};

export type IntroDemoState = {
  simTimeSec: number;
  mode: IntroDemoMode;
  modeStartSec: number;
  windDeg: number;
  /** Deviation from the base direction, for the HUD readout. */
  windOscDeg: number;
  red: DemoBoat;
  blue: DemoBoat;
  finished: boolean;
};

export const DEMO_BASE_WIND_DEG = 0;
export const DEMO_WIND_SPEED_KNOTS = 12;
export const DEMO_FIRST_SHIFT_DEG = 25;
/** Gentle compression while boats split, faster once the story is moving. */
export const DEMO_TIME_SCALE: Record<IntroDemoMode, number> = { split: 2, shift: 3 };
export const DEMO_MARK: Vec2 = { x: 1400, y: 300 };
export const DEMO_START_Y = 1620;

const SHIFT_RATE_DEG_PER_SEC = 2.5;
const CLOSE_HAULED_DEG = 45;
const TACK_HYSTERESIS_DEG = 12;
const ARENA_LEFT = 380;
const ARENA_RIGHT = 2420;
const FINISH_RADIUS = 240;
const STEER_GAIN = 0.045;
const TRACK_SPACING = 24;
const TRACK_LIMIT = 700;
const WAYPOINT_RADIUS = 220;

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

export function createIntroDemoState(): IntroDemoState {
  return {
    simTimeSec: 0,
    mode: "split",
    modeStartSec: 0,
    windDeg: DEMO_BASE_WIND_DEG,
    windOscDeg: 0,
    ...startingBoats(),
    finished: false
  };
}

export function demoWindOscDeg(mode: IntroDemoMode, timeInModeSec: number): number {
  switch (mode) {
    case "split":
      return 0;
    case "shift":
      return Math.min(DEMO_FIRST_SHIFT_DEG, SHIFT_RATE_DEG_PER_SEC * timeInModeSec);
  }
}

export function advanceIntroDemoMode(state: IntroDemoState): IntroDemoState {
  if (state.mode !== "split") return state;
  return { ...state, mode: "shift", modeStartSec: state.simTimeSec };
}

/** Close-hauled compass heading for a tack: wind over port side means heading right of the wind. */
export function targetHeadingForTack(tack: Tack, windDeg: number): number {
  return normalizeDeg(windDeg + (tack === "port" ? CLOSE_HAULED_DEG : -CLOSE_HAULED_DEG));
}

/**
 * Tack-on-headers strategy: hold the tack whose close-hauled heading points
 * closer at the target, with hysteresis so the boat doesn't flap when the
 * target is dead upwind.
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

/** Shift-blind strategy: only tack when running out of water at the edges. */
export function chooseCornerTack(x: number, currentTack: Tack): Tack {
  if (x < ARENA_LEFT) return "port";
  if (x > ARENA_RIGHT) return "starboard";
  return currentTack;
}

/** Race-truth lead: how many meters further from the mark blue is than red. */
export function leadMeters(red: Vec2, blue: Vec2, mark: Vec2 = DEMO_MARK): number {
  const redDist = Math.hypot(mark.x - red.x, mark.y - red.y);
  const blueDist = Math.hypot(mark.x - blue.x, mark.y - blue.y);
  return (blueDist - redDist) / PIXELS_PER_METER;
}

export function boatSpeedKnots(boat: DemoBoat): number {
  return boat.motion.speed / PIXELS_PER_KNOT;
}

export function stepIntroDemo(state: IntroDemoState, dt: number): IntroDemoState {
  if (state.finished) return state;

  const substeps = DEMO_TIME_SCALE[state.mode];
  let { simTimeSec, windDeg, windOscDeg, red, blue } = state;
  let finished: boolean = state.finished;

  for (let i = 0; i < substeps && !finished; i += 1) {
    simTimeSec += dt;
    windOscDeg = demoWindOscDeg(state.mode, simTimeSec - state.modeStartSec);
    windDeg = normalizeDeg(DEMO_BASE_WIND_DEG + windOscDeg);
    const wind: LocalWind = { directionDeg: windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS };

    const redTack =
      state.mode === "split"
        ? chooseCornerTack(red.motion.position.x, red.tackHeld)
        : chooseAdaptiveTack({
            position: red.motion.position,
            currentTack: red.tackHeld,
            windDeg,
            mark: DEMO_MARK,
            hysteresisDeg: TACK_HYSTERESIS_DEG
          });
    const blueTack = chooseCornerTack(blue.motion.position.x, blue.tackHeld);

    red = stepDemoBoat(red, redTack, wind, dt);
    blue = stepDemoBoat(blue, blueTack, wind, dt);
    finished = isAtMark(red.motion.position);
  }

  return { ...state, simTimeSec, windDeg, windOscDeg, red, blue, finished };
}

// ---------- zone demo (act 2) ----------

export const ZONE_DEMO_ZONES: WindZoneState[] = [
  {
    id: "strong-lift",
    bounds: { x: 1560, y: 420, width: 840, height: 980 },
    speedDeltaKnots: 4,
    shiftDeg: -12,
    color: "#12a5e8",
    alpha: 0.22,
    phase: 0,
    phaseSpeed: 0.6
  },
  {
    id: "soft-patch",
    bounds: { x: 400, y: 420, width: 840, height: 1080 },
    speedDeltaKnots: -7,
    shiftDeg: 12,
    color: "#021a2c",
    alpha: 0.42,
    phase: 1.3,
    phaseSpeed: 0.4
  }
];

const ZONE_TIME_SCALE = 3;
const RED_ROUTE: Vec2[] = [{ x: 1960, y: 880 }, DEMO_MARK];
const BLUE_ROUTE: Vec2[] = [{ x: 740, y: 880 }, DEMO_MARK];

export type ZoneDemoState = {
  simTimeSec: number;
  zones: WindZoneState[];
  red: DemoBoat;
  blue: DemoBoat;
  redWaypoint: number;
  blueWaypoint: number;
  finished: boolean;
};

export function createZoneDemoState(): ZoneDemoState {
  return {
    simTimeSec: 0,
    zones: ZONE_DEMO_ZONES.map((zone) => ({ ...zone })),
    ...startingBoats(),
    redWaypoint: 0,
    blueWaypoint: 0,
    finished: false
  };
}

export function localWindAt(zones: WindZoneState[], position: Vec2): LocalWind {
  const config: WindFieldConfig = {
    baseDirectionDeg: DEMO_BASE_WIND_DEG,
    baseSpeedKnots: DEMO_WIND_SPEED_KNOTS,
    oscillation: { kind: "none" },
    gusts: [],
    zones
  };
  return getLocalWind(config, position, 0);
}

export function stepZoneDemo(state: ZoneDemoState, dt: number): ZoneDemoState {
  if (state.finished) return state;

  let { simTimeSec, red, blue, redWaypoint, blueWaypoint } = state;
  let finished: boolean = state.finished;
  const zones = state.zones.map((zone) => ({ ...zone, phase: zone.phase + zone.phaseSpeed * dt * ZONE_TIME_SCALE }));

  for (let i = 0; i < ZONE_TIME_SCALE && !finished; i += 1) {
    simTimeSec += dt;

    [redWaypoint, red] = stepRoutedBoat(red, RED_ROUTE, redWaypoint, zones, dt);
    [blueWaypoint, blue] = stepRoutedBoat(blue, BLUE_ROUTE, blueWaypoint, zones, dt);
    finished = isAtMark(red.motion.position);
  }

  return { ...state, simTimeSec, zones, red, blue, redWaypoint, blueWaypoint, finished };
}

function stepRoutedBoat(
  boat: DemoBoat,
  route: Vec2[],
  waypointIndex: number,
  zones: WindZoneState[],
  dt: number
): [number, DemoBoat] {
  const position = boat.motion.position;
  let index = waypointIndex;
  const waypoint = route[index];
  if (index < route.length - 1 && Math.hypot(position.x - waypoint.x, position.y - waypoint.y) < WAYPOINT_RADIUS) {
    index += 1;
  }

  const wind = localWindAt(zones, position);
  const tack = chooseAdaptiveTack({
    position,
    currentTack: boat.tackHeld,
    windDeg: wind.directionDeg,
    mark: route[index],
    hysteresisDeg: TACK_HYSTERESIS_DEG
  });
  return [index, stepDemoBoat(boat, tack, wind, dt)];
}

// ---------- shared helpers ----------

export function stepDemoBoat(boat: DemoBoat, tack: Tack, wind: LocalWind, dt: number): DemoBoat {
  const target = targetHeadingForTack(tack, wind.directionDeg);
  const rudder = clamp(signedDelta(boat.motion.headingDeg, target) * STEER_GAIN, -1, 1);
  const motion = stepBoatPhysics({
    motion: boat.motion,
    rudder,
    boatType: "op",
    wind,
    current: { x: 0, y: 0 },
    penaltyFactor: 1,
    dt
  });

  let track = boat.track;
  const last = track[track.length - 1];
  if (!last || Math.hypot(motion.position.x - last.x, motion.position.y - last.y) > TRACK_SPACING) {
    track = [...track, { ...motion.position }];
    if (track.length > TRACK_LIMIT) track = track.slice(track.length - TRACK_LIMIT);
  }

  return { motion, track, tackHeld: tack };
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
