import { describe, expect, it } from "vitest";
import { getLocalWind, globalWindAt, gustPositionAt } from "./windField";
import type { WindFieldConfig } from "./windField";

const base: WindFieldConfig = {
  baseDirectionDeg: 30,
  baseSpeedKnots: 12,
  oscillation: { kind: "none" },
  gusts: [],
  zones: []
};

describe("globalWindAt", () => {
  it("returns the base wind when there is no oscillation", () => {
    const wind = globalWindAt(base, 100);
    expect(wind.directionDeg).toBe(30);
    expect(wind.speedKnots).toBe(12);
  });

  it("applies a persistent shift at the configured rate, capped at maxShift", () => {
    const config: WindFieldConfig = {
      ...base,
      oscillation: { kind: "persistent", shiftDirection: "right", shiftRateDegPerSec: 0.5, maxShiftDeg: 10 }
    };
    expect(globalWindAt(config, 10).directionDeg).toBeCloseTo(35, 6);
    expect(globalWindAt(config, 100).directionDeg).toBeCloseTo(40, 6);

    const left: WindFieldConfig = {
      ...base,
      oscillation: { kind: "persistent", shiftDirection: "left", shiftRateDegPerSec: 0.5, maxShiftDeg: 10 }
    };
    expect(globalWindAt(left, 10).directionDeg).toBeCloseTo(25, 6);
  });

  it("applies a pendulum oscillation around the base direction", () => {
    const config: WindFieldConfig = {
      ...base,
      oscillation: { kind: "pendulum", amplitudeDeg: 8, periodSec: 40, phase: 0 }
    };
    expect(globalWindAt(config, 0).directionDeg).toBeCloseTo(30, 6);
    expect(globalWindAt(config, 10).directionDeg).toBeCloseTo(38, 6);
    expect(globalWindAt(config, 30).directionDeg).toBeCloseTo(22, 6);
  });
});

describe("gusts", () => {
  const gust = {
    id: "g1",
    position: { x: 1000, y: 1000 },
    radius: 200,
    windSpeedDeltaKnots: 4,
    windDirectionDeltaDeg: -6,
    movementVector: { x: 10, y: 0 }
  };

  it("moves the gust deterministically over time", () => {
    expect(gustPositionAt(gust, 0)).toEqual({ x: 1000, y: 1000 });
    expect(gustPositionAt(gust, 30)).toEqual({ x: 1300, y: 1000 });
  });

  it("applies full effect at the gust center and none outside the radius", () => {
    const config: WindFieldConfig = { ...base, gusts: [gust] };
    const center = getLocalWind(config, { x: 1000, y: 1000 }, 0);
    expect(center.speedKnots).toBeCloseTo(16, 6);
    expect(center.directionDeg).toBeCloseTo(24, 6);

    const outside = getLocalWind(config, { x: 1400, y: 1000 }, 0);
    expect(outside.speedKnots).toBeCloseTo(12, 6);
    expect(outside.directionDeg).toBeCloseTo(30, 6);
  });

  it("fades the gust effect linearly toward the edge", () => {
    const config: WindFieldConfig = { ...base, gusts: [gust] };
    const halfway = getLocalWind(config, { x: 1100, y: 1000 }, 0);
    expect(halfway.speedKnots).toBeCloseTo(14, 6);
  });
});

describe("wind zones", () => {
  it("adds the zone speed and direction delta inside a rectangular zone", () => {
    const config: WindFieldConfig = {
      ...base,
      zones: [
        {
          id: "z1",
          bounds: { x: 0, y: 0, width: 500, height: 500 },
          speedDeltaKnots: 2,
          shiftDeg: 5,
          color: "#000000",
          alpha: 0.2,
          phase: 0,
          phaseSpeed: 0
        }
      ]
    };
    const inside = getLocalWind(config, { x: 100, y: 100 }, 0);
    expect(inside.speedKnots).toBeCloseTo(14, 6);
    expect(inside.directionDeg).toBeCloseTo(35, 6);

    const outside = getLocalWind(config, { x: 600, y: 600 }, 0);
    expect(outside.speedKnots).toBeCloseTo(12, 6);
  });

  it("never returns a negative wind speed", () => {
    const config: WindFieldConfig = {
      ...base,
      baseSpeedKnots: 1,
      gusts: [
        {
          id: "lull",
          position: { x: 0, y: 0 },
          radius: 100,
          windSpeedDeltaKnots: -10,
          windDirectionDeltaDeg: 0,
          movementVector: { x: 0, y: 0 }
        }
      ]
    };
    expect(getLocalWind(config, { x: 0, y: 0 }, 0).speedKnots).toBe(0);
  });
});
