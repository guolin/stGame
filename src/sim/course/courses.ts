import type { CourseDefinition, CourseId, SpawnPoint } from "./types";

export const COURSE_IDS: CourseId[] = ["simple", "windwardLeeward", "ioTwoLap"];

const START_LINE = {
  left: { x: 1000, y: 1490 },
  right: { x: 1800, y: 1490 }
};

const DOWNWIND_FINISH_LINE = {
  left: { x: 1120, y: 1740 },
  right: { x: 1680, y: 1740 }
};

function defaultSpawns(): SpawnPoint[] {
  // Wind blows from the top of the screen; spawn on close-hauled-ish headings
  // so boats can accelerate right away instead of sitting head-to-wind.
  return [
    { position: { x: 1260, y: 1585 }, headingDeg: 310 },
    { position: { x: 1540, y: 1585 }, headingDeg: 50 },
    { position: { x: 1120, y: 1630 }, headingDeg: 305 },
    { position: { x: 1680, y: 1630 }, headingDeg: 55 }
  ];
}

const COURSES: Record<CourseId, CourseDefinition> = {
  simple: {
    id: "simple",
    name: "航线 1 · 简单航线",
    description: "起航线 -> 1标 -> 终点，用于教学和第一次试玩。",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [{ id: "m1", label: "1标", position: { x: 1400, y: 260 }, rounding: "port" }],
    legMarkIds: ["m1"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 1, max: 2 }
  },
  windwardLeeward: {
    id: "windwardLeeward",
    name: "航线 2 · 迎风顺风",
    description: "起航线 -> 1标 -> 2标 -> 3标 -> 终点；3标在起航线下方。",
    startLine: START_LINE,
    finishLine: DOWNWIND_FINISH_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1400, y: 250 }, rounding: "port" },
      { id: "m2", label: "2标", position: { x: 1660, y: 350 }, rounding: "port" },
      { id: "m3", label: "3标", position: { x: 1400, y: 1645 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2", "m3"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  },
  ioTwoLap: {
    id: "ioTwoLap",
    name: "航线 3 · 两圈 IO",
    description: "起航线 -> 1标 -> 2标 -> 1标 -> 2标 -> 终点。",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1450, y: 260 }, rounding: "port" },
      { id: "m2", label: "2标", position: { x: 920, y: 1160 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2", "m1", "m2"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  }
};

export function getCourse(id: CourseId): CourseDefinition {
  return COURSES[id];
}
