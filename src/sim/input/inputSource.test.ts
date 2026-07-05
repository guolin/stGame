import { describe, expect, it } from "vitest";
import { createConstantInputSource, createScriptInputSource } from "./inputSource";

describe("createConstantInputSource", () => {
  it("always returns the same rudder value", () => {
    const source = createConstantInputSource(0.4);
    expect(source.sample(0).rudder).toBe(0.4);
    expect(source.sample(500).rudder).toBe(0.4);
  });
});

describe("createScriptInputSource", () => {
  it("interpolates rudder linearly between keyframes", () => {
    const source = createScriptInputSource([
      { tick: 0, rudder: 0 },
      { tick: 100, rudder: 1 }
    ]);
    expect(source.sample(0).rudder).toBe(0);
    expect(source.sample(50).rudder).toBeCloseTo(0.5, 9);
    expect(source.sample(100).rudder).toBe(1);
  });

  it("holds the boundary values outside the scripted range", () => {
    const source = createScriptInputSource([
      { tick: 10, rudder: -0.5 },
      { tick: 20, rudder: 0.5 }
    ]);
    expect(source.sample(0).rudder).toBe(-0.5);
    expect(source.sample(99).rudder).toBe(0.5);
  });

  it("clamps rudder output to the [-1, 1] hardware range", () => {
    const source = createScriptInputSource([{ tick: 0, rudder: 3 }]);
    expect(source.sample(0).rudder).toBe(1);
  });
});
