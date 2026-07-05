import { angleDifferenceDeg, clamp, lerp } from "../utils/math";

const POLAR_TABLE = [
  { angle: 0, multiplier: 0 },
  { angle: 35, multiplier: 0.15 },
  { angle: 40, multiplier: 0.65 },
  { angle: 60, multiplier: 0.85 },
  { angle: 90, multiplier: 1 },
  { angle: 135, multiplier: 0.82 },
  { angle: 180, multiplier: 0.7 }
];

export function polarMultiplier(windAngleDeg: number) {
  const angle = clamp(angleDifferenceDeg(windAngleDeg, 0), 0, 180);

  for (let index = 0; index < POLAR_TABLE.length - 1; index += 1) {
    const current = POLAR_TABLE[index];
    const next = POLAR_TABLE[index + 1];
    if (angle >= current.angle && angle <= next.angle) {
      const t = (angle - current.angle) / (next.angle - current.angle);
      return lerp(current.multiplier, next.multiplier, t);
    }
  }

  return POLAR_TABLE[POLAR_TABLE.length - 1].multiplier;
}
