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
    const finishY = (course.finishLine.left.y + course.finishLine.right.y) / 2;
    const downwindMark = course.marks.find((mark) => mark.id === "m2")!;

    expect(course.legMarkIds).toEqual(["m1", "m2", "m1"]);
    expect(downwindMark.position.y).toBeGreaterThan(startY);
    expect(finishY).toBeGreaterThan(downwindMark.position.y);
  });

  it("uses a triangle order for course 3", () => {
    expect(getCourse("triangle").legMarkIds).toEqual(["m1", "m2", "m3"]);
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
