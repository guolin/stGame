import { describe, expect, it } from "vitest";
import { splitFrameIntoSteps } from "./loop";

describe("splitFrameIntoSteps", () => {
  it("accumulates frame time and emits whole fixed steps plus a remainder", () => {
    const simDt = 1 / 60;
    const first = splitFrameIntoSteps(0, 0.02, simDt);
    expect(first.steps).toBe(1);
    expect(first.remainder).toBeCloseTo(0.02 - simDt, 9);

    const second = splitFrameIntoSteps(first.remainder, 0.01, simDt);
    expect(second.steps).toBe(0);
    expect(second.remainder).toBeCloseTo(first.remainder + 0.01, 9);
  });

  it("caps runaway frames so a long stall cannot trigger a spiral of death", () => {
    const simDt = 1 / 60;
    const result = splitFrameIntoSteps(0, 2.5, simDt, 5);
    expect(result.steps).toBe(5);
    expect(result.remainder).toBe(0);
  });
});
