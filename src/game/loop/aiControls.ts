import { WORLD } from "../constants";
import type { AiControlProfile, AiDifficulty, BoatControls, BoatId, BoatState, Vec2, WindState } from "../types";
import { angleDifferenceDeg, clamp, distance, headingToVector, normalizeDeg } from "../utils/math";
import type { CourseDefinition } from "../../sim/course/types";
import { currentTarget } from "../../sim/course/progress";
import { getNoGoAngle } from "../../sim/polar/polar";

export const AI_DIFFICULTIES: readonly AiDifficulty[] = ["high", "medium", "low"];

export const AI_DIFFICULTY_LABEL: Record<AiDifficulty, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

type AiProfile = {
  upwindAngleDeg: number;
  downwindAngleDeg: number;
  rudderGain: number;
  maxRudder: number;
  tackBufferPx: number;
  markApproachRadiusPx: number;
  markOrbitRadiusPx: number;
  markOrbitLeadDeg: number;
  markExitRadiusPx: number;
  weaveDeg: number;
  weavePeriodSec: number;
};

type AiTarget = {
  point: Vec2;
  forceDirect?: boolean;
};

const AI_PROFILES: Record<AiControlProfile, AiProfile> = {
  high: {
    upwindAngleDeg: 45,
    downwindAngleDeg: 145,
    rudderGain: 0.035,
    maxRudder: 0.92,
    tackBufferPx: 110,
    markApproachRadiusPx: 340,
    markOrbitRadiusPx: 126,
    markOrbitLeadDeg: 72,
    markExitRadiusPx: 520,
    weaveDeg: 0,
    weavePeriodSec: 12
  },
  medium: {
    upwindAngleDeg: 52,
    downwindAngleDeg: 158,
    rudderGain: 0.026,
    maxRudder: 0.66,
    tackBufferPx: 170,
    markApproachRadiusPx: 380,
    markOrbitRadiusPx: 120,
    markOrbitLeadDeg: 60,
    markExitRadiusPx: 500,
    weaveDeg: 4,
    weavePeriodSec: 9
  },
  low: {
    upwindAngleDeg: 64,
    downwindAngleDeg: 176,
    rudderGain: 0.017,
    maxRudder: 0.42,
    tackBufferPx: 245,
    markApproachRadiusPx: 430,
    markOrbitRadiusPx: 112,
    markOrbitLeadDeg: 50,
    markExitRadiusPx: 480,
    weaveDeg: 11,
    weavePeriodSec: 6.5
  },
  reserve: {
    upwindAngleDeg: 58,
    downwindAngleDeg: 168,
    rudderGain: 0.021,
    maxRudder: 0.5,
    tackBufferPx: 210,
    markApproachRadiusPx: 405,
    markOrbitRadiusPx: 116,
    markOrbitLeadDeg: 56,
    markExitRadiusPx: 490,
    weaveDeg: 7,
    weavePeriodSec: 7.5
  }
};

const BOAT_PHASE: Record<BoatId, number> = {
  red: 0.2,
  green: 1.7,
  yellow: 3.1,
  blue: 4.4
};
const MARK_EXIT_SWEEP_DEG = 100;

export function assignAiDifficulties(boatIds: readonly BoatId[], random: () => number = Math.random): Partial<Record<BoatId, AiDifficulty>> {
  const difficulties = shuffle([...AI_DIFFICULTIES], random);
  const assignments: Partial<Record<BoatId, AiDifficulty>> = {};
  boatIds.forEach((boatId, index) => {
    if (index < difficulties.length) assignments[boatId] = difficulties[index];
  });
  return assignments;
}

export function computeAiBoatControl({
  boat,
  course,
  wind,
  difficulty,
  elapsedMs
}: {
  boat: BoatState;
  course: CourseDefinition;
  wind: WindState;
  difficulty: AiControlProfile;
  elapsedMs: number;
}): BoatControls {
  if (boat.finished) return { rudder: 0 };

  const profile = AI_PROFILES[difficulty];
  const target = aiTargetPoint(boat, course, profile, wind.directionDeg);
  const directBearing = bearingTo(boat.position, target.point);
  const desiredCourse = target.forceDirect
    ? directBearing
    : sailingCourseForTarget({
        boat,
        target: target.point,
        directBearing,
        windFromDeg: wind.directionDeg,
        profile
      });
  const weave = profile.weaveDeg === 0 ? 0 : Math.sin(elapsedMs / 1000 / profile.weavePeriodSec + BOAT_PHASE[boat.id]) * profile.weaveDeg;
  const desiredHeading = keepInsideWorld(boat, normalizeDeg(desiredCourse + weave));
  const error = signedHeadingError(boat.headingDeg, desiredHeading);
  const rudder = clamp(error * profile.rudderGain, -profile.maxRudder, profile.maxRudder);
  return { rudder };
}

