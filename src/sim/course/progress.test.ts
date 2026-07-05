import { describe, expect, it } from "vitest";
import { advanceLeg, currentTarget, isOnFinalLeg } from "./progress";
import { getCourse } from "./courses";

const io = getCourse("io");

describe("course progress", () => {
  it("targets the marks in leg order and the finish line at the end", () => {
    expect(currentTarget(io, 0)).toEqual({ kind: "mark", mark: io.marks.find((m) => m.id === io.legMarkIds[0]) });
    expect(currentTarget(io, 1)).toEqual({ kind: "mark", mark: io.marks.find((m) => m.id === io.legMarkIds[1]) });
    expect(currentTarget(io, 2)).toEqual({ kind: "finish", line: io.finishLine });
  });

  it("advances the leg when the boat passes near the current mark", () => {
    const mark = io.marks.find((m) => m.id === io.legMarkIds[0])!;
    const near = { x: mark.position.x + 10, y: mark.position.y + 10 };
    expect(advanceLeg(io, 0, near)).toBe(1);
  });

  it("does not advance when the boat is near a later mark than its current target", () => {
    const laterMark = io.marks.find((m) => m.id === io.legMarkIds[1])!;
    const nearLater = { x: laterMark.position.x, y: laterMark.position.y };
    expect(advanceLeg(io, 0, nearLater)).toBe(0);
  });

  it("reports the final leg only after all marks are rounded", () => {
    expect(isOnFinalLeg(io, 0)).toBe(false);
    expect(isOnFinalLeg(io, io.legMarkIds.length)).toBe(true);
  });
});
