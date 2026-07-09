import { describe, expect, it } from "vitest";
import { gamepadAxisToRudder, resolveDigitalRudderOverride, stepDigitalRudder } from "./gamepadControls";

describe("gamepadAxisToRudder", () => {
  it("amplifies axis 0 direction and magnitude as continuous rudder input", () => {
    expect(gamepadAxisToRudder(0.5)).toBe(1);
    expect(gamepadAxisToRudder(-0.25)).toBe(-0.65);
  });

  it("stops steering near center and clamps out-of-range values", () => {
    expect(gamepadAxisToRudder(0)).toBe(0);
    expect(gamepadAxisToRudder(0.01)).toBe(0);
    expect(gamepadAxisToRudder(2)).toBe(1);
    expect(gamepadAxisToRudder(-2)).toBe(-1);
  });
});

function pad(pressedIndexes: number[]) {
  const maxIndex = Math.max(0, ...pressedIndexes);
  const buttons = Array.from({ length: maxIndex + 1 }, (_, i) => ({ pressed: pressedIndexes.includes(i) }));
  return { buttons };
}

describe("resolveDigitalRudderOverride", () => {
  it("maps Q/E (buttons 2/3) to R1's left/right nudge on channel 0", () => {
    expect(resolveDigitalRudderOverride(pad([2]), 0)).toBe(-1);
    expect(resolveDigitalRudderOverride(pad([3]), 0)).toBe(1);
  });

  it("maps I/P, Z/C, B/M to R2/R3/R4 on channels 1-3", () => {
    expect(resolveDigitalRudderOverride(pad([4]), 1)).toBe(-1);
    expect(resolveDigitalRudderOverride(pad([5]), 1)).toBe(1);
    expect(resolveDigitalRudderOverride(pad([6]), 2)).toBe(-1);
    expect(resolveDigitalRudderOverride(pad([7]), 2)).toBe(1);
    expect(resolveDigitalRudderOverride(pad([8]), 3)).toBe(-1);
    expect(resolveDigitalRudderOverride(pad([9]), 3)).toBe(1);
  });

  it("returns 0 when neither or both nudge buttons for a channel are pressed", () => {
    expect(resolveDigitalRudderOverride(pad([]), 0)).toBe(0);
    expect(resolveDigitalRudderOverride(pad([2, 3]), 0)).toBe(0);
  });

  it("returns 0 for an unmapped channel or missing gamepad", () => {
    expect(resolveDigitalRudderOverride(pad([2]), 4)).toBe(0);
    expect(resolveDigitalRudderOverride(undefined, 0)).toBe(0);
  });
});

describe("stepDigitalRudder", () => {
  it("ramps while held so digital buttons behave like a continuous rudder", () => {
    expect(stepDigitalRudder(0, 1, 0.1)).toBeCloseTo(0.7, 6);
    expect(stepDigitalRudder(0.7, 1, 0.1)).toBe(1);
    expect(stepDigitalRudder(0, -1, 0.1)).toBeCloseTo(-0.7, 6);
  });

  it("returns smoothly to center after release", () => {
    expect(stepDigitalRudder(1, 0, 0.1)).toBeCloseTo(0.6, 6);
    expect(stepDigitalRudder(0.2, 0, 0.1)).toBe(0);
  });
});
