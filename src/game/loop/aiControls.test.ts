import { describe, expect, it } from "vitest";
import { INITIAL_WIND } from "../constants";
import type { AiControlProfile, BoatControls, BoatId, BoatState } from "../types";
import { assignAiDifficulties, computeAiBoatControl } from "./aiControls";
import { getCourse } from "../../sim/course/courses";
import { SIM_DT, cloneInitialBoats, createInitialSimState, stepSimulation } from "../../sim/simulation";

describe("assignAiDifficulties", () => {
  it("randomly assigns one high, one medium, and one low profile across three AI boats", () => {
    const assignments = assignAiDifficulties(["red", "green", "yellow"], () => 0.99);
    expect(new Set(Object.values(assignments))).toEqual(new Set(["high", "medium", "low"]));
  });

  it("does not duplicate high, medium, or low when more than three AI boats need controls", () => {
    const assignments = assignAiDifficulties(["red", "green", "yellow", "blue"], () => 0.99);
    expect(Object.values(assignments)).toHaveLength(3);
    expect(new Set(Object.values(assignments))).toEqual(new Set(["high", "medium", "low"]));
  });
});

describe("computeAiBoatControl", () => {
  const course = getCourse("windwardLeeward");

  function boat(id: BoatId, overrides: Partial<BoatState> = {}) {
    return { ...cloneInitialBoats(course).find((item) => item.id === id)!, ...overrides };
  }

  it("steers an upwind boat toward a legal close-hauled course instead of aiming into the no-go zone", () => {
    const control = computeAiBoatControl({
      boat: boat("red", { headingDeg: 310 }),
      course,
      wind: INITIAL_WIND,
      difficulty: "high",
      elapsedMs: 0
    });

    expect(control.rudder).toBeGreaterThan(0);
  });

  it("uses stronger steering on high difficulty than low difficulty for the same error", () => {
    const baseBoat = boat("red", { headingDeg: 180 });
    const high = computeAiBoatControl({ boat: baseBoat, course, wind: INITIAL_WIND, difficulty: "high", elapsedMs: 0 });
    const low = computeAiBoatControl({ boat: baseBoat, course, wind: INITIAL_WIND, difficulty: "low", elapsedMs: 0 });

    expect(Math.abs(high.rudder)).toBeGreaterThan(Math.abs(low.rudder));
  });

  it("rounds the first mark through normal race progress for every AI control profile", () => {
    const profiles: AiControlProfile[] = ["high", "medium", "low", "reserve"];

    for (const profile of profiles) {
      let state = createInitialSimState(["red"], "simple");
      state = {
        ...state,
        windField: { ...state.windField, oscillation: { kind: "none" }, gusts: [], zones: [] },
        race: { ...state.race, phase: "racing", countdownMs: 0 },
        boats: state.boats.map((item) => (item.id === "red" ? { ...item, startStatus: "started" as const } : item))
      };

      const controls: Record<BoatId, BoatControls> = {
        red: { rudder: 0 },
        green: { rudder: 0 },
        yellow: { rudder: 0 },
        blue: { rudder: 0 }
      };
      const firstMark = state.course.marks[0].position;
      let maxSweepBeforeAdvance = 0;
      let advancedAtTick = 0;

      for (let tick = 0; tick < 360 / SIM_DT; tick += 1) {
        const aiBoat = state.boats.find((item) => item.id === "red")!;
        maxSweepBeforeAdvance = Math.max(maxSweepBeforeAdvance, Math.abs(aiBoat.markSweepDeg));
        controls.red = computeAiBoatControl({
          boat: aiBoat,
          course: state.course,
          wind: state.wind,
          difficulty: profile,
          elapsedMs: state.race.elapsedMs
        });
        state = stepSimulation(state, controls);
        if (state.boats.find((item) => item.id === "red")!.legIndex > 0) {
          advancedAtTick = tick;
          break;
        }
      }

      const red = state.boats.find((item) => item.id === "red")!;
      expect(red.legIndex, profile).toBeGreaterThan(0);
      expect(state.race.events.some((event) => event.kind === "mark" && event.boatId === "red"), profile).toBe(true);
      expect(maxSweepBeforeAdvance, profile).toBeGreaterThan(95);
      expect(maxSweepBeforeAdvance, profile).toBeLessThan(180);

      for (let tick = 0; tick < 45 / SIM_DT; tick += 1) {
        const aiBoat = state.boats.find((item) => item.id === "red")!;
        controls.red = computeAiBoatControl({
          boat: aiBoat,
          course: state.course,
          wind: state.wind,
          difficulty: profile,
          elapsedMs: state.race.elapsedMs
        });
        state = stepSimulation(state, controls);
      }

      const departed = state.boats.find((item) => item.id === "red")!;
      const departedDistance = Math.hypot(departed.position.x - firstMark.x, departed.position.y - firstMark.y);
      expect(advancedAtTick, profile).toBeGreaterThan(0);
      expect(departedDistance, profile).toBeGreaterThan(360);
    }
  });
});