function aiTargetPoint(boat: BoatState, course: CourseDefinition, profile: AiProfile, windFromDeg: number): AiTarget {
  const target = currentTarget(course, boat.legIndex);
  if (target.kind === "finish") {
    return { point: lineMidpoint(target.line.left, target.line.right) };
  }

  const mark = target.mark;
  const dist = distance(boat.position, mark.position);
  const roundingSign = mark.rounding === "port" ? -1 : 1;
  const bearingFromMark = bearingAroundMark(mark.position, boat.position);
  const trackedBearing = boat.lastMarkBearingDeg ?? bearingFromMark;
  const sweepProgress = boat.markSweepDeg * roundingSign;
  const hasEnoughSweep = boat.lastMarkBearingDeg !== undefined && sweepProgress >= MARK_EXIT_SWEEP_DEG;

  if (hasEnoughSweep) {
    return { point: safeMarkExitPoint(mark.position, bearingTo(mark.position, boat.position), boat.boatType, windFromDeg, profile.markExitRadiusPx), forceDirect: true };
  }

  if (dist > profile.markApproachRadiusPx) {
    return { point: pointAroundMark(mark.position, bearingFromMark, profile.markOrbitRadiusPx) };
  }

  return { point: pointAroundMark(mark.position, trackedBearing + roundingSign * profile.markOrbitLeadDeg, profile.markOrbitRadiusPx) };
}

function sailingCourseForTarget({
  boat,
  target,
  directBearing,
  windFromDeg,
  profile
}: {
  boat: BoatState;
  target: Vec2;
  directBearing: number;
  windFromDeg: number;
  profile: AiProfile;
}) {
  const angleToWind = angleDifferenceDeg(directBearing, windFromDeg);
  const noGo = getNoGoAngle(boat.boatType) + 2;
  const windRight = headingToVector(normalizeDeg(windFromDeg + 90));
  const targetSide = (target.x - boat.position.x) * windRight.x + (target.y - boat.position.y) * windRight.y;

  if (angleToWind < noGo) {
    return chooseWindSideCourse({
      boat,
      windFromDeg,
      targetSide,
      bufferPx: profile.tackBufferPx,
      angleDeg: profile.upwindAngleDeg
    });
  }

  if (angleToWind > 162) {
    return chooseWindSideCourse({
      boat,
      windFromDeg,
      targetSide,
      bufferPx: profile.tackBufferPx * 0.8,
      angleDeg: profile.downwindAngleDeg
    });
  }

  return directBearing;
}

function chooseWindSideCourse({
  boat,
  windFromDeg,
  targetSide,
  bufferPx,
  angleDeg
}: {
  boat: BoatState;
  windFromDeg: number;
  targetSide: number;
  bufferPx: number;
  angleDeg: number;
}) {
  const leftCourse = normalizeDeg(windFromDeg - angleDeg);
  const rightCourse = normalizeDeg(windFromDeg + angleDeg);
  if (targetSide > bufferPx) return rightCourse;
  if (targetSide < -bufferPx) return leftCourse;
  return angleDifferenceDeg(boat.headingDeg, leftCourse) < angleDifferenceDeg(boat.headingDeg, rightCourse) ? leftCourse : rightCourse;
}

function keepInsideWorld(boat: BoatState, headingDeg: number) {
  const margin = 160;
  if (boat.position.x < margin && headingPointsLeft(headingDeg)) return 90;
  if (boat.position.x > WORLD.width - margin && !headingPointsLeft(headingDeg)) return 270;
  if (boat.position.y < margin && headingPointsUp(headingDeg)) return 135;
  if (boat.position.y > WORLD.height - margin && !headingPointsUp(headingDeg)) return 45;
  return headingDeg;
}

function lineMidpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function bearingTo(from: Vec2, to: Vec2) {
  return normalizeDeg((Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI);
}

function bearingAroundMark(from: Vec2, to: Vec2) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function pointAroundMark(mark: Vec2, bearingDeg: number, radius: number): Vec2 {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    x: mark.x + Math.cos(rad) * radius,
    y: mark.y + Math.sin(rad) * radius
  };
}

function safeMarkExitPoint(mark: Vec2, exitHeadingDeg: number, boatType: BoatState["boatType"], windFromDeg: number, radius: number): Vec2 {
  const noGo = getNoGoAngle(boatType) + 14;
  const heading =
    angleDifferenceDeg(exitHeadingDeg, windFromDeg) < noGo
      ? normalizeDeg(windFromDeg + Math.sign(signedHeadingError(windFromDeg, exitHeadingDeg) || 1) * noGo)
      : exitHeadingDeg;
  const vector = headingToVector(heading);
  return {
    x: mark.x + vector.x * radius,
    y: mark.y + vector.y * radius
  };
}

function signedHeadingError(fromDeg: number, toDeg: number) {
  return ((normalizeDeg(toDeg) - normalizeDeg(fromDeg) + 540) % 360) - 180;
}

function headingPointsLeft(headingDeg: number) {
  return headingToVector(headingDeg).x < 0;
}

function headingPointsUp(headingDeg: number) {
  return headingToVector(headingDeg).y < 0;
}

function shuffle<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}
