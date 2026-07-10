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

export type ApparentWind = {
  angleDeg: number;
  speedKnots: number;
};

export type SailShape = {
  boomAngleDeg: number;
  camber: number;
  twistDeg: number;
  luffing: number;
  dragShare: number;
  flowEfficiency: number;
  mode: "lift" | "mixed" | "drag";
};

export type BoatMotionState = {
  position: Vec2;
  headingDeg: number;
  /** Speed through water in px/s. */
  speed: number;
  /** Speed over ground vector in px/s. */
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
  /** 1 = normal; <1 while serving a slow-down penalty. */
  penaltyFactor: number;
  dt: number;
};

export const MAX_RUDDER_DEG = 32;
const RUDDER_SLEW_DEG_PER_SEC = 520;
const RUDDER_CENTERING_DEG_PER_SEC = 420;
const TURN_RATE_PER_RUDDER_DEG = 4.15;
const REFERENCE_SPEED = 4 * PIXELS_PER_KNOT;
const ACCELERATION = 1.15;
const DECELERATION = 1.6;
/** Head to wind the hull coasts on momentum instead of braking hard. */
const NO_GO_COAST_DECELERATION = 0.28;
/** Rudder authority floor: even a slow hull can push its bow through a tack. */
const MIN_SPEED_FACTOR = 0.45;
const TACK_PENALTY_SEC = 1.6;
const GYBE_PENALTY_SEC = 1.0;
const TACK_PENALTY_FACTOR = 0.45;
const SAIL_TRIM_RATE = 3.2;
const MIN_BOOM_ANGLE_DEG = 7;
const MAX_BOOM_ANGLE_DEG = 89;
const KNOTS_TO_PIXELS_PER_SEC = PIXELS_PER_KNOT;

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
  return computeSailShape({ angleDeg: twaDeg, speedKnots: 0 }).boomAngleDeg;
}

export function apparentWind(headingDeg: number, boatVelocity: Vec2, wind: LocalWind): ApparentWind {
  const trueWindTo = headingToVector(normalizeDeg(wind.directionDeg + 180));
  const trueWindVelocity = {
    x: trueWindTo.x * wind.speedKnots * KNOTS_TO_PIXELS_PER_SEC,
    y: trueWindTo.y * wind.speedKnots * KNOTS_TO_PIXELS_PER_SEC
  };
  const apparentAirVelocity = {
    x: trueWindVelocity.x - boatVelocity.x,
    y: trueWindVelocity.y - boatVelocity.y
  };
  const apparentFrom = { x: -apparentAirVelocity.x, y: -apparentAirVelocity.y };
  const apparentFromDeg = vectorToHeadingDeg(apparentFrom);
  return {
    angleDeg: angleDistance(headingDeg, apparentFromDeg),
    speedKnots: Math.hypot(apparentAirVelocity.x, apparentAirVelocity.y) / KNOTS_TO_PIXELS_PER_SEC
  };
}

export function computeSailShape(apparent: ApparentWind): SailShape {
  const awaDeg = clamp(apparent.angleDeg, 0, 180);
  const boomAngleDeg = interpolateSailCurve(awaDeg, [
    [0, MIN_BOOM_ANGLE_DEG],
    [32, MIN_BOOM_ANGLE_DEG],
    [45, 14],
    [60, 24],
    [90, 45],
    [120, 64],
    [150, 80],
    [180, MAX_BOOM_ANGLE_DEG]
  ]);
  const reach = clamp((awaDeg - 35) / 95, 0, 1);
  const dragShare = clamp((awaDeg - 125) / 45, 0, 1);
  const camber = clamp(interpolateSailCurve(awaDeg, [
    [0, 0.08],
    [40, 0.1],
    [90, 0.16],
    [140, 0.21],
    [180, 0.24]
  ]), 0.08, 0.24);
  const twistDeg = clamp(interpolateSailCurve(awaDeg, [
    [0, 2],
    [45, 4],
    [90, 9],
    [140, 14],
    [180, 17]
  ]), 2, 17);
  const luffing = clamp((32 - awaDeg) / 12, 0, 1);
  const dragLoss = dragShare * 0.08;
  const twistLoss = clamp((twistDeg - 12) / 40, 0, 0.08);
  const apparentWindLoss = apparent.speedKnots < 2 ? 0.2 : 0;
  const flowEfficiency = clamp(1 - luffing * 0.78 - dragLoss - twistLoss - apparentWindLoss + reach * 0.02, 0.2, 1);

  return {
    boomAngleDeg,
    camber,
    twistDeg,
    luffing,
    dragShare,
    flowEfficiency,
    mode: dragShare > 0.55 ? "drag" : awaDeg > 110 ? "mixed" : "lift"
  };
}

export function stepBoatPhysics({ motion, rudder, boatType, wind, penaltyFactor, dt }: BoatPhysicsInput): BoatMotionState {
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
  const apparent = apparentWind(headingDeg, motion.velocity, wind);
  const sailShape = computeSailShape(apparent);
  const targetSail = sailShape.boomAngleDeg;
  const sailAngleDeg = motion.sailAngleDeg + (targetSail - motion.sailAngleDeg) * Math.min(1, SAIL_TRIM_RATE * dt);
  const trimEfficiency = clamp(1 - Math.abs(targetSail - sailAngleDeg) / 50, 0.35, 1);
  let sailEfficiency = clamp(trimEfficiency * sailShape.flowEfficiency, 0.25, 1);
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
  const velocity = { x: bow.x * speed, y: bow.y * speed };
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

function vectorToHeadingDeg(vector: Vec2): number {
  if (vector.x === 0 && vector.y === 0) return 0;
  return normalizeDeg((Math.atan2(vector.x, -vector.y) * 180) / Math.PI);
}

function interpolateSailCurve(value: number, points: readonly (readonly [number, number])[]) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return points[value < points[0][0] ? 0 : points.length - 1][1];
}
