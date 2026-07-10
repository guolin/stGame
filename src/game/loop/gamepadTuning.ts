export type GamepadSteeringSettings = {
  /** Normalized deadzone in [0, 1]. */
  deadzone: number;
  /** End of the cubic fine-control region, normalized in [0, 1]. */
  precisionPoint: number;
  /** Start of the fast-growth region, normalized in [0, 1]. */
  boostPoint: number;
};

export const DEFAULT_GAMEPAD_STEERING: GamepadSteeringSettings = {
  deadzone: 0.2,
  precisionPoint: 0.6,
  boostPoint: 0.8
};

const MIN_POINT_GAP = 0.05;

export function sanitizeGamepadSteeringSettings(settings: GamepadSteeringSettings): GamepadSteeringSettings {
  const deadzone = clamp01(settings.deadzone);
  const precisionPoint = Math.max(deadzone + MIN_POINT_GAP, Math.min(0.95, settings.precisionPoint));
  const boostPoint = Math.max(precisionPoint + MIN_POINT_GAP, Math.min(1, settings.boostPoint));
  return { deadzone, precisionPoint, boostPoint };
}

export function gamepadSteeringResponse(normalizedMagnitude: number, settings = DEFAULT_GAMEPAD_STEERING) {
  const { deadzone, precisionPoint, boostPoint } = sanitizeGamepadSteeringSettings(settings);
  const magnitude = clamp01(normalizedMagnitude);
  if (magnitude <= deadzone) return 0;

  const precisionOutput = 0.125;
  const boostOutput = 0.42;

  if (magnitude <= precisionPoint) {
    const t = (magnitude - deadzone) / (precisionPoint - deadzone);
    return precisionOutput * t ** 3;
  }

  if (magnitude <= boostPoint) {
    const t = smoothstep((magnitude - precisionPoint) / (boostPoint - precisionPoint));
    return precisionOutput + (boostOutput - precisionOutput) * t;
  }

  const t = (magnitude - boostPoint) / (1 - boostPoint);
  return boostOutput + (1 - boostOutput) * (1 - (1 - t) ** 3);
}

function smoothstep(t: number) {
  const clamped = clamp01(t);
  return clamped * clamped * (3 - 2 * clamped);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
