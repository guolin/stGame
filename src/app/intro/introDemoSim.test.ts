import { describe, expect, it } from "vitest";
import {
  DEMO_BASE_WIND_DEG,
  DEMO_FIRST_SHIFT_DEG,
  DEMO_MARK,
  advanceIntroDemoMode,
  chooseAdaptiveTack,
  chooseCornerTack,
  createIntroDemoState,
  demoWindOscDeg,
  leadMeters,
  stepIntroDemo
} from "./introDemoSim";

describe("demoWindOscDeg", () => {
  it("holds steady wind during the split phase", () => {
    expect(demoWindOscDeg("split", 0)).toBe(0);
    expect(demoWindOscDeg("split", 30)).toBe(0);
  });

  it("ramps right during the first shift and caps at the target", () => {
    expect(demoWindOscDeg("shift", 0)).toBe(0);
    expect(demoWindOscDeg("shift", 2)).toBeGreaterThan(0);
    expect(demoWindOscDeg("shift", 500)).toBe(DEMO_FIRST_SHIFT_DEG);
  });

  it("starts the pendulum exactly at the first-shift angle (no jump)", () => {
    expect(demoWindOscDeg("pendulum", 0)).toBeCloseTo(DEMO_FIRST_SHIFT_DEG, 6);
  });

  it("swings back left after the pendulum starts", () => {
    const early = demoWindOscDeg("pendulum", 1);
    expect(early).toBeLessThan(DEMO_FIRST_SHIFT_DEG);
    // and it eventually crosses to the left of the base direction
    const angles = Array.from({ length: 400 }, (_, i) => demoWindOscDeg("pendulum", i * 0.1));
    expect(Math.min(...angles)).toBeLessThan(0);
  });
});

describe("mode transitions keep the wind continuous", () => {
  it("split → shift → pendulum has no discontinuity at either boundary", () => {
    let state = createIntroDemoState();
    state = stepIntroDemo(state, 4);
    expect(state.windDeg).toBeCloseTo(DEMO_BASE_WIND_DEG, 6);

    state = advanceIntroDemoMode(state);
    expect(state.mode).toBe("shift");
    const beforeRamp = state.windDeg;
    expect(beforeRamp).toBeCloseTo(DEMO_BASE_WIND_DEG, 6);

    // run the ramp to completion
    for (let i = 0; i < 20 * 60; i += 1) state = stepIntroDemo(state, 1 / 60);
    expect(state.windOscDeg).toBeCloseTo(DEMO_FIRST_SHIFT_DEG, 3);

    state = advanceIntroDemoMode(state);
    expect(state.mode).toBe("pendulum");
    const atSwitch = state.windOscDeg;
    state = stepIntroDemo(state, 1 / 60);
    expect(Math.abs(state.windOscDeg - atSwitch)).toBeLessThan(1);
  });
});

describe("chooseAdaptiveTack (tack on headers)", () => {
  const mark = DEMO_MARK;

  it("switches to starboard after a big right shift when port no longer points at the mark", () => {
    // Boat below and right of the mark, wind veered right by 25°.
    const position = { x: mark.x + 500, y: mark.y + 1000 };
    const tack = chooseAdaptiveTack({ position, currentTack: "port", windDeg: 25, mark, hysteresisDeg: 12 });
    expect(tack).toBe("starboard");
  });

  it("keeps the current tack when the mark is dead upwind (hysteresis)", () => {
    // Directly downwind of the mark with wind at base: both tacks are equal.
    const position = { x: mark.x, y: mark.y + 1000 };
    expect(chooseAdaptiveTack({ position, currentTack: "port", windDeg: 0, mark, hysteresisDeg: 12 })).toBe("port");
    expect(chooseAdaptiveTack({ position, currentTack: "starboard", windDeg: 0, mark, hysteresisDeg: 12 })).toBe("starboard");
  });
});

describe("chooseCornerTack (blue's fixed zigzag)", () => {
  it("tacks toward the middle at the arena edges and otherwise holds", () => {
    expect(chooseCornerTack(300, "starboard")).toBe("port");
    expect(chooseCornerTack(2500, "port")).toBe("starboard");
    expect(chooseCornerTack(1400, "starboard")).toBe("starboard");
    expect(chooseCornerTack(1400, "port")).toBe("port");
  });
});

describe("leadMeters", () => {
  it("is positive when red is closer to the mark, negative when further", () => {
    expect(leadMeters({ x: DEMO_MARK.x, y: DEMO_MARK.y + 800 }, { x: DEMO_MARK.x, y: DEMO_MARK.y + 1000 })).toBeGreaterThan(0);
    expect(leadMeters({ x: DEMO_MARK.x, y: DEMO_MARK.y + 1200 }, { x: DEMO_MARK.x, y: DEMO_MARK.y + 1000 })).toBeLessThan(0);
  });

  it("is zero for equidistant boats", () => {
    const red = { x: DEMO_MARK.x - 600, y: DEMO_MARK.y + 800 };
    const blue = { x: DEMO_MARK.x + 600, y: DEMO_MARK.y + 800 };
    expect(leadMeters(red, blue)).toBeCloseTo(0, 6);
  });
});

describe("full demo integration", () => {
  it("red beats blue to the mark by playing the shifts", () => {
    let state = createIntroDemoState();
    const dt = 1 / 60;

    // Split phase: boats sail apart for a few seconds.
    for (let i = 0; i < 6 * 60; i += 1) state = stepIntroDemo(state, dt);
    expect(state.red.motion.position.x).toBeGreaterThan(state.blue.motion.position.x);

    // First shift.
    state = advanceIntroDemoMode(state);
    for (let i = 0; i < 12 * 60; i += 1) state = stepIntroDemo(state, dt);
    const leadAfterFirstShift = leadMeters(state.red.motion.position, state.blue.motion.position);
    expect(leadAfterFirstShift).toBeGreaterThan(0);

    // Pendulum until red reaches the mark (bounded).
    state = advanceIntroDemoMode(state);
    for (let i = 0; i < 90 * 60 && !state.finished; i += 1) state = stepIntroDemo(state, dt);

    expect(state.finished).toBe(true);
    expect(leadMeters(state.red.motion.position, state.blue.motion.position)).toBeGreaterThan(leadAfterFirstShift);
  });
});
