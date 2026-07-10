import { create } from "zustand";
import { INITIAL_OVERLAYS, INITIAL_WIND, INITIAL_WIND_FIELD } from "../game/constants";
import type {
  AppView,
  BoatControls,
  BoatId,
  BoatPilotState,
  BoatState,
  OverlaySettings,
  RaceState,
  WindState,
  WindZoneState
} from "../game/types";
import { splitFrameIntoSteps } from "../sim/loop";
import { SIM_DT, cloneInitialBoats, cloneInitialRace, stepSimulation } from "../sim/simulation";
import { getCourse } from "../sim/course/courses";
import type { CourseDefinition, CourseId } from "../sim/course/types";
import { buildEnvironment, buildWindZones } from "../sim/environment";
import { createRulesEngineState } from "../sim/rules/rulesEngine";
import type { RulesEngineState } from "../sim/rules/rulesEngine";
import type { DifficultyId, EnvironmentId, WindZoneCount } from "../sim/environment";
import type { WindFieldConfig } from "../sim/wind/windField";
import { DEFAULT_GAMEPAD_STEERING, sanitizeGamepadSteeringSettings } from "../game/loop/gamepadTuning";
import type { GamepadSteeringSettings } from "../game/loop/gamepadTuning";
import { assignAiDifficulties, computeAiBoatControl } from "../game/loop/aiControls";

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
  windZoneCount: WindZoneCount;
  windField: WindFieldConfig;
  wind: WindState;
  windZones: WindZoneState[];
  rulesState: RulesEngineState;
  overlays: OverlaySettings;
  hudVisible: boolean;
  timeScale: number;
  gamepadSteering: GamepadSteeringSettings;
  boatPilots: Record<BoatId, BoatPilotState>;
  controls: Record<BoatId, BoatControls>;
  tick: (dt: number) => void;
  setView: (view: AppView) => void;
  setSetupStep: (step: SetupStep) => void;
  setBoatCount: (count: number) => void;
  setCourse: (courseId: CourseId) => void;
  setDifficulty: (difficulty: DifficultyId) => void;
  setEnvironment: (environment: EnvironmentId) => void;
  setWindZoneCount: (count: WindZoneCount) => void;
  startRace: () => void;
  claimHumanControl: (boatId: BoatId) => void;
  setControl: (boatId: BoatId, control: Partial<BoatControls>) => void;
  setupRule10Demo: () => void;
  toggleOverlay: (key: keyof OverlaySettings) => void;
  toggleHud: () => void;
  togglePause: () => void;
  setTimeScale: (timeScale: number) => void;
  setGamepadSteering: (settings: Partial<GamepadSteeringSettings>) => void;
  restart: () => void;
};

const BOAT_ORDER: BoatId[] = ["red", "green", "yellow", "blue"];
const NORMAL_TIME_SCALE = 1;
const START_STEP_EPSILON_MS = SIM_DT * 1000 + 0.001;

function createEmptyControls(): Record<BoatId, BoatControls> {
  return {
    red: { rudder: 0 },
    blue: { rudder: 0 },
    green: { rudder: 0 },
    yellow: { rudder: 0 }
  };
}

function createUnclaimedPilots(): Record<BoatId, BoatPilotState> {
  return {
    red: { mode: "unclaimed" },
    blue: { mode: "unclaimed" },
    green: { mode: "unclaimed" },
    yellow: { mode: "unclaimed" }
  };
}

function promoteUnclaimedBoatsToAi(pilots: Record<BoatId, BoatPilotState>, activeBoatIds: readonly BoatId[]) {
  const unclaimed = activeBoatIds.filter((boatId) => pilots[boatId].mode === "unclaimed");
  if (unclaimed.length === 0) return { pilots, changed: false };

  const assignments = assignAiDifficulties(unclaimed);
  const next = { ...pilots };
  unclaimed.forEach((boatId) => {
    const aiDifficulty = assignments[boatId];
    next[boatId] = aiDifficulty ? { mode: "ai", aiDifficulty, aiProfile: aiDifficulty } : { mode: "ai", aiProfile: "reserve" };
  });
  return { pilots: next, changed: true };
}

function controlsForStep({
  boats,
  activeBoatIds,
  controls,
  pilots,
  course,
  wind,
  elapsedMs
}: {
  boats: BoatState[];
  activeBoatIds: readonly BoatId[];
  controls: Record<BoatId, BoatControls>;
  pilots: Record<BoatId, BoatPilotState>;
  course: CourseDefinition;
  wind: WindState;
  elapsedMs: number;
}): Record<BoatId, BoatControls> {
  const next = { ...controls };
  activeBoatIds.forEach((boatId) => {
    const pilot = pilots[boatId];
    if (pilot.mode !== "ai") return;
    const aiProfile = pilot.aiProfile ?? pilot.aiDifficulty;
    if (!aiProfile) return;
    const boat = boats.find((item) => item.id === boatId);
    if (!boat) return;
    next[boatId] = computeAiBoatControl({ boat, course, wind, difficulty: aiProfile, elapsedMs });
  });
  return next;
}

