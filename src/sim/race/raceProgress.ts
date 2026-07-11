import type { BoatState, LineSegment, RaceEvent, Vec2 } from "../../game/types";
import { distance, headingToVector } from "../../game/utils/math";
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
const MARK_TOUCH_RADIUS = 23;
/** Minimal bearing sweep that proves the boat passed the mark on the required side. */
const ROUNDING_PASS_SWEEP_DEG = 45;
const BOW_OFFSET_PX = 48;
const MARK_TOUCH_PENALTY_MS = 3000;

export function updateBoatRace({ boat, prevPosition, course, elapsedMs, startSignal }: RaceProgressInput): RaceProgressResult {
  const events: RaceEvent[] = [];
  let next = boat;
  const prevBow = bowPosition(next, prevPosition);
  const bow = bowPosition(next);

  const emit = (kind: RaceEvent["kind"], message: string) => {
    events.push({ id: `${kind}-${boat.id}-${Math.round(elapsedMs)}`, timeMs: elapsedMs, kind, boatId: boat.id, message });
  };

  // --- starting signal: anyone on the course side is OCS ---
  if (startSignal && next.startStatus === "prestart" && isOnCourseSide(bow, course.startLine)) {
    next = { ...next, startStatus: "ocs" };
    emit("ocs", `${boat.name} 抢航（OCS），必须回到起航线后重新起航`);
  }

  if (next.startStatus === "ocs") {
    if (!isOnCourseSide(bow, course.startLine)) {
      next = { ...next, startStatus: "prestart" };
      emit("ocs-cleared", `${boat.name} 已回到起航线后，可以重新起航`);
    }
    return { boat: next, events };
  }

  if (next.startStatus === "prestart") {
    if (!startSignal && crossesLineUpward(prevBow, bow, course.startLine)) {
      next = { ...next, startStatus: "started" };
      emit("start", `${boat.name} 起航`);
    }
    return { boat: next, events };
  }

  // --- started: mark rounding with normal race-side check ---
  if (next.finished) return { boat: next, events };

  const target = currentTarget(course, next.legIndex);
  if (target.kind === "mark") {
    const mark = target.mark;
    const dist = distance(next.position, mark.position);

    if (dist <= MARK_TOUCH_RADIUS) {
      const alreadyPenalized = Boolean(next.penaltyUntilMs && next.penaltyUntilMs > elapsedMs);
      next = {
        ...next,
        markSweepDeg: 0,
        lastMarkBearingDeg: undefined,
        markEntrySide: undefined,
        touchedMarkId: mark.id
      };
      if (!alreadyPenalized) {
        next = {
          ...next,
          speed: next.speed * 0.25,
          penaltyCount: next.penaltyCount + 1,
          penaltyUntilMs: elapsedMs + MARK_TOUCH_PENALTY_MS
        };
        emit("rule", `${boat.name} 碰到 ${mark.label}，绕标不算，需重新按规定一侧绕标`);
      }
      return { boat: next, events };
    }

    if (dist <= ROUNDING_TRACK_RADIUS) {
      const bearing = bearingDeg(mark.position, next.position);
      const lastBearing = next.lastMarkBearingDeg;
      const delta = lastBearing === undefined ? 0 : signedAngleDelta(lastBearing, bearing);
      next = {
        ...next,
        markSweepDeg: next.markSweepDeg + delta,
        lastMarkBearingDeg: bearing,
        markEntrySide: next.markEntrySide ?? sideOfMark(next.position, mark.position),
        touchedMarkId: next.touchedMarkId === mark.id ? mark.id : undefined
      };
    } else if (next.lastMarkBearingDeg !== undefined) {
      const requiredSign = mark.rounding === "port" ? -1 : 1;
      const exitedLeft = sideOfMark(next.position, mark.position) === "left";
      const enteredRight = next.markEntrySide === "right";
      const rounded = enteredRight && exitedLeft && next.markSweepDeg * requiredSign >= ROUNDING_PASS_SWEEP_DEG && next.touchedMarkId !== mark.id;
      if (rounded) {
        next = {
          ...next,
          legIndex: next.legIndex + 1,
          markSweepDeg: 0,
          lastMarkBearingDeg: undefined,
          markEntrySide: undefined,
          touchedMarkId: undefined
        };
        emit("mark", `${boat.name} 绕过 ${mark.label}`);
      } else {
        next = { ...next, markSweepDeg: 0, lastMarkBearingDeg: undefined, markEntrySide: undefined, touchedMarkId: undefined };
      }
    }
    return { boat: next, events };
  }

  // --- final leg: finish crossing ---
  if (isOnFinalLeg(course, next.legIndex) && crossesLine(prevPosition, next.position, course.finishLine)) {
    next = { ...next, finished: true };
    emit("finish", `${boat.name} 冲过终点`);
  }

  return { boat: next, events };
}

function bowPosition(boat: BoatState, position = boat.position): Vec2 {
  const forward = headingToVector(boat.headingDeg);
  return {
    x: position.x + forward.x * BOW_OFFSET_PX,
    y: position.y + forward.y * BOW_OFFSET_PX
  };
}

function sideOfMark(position: Vec2, mark: Vec2): "left" | "right" {
  return position.x < mark.x ? "left" : "right";
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

function crossesLine(prev: Vec2, pos: Vec2, line: LineSegment): boolean {
  return (crossesLineUpward(prev, pos, line) || crossesLineDownward(prev, pos, line)) && withinLineSpan(pos, line);
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
