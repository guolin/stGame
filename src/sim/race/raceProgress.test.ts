import { describe, expect, it } from "vitest";
import { updateBoatRace } from "./raceProgress";
import { getCourse } from "../course/courses";
import type { BoatState } from "../../game/types";

const course = getCourse("windwardLeeward");
const lineY = (course.startLine.left.y + course.startLine.right.y) / 2;
const finishY = (course.finishLine.left.y + course.finishLine.right.y) / 2;
const midX = 1400;

function makeBoat(overrides: Partial<BoatState> = {}): BoatState {
  return {
    id: "red",
    name: "玩家 1",
    color: "#ff533d",
    boatType: "op",
    position: { x: midX, y: lineY + 60 },
    headingDeg: 0,
    speed: 30,
    velocity: { x: 0, y: 0 },
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 45,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    track: [],
    startStatus: "prestart",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    ...overrides
  };
}

describe("start legality", () => {
  it("flags a boat as OCS if its bow is on the course side at the starting signal", () => {
    const boat = makeBoat({ position: { x: midX, y: lineY + 30 }, headingDeg: 0 });
    const result = updateBoatRace({ boat, prevPosition: boat.position, course, elapsedMs: 0, startSignal: true });
    expect(result.boat.startStatus).toBe("ocs");
    expect(result.events.some((e) => e.kind === "ocs")).toBe(true);
  });

  it("starts a boat when its bow crosses the line from the pre-start side after the signal", () => {
    const boat = makeBoat({ position: { x: midX, y: lineY + 40 }, headingDeg: 0 });
    const result = updateBoatRace({ boat, prevPosition: { x: midX, y: lineY + 60 }, course, elapsedMs: 1000, startSignal: false });
    expect(result.boat.startStatus).toBe("started");
    expect(result.events.some((e) => e.kind === "start")).toBe(true);
  });

  it("does not wait for the boat center to cross the start line", () => {
    const boat = makeBoat({ position: { x: midX, y: lineY + 40 }, headingDeg: 0 });
    const result = updateBoatRace({ boat, prevPosition: { x: midX, y: lineY + 60 }, course, elapsedMs: 1000, startSignal: false });
    expect(boat.position.y).toBeGreaterThan(lineY);
    expect(result.boat.startStatus).toBe("started");
  });

  it("clears OCS only after the boat returns fully to the pre-start side", () => {
    const ocsBoat = makeBoat({ startStatus: "ocs", position: { x: midX, y: lineY + 80 }, headingDeg: 0 });
    const back = updateBoatRace({ boat: ocsBoat, prevPosition: { x: midX, y: lineY - 10 }, course, elapsedMs: 2000, startSignal: false });
    expect(back.boat.startStatus).toBe("prestart");

    const restart = updateBoatRace({
      boat: back.boat,
      prevPosition: { x: midX, y: lineY + 80 },
      course,
      elapsedMs: 3000,
      startSignal: false
    });
    // still below the line -> no start yet
    expect(restart.boat.startStatus).toBe("prestart");
  });

  it("keeps OCS while only the bow has returned to the pre-start side", () => {
    const ocsBoat = makeBoat({ startStatus: "ocs", position: { x: midX, y: lineY - 20 }, headingDeg: 180 });
    const result = updateBoatRace({ boat: ocsBoat, prevPosition: { x: midX, y: lineY - 80 }, course, elapsedMs: 2000, startSignal: false });
    expect(result.boat.startStatus).toBe("ocs");
    expect(result.events.some((e) => e.kind === "ocs-cleared")).toBe(false);
  });

  it("does not advance legs before a legal start", () => {
    const mark = course.marks[0];
    const boat = makeBoat({ startStatus: "ocs", position: { ...mark.position } });
    const result = updateBoatRace({ boat, prevPosition: boat.position, course, elapsedMs: 0, startSignal: false });
    expect(result.boat.legIndex).toBe(0);
  });
});

