import type { CourseDefinition, CourseId, SpawnPoint } from "./types";

export const COURSE_IDS: CourseId[] = ["simple", "windwardLeeward", "triangle"];

const START_LINE = {
  left: { x: 1000, y: 1490 },
  right: { x: 1800, y: 1490 }
};

const TRIANGLE_START_LINE = {
  left: { x: 1560, y: 1490 },
  right: { x: 2160, y: 1490 }
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

function triangleSpawns(): SpawnPoint[] {
  return [
    { position: { x: 1720, y: 1585 }, headingDeg: 310 },
    { position: { x: 2000, y: 1585 }, headingDeg: 50 },
    { position: { x: 1620, y: 1630 }, headingDeg: 305 },
    { position: { x: 2100, y: 1630 }, headingDeg: 55 }
  ];
}

const COURSES: Record<CourseId, CourseDefinition> = {
  simple: {
    id: "simple",
    name: "短航线",
    description: "起点/终点 -> 1标 -> 起点/终点",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [{ id: "m1", label: "1标", position: { x: 1400, y: 260 }, rounding: "starboard" }],
    legMarkIds: ["m1"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 1, max: 2 }
  },
  windwardLeeward: {
    id: "windwardLeeward",
    name: "迎顺风",
    description: "起点/终点 -> 1标 -> 4标 -> 1标 -> 起点/终点",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1400, y: 250 }, rounding: "starboard" },
      { id: "m4", label: "4标", position: { x: 1400, y: 1645 }, rounding: "starboard" }
    ],
    legMarkIds: ["m1", "m4", "m1"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  },
  triangle: {
    id: "triangle",
    name: "三角航线",
    description: "起点/终点 -> 1标 -> 2标 -> 3标 -> 2标 -> 3标 -> 起点/终点",
    startLine: TRIANGLE_START_LINE,
    finishLine: TRIANGLE_START_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1860, y: 266 }, rounding: "starboard" },
      { id: "m2", label: "2标", position: { x: 933, y: 430 }, rounding: "starboard" },
      { id: "m3", label: "3标", position: { x: 933, y: 1360 }, rounding: "starboard" }
    ],
    legMarkIds: ["m1", "m2", "m3", "m2", "m3"],
    spawnPoints: triangleSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  }
};

export function getCourse(id: CourseId): CourseDefinition {
  return COURSES[id];
}
