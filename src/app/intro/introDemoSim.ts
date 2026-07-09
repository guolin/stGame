import type { Vec2 } from "../../game/types";
import { clamp, normalizeDeg } from "../../game/utils/math";
import type { BoatMotionState, Tack } from "../../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../../sim/boat/units";

/**
 * Scripted intro-demo simulation: one continuous upwind leg from the start
 * line to mark 1, driven by real boat physics. Red plays the shifts, blue
 * sails a fixed zigzag; the wind script advances when the presenter does.
 */

export type IntroDemoMode = "split" | "shift" | "pendulum";

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
/** Everything is gently compressed; the pendulum act runs extra fast. */
export const DEMO_TIME_SCALE: Record<IntroDemoMode, number> = { split: 2, shift: 2, pendulum: 3 };
export const DEMO_MARK: Vec2 = { x: 1400, y: 300 };
export const DEMO_START_Y = 1620;

const SHIFT_RATE_DEG_PER_SEC = 2.5;
const PENDULUM_CENTER_DEG = 5;
const PENDULUM_AMPLITUDE_DEG = DEMO_FIRST_SHIFT_DEG - PENDULUM_CENTER_DEG;
const PENDULUM_PERIOD_SEC = 30;
const CLOSE_HAULED_DEG = 45;
const TACK_HYSTERESIS_DEG = 12;
const ARENA_LEFT = 380;
const ARENA_RIGHT = 2420;
const FINISH_RADIUS = 240;
const STEER_GAIN = 0.045;
const TRACK_SPACING = 24;
const TRACK_LIMIT = 700;

/** 1 knot ≈ 0.5144 m/s, so world pixels per real-world meter. */
export const PIXELS_PER_METER = PIXELS_PER_KNOT / 0.5144;

export function createIntroDemoState(): IntroDemoState {
  const speed = 3.2 * PIXELS_PER_KNOT;
  return {
    simTimeSec: 0,
    mode: "split",
    modeStartSec: 0,
    windDeg: DEMO_BASE_WIND_DEG,
    windOscDeg: 0,
    red: {
      motion: createBoatMotionState({ position: { x: 1450, y: DEMO_START_Y }, headingDeg: 45, speed }),
      track: [],
      tackHeld: "port"
    },
    blue: {
      motion: createBoatMotionState({ position: { x: 1350, y: DEMO_START_Y }, headingDeg: 315, speed }),
      track: [],
      tackHeld: "starboard"
    },
    finished: false
  };
}

export function demoWindOscDeg(mode: IntroDemoMode, timeInModeSec: number): number {
  switch (mode) {
    case "split":
      return 0;
    case "shift":
      return Math.min(DEMO_FIRST_SHIFT_DEG, SHIFT_RATE_DEG_PER_SEC * timeInModeSec);
    case "pendulum":
      return (
        PENDULUM_CENTER_DEG +
        PENDULUM_AMPLITUDE_DEG * Math.cos((2 * Math.PI * timeInModeSec) / PENDULUM_PERIOD_SEC)
      );
  }
}

export function advanceIntroDemoMode(state: IntroDemoState): IntroDemoState {
  if (state.mode === "pendulum") return state;
  const mode: IntroDemoMode = state.mode === "split" ? "shift" : "pendulum";
  return { ...state, mode, modeStartSec: state.simTimeSec };
}

/** Close-hauled compass heading for a tack: wind over port side means heading right of the wind. */
export function targetHeadingForTack(tack: Tack, windDeg: number): number {
  return normalizeDeg(windDeg + (tack === "port" ? CLOSE_HAULED_DEG : -CLOSE_HAULED_DEG));
}

/**
 * Tack-on-headers strategy: hold the tack whose close-hauled heading points
 * closer at the mark, with hysteresis so the boat doesn't flap when the mark
 * is dead upwind.
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

/** Blue's shift-blind strategy: only tack when running out of water at the edges. */
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

export function stepIntroDemo(state: IntroDemoState, dt: number): IntroDemoState {
  if (state.finished) return state;

  const substeps = DEMO_TIME_SCALE[state.mode];
  let { simTimeSec, windDeg, windOscDeg, red, blue } = state;
  let finished: boolean = state.finished;

  for (let i = 0; i < substeps && !finished; i += 1) {
    simTimeSec += dt;
    windOscDeg = demoWindOscDeg(state.mode, simTimeSec - state.modeStartSec);
    windDeg = normalizeDeg(DEMO_BASE_WIND_DEG + windOscDeg);

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

    red = stepDemoBoat(red, redTack, windDeg, dt);
    blue = stepDemoBoat(blue, blueTack, windDeg, dt);

    const dx = red.motion.position.x - DEMO_MARK.x;
    const dy = red.motion.position.y - DEMO_MARK.y;
    if (Math.hypot(dx, dy) < FINISH_RADIUS) finished = true;
  }

  return { ...state, simTimeSec, windDeg, windOscDeg, red, blue, finished };
}

function stepDemoBoat(boat: DemoBoat, tack: Tack, windDeg: number, dt: number): DemoBoat {
  const target = targetHeadingForTack(tack, windDeg);
  const rudder = clamp(signedDelta(boat.motion.headingDeg, target) * STEER_GAIN, -1, 1);
  const motion = stepBoatPhysics({
    motion: boat.motion,
    rudder,
    boatType: "op",
    wind: { directionDeg: windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS },
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
