import { describe, expect, it } from "vitest";
import { COURSE_IDS, getCourse } from "./courses";

describe("course definitions", () => {
  it("provides the three race courses", () => {
    expect(COURSE_IDS).toEqual(["simple", "windwardLeeward", "triangle"]);
  });

  it("gives each course the documented number of marks", () => {
    expect(getCourse("simple").marks).toHaveLength(1);
    expect(getCourse("windwardLeeward").marks).toHaveLength(2);
    expect(getCourse("triangle").marks).toHaveLength(3);
  });

  it("uses an upwind/downwind/upwind order for course 2", () => {
    const course = getCourse("windwardLeeward");
    const startY = (course.startLine.left.y + course.startLine.right.y) / 2;
    const mark1 = course.marks.find((mark) => mark.id === "m1")!;
    const mark4 = course.marks.find((mark) => mark.id === "m4")!;

    expect(course.legMarkIds).toEqual(["m1", "m4", "m1"]);
    expect(mark4.position.y).toBeGreaterThan(mark1.position.y);
    expect(mark4.position.y).toBeGreaterThan(startY);
  });

  it("uses a triangle order for course 3", () => {
    expect(getCourse("triangle").legMarkIds).toEqual(["m1", "m2", "m3", "m2", "m3"]);
  });

  it("uses one shared start and finish line on every course", () => {
    for (const id of COURSE_IDS) {
      const course = getCourse(id);
      expect(course.finishLine).toEqual(course.startLine);
    }
  });

  it("uses numeric mark labels with the number first", () => {
    expect(getCourse("simple").marks.map((mark) => mark.label)).toEqual(["1标"]);
    expect(getCourse("windwardLeeward").marks.map((mark) => mark.label)).toEqual(["1标", "4标"]);
    expect(getCourse("triangle").marks.map((mark) => mark.label)).toEqual(["1标", "2标", "3标"]);
  });

  it("places the triangle course in the lower-right area with mark 1 above mark 2 and mark 3 below mark 2", () => {
    const course = getCourse("triangle");
    const startCenter = {
      x: (course.startLine.left.x + course.startLine.right.x) / 2,
      y: (course.startLine.left.y + course.startLine.right.y) / 2
    };
    const mark1 = course.marks.find((mark) => mark.id === "m1")!;
    const mark2 = course.marks.find((mark) => mark.id === "m2")!;
    const mark3 = course.marks.find((mark) => mark.id === "m3")!;

    expect(startCenter.x).toBeGreaterThan(2800 * 0.6);
    expect(startCenter.y).toBeGreaterThan(1800 * 0.7);
    expect(mark1.position.x).toBe(startCenter.x);
    expect(mark1.position.y).toBeLessThan(mark2.position.y);
    expect(mark2.position.x).toBeCloseTo(2800 / 3, 0);
    expect(bearingDeg(mark1.position, mark2.position)).toBeCloseTo(260, 0);
    expect(mark3.position.x).toBe(mark2.position.x);
    expect(mark3.position.y).toBeGreaterThan(mark2.position.y);
    expect(mark3.position.y).toBeGreaterThan(1800 * 0.7);
  });

  it("only references defined marks in the leg order", () => {
    for (const id of COURSE_IDS) {
      const course = getCourse(id);
      const markIds = new Set(course.marks.map((mark) => mark.id));
      for (const legMarkId of course.legMarkIds) {
        expect(markIds.has(legMarkId)).toBe(true);
      }
    }
  });

  it("provides four spawn points per course, all on the pre-start side of the line", () => {
    for (const id of COURSE_IDS) {
      const course = getCourse(id);
      expect(course.spawnPoints).toHaveLength(4);
      const lineY = (course.startLine.left.y + course.startLine.right.y) / 2;
      for (const spawn of course.spawnPoints) {
        expect(spawn.position.y).toBeGreaterThan(lineY);
      }
    }
  });
});

function bearingDeg(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (Math.atan2(dx, -dy) * 180) / Math.PI + 360;
}
