import type { CourseDefinition, CourseId, SpawnPoint } from "./types";

export const COURSE_IDS: CourseId[] = ["simple", "windwardLeeward", "triangle"];

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
    name: "短航线",
    description: "起航 -> 上风标 -> 终点",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [{ id: "m1", label: "1标", position: { x: 1400, y: 260 }, rounding: "port" }],
    legMarkIds: ["m1"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 1, max: 2 }
  },
  windwardLeeward: {
    id: "windwardLeeward",
    name: "迎顺风",
    description: "起航 -> 上风标 -> 下风标 -> 上风标 -> 终点",
    startLine: START_LINE,
    finishLine: DOWNWIND_FINISH_LINE,
    marks: [
      { id: "m1", label: "上风标", position: { x: 1400, y: 250 }, rounding: "port" },
      { id: "m2", label: "下风标", position: { x: 1400, y: 1645 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2", "m1"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  },
  triangle: {
    id: "triangle",
    name: "三角航线",
    description: "起航 -> 上风标 -> 横风标 -> 下风标 -> 终点",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [
      { id: "m1", label: "上风标", position: { x: 1400, y: 250 }, rounding: "port" },
      { id: "m2", label: "横风标", position: { x: 2140, y: 900 }, rounding: "port" },
      { id: "m3", label: "下风标", position: { x: 860, y: 1180 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2", "m3"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  }
};

export function getCourse(id: CourseId): CourseDefinition {
  return COURSES[id];
}
