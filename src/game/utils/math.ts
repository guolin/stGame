import type { Vec2 } from "../types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function angleDifferenceDeg(a: number, b: number) {
  const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return diff > 180 ? 360 - diff : diff;
}

export function headingToVector(deg: number): Vec2 {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
}

export function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}
