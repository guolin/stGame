import { create } from "zustand";
import { INITIAL_CURRENTS, INITIAL_OVERLAYS, INITIAL_WIND, INITIAL_WIND_FIELD } from "../game/constants";
import type { AppView, BoatControls, BoatId, BoatState, CurrentZone, OverlaySettings, RaceState, WindState, WindZoneState } from "../game/types";
import { splitFrameIntoSteps } from "../sim/loop";
import { SIM_DT, cloneInitialBoats, cloneInitialRace, stepSimulation } from "../sim/simulation";
import { getCourse } from "../sim/course/courses";
import type { CourseDefinition, CourseId } from "../sim/course/types";
import { buildEnvironment } from "../sim/environment";
import { createRulesEngineState } from "../sim/rules/rulesEngine";
import type { RulesEngineState } from "../sim/rules/rulesEngine";
import type { DifficultyId, EnvironmentId } from "../sim/environment";
import type { WindFieldConfig } from "../sim/wind/windField";

export type SetupStep = "players" | "course" | "difficulty" | "environment" | "controllers";

type GameStore = {
  view: AppView;
  setupStep: SetupStep;
  boats: BoatState[];
  activeBoatIds: BoatId[];
  race: RaceState;
  course: CourseDefinition;
  difficulty: DifficultyId;
  environment: EnvironmentId;
  windField: WindFieldConfig;
  wind: WindState;
  windZones: WindZoneState[];
  currents: CurrentZone[];
  rulesState: RulesEngineState;
  overlays: OverlaySettings;
  hudVisible: boolean;
  timeScale: number;
  controls: Record<BoatId, BoatControls>;
  tick: (dt: number) => void;
  setView: (view: AppView) => void;
  setSetupStep: (step: SetupStep) => void;
  setBoatCount: (count: number) => void;
  setCourse: (courseId: CourseId) => void;
  setDifficulty: (difficulty: DifficultyId) => void;
  setEnvironment: (environment: EnvironmentId) => void;
  startRace: () => void;
  setControl: (boatId: BoatId, control: Partial<BoatControls>) => void;
  setupRule10Demo: () => void;
  toggleOverlay: (key: keyof OverlaySettings) => void;
  toggleHud: () => void;
  togglePause: () => void;
  setTimeScale: (timeScale: number) => void;
  restart: () => void;
};

const BOAT_ORDER: BoatId[] = ["red", "blue", "green", "yellow"];
const NORMAL_TIME_SCALE = 1;

function createEmptyControls(): Record<BoatId, BoatControls> {
  return {
    red: { rudder: 0 },
    blue: { rudder: 0 },
    green: { rudder: 0 },
    yellow: { rudder: 0 }
  };
}