describe("mark rounding direction", () => {
  const mark = course.marks[0]; // starboard rounding

  function roundMark(path: { x: number; y: number }[], startLegIndex = 0) {
    let boat = makeBoat({ startStatus: "started", legIndex: startLegIndex, position: path[0] });
    let prev = path[0];
    const allEvents = [];
    for (const point of path.slice(1)) {
      const result = updateBoatRace({
        boat: { ...boat, position: point },
        prevPosition: prev,
        course,
        elapsedMs: 0,
        startSignal: false
      });
      boat = result.boat;
      allEvents.push(...result.events);
      prev = point;
    }
    return { boat, events: allEvents };
  }

  it("advances the leg when the boat rounds the mark on the required side", () => {
    // Starboard rounding: leave the mark to starboard -> pass on its left (west), sweeping clockwise.
    const m = mark.position;
    const path = [
      { x: m.x, y: m.y + 130 },
      { x: m.x - 95, y: m.y + 95 },
      { x: m.x - 130, y: m.y },
      { x: m.x - 95, y: m.y - 95 },
      { x: m.x, y: m.y - 130 },
      { x: m.x + 95, y: m.y - 95 },
      { x: m.x + 200, y: m.y - 60 },
      { x: m.x + 400, y: m.y + 100 }
    ];
    const { boat, events } = roundMark(path);
    expect(boat.legIndex).toBe(1);
    expect(events.some((e) => e.kind === "mark")).toBe(true);
  });

  it("does not count a pass that never exits to the right side of the mark", () => {
    const m = mark.position;
    const path = [
      { x: m.x, y: m.y + 150 },
      { x: m.x - 80, y: m.y + 100 },
      { x: m.x - 130, y: m.y },
      { x: m.x - 190, y: m.y }
    ];
    const { boat, events } = roundMark(path);
    expect(boat.legIndex).toBe(0);
    expect(events.some((e) => e.kind === "mark")).toBe(false);
  });

  it("does not advance and penalizes the boat when it hits the mark", () => {
    const m = mark.position;
    const { boat, events } = roundMark([
      { x: m.x, y: m.y + 150 },
      { x: m.x + 80, y: m.y + 80 },
      { x: m.x + 12, y: m.y + 10 },
      { x: m.x - 120, y: m.y - 90 },
      { x: m.x - 220, y: m.y - 120 }
    ]);

    expect(boat.legIndex).toBe(0);
    expect(boat.penaltyCount).toBe(1);
    expect(boat.penaltyUntilMs).toBeGreaterThan(0);
    expect(events.some((e) => e.kind === "rule" && e.message.includes("碰到"))).toBe(true);
  });

  it("does not penalize a boat for touching only the yellow outer ring", () => {
    const m = mark.position;
    const { boat, events } = roundMark([
      { x: m.x, y: m.y + 150 },
      { x: m.x - 48, y: m.y + 20 },
      { x: m.x - 120, y: m.y - 90 },
      { x: m.x - 220, y: m.y - 120 }
    ]);

    expect(boat.penaltyCount).toBe(0);
    expect(events.some((e) => e.kind === "rule" && e.message.includes("碰到"))).toBe(false);
  });

  it("does not advance when the boat passes the mark on the wrong side", () => {
    const m = mark.position;
    const path = [
      { x: m.x, y: m.y + 130 },
      { x: m.x + 95, y: m.y + 95 },
      { x: m.x + 130, y: m.y },
      { x: m.x + 95, y: m.y - 95 },
      { x: m.x, y: m.y - 130 },
      { x: m.x - 200, y: m.y - 200 },
      { x: m.x - 400, y: m.y - 400 }
    ];
    const { boat } = roundMark(path);
    expect(boat.legIndex).toBe(0);
  });
});

describe("finish", () => {
  it("finishes a started boat that crosses the finish line on the final leg", () => {
    const boat = makeBoat({
      startStatus: "started",
      legIndex: course.legMarkIds.length,
      position: { x: midX, y: finishY + 5 }
    });
    const result = updateBoatRace({ boat, prevPosition: { x: midX, y: finishY - 5 }, course, elapsedMs: 90_000, startSignal: false });
    expect(result.boat.finished).toBe(true);
    expect(result.events.some((e) => e.kind === "finish")).toBe(true);
  });

  it("does not finish a boat that has not rounded all marks", () => {
    const boat = makeBoat({ startStatus: "started", legIndex: 0, position: { x: midX, y: finishY + 5 } });
    const result = updateBoatRace({ boat, prevPosition: { x: midX, y: finishY - 5 }, course, elapsedMs: 90_000, startSignal: false });
    expect(result.boat.finished).toBe(false);
  });
});
