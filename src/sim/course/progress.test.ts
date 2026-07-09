import { describe, expect, it } from "vitest";
import { advanceLeg, currentTarget, isOnFinalLeg } from "./progress";
import { getCourse } from "./courses";

const course = getCourse("windwardLeeward");

describe("course progress", () => {
  it("targets the marks in leg order and the finish line at the end", () => {
    expect(currentTarget(course, 0)).toEqual({ kind: "mark", mark: course.marks.find((m) => m.id === course.legMarkIds[0]) });
    expect(currentTarget(course, 1)).toEqual({ kind: "mark", mark: course.marks.find((m) => m.id === course.legMarkIds[1]) });
    expect(currentTarget(course, 2)).toEqual({ kind: "mark", mark: course.marks.find((m) => m.id === course.legMarkIds[2]) });
    expect(currentTarget(course, 3)).toEqual({ kind: "finish", line: course.finishLine });
  });

  it("advances the leg when the boat passes near the current mark", () => {
    const mark = course.marks.find((m) => m.id === course.legMarkIds[0])!;
    const near = { x: mark.position.x + 10, y: mark.position.y + 10 };
    expect(advanceLeg(course, 0, near)).toBe(1);
  });

  it("does not advance when the boat is near a later mark than its current target", () => {
    const laterMark = course.marks.find((m) => m.id === course.legMarkIds[1])!;
    const nearLater = { x: laterMark.position.x, y: laterMark.position.y };
    expect(advanceLeg(course, 0, nearLater)).toBe(0);
  });

  it("reports the final leg only after all marks are rounded", () => {
    expect(isOnFinalLeg(course, 0)).toBe(false);
    expect(isOnFinalLeg(course, course.legMarkIds.length)).toBe(true);
  });
});