let frameAccumulator = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  view: "home",
  setupStep: "players",
  boats: cloneInitialBoats(getCourse("windwardLeeward")),
  activeBoatIds: ["red", "blue"],
  race: cloneInitialRace(),
  course: getCourse("windwardLeeward"),
  difficulty: "standard",
  environment: "combo",
  windField: INITIAL_WIND_FIELD,
  wind: { ...INITIAL_WIND },
  windZones: [],
  currents: INITIAL_CURRENTS,
  rulesState: createRulesEngineState(),
  overlays: { ...INITIAL_OVERLAYS },
  hudVisible: true,
  timeScale: NORMAL_TIME_SCALE,
  controls: createEmptyControls(),
  tick: (frameDt) => {
    const state = get();
    if (state.view !== "race" || state.race.phase === "paused" || state.race.phase === "finished") {
      frameAccumulator = 0;
      return;
    }

    // Time scaling feeds more or less wall time into the accumulator; every
    // simulated tick still advances exactly SIM_DT so results stay deterministic.
    const { steps, remainder } = splitFrameIntoSteps(frameAccumulator, frameDt * state.timeScale, SIM_DT);
    frameAccumulator = remainder;
    if (steps === 0) return;

    let sim = {
      boats: state.boats,
      activeBoatIds: state.activeBoatIds,
      race: state.race,
      course: state.course,
      windField: state.windField,
      wind: state.wind,
      windZones: state.windZones,
      currents: state.currents,
      rulesState: state.rulesState
    };
    for (let step = 0; step < steps; step += 1) {
      sim = stepSimulation(sim, get().controls);
    }

    set({ boats: sim.boats, race: sim.race, wind: sim.wind, windZones: sim.windZones, rulesState: sim.rulesState });
  },
  setView: (view) => set({ view }),
  setSetupStep: (step) => set({ setupStep: step }),
  setBoatCount: (count) => {
    const activeBoatIds = BOAT_ORDER.slice(0, Math.max(1, Math.min(4, count)));
    set({ activeBoatIds });
  },
  setCourse: (courseId) => set({ course: getCourse(courseId) }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setEnvironment: (environment) => set({ environment }),
  startRace: () => {
    const state = get();
    const env = buildEnvironment(state.difficulty, state.environment);
    frameAccumulator = 0;
    set({
      view: "race",
      boats: cloneInitialBoats(state.course),
      race: { ...cloneInitialRace(), countdownMs: env.countdownMs },
      windField: env.windField,
      wind: { ...INITIAL_WIND, speedKnots: env.windField.baseSpeedKnots },
      windZones: env.windField.zones.map((zone) => ({ ...zone, bounds: { ...zone.bounds } })),
      currents: env.currents,
      overlays: env.overlays,
      rulesState: createRulesEngineState(),
      controls: createEmptyControls(),
      timeScale: NORMAL_TIME_SCALE
    });
  },
  setControl: (boatId, control) => {
    set((state) => ({
      controls: {
        ...state.controls,
        [boatId]: { ...state.controls[boatId], ...control }
      }
    }));
  },
  setupRule10Demo: () => {
    const state = get();
    const env = buildEnvironment("standard", "stable");
    frameAccumulator = 0;
    set({
      view: "race",
      activeBoatIds: ["red", "blue"],
      race: { ...cloneInitialRace(), phase: "racing", countdownMs: 0 },
      windField: env.windField,
      windZones: [],
      currents: [],
      overlays: { ...env.overlays, laylines: false, noGoZone: false },
      boats: cloneInitialBoats(state.course).map((boat) => {
        if (boat.id === "red") {
          return { ...boat, position: { x: 1310, y: 1040 }, headingDeg: 44, speed: 60, startStatus: "started" as const };
        }
        if (boat.id === "blue") {
          return { ...boat, position: { x: 1490, y: 1030 }, headingDeg: 316, speed: 60, startStatus: "started" as const };
        }
        return boat;
      }),
      rulesState: createRulesEngineState(),
      controls: createEmptyControls(),
      timeScale: NORMAL_TIME_SCALE
    });
  },
  toggleOverlay: (key) => set((state) => ({ overlays: { ...state.overlays, [key]: !state.overlays[key] } })),
  toggleHud: () => set((state) => ({ hudVisible: !state.hudVisible })),
  togglePause: () => {
    set((state) => ({
      race: {
        ...state.race,
        phase: state.race.phase === "paused" ? (state.race.countdownMs > 0 ? "prestart" : "racing") : "paused"
      }
    }));
  },
  setTimeScale: (timeScale) => set({ timeScale: Math.max(1, Math.min(2, timeScale)) }),
  restart: () => {
    const state = get();
    const env = buildEnvironment(state.difficulty, state.environment);
    frameAccumulator = 0;
    set({
      boats: cloneInitialBoats(state.course),
      race: { ...cloneInitialRace(), countdownMs: env.countdownMs },
      rulesState: createRulesEngineState(),
      controls: createEmptyControls(),
      timeScale: NORMAL_TIME_SCALE
    });
  }
}));
