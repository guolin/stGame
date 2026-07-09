import { describe, expect, it } from "vitest";
import { COURSE_IDS, getCourse } from "./courses";

describe("course definitions", () => {
  it("provides the three race courses", () => {
    expect(COURSE_IDS).toEqual(["simple", "windwardLeeward", "ioTwoLap"]);
  });

  it("gives each course the documented number of marks", () => {
    expect(getCourse("simple").marks).toHaveLength(1);
    expect(getCourse("windwardLeeward").marks).toHaveLength(3);
    expect(getCourse("ioTwoLap").marks).toHaveLength(2);
  });

  it("places course 2 mark 3 below the starting line with a downwind finish", () => {
    const course = getCourse("windwardLeeward");
    const startY = (course.startLine.left.y + course.startLine.right.y) / 2;
    const finishY = (course.finishLine.left.y + course.finishLine.right.y) / 2;
    const mark3 = course.marks.find((mark) => mark.id === "m3")!;

    expect(course.legMarkIds).toEqual(["m1", "m2", "m3"]);
    expect(mark3.position.y).toBeGreaterThan(startY);
    expect(finishY).toBeGreaterThan(mark3.position.y);
  });

  it("uses a two-lap IO order for course 3", () => {
    expect(getCourse("ioTwoLap").legMarkIds).toEqual(["m1", "m2", "m1", "m2"]);
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
