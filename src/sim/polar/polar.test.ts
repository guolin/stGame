import { describe, expect, it } from "vitest";
import { getNoGoAngle, getPolarSpeed } from "./polar";

describe("getPolarSpeed", () => {
  it("returns near-zero speed dead upwind for every boat type", () => {
    expect(getPolarSpeed("op", 12, 0)).toBe(0);
    expect(getPolarSpeed("topper", 12, 0)).toBe(0);
  });

  it("gives very low speed inside the no-go zone", () => {
    const inNoGo = getPolarSpeed("op", 12, 25);
    const beam = getPolarSpeed("op", 12, 90);
    expect(inNoGo).toBeLessThan(beam * 0.25);
  });

  it("is fastest around a beam reach and slower dead downwind", () => {
    const beam = getPolarSpeed("op", 12, 90);
    const closeHauled = getPolarSpeed("op", 12, 45);
    const run = getPolarSpeed("op", 12, 180);
    expect(beam).toBeGreaterThan(closeHauled);
    expect(beam).toBeGreaterThan(run);
  });

  it("goes faster in more wind", () => {
    expect(getPolarSpeed("op", 16, 90)).toBeGreaterThan(getPolarSpeed("op", 8, 90));
  });

  it("interpolates between table nodes in both dimensions", () => {
    const low = getPolarSpeed("op", 8, 90);
    const high = getPolarSpeed("op", 12, 90);
    const mid = getPolarSpeed("op", 10, 90);
    expect(mid).toBeGreaterThan(low);
    expect(mid).toBeLessThan(high);

    const a = getPolarSpeed("op", 12, 90);
    const b = getPolarSpeed("op", 12, 110);
    const between = getPolarSpeed("op", 12, 100);
    expect(between).toBeLessThanOrEqual(Math.max(a, b));
    expect(between).toBeGreaterThanOrEqual(Math.min(a, b));
  });

  it("clamps wind speed and angle outside the table instead of extrapolating", () => {
    expect(getPolarSpeed("op", 40, 90)).toBeCloseTo(getPolarSpeed("op", 20, 90), 9);
    expect(getPolarSpeed("op", 12, 200)).toBeCloseTo(getPolarSpeed("op", 12, 180), 9);
  });

  it("makes the topper faster than the op in the same conditions", () => {
    expect(getPolarSpeed("topper", 12, 90)).toBeGreaterThan(getPolarSpeed("op", 12, 90));
  });
});

describe("getNoGoAngle", () => {
  it("is between 40 and 45 degrees for the teaching dinghies", () => {
    expect(getNoGoAngle("op")).toBeGreaterThanOrEqual(40);
    expect(getNoGoAngle("op")).toBeLessThanOrEqual(45);
    expect(getNoGoAngle("topper")).toBeGreaterThanOrEqual(40);
    expect(getNoGoAngle("topper")).toBeLessThanOrEqual(45);
  });
});
