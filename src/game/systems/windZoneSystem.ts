import type { WindZoneState } from "../types";

/**
 * Advances the purely visual pulse phase of each zone. The tactical wind
 * effect of zones is computed by src/sim/wind/windField.ts.
 */
export function updateWindZones(zones: WindZoneState[], dt: number): WindZoneState[] {
  return zones.map((zone) => ({
    ...zone,
    phase: zone.phase + zone.phaseSpeed * dt
  }));
}
