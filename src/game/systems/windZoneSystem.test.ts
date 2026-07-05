import { describe, expect, it } from "vitest";
import { updateWindZones } from "./windZoneSystem";
import type { WindZoneState } from "../types";

const zones: WindZoneState[] = [
  {
    id: "strong-left",
    bounds: { x: 0, y: 0, width: 500, height: 500 },
    speedDeltaKnots: 2,
    shiftDeg: -8,
    color: "#0a5276",
    alpha: 0.18,
    phase: 0,
    phaseSpeed: 0.2
  },
  {
    id: "soft-right",
    bounds: { x: 500, y: 0, width: 500, height: 500 },
    speedDeltaKnots: -1.5,
    shiftDeg: 6,
    color: "#63d7ff",
    alpha: 0.1,
    phase: 1,
    phaseSpeed: 0.1
  }
];

describe("updateWindZones", () => {
  it("slowly changes zone phase without moving the tactical regions", () => {
    const updated = updateWindZones(zones, 2);

    expect(updated[0].bounds).toEqual(zones[0].bounds);
    expect(updated[0].phase).toBeCloseTo(0.4);
    expect(updated[1].phase).toBeCloseTo(1.2);
  });
});
