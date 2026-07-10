import { describe, expect, it } from "vitest";
import { gamepadAxisToRudder, normalizeGamepadAxis, resolveAnalogRudder, resolveControllerPad, resolveDigitalRudderOverride, stepDigitalRudder } from "./gamepadControls";

describe("gamepadAxisToRudder", () => {
  it("normalizes browser -1..1 axes and raw -100..100 ADV axes", () => {
    expect(normalizeGamepadAxis(0.5)).toBe(0.5);
    expect(normalizeGamepadAxis(-0.5)).toBe(-0.5);
    expect(normalizeGamepadAxis(50)).toBe(0.5);
    expect(normalizeGamepadAxis(-50)).toBe(-0.5);
  });

  it("reverses and eases steering exponentially after the deadzone instead of saturating early", () => {
    expect(gamepadAxisToRudder(0.2)).toBe(0);
    expect(gamepadAxisToRudder(20)).toBe(0);
    expect(gamepadAxisToRudder(50)).toBeCloseTo(-0.052734375, 6);
    expect(gamepadAxisToRudder(60)).toBeCloseTo(-0.125, 6);
    expect(gamepadAxisToRudder(-60)).toBeCloseTo(0.125, 6);
    expect(gamepadAxisToRudder(100)).toBe(-1);
    expect(gamepadAxisToRudder(-100)).toBe(1);
  });

  it("stops steering near center and clamps out-of-range values", () => {
    expect(gamepadAxisToRudder(0)).toBe(0);
    expect(gamepadAxisToRudder(0.19)).toBe(0);
    expect(gamepadAxisToRudder(-0.19)).toBe(0);
    expect(gamepadAxisToRudder(100)).toBe(-1);
    expect(gamepadAxisToRudder(-100)).toBe(1);
  });
});

function pad(pressedIndexes: number[]) {
  const maxIndex = Math.max(0, ...pressedIndexes);
  const buttons = Array.from({ length: maxIndex + 1 }, (_, i) => ({ pressed: pressedIndexes.includes(i) }));
  return { buttons };
}

function controller(axes: number[], pressedIndexes: number[] = []) {
  return { axes, buttons: pad(pressedIndexes).buttons, connected: true };
}

describe("resolveDigitalRudderOverride", () => {
  it("maps Q/E (buttons 2/3) to R1's left/right nudge on channel 0", () => {
    expect(resolveDigitalRudderOverride(pad([2]), 0)).toBe(1);
    expect(resolveDigitalRudderOverride(pad([3]), 0)).toBe(-1);
  });

  it("maps I/P, Z/C, B/M to R2/R3/R4 on channels 1-3", () => {
    expect(resolveDigitalRudderOverride(pad([4]), 1)).toBe(1);
    expect(resolveDigitalRudderOverride(pad([5]), 1)).toBe(-1);
    expect(resolveDigitalRudderOverride(pad([6]), 2)).toBe(1);
    expect(resolveDigitalRudderOverride(pad([7]), 2)).toBe(-1);
    expect(resolveDigitalRudderOverride(pad([8]), 3)).toBe(1);
    expect(resolveDigitalRudderOverride(pad([9]), 3)).toBe(-1);
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

describe("resolveControllerPad", () => {
  it("uses one Gamepad per boat when enough individual controllers are connected", () => {
    const pads = [controller([0.1]), controller([0.2]), controller([0.3]), controller([0.4])];
    expect(resolveControllerPad(pads, 2, 4)).toEqual({ pad: pads[2], localChannel: 0 });
    expect(resolveAnalogRudder(pads, 2, 4)).toBeCloseTo(-0.001953125, 6);
  });

  it("splits two ADV terminals into two local channels each for four boats", () => {
    const pads = [controller([0.1, 0.2]), controller([0.3, 0.4])];
    expect(resolveControllerPad(pads, 0, 4)).toEqual({ pad: pads[0], localChannel: 0 });
    expect(resolveControllerPad(pads, 1, 4)).toEqual({ pad: pads[0], localChannel: 1 });
    expect(resolveControllerPad(pads, 2, 4)).toEqual({ pad: pads[1], localChannel: 0 });
    expect(resolveControllerPad(pads, 3, 4)).toEqual({ pad: pads[1], localChannel: 1 });
    expect(resolveAnalogRudder(pads, 3, 4)).toBeCloseTo(-0.015625, 6);
  });

  it("keeps a single four-channel ADV compatible with all four boats", () => {
    const pads = [controller([0.1, 0.2, 0.3, 0.4])];
    expect(resolveControllerPad(pads, 3, 4)).toEqual({ pad: pads[0], localChannel: 3 });
    expect(resolveAnalogRudder(pads, 2, 4)).toBeCloseTo(-0.001953125, 6);
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
