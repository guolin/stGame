import type { CourseDefinition, CourseId, SpawnPoint } from "./types";

export const COURSE_IDS: CourseId[] = ["simple", "io", "triangle", "complex4"];

const START_LINE = {
  left: { x: 1000, y: 1580 },
  right: { x: 1800, y: 1580 }
};

function defaultSpawns(): SpawnPoint[] {
  // Wind blows from the top of the screen; spawn on close-hauled-ish headings
  // so boats can accelerate right away instead of sitting head-to-wind.
  return [
    { position: { x: 1260, y: 1670 }, headingDeg: 310 },
    { position: { x: 1540, y: 1670 }, headingDeg: 50 },
    { position: { x: 1120, y: 1720 }, headingDeg: 305 },
    { position: { x: 1680, y: 1720 }, headingDeg: 55 }
  ];
}

const COURSES: Record<CourseId, CourseDefinition> = {
  simple: {
    id: "simple",
    name: "简单迎风场地",
    description: "起航线 → 1 标 → 终点线，用于教学和第一次试玩。",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [{ id: "m1", label: "1标", position: { x: 1400, y: 300 }, rounding: "port" }],
    legMarkIds: ["m1"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 1, max: 2 }
  },
  io: {
    id: "io",
    name: "IO 场地",
    description: "起航线 → 1 标 → 2 标 → 终点线，主 Demo 推荐。",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1450, y: 280 }, rounding: "port" },
      { id: "m2", label: "2标", position: { x: 900, y: 1180 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  },
  triangle: {
    id: "triangle",
    name: "三角标场地",
    description: "三角路线，展示不同风角航速与绕标转向。",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1400, y: 300 }, rounding: "port" },
      { id: "m2", label: "2标", position: { x: 2260, y: 1160 }, rounding: "port" },
      { id: "m3", label: "3标", position: { x: 560, y: 1160 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2", "m3"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 2, max: 4 }
  },
  complex4: {
    id: "complex4",
    name: "复杂 4 标场地",
    description: "四标完整对抗，多次会船与换舷，适合 3-4 人。",
    startLine: START_LINE,
    finishLine: START_LINE,
    marks: [
      { id: "m1", label: "1标", position: { x: 1450, y: 260 }, rounding: "port" },
      { id: "m2", label: "2标", position: { x: 2300, y: 720 }, rounding: "port" },
      { id: "m3", label: "3标", position: { x: 1100, y: 980 }, rounding: "starboard" },
      { id: "m4", label: "4标", position: { x: 520, y: 480 }, rounding: "port" }
    ],
    legMarkIds: ["m1", "m2", "m3", "m4"],
    spawnPoints: defaultSpawns(),
    recommendedPlayers: { min: 3, max: 4 }
  }
};

export function getCourse(id: CourseId): CourseDefinition {
  return COURSES[id];
}
