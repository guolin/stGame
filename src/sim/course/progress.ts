import type { LineSegment, Vec2 } from "../../game/types";
import { distance } from "../../game/utils/math";
import type { CourseDefinition, CourseMark } from "./types";

export const MARK_ROUNDING_RADIUS = 62;

export type LegTarget = { kind: "mark"; mark: CourseMark } | { kind: "finish"; line: LineSegment };

export function currentTarget(course: CourseDefinition, legIndex: number): LegTarget {
  if (legIndex < course.legMarkIds.length) {
    const markId = course.legMarkIds[legIndex];
    const mark = course.marks.find((item) => item.id === markId)!;
    return { kind: "mark", mark };
  }
  return { kind: "finish", line: course.finishLine };
}

export function isOnFinalLeg(course: CourseDefinition, legIndex: number): boolean {
  return legIndex >= course.legMarkIds.length;
}

export function advanceLeg(course: CourseDefinition, legIndex: number, position: Vec2): number {
  const target = currentTarget(course, legIndex);
  if (target.kind !== "mark") return legIndex;
  if (distance(position, target.mark.position) <= MARK_ROUNDING_RADIUS) return legIndex + 1;
  return legIndex;
}
