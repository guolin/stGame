import type { LineSegment, Vec2 } from "../../game/types";

export type MarkRounding = "port" | "starboard";

export type CourseMark = {
  id: string;
  label: string;
  position: Vec2;
  rounding: MarkRounding;
};

export type CourseId = "simple" | "windwardLeeward" | "triangle";

export type SpawnPoint = {
  position: Vec2;
  headingDeg: number;
};

export type CourseDefinition = {
  id: CourseId;
  name: string;
  description: string;
  startLine: LineSegment;
  finishLine: LineSegment;
  marks: CourseMark[];
  /** Rounding order; boats target these marks in sequence, then the finish line. */
  legMarkIds: string[];
  spawnPoints: SpawnPoint[];
  recommendedPlayers: { min: number; max: number };
};
