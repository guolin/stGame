import { describe, expect, it } from "vitest";
import { COURSE_IDS, getCourse } from "./courses";

describe("course definitions", () => {
  it("provides the four PRD courses", () => {
    expect(COURSE_IDS).toEqual(["simple", "io", "triangle", "complex4"]);
  });

  it("gives each course the documented number of marks", () => {
    expect(getCourse("simple").marks).toHaveLength(1);
    expect(getCourse("io").marks).toHaveLength(2);
    expect(getCourse("triangle").marks).toHaveLength(3);
    expect(getCourse("complex4").marks).toHaveLength(4);
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
