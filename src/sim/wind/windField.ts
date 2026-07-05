import type { Vec2, WindState, WindZoneState } from "../../game/types";
import { clamp, normalizeDeg } from "../../game/utils/math";

export type OscillationConfig =
  | { kind: "none" }
  | { kind: "persistent"; shiftDirection: "left" | "right"; shiftRateDegPerSec: number; maxShiftDeg: number }
  | { kind: "pendulum"; amplitudeDeg: number; periodSec: number; phase: number };

export type GustConfig = {
  id: string;
  position: Vec2;
  radius: number;
  windSpeedDeltaKnots: number;
  windDirectionDeltaDeg: number;
  movementVector: Vec2;
};

export type WindFieldConfig = {
  baseDirectionDeg: number;
  baseSpeedKnots: number;
  oscillation: OscillationConfig;
  gusts: GustConfig[];
  zones: WindZoneState[];
};

export function oscillationDegAt(oscillation: OscillationConfig, timeSec: number): number {
  switch (oscillation.kind) {
    case "none":
      return 0;
    case "persistent": {
      const magnitude = Math.min(oscillation.maxShiftDeg, oscillation.shiftRateDegPerSec * timeSec);
      return oscillation.shiftDirection === "right" ? magnitude : -magnitude;
    }
    case "pendulum":
      return oscillation.amplitudeDeg * Math.sin((2 * Math.PI * timeSec) / oscillation.periodSec + oscillation.phase);
  }
}

export function globalWindAt(config: WindFieldConfig, timeSec: number): WindState {
  const oscillationDeg = oscillationDegAt(config.oscillation, timeSec);
  return {
    directionDeg: normalizeDeg(config.baseDirectionDeg + oscillationDeg),
    speedKnots: config.baseSpeedKnots,
    oscillationDeg
  };
}

export function gustPositionAt(gust: GustConfig, timeSec: number): Vec2 {
  return {
    x: gust.position.x + gust.movementVector.x * timeSec,
    y: gust.position.y + gust.movementVector.y * timeSec
  };
}

export function getLocalWind(config: WindFieldConfig, position: Vec2, timeSec: number): { directionDeg: number; speedKnots: number } {
  const global = globalWindAt(config, timeSec);
  let directionDeg = global.directionDeg;
  let speedKnots = global.speedKnots;

  for (const gust of config.gusts) {
    const center = gustPositionAt(gust, timeSec);
    const dist = Math.hypot(position.x - center.x, position.y - center.y);
    if (dist >= gust.radius) continue;
    const strength = 1 - dist / gust.radius;
    speedKnots += gust.windSpeedDeltaKnots * strength;
    directionDeg += gust.windDirectionDeltaDeg * strength;
  }

  for (const zone of config.zones) {
    const inside =
      position.x >= zone.bounds.x &&
      position.x <= zone.bounds.x + zone.bounds.width &&
      position.y >= zone.bounds.y &&
      position.y <= zone.bounds.y + zone.bounds.height;
    if (!inside) continue;
    speedKnots += zone.speedDeltaKnots;
    directionDeg += zone.shiftDeg;
  }

  return {
    directionDeg: normalizeDeg(directionDeg),
    speedKnots: clamp(speedKnots, 0, Number.POSITIVE_INFINITY)
  };
}