let frameAccumulator = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  view: "home",
  setupStep: "players",
  boats: cloneInitialBoats(getCourse("windwardLeeward")),
  activeBoatIds: ["red", "green", "yellow", "blue"],
  race: cloneInitialRace(),
  course: getCourse("windwardLeeward"),
  difficulty: "standard",
  environment: "combo",
  windZoneCount: 3,
  windField: INITIAL_WIND_FIELD,
  wind: { ...INITIAL_WIND },
  windZones: [],
  rulesState: createRulesEngineState(),
  overlays: { ...INITIAL_OVERLAYS },
  hudVisible: true,
  timeScale: NORMAL_TIME_SCALE,
  gamepadSteering: DEFAULT_GAMEPAD_STEERING,
  boatPilots: createUnclaimedPilots(),
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

    let pilots = state.boatPilots;
    let pilotsChanged = false;
    let sim = {
      boats: state.boats,
      activeBoatIds: state.activeBoatIds,
      race: state.race,
      course: state.course,
      windField: state.windField,
      wind: state.wind,
      windZones: state.windZones,
      rulesState: state.rulesState
    };
    for (let step = 0; step < steps; step += 1) {
      const startsThisStep = sim.race.phase === "prestart" && sim.race.countdownMs <= START_STEP_EPSILON_MS;
      if (sim.race.phase === "racing" || startsThisStep) {
        const promoted = promoteUnclaimedBoatsToAi(pilots, sim.activeBoatIds);
        pilots = promoted.pilots;
        pilotsChanged ||= promoted.changed;
      }

      const frozenBoatIds = new Set(
        sim.race.phase === "prestart" && !startsThisStep
          ? sim.activeBoatIds.filter((boatId) => pilots[boatId].mode !== "human")
          : []
      );
      const activeBoatIds = sim.activeBoatIds.filter((boatId) => !frozenBoatIds.has(boatId));
      const stepControls = controlsForStep({
        boats: sim.boats,
        activeBoatIds,
        controls: get().controls,
        pilots,
        course: sim.course,
        wind: sim.wind,
        elapsedMs: sim.race.elapsedMs
      });
      sim = stepSimulation({ ...sim, activeBoatIds }, stepControls);
    }

    set({
      boats: sim.boats,
      race: sim.race,
      wind: sim.wind,
      windZones: sim.windZones,
      rulesState: sim.rulesState,
      ...(pilotsChanged ? { boatPilots: pilots } : {})
    });
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
  setWindZoneCount: (windZoneCount) => set({ windZoneCount }),
  startRace: () => {
    const state = get();
    const env = buildEnvironment("standard", "oscillating");
    const windZones = buildWindZones(state.windZoneCount);
    const windField = { ...env.windField, zones: windZones };
    frameAccumulator = 0;
    set({
      view: "race",
      boats: cloneInitialBoats(state.course),
      race: { ...cloneInitialRace(), countdownMs: env.countdownMs },
      windField,
      wind: { ...INITIAL_WIND, speedKnots: windField.baseSpeedKnots },
      windZones: windZones.map((zone) => ({ ...zone, bounds: { ...zone.bounds } })),
      overlays: env.overlays,
      rulesState: createRulesEngineState(),
      boatPilots: createUnclaimedPilots(),
      controls: createEmptyControls(),
      timeScale: NORMAL_TIME_SCALE
    });
  },
  claimHumanControl: (boatId) => {
    set((state) => {
      if (!state.activeBoatIds.includes(boatId) || state.boatPilots[boatId].mode === "human") return {};
      return {
        boatPilots: {
          ...state.boatPilots,
          [boatId]: { mode: "human" }
        }
      };
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
      boatPilots: {
        ...createUnclaimedPilots(),
        red: { mode: "human" },
        blue: { mode: "human" }
      },
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
  setTimeScale: (timeScale) => set({ timeScale: Math.max(1, Math.min(4, timeScale)) }),
  setGamepadSteering: (settings) =>
    set((state) => ({
      gamepadSteering: sanitizeGamepadSteeringSettings({ ...state.gamepadSteering, ...settings })
    })),
  restart: () => {
    const state = get();
    const env = buildEnvironment(state.difficulty, state.environment);
    frameAccumulator = 0;
    set({
      boats: cloneInitialBoats(state.course),
      race: { ...cloneInitialRace(), countdownMs: env.countdownMs },
      rulesState: createRulesEngineState(),
      boatPilots: createUnclaimedPilots(),
      controls: createEmptyControls(),
      timeScale: NORMAL_TIME_SCALE
    });
  }
}));
