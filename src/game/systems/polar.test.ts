import { describe, expect, it } from "vitest";
import { polarMultiplier } from "./polar";

describe("polarMultiplier", () => {
  it("returns fast beam reach and slower downwind speeds", () => {
    expect(polarMultiplier(90)).toBeCloseTo(1);
    expect(polarMultiplier(180)).toBeCloseTo(0.7);
  });

  it("interpolates between table angles", () => {
    expect(polarMultiplier(75)).toBeCloseTo(0.925);
  });

  it("penalizes the no-go zone near the wind", () => {
    expect(polarMultiplier(10)).toBeCloseTo(0.043, 2);
  });
});
