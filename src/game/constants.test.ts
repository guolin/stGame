import { describe, expect, it } from "vitest";
import { WORLD } from "./constants";
import { COURSE_IDS, getCourse } from "../sim/course/courses";

describe("WORLD", () => {
  it("uses a large tactical playfield suitable for full-map multiplayer play", () => {
    expect(WORLD.width).toBeGreaterThanOrEqual(2600);
    expect(WORLD.height).toBeGreaterThanOrEqual(1700);
  });

  it("gives every course a long first beat from the start line to mark 1", () => {
    for (const id of COURSE_IDS) {
      const course = getCourse(id);
      const firstMark = course.marks.find((mark) => mark.id === course.legMarkIds[0])!;
      const startY = (course.startLine.left.y + course.startLine.right.y) / 2;
      expect(startY - firstMark.position.y).toBeGreaterThanOrEqual(1200);
    }
  });
});
