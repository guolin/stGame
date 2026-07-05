import type { CurrentZone, OverlaySettings } from "../game/types";
import { INITIAL_WIND_ZONES } from "../game/constants";
import type { WindFieldConfig } from "./wind/windField";

export type DifficultyId = "easy" | "standard" | "race";
export type EnvironmentId = "stable" | "oscillating" | "current" | "gust" | "combo";

export const DIFFICULTY_IDS: DifficultyId[] = ["easy", "standard", "race"];
export const ENVIRONMENT_IDS: EnvironmentId[] = ["stable", "oscillating", "current", "gust", "combo"];

export const DIFFICULTY_LABEL: Record<DifficultyId, { name: string; blurb: string }> = {
  easy: { name: "入门 · 小风天", blurb: "船速慢、辅助线全开、倒计时短，适合第一次玩" },
  standard: { name: "标准 · 正常风", blurb: "标准风速与图层，黑客松主比赛推荐" },
  race: { name: "竞赛 · 大风天", blurb: "风大船快，关闭 Layline 和禁航角辅助" }
};

export const ENVIRONMENT_LABEL: Record<EnvironmentId, { name: string; blurb: string }> = {
  stable: { name: "稳定风", blurb: "风向基本不摆，无水流，专注操船" },
  oscillating: { name: "摆动风", blurb: "钟摆式风摆 ±9°，考验换舷时机" },
  current: { name: "水流演示", blurb: "稳定风 + 明显水流区，看船被推偏" },
  gust: { name: "阵风演示", blurb: "移动阵风扫过赛场，抢到阵风就快" },
  combo: { name: "Demo 综合", blurb: "风摆 + 阵风 + 水流，大电视完整演示" }
};

export type RaceEnvironment = {
  windField: WindFieldConfig;
  currents: CurrentZone[];
  countdownMs: number;
  overlays: OverlaySettings;
};

const DIFFICULTY_WIND_KNOTS: Record<DifficultyId, number> = { easy: 8, standard: 12, race: 16 };
const DIFFICULTY_COUNTDOWN_MS: Record<DifficultyId, number> = { easy: 20_000, standard: 30_000, race: 30_000 };

const CURRENT_ZONES: CurrentZone[] = [
  { id: "left-river", center: { x: 700, y: 900 }, radius: 420, vector: { x: 13, y: -2 } },
  { id: "right-counter", center: { x: 2150, y: 1050 }, radius: 480, vector: { x: -10, y: 5 } }
];

const WEAK_CURRENT: CurrentZone[] = [{ id: "weak-drift", center: { x: 1400, y: 900 }, radius: 700, vector: { x: 4, y: 1 } }];

function makeGusts(kind: "single" | "double"): WindFieldConfig["gusts"] {
  const primary = {
    id: "gust-band",
    position: { x: 350, y: 520 },
    radius: 330,
    windSpeedDeltaKnots: 5,
    windDirectionDeltaDeg: -6,
    movementVector: { x: 26, y: 6 }
  };
  const lull = {
    id: "soft-hole",
    position: { x: 2350, y: 1100 },
    radius: 300,
    windSpeedDeltaKnots: -4,
    windDirectionDeltaDeg: 4,
    movementVector: { x: -18, y: -4 }
  };
  return kind === "single" ? [primary] : [primary, lull];
}

export function buildEnvironment(difficulty: DifficultyId, environment: EnvironmentId): RaceEnvironment {
  const baseSpeedKnots = DIFFICULTY_WIND_KNOTS[difficulty];
  const countdownMs = DIFFICULTY_COUNTDOWN_MS[difficulty];

  const windField: WindFieldConfig = {
    baseDirectionDeg: 0,
    baseSpeedKnots,
    oscillation: { kind: "none" },
    gusts: [],
    zones: []
  };
  let currents: CurrentZone[] = [];

  switch (environment) {
    case "stable":
      break;
    case "oscillating":
      windField.oscillation = { kind: "pendulum", amplitudeDeg: 9, periodSec: 40, phase: 0 };
      windField.zones = INITIAL_WIND_ZONES;
      break;
    case "current":
      currents = CURRENT_ZONES;
      break;
    case "gust":
      windField.oscillation = { kind: "pendulum", amplitudeDeg: 6, periodSec: 50, phase: 0 };
      windField.gusts = makeGusts("double");
      break;
    case "combo":
      windField.oscillation = { kind: "pendulum", amplitudeDeg: 9, periodSec: 40, phase: 0 };
      windField.gusts = makeGusts("single");
      windField.zones = INITIAL_WIND_ZONES;
      currents = WEAK_CURRENT;
      break;
  }

  const assists = difficulty !== "race";
  const overlays: OverlaySettings = {
    wind: true,
    current: currents.length > 0,
    tracks: true,
    laylines: assists,
    noGoZone: assists
  };

  return { windField, currents, countdownMs, overlays };
}
