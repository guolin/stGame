import { describe, expect, it } from "vitest";
import { SIM_DT, createInitialSimState, stepSimulation } from "./simulation";
import type { BoatControls, BoatId } from "../game/types";

function scriptedControls(tick: number): Record<BoatId, BoatControls> {
  const rudder = Math.sin(tick / 30) * 0.8;
  return {
    red: { rudder },
    blue: { rudder: -rudder },
    green: { rudder: 0 },
    yellow: { rudder: 0 }
  };
}

describe("stepSimulation", () => {
  it("advances exactly one fixed tick of elapsed time while racing", () => {
    let state = createInitialSimState();
    state = { ...state, race: { ...state.race, phase: "racing", countdownMs: 0 } };
    const next = stepSimulation(state, scriptedControls(0));
    expect(next.race.elapsedMs).toBeCloseTo(state.race.elapsedMs + SIM_DT * 1000, 6);
  });

  it("is deterministic: same input sequence twice gives identical states", () => {
    const run = () => {
      let state = createInitialSimState();
      state = { ...state, race: { ...state.race, phase: "racing", countdownMs: 0 } };
      for (let tick = 0; tick < 600; tick += 1) {
        state = stepSimulation(state, scriptedControls(tick));
      }
      return state;
    };

    expect(run()).toEqual(run());
  });

  it("transitions from prestart to racing when the countdown reaches zero", () => {
    let state = createInitialSimState();
    state = { ...state, race: { ...state.race, phase: "prestart", countdownMs: SIM_DT * 1000 * 2.5 } };
    for (let tick = 0; tick < 3; tick += 1) {
      state = stepSimulation(state, scriptedControls(0));
    }
    expect(state.race.phase).toBe("racing");
    expect(state.race.countdownMs).toBe(0);
  });

  it("keeps race elapsed time at zero until the start signal", () => {
    let state = createInitialSimState();
    state = { ...state, race: { ...state.race, phase: "prestart", countdownMs: SIM_DT * 1000 } };
    state = stepSimulation(state, scriptedControls(0));
    expect(state.race.phase).toBe("racing");
    expect(state.race.elapsedMs).toBe(0);
  });

  it("does not mutate the input state", () => {
    let state = createInitialSimState();
    state = { ...state, race: { ...state.race, phase: "racing", countdownMs: 0 } };
    const snapshot = JSON.parse(JSON.stringify(state));
    stepSimulation(state, scriptedControls(0));
    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });

  it("samples tracks by fixed time so faster boats leave wider-spaced dots", () => {
    const run = (speed: number) => {
      let state = createInitialSimState(["red"]);
      state = {
        ...state,
        race: { ...state.race, phase: "racing", countdownMs: 0 },
        boats: state.boats.map((boat) =>
          boat.id === "red"
            ? {
                ...boat,
                speed,
                headingDeg: 90,
                startStatus: "started" as const,
                track: [],
                lastTrackSampleMs: undefined
              }
            : boat
        )
      };

      for (let tick = 0; tick < 2 / SIM_DT; tick += 1) {
        state = stepSimulation(state, { red: { rudder: 0 }, blue: { rudder: 0 }, green: { rudder: 0 }, yellow: { rudder: 0 } });
      }

      return state.boats.find((boat) => boat.id === "red")!.track;
    };

    const slowTrack = run(25);
    const fastTrack = run(95);
    const averageSpacing = (track: { x: number; y: number }[]) => {
      const distances = track.slice(1).map((point, index) => Math.hypot(point.x - track[index].x, point.y - track[index].y));
      return distances.reduce((sum, value) => sum + value, 0) / distances.length;
    };

    expect(slowTrack.length).toBeGreaterThan(4);
    expect(fastTrack.length).toBe(slowTrack.length);
    expect(averageSpacing(fastTrack)).toBeGreaterThan(averageSpacing(slowTrack));
  });
});
