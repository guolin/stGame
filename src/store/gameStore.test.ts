import { beforeEach, describe, expect, it } from "vitest";
import { getCourse } from "../sim/course/courses";
import { SIM_DT } from "../sim/simulation";
import { useGameStore } from "./gameStore";

describe("gameStore pilot control", () => {
  beforeEach(() => {
    useGameStore.setState({
      activeBoatIds: ["red", "green", "yellow"],
      course: getCourse("windwardLeeward")
    });
    useGameStore.getState().startRace();
  });

  it("keeps unclaimed boats frozen during prestart", () => {
    const before = useGameStore.getState().boats.map((boat) => ({ id: boat.id, position: boat.position }));

    useGameStore.getState().tick(1);

    const after = useGameStore.getState().boats;
    for (const boat of before) {
      const next = after.find((item) => item.id === boat.id)!;
      expect(next.position).toEqual(boat.position);
    }
  });

  it("promotes unclaimed boats to AI at the start signal", () => {
    useGameStore.setState((state) => ({
      race: { ...state.race, countdownMs: SIM_DT * 1000 }
    }));

    useGameStore.getState().tick(SIM_DT);

    const pilots = useGameStore.getState().boatPilots;
    expect(useGameStore.getState().race.phase).toBe("racing");
    expect(["red", "green", "yellow"].map((boatId) => pilots[boatId as keyof typeof pilots].mode)).toEqual(["ai", "ai", "ai"]);
    expect(new Set(["red", "green", "yellow"].map((boatId) => pilots[boatId as keyof typeof pilots].aiDifficulty))).toEqual(
      new Set(["high", "medium", "low"])
    );
  });

  it("lets a mid-race player input take over an AI boat", () => {
    useGameStore.setState((state) => ({
      race: { ...state.race, phase: "racing", countdownMs: 0 },
      boatPilots: { ...state.boatPilots, red: { mode: "ai", aiDifficulty: "high" } }
    }));

    useGameStore.getState().claimHumanControl("red");
    useGameStore.getState().setControl("red", { rudder: 1 });

    expect(useGameStore.getState().boatPilots.red).toEqual({ mode: "human" });
    expect(useGameStore.getState().controls.red.rudder).toBe(1);
  });
});
