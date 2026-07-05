import type { Vec2 } from "../../game/types";
import { clamp, headingToVector, normalizeDeg } from "../../game/utils/math";
import type { BoatType } from "../polar/polar";
import { getNoGoAngle, getPolarSpeed } from "../polar/polar";
import { PIXELS_PER_KNOT } from "./units";

/**
 * Wind convention across the whole simulation:
 * directionDeg is where the wind blows FROM, 0 = top of the screen, clockwise.
 * Boat headingDeg uses the same compass (0 = up-screen).
 */
export type LocalWind = {
  directionDeg: number;
  speedKnots: number;
};

export type Tack = "port" | "starboard";

export type BoatMotionState = {
  position: Vec2;
  headingDeg: number;
  /** Speed through water in px/s. */
  speed: number;
  /** Speed over ground vector in px/s (includes current). */
  velocity: Vec2;
  rudderAngleDeg: number;
  sailAngleDeg: number;
  twaDeg: number;
  tack: Tack;
  /** Seconds of tack/gybe slowdown remaining. */
  tackTimerSec: number;
  sailEfficiency: number;
};

export type BoatPhysicsInput = {
  motion: BoatMotionState;
  /** Normalized rudder command in [-1, 1]. */
  rudder: number;
  boatType: BoatType;
  wind: LocalWind;
  current: Vec2;
  /** 1 = normal; <1 while serving a slow-down penalty. */
  penaltyFactor: number;
  dt: number;
};

export const MAX_RUDDER_DEG = 32;
const RUDDER_SLEW_DEG_PER_SEC = 130;
const RUDDER_CENTERING_DEG_PER_SEC = 70;
const TURN_RATE_PER_RUDDER_DEG = 2.6;
const REFERENCE_SPEED = 4 * PIXELS_PER_KNOT;
const ACCELERATION = 0.55;
const DECELERATION = 1.15;
/** Head to wind the hull coasts on momentum instead of braking hard. */
const NO_GO_COAST_DECELERATION = 0.28;
/** Rudder authority floor: even a slow hull can push its bow through a tack. */
const MIN_SPEED_FACTOR = 0.45;
const TACK_PENALTY_SEC = 1.6;
const GYBE_PENALTY_SEC = 1.0;
const TACK_PENALTY_FACTOR = 0.45;
const SAIL_TRIM_RATE = 3.2;

export function createBoatMotionState(init: { position: Vec2; headingDeg: number; speed?: number }): BoatMotionState {
  return {
    position: { ...init.position },
    headingDeg: normalizeDeg(init.headingDeg),
    speed: init.speed ?? 0,
    velocity: { x: 0, y: 0 },
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 0,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1
  };
}

export function tackFromWind(headingDeg: number, windFromDeg: number): Tack {
  const relativeBearing = normalizeDeg(windFromDeg - headingDeg);
  // Wind source on the right-hand side of the bow -> starboard tack.
  return relativeBearing > 0 && relativeBearing < 180 ? "starboard" : "port";
}

export function idealSailAngle(twaDeg: number): number {
  return clamp((twaDeg - 15) * 0.6, 8, 88);
}

export function stepBoatPhysics({ motion, rudder, boatType, wind, current, penaltyFactor, dt }: BoatPhysicsInput): BoatMotionState {
  // --- rudder ---
  const command = clamp(rudder, -1, 1) * MAX_RUDDER_DEG;
  const slew = Math.abs(rudder) < 0.05 ? RUDDER_CENTERING_DEG_PER_SEC : RUDDER_SLEW_DEG_PER_SEC;
  const rudderDelta = clamp(command - motion.rudderAngleDeg, -slew * dt, slew * dt);
  const rudderAngleDeg = motion.rudderAngleDeg + rudderDelta;

  // --- turning: more effective with boat speed ---
  const speedFactor = clamp(motion.speed / REFERENCE_SPEED, MIN_SPEED_FACTOR, 1.4);
  const headingDeg = normalizeDeg(motion.headingDeg + rudderAngleDeg * TURN_RATE_PER_RUDDER_DEG * speedFactor * dt);

  // --- wind geometry ---
  const twaDeg = angleDistance(headingDeg, wind.directionDeg);
  const tack = tackFromWind(headingDeg, wind.directionDeg);

  // --- tack / gybe detection ---
  let tackTimerSec = Math.max(0, motion.tackTimerSec - dt);
  if (tack !== motion.tack) {
    tackTimerSec = twaDeg < 90 ? TACK_PENALTY_SEC : GYBE_PENALTY_SEC;
  }

  // --- auto trim ---
  const targetSail = idealSailAngle(twaDeg);
  const sailAngleDeg = motion.sailAngleDeg + (targetSail - motion.sailAngleDeg) * Math.min(1, SAIL_TRIM_RATE * dt);
  let sailEfficiency = clamp(1 - Math.abs(targetSail - sailAngleDeg) / 50, 0.35, 1);
  if (tackTimerSec > 0) sailEfficiency *= 0.55;

  // --- target speed through water ---
  const polarKnots = getPolarSpeed(boatType, wind.speedKnots, twaDeg);
  const rudderDrag = 1 - (Math.abs(rudderAngleDeg) / MAX_RUDDER_DEG) ** 2 * 0.3;
  const tackPenalty = tackTimerSec > 0 ? TACK_PENALTY_FACTOR : 1;
  const targetSpeed = Math.max(0, polarKnots * PIXELS_PER_KNOT * sailEfficiency * rudderDrag * tackPenalty * penaltyFactor);

  const inNoGo = twaDeg < getNoGoAngle(boatType);
  const response = targetSpeed > motion.speed ? ACCELERATION : inNoGo ? NO_GO_COAST_DECELERATION : DECELERATION;
  const speed = motion.speed + (targetSpeed - motion.speed) * Math.min(1, response * dt);

  // --- motion over ground ---
  const bow = headingToVector(headingDeg);
  const velocity = { x: bow.x * speed + current.x, y: bow.y * speed + current.y };
  const position = { x: motion.position.x + velocity.x * dt, y: motion.position.y + velocity.y * dt };

  return {
    position,
    headingDeg,
    speed,
    velocity,
    rudderAngleDeg,
    sailAngleDeg,
    twaDeg,
    tack,
    tackTimerSec,
    sailEfficiency
  };
}

function angleDistance(aDeg: number, bDeg: number): number {
  const diff = Math.abs(normalizeDeg(aDeg) - normalizeDeg(bDeg)) % 360;
  return diff > 180 ? 360 - diff : diff;
}
