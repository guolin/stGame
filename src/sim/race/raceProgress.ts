import type { BoatState, LineSegment, RaceEvent, Vec2 } from "../../game/types";
import { distance } from "../../game/utils/math";
import type { CourseDefinition } from "../course/types";
import { currentTarget, isOnFinalLeg } from "../course/progress";

export type RaceProgressInput = {
  boat: BoatState;
  prevPosition: Vec2;
  course: CourseDefinition;
  elapsedMs: number;
  /** True only on the tick the starting signal fires. */
  startSignal: boolean;
};

export type RaceProgressResult = {
  boat: BoatState;
  events: RaceEvent[];
};

/** Radius around a mark inside which the rounding sweep is tracked. */
const ROUNDING_TRACK_RADIUS = 170;
/** Bearing sweep (degrees) required to count as having rounded the mark. */
const ROUNDING_SWEEP_DEG = 90;

export function updateBoatRace({ boat, prevPosition, course, elapsedMs, startSignal }: RaceProgressInput): RaceProgressResult {
  const events: RaceEvent[] = [];
  let next = boat;

  const emit = (kind: RaceEvent["kind"], message: string) => {
    events.push({ id: `${kind}-${boat.id}-${Math.round(elapsedMs)}`, timeMs: elapsedMs, kind, boatId: boat.id, message });
  };

  // --- starting signal: anyone on the course side is OCS ---
  if (startSignal && next.startStatus === "prestart" && isOnCourseSide(next.position, course.startLine)) {
    next = { ...next, startStatus: "ocs" };
    emit("ocs", `${boat.name} 抢航（OCS），必须回到起航线后重新起航`);
  }

  if (next.startStatus === "ocs") {
    if (!isOnCourseSide(next.position, course.startLine)) {
      next = { ...next, startStatus: "prestart" };
      emit("ocs-cleared", `${boat.name} 已回到起航线后，可以重新起航`);
    }
    return { boat: next, events };
  }

  if (next.startStatus === "prestart") {
    if (!startSignal && crossesLineUpward(prevPosition, next.position, course.startLine)) {
      next = { ...next, startStatus: "started" };
      emit("start", `${boat.name} 起航`);
    }
    return { boat: next, events };
  }

  // --- started: mark rounding with direction check ---
  if (next.finished) return { boat: next, events };

  const target = currentTarget(course, next.legIndex);
  if (target.kind === "mark") {
    const mark = target.mark;
    const dist = distance(next.position, mark.position);

    if (dist <= ROUNDING_TRACK_RADIUS) {
      const bearing = bearingDeg(mark.position, next.position);
      const lastBearing = next.lastMarkBearingDeg;
      const delta = lastBearing === undefined ? 0 : signedAngleDelta(lastBearing, bearing);
      next = { ...next, markSweepDeg: next.markSweepDeg + delta, lastMarkBearingDeg: bearing };
    } else if (next.lastMarkBearingDeg !== undefined) {
      const requiredSign = mark.rounding === "port" ? -1 : 1;
      const rounded = next.markSweepDeg * requiredSign >= ROUNDING_SWEEP_DEG;
      if (rounded) {
        next = { ...next, legIndex: next.legIndex + 1, markSweepDeg: 0, lastMarkBearingDeg: undefined };
        emit("mark", `${boat.name} 绕过 ${mark.label}`);
      } else {
        next = { ...next, markSweepDeg: 0, lastMarkBearingDeg: undefined };
      }
    }
    return { boat: next, events };
  }

  // --- final leg: finish crossing ---
  if (isOnFinalLeg(course, next.legIndex) && crossesLineDownward(prevPosition, next.position, course.finishLine)) {
    next = { ...next, finished: true };
    emit("finish", `${boat.name} 冲过终点`);
  }

  return { boat: next, events };
}

/** Course side is above the line (marks are upwind of the start). */
function isOnCourseSide(position: Vec2, line: LineSegment): boolean {
  return position.y < lineYAt(line);
}

function lineYAt(line: LineSegment): number {
  return (line.left.y + line.right.y) / 2;
}

function withinLineSpan(position: Vec2, line: LineSegment): boolean {
  const minX = Math.min(line.left.x, line.right.x);
  const maxX = Math.max(line.left.x, line.right.x);
  return position.x >= minX && position.x <= maxX;
}

function crossesLineUpward(prev: Vec2, pos: Vec2, line: LineSegment): boolean {
  const y = lineYAt(line);
  return prev.y >= y && pos.y < y && withinLineSpan(pos, line);
}

function crossesLineDownward(prev: Vec2, pos: Vec2, line: LineSegment): boolean {
  const y = lineYAt(line);
  return prev.y <= y && pos.y > y && withinLineSpan(pos, line);
}

function bearingDeg(from: Vec2, to: Vec2): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function signedAngleDelta(fromDeg: number, toDeg: number): number {
  let delta = toDeg - fromDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}
