import { describe, expect, it } from "vitest";
import { createBoatMotionState, stepBoatPhysics } from "./boatPhysics";
import type { BoatPhysicsInput } from "./boatPhysics";
import { PIXELS_PER_KNOT } from "./units";

const calmWind = { directionDeg: 0, speedKnots: 12 };

function makeInput(overrides: Partial<BoatPhysicsInput> = {}): BoatPhysicsInput {
  return {
    motion: createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 90 }),
    rudder: 0,
    boatType: "op",
    wind: calmWind,
    current: { x: 0, y: 0 },
    penaltyFactor: 1,
    dt: 1 / 60,
    ...overrides
  };
}

function run(input: BoatPhysicsInput, seconds: number) {
  let motion = input.motion;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    motion = stepBoatPhysics({ ...input, motion });
  }
  return motion;
}

describe("rudder model", () => {
  it("deflects toward the command and returns to center when released", () => {
    const held = run(makeInput({ rudder: 1 }), 1);
    expect(held.rudderAngleDeg).toBeGreaterThan(20);

    const released = run(makeInput({ motion: held, rudder: 0 }), 1.5);
    expect(Math.abs(released.rudderAngleDeg)).toBeLessThan(2);
  });

  it("turns faster at higher boat speed for the same rudder angle", () => {
    const slow = createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 90, speed: 4 });
    const fast = createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 90, speed: 5 * PIXELS_PER_KNOT });

    const slowTurned = run(makeInput({ motion: slow, rudder: 1 }), 1);
    const fastTurned = run(makeInput({ motion: fast, rudder: 1 }), 1);

    const slowDelta = Math.abs(slowTurned.headingDeg - 90);
    const fastDelta = Math.abs(fastTurned.headingDeg - 90);
    expect(fastDelta).toBeGreaterThan(slowDelta * 1.4);
  });
});

describe("wind and polar", () => {
  it("stalls a boat pointed dead upwind", () => {
    const moving = createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 0, speed: 4 * PIXELS_PER_KNOT });
    const stalled = run(makeInput({ motion: moving }), 6);
    expect(stalled.speed).toBeLessThan(1 * PIXELS_PER_KNOT);
    expect(stalled.twaDeg).toBeCloseTo(0, 5);
  });

  it("accelerates to polar target speed on a beam reach", () => {
    const settled = run(makeInput(), 15);
    const stwKnots = settled.speed / PIXELS_PER_KNOT;
    expect(stwKnots).toBeGreaterThan(3.4);
    expect(stwKnots).toBeLessThan(5.2);
    expect(settled.twaDeg).toBeCloseTo(90, 5);
  });

  it("reports the tack from the wind side: wind from the right bow means starboard tack", () => {
    const east = run(makeInput(), 0.1); // heading 90, wind from 0 (top) -> wind over port... check convention
    // heading 90 (east), wind from north: relative bearing of wind source = -90 -> port side of bow
    expect(east.tack).toBe("port");

    const west = run(makeInput({ motion: createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 270 }) }), 0.1);
    expect(west.tack).toBe("starboard");
  });
});

describe("tacking", () => {
  it("carries momentum through the no-go zone: a full tack completes in a couple of seconds", () => {
    // settle close-hauled on starboard, then throw the helm over
    let motion = run(makeInput({ motion: createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 315 }) }), 10);
    const preTackSpeed = motion.speed;

    const input = makeInput({ motion, rudder: 1 });
    let ticks = 0;
    while (ticks < 60 * 5) {
      motion = stepBoatPhysics({ ...input, motion });
      ticks += 1;
      if (motion.tack === "port" && motion.twaDeg >= 40) break;
    }

    expect(ticks).toBeLessThan(60 * 2.5);
    expect(motion.speed).toBeGreaterThan(preTackSpeed * 0.35);
  });

  it("does not park a slow boat head to wind: even from a crawl it can turn out of the no-go zone", () => {
    let motion = createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 0, speed: 0.6 * PIXELS_PER_KNOT });
    const input = makeInput({ motion, rudder: 1 });
    let ticks = 0;
    while (ticks < 60 * 8) {
      motion = stepBoatPhysics({ ...input, motion });
      ticks += 1;
      if (motion.twaDeg >= 45) break;
    }
    expect(ticks).toBeLessThan(60 * 4);
  });

  it("applies a temporary speed penalty when the bow crosses the wind", () => {
    // settle on starboard tack close-hauled, then turn through the wind
    let motion = run(makeInput({ motion: createBoatMotionState({ position: { x: 1000, y: 1000 }, headingDeg: 315 }) }), 10);
    const settledSpeed = motion.speed;
    expect(motion.tack).toBe("starboard");

    // steer right through head-to-wind onto port tack
    let input = makeInput({ motion, rudder: 1 });
    let tackedMotion = motion;
    for (let i = 0; i < 6 * 60; i += 1) {
      tackedMotion = stepBoatPhysics({ ...input, motion: tackedMotion, rudder: tackedMotion.tack === "starboard" || tackedMotion.twaDeg < 44 ? 1 : 0 });
      if (tackedMotion.tack === "port" && tackedMotion.tackTimerSec > 0) break;
    }
    expect(tackedMotion.tack).toBe("port");
    expect(tackedMotion.tackTimerSec).toBeGreaterThan(0);
    expect(tackedMotion.speed).toBeLessThan(settledSpeed);
  });
});

describe("current and STW/SOG", () => {
  it("keeps STW unchanged by current while SOG drifts with it", () => {
    const noCurrent = run(makeInput(), 10);
    const withCurrent = run(makeInput({ current: { x: 10, y: 0 } }), 10);

    expect(withCurrent.speed).toBeCloseTo(noCurrent.speed, 1);
    expect(withCurrent.velocity.x - noCurrent.velocity.x).toBeCloseTo(10, 1);
    expect(withCurrent.position.x).toBeGreaterThan(noCurrent.position.x + 50);
  });
});

describe("penalty", () => {
  it("caps the boat at a fraction of polar speed while penalized", () => {
    const normal = run(makeInput(), 12);
    const penalized = run(makeInput({ penaltyFactor: 0.4 }), 12);
    expect(penalized.speed).toBeLessThan(normal.speed * 0.55);
  });
});

describe("auto trim", () => {
  it("keeps sail efficiency high when sailing steadily", () => {
    const settled = run(makeInput(), 15);
    expect(settled.sailEfficiency).toBeGreaterThan(0.85);
  });
});
