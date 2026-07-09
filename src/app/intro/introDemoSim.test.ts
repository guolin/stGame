import { describe, expect, it } from "vitest";
import {
  DEMO_MARK,
  DEMO_SHIFT_FROM_DEG,
  DEMO_SHIFT_TO_DEG,
  ZONE_DEMO_ZONES,
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
  it("starts left of the base direction and veers through to the right cap", () => {
    expect(demoWindOscDeg(0)).toBe(DEMO_SHIFT_FROM_DEG);
    expect(demoWindOscDeg(2)).toBe(DEMO_SHIFT_FROM_DEG);
    expect(demoWindOscDeg(10)).toBeGreaterThan(DEMO_SHIFT_FROM_DEG);
    expect(demoWindOscDeg(60)).toBe(DEMO_SHIFT_TO_DEG);
    expect(demoWindOscDeg(500)).toBe(DEMO_SHIFT_TO_DEG);
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
  it("both boats really reach the mark, red clearly first", () => {
    let state = createIntroDemoState();
    const dt = 1 / 60;

    // Boats split off the line: red right, blue left.
    for (let i = 0; i < 4 * 60; i += 1) state = stepIntroDemo(state, dt);
    expect(state.red.motion.position.x).toBeGreaterThan(state.blue.motion.position.x);

    for (let i = 0; i < 120 * 60 && !state.finished; i += 1) state = stepIntroDemo(state, dt);

    expect(state.finished).toBe(true);
    expect(state.redAtMarkSec).toBeDefined();
    expect(state.blueAtMarkSec).toBeDefined();
    expect(state.blueAtMarkSec! - state.redAtMarkSec!).toBeGreaterThan(5);
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
