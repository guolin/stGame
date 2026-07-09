import { describe, expect, it } from "vitest";
import {
  DEMO_BASE_WIND_DEG,
  DEMO_FIRST_SHIFT_DEG,
  DEMO_MARK,
  ZONE_DEMO_ZONES,
  advanceIntroDemoMode,
  boatSpeedKnots,
  chooseAdaptiveTack,
  chooseCornerTack,
  createIntroDemoState,
  createZoneDemoState,
  demoWindOscDeg,
  leadMeters,
  localWindAt,
  stepIntroDemo,
  stepZoneDemo
} from "./introDemoSim";

describe("demoWindOscDeg", () => {
  it("holds steady wind during the split phase", () => {
    expect(demoWindOscDeg("split", 0)).toBe(0);
    expect(demoWindOscDeg("split", 30)).toBe(0);
  });

  it("ramps right during the shift, caps at the target and stays there", () => {
    expect(demoWindOscDeg("shift", 0)).toBe(0);
    expect(demoWindOscDeg("shift", 2)).toBeGreaterThan(0);
    expect(demoWindOscDeg("shift", 60)).toBe(DEMO_FIRST_SHIFT_DEG);
    expect(demoWindOscDeg("shift", 500)).toBe(DEMO_FIRST_SHIFT_DEG);
  });
});

describe("mode transition keeps the wind continuous", () => {
  it("split → shift starts the ramp from the base direction", () => {
    let state = createIntroDemoState();
    state = stepIntroDemo(state, 4);
    expect(state.windDeg).toBeCloseTo(DEMO_BASE_WIND_DEG, 6);

    state = advanceIntroDemoMode(state);
    expect(state.mode).toBe("shift");
    expect(state.windDeg).toBeCloseTo(DEMO_BASE_WIND_DEG, 6);

    state = stepIntroDemo(state, 1 / 60);
    expect(Math.abs(state.windOscDeg)).toBeLessThan(1);
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

describe("shift demo integration", () => {
  it("red beats blue to the mark by playing the single shift", () => {
    let state = createIntroDemoState();
    const dt = 1 / 60;

    // Split phase: boats sail apart for a few seconds.
    for (let i = 0; i < 6 * 60; i += 1) state = stepIntroDemo(state, dt);
    expect(state.red.motion.position.x).toBeGreaterThan(state.blue.motion.position.x);

    // Single persistent shift, then sail it out to the mark.
    state = advanceIntroDemoMode(state);
    for (let i = 0; i < 120 * 60 && !state.finished; i += 1) state = stepIntroDemo(state, dt);

    expect(state.finished).toBe(true);
    expect(leadMeters(state.red.motion.position, state.blue.motion.position)).toBeGreaterThan(15);
  });
});

describe("zone demo integration", () => {
  it("the strong zone is stronger and lifted, the soft patch is soft", () => {
    const strong = localWindAt(ZONE_DEMO_ZONES, { x: 1960, y: 900 });
    const soft = localWindAt(ZONE_DEMO_ZONES, { x: 740, y: 900 });
    expect(strong.speedKnots).toBeGreaterThan(14);
    expect(soft.speedKnots).toBeLessThan(8);
  });

  it("red's planned route through the strong zone wins clearly", () => {
    let state = createZoneDemoState();
    const dt = 1 / 60;

    let sampledSpeedGap = 0;
    for (let i = 0; i < 120 * 60 && !state.finished; i += 1) {
      state = stepZoneDemo(state, dt);
      if (i === 8 * 60) sampledSpeedGap = boatSpeedKnots(state.red) - boatSpeedKnots(state.blue);
    }

    expect(state.finished).toBe(true);
    // Mid-race red should be visibly faster, and the finish gap should be big.
    expect(sampledSpeedGap).toBeGreaterThan(1);
    expect(leadMeters(state.red.motion.position, state.blue.motion.position)).toBeGreaterThan(12);
  });
});
