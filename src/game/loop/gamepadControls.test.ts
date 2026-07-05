import { describe, expect, it } from "vitest";
import { gamepadAxisToRudder } from "./gamepadControls";

describe("gamepadAxisToRudder", () => {
  it("amplifies axis 0 direction and magnitude as continuous rudder input", () => {
    expect(gamepadAxisToRudder(0.5)).toBe(0.8);
    expect(gamepadAxisToRudder(-0.25)).toBe(-0.4);
  });

  it("stops steering near center and clamps out-of-range values", () => {
    expect(gamepadAxisToRudder(0)).toBe(0);
    expect(gamepadAxisToRudder(0.04)).toBe(0);
    expect(gamepadAxisToRudder(2)).toBe(1);
    expect(gamepadAxisToRudder(-2)).toBe(-1);
  });
});
