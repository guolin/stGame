import { describe, expect, it } from "vitest";
import { createRulesEngineState, stepRules } from "./rulesEngine";
import type { BoatState } from "../../game/types";

function makeBoat(id: BoatState["id"], overrides: Partial<BoatState> = {}): BoatState {
  return {
    id,
    name: id === "red" ? "1号船" : id === "blue" ? "2号船" : id,
    color: "#fff",
    boatType: "op",
    position: { x: 1000, y: 1000 },
    headingDeg: 0,
    speed: 25,
    velocity: { x: 0, y: 0 },
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 45,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    startStatus: "started",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: [],
    ...overrides
  };
}

const WIND_FROM = 0;

function runContact(a: BoatState, b: BoatState, primeBoats?: [BoatState, BoatState]) {
  let state = createRulesEngineState();
  // a priming tick so the engine already knows the right-of-way relationship;
  // by default the same geometry, pulled apart along the x axis
  const primed = primeBoats ?? [
    { ...a, position: { x: a.position.x - 200, y: a.position.y } },
    { ...b, position: { x: b.position.x + 200, y: b.position.y } }
  ];
  const apart = stepRules({
    boats: primed,
    activeBoatIds: ["red", "blue"],
    windFromDeg: WIND_FROM,
    elapsedMs: 1000,
    state
  });
  state = apart.state;
  const result = stepRules({ boats: [a, b], activeBoatIds: ["red", "blue"], windFromDeg: WIND_FROM, elapsedMs: 5000, state });
  return result;
}

describe("rule 10 — opposite tacks", () => {
  it("blames the port-tack boat on contact", () => {
    const port = makeBoat("red", { tack: "port", headingDeg: 45, position: { x: 990, y: 1000 } });
    const starboard = makeBoat("blue", { tack: "starboard", headingDeg: 315, position: { x: 1040, y: 1000 } });
    const { events } = runContact(port, starboard);
    const breach = events.find((e) => e.type === "breach");
    expect(breach?.rule).toBe("10");
    expect(breach?.offenderId).toBe("red");
  });

  it("warns before contact when boats are converging", () => {
    let state = createRulesEngineState();
    const port = makeBoat("red", { tack: "port", headingDeg: 45, position: { x: 900, y: 1030 }, velocity: { x: 18, y: -18 } });
    const starboard = makeBoat("blue", {
      tack: "starboard",
      headingDeg: 315,
      position: { x: 1030, y: 1030 },
      velocity: { x: -18, y: -18 }
    });
    const result = stepRules({ boats: [port, starboard], activeBoatIds: ["red", "blue"], windFromDeg: WIND_FROM, elapsedMs: 1000, state });
    const warning = result.events.find((e) => e.type === "warning");
    expect(warning?.offenderId).toBe("red");
  });
});

describe("rule 11 — same tack, overlapped", () => {
  it("blames the windward boat", () => {
    // both on starboard tack heading up-left; red is upwind (smaller y = closer to wind source)
    const windward = makeBoat("red", { headingDeg: 315, position: { x: 1000, y: 970 } });
    const leeward = makeBoat("blue", { headingDeg: 315, position: { x: 1000, y: 1030 } });
    // prime with the same overlapped geometry so right of way is already settled
    const { events } = runContact(windward, leeward, [windward, leeward]);
    const breach = events.find((e) => e.type === "breach");
    expect(breach?.rule).toBe("11");
    expect(breach?.offenderId).toBe("red");
  });
});

describe("rule 12 — same tack, clear astern", () => {
  it("blames the boat clear astern", () => {
    // both heading up (0°); blue directly behind red
    const ahead = makeBoat("red", { headingDeg: 315, position: { x: 1000, y: 985 }, twaDeg: 45 });
    const astern = makeBoat("blue", { headingDeg: 315, position: { x: 1048, y: 1033 } });
    const { events } = runContact(ahead, astern);
    const breach = events.find((e) => e.type === "breach");
    expect(breach?.rule).toBe("12");
    expect(breach?.offenderId).toBe("blue");
  });
});

describe("rule 13 — while tacking", () => {
  it("blames the boat that is still completing its tack", () => {
    const tacking = makeBoat("red", { tack: "starboard", tackTimerSec: 1.2, twaDeg: 20, headingDeg: 350, position: { x: 995, y: 1000 } });
    const sailing = makeBoat("blue", { tack: "starboard", headingDeg: 315, position: { x: 1045, y: 1010 } });
    const { events } = runContact(tacking, sailing);
    const breach = events.find((e) => e.type === "breach");
    expect(breach?.rule).toBe("13");
    expect(breach?.offenderId).toBe("red");
  });
});

describe("rules 15/16 — right-of-way limitations", () => {
  it("blames the right-of-way boat when it turned sharply just before contact", () => {
    let state = createRulesEngineState();
    const port = makeBoat("red", { tack: "port", headingDeg: 45, position: { x: 700, y: 1000 } });
    const starboard = makeBoat("blue", { tack: "starboard", headingDeg: 315, position: { x: 1300, y: 1000 } });

    // feed a second of history where the starboard (ROW) boat swings its heading wildly
    for (let tick = 0; tick < 60; tick += 1) {
      const swing = stepRules({
        boats: [
          { ...port, position: { x: 900 + tick, y: 1000 } },
          { ...starboard, headingDeg: 315 - tick * 1.2, position: { x: 1100 - tick, y: 1000 } }
        ],
        activeBoatIds: ["red", "blue"],
        windFromDeg: WIND_FROM,
        elapsedMs: 1000 + tick * 16.7,
        state
      });
      state = swing.state;
    }

    const contact = stepRules({
      boats: [
        { ...port, position: { x: 1000, y: 1000 } },
        { ...starboard, headingDeg: 243, position: { x: 1040, y: 1000 } }
      ],
      activeBoatIds: ["red", "blue"],
      windFromDeg: WIND_FROM,
      elapsedMs: 2100,
      state
    });

    const breach = contact.events.find((e) => e.type === "breach");
    expect(breach?.rule).toBe("16");
    expect(breach?.offenderId).toBe("blue");
  });
});

describe("cooldown", () => {
  it("does not fire the same breach twice within the cooldown window", () => {
    const port = makeBoat("red", { tack: "port", headingDeg: 45, position: { x: 990, y: 1000 } });
    const starboard = makeBoat("blue", { tack: "starboard", headingDeg: 315, position: { x: 1040, y: 1000 } });

    let state = createRulesEngineState();
    const first = stepRules({ boats: [port, starboard], activeBoatIds: ["red", "blue"], windFromDeg: WIND_FROM, elapsedMs: 1000, state });
    expect(first.events.some((e) => e.type === "breach")).toBe(true);

    const second = stepRules({
      boats: [port, starboard],
      activeBoatIds: ["red", "blue"],
      windFromDeg: WIND_FROM,
      elapsedMs: 1500,
      state: first.state
    });
    expect(second.events.some((e) => e.type === "breach")).toBe(false);
  });
});
