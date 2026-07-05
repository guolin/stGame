import { describe, expect, it } from "vitest";
import { currentAt } from "./currentSystem";

describe("currentAt", () => {
  it("adds vectors from overlapping current zones", () => {
    const current = currentAt(
      { x: 110, y: 110 },
      [
        { id: "left", center: { x: 100, y: 100 }, radius: 40, vector: { x: 12, y: 0 } },
        { id: "up", center: { x: 120, y: 120 }, radius: 40, vector: { x: 0, y: -8 } }
      ]
    );

    expect(current).toEqual({ x: 12, y: -8 });
  });

  it("returns still water outside current zones", () => {
    expect(currentAt({ x: 500, y: 500 }, [])).toEqual({ x: 0, y: 0 });
  });
});
