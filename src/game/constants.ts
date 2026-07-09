import type { BoatState, CurrentZone, OverlaySettings, RaceState, WindState, WindZoneState } from "./types";
import type { WindFieldConfig } from "../sim/wind/windField";
import { PIXELS_PER_KNOT } from "../sim/boat/units";

export const WORLD = {
  width: 2800,
  height: 1800
};

export const INITIAL_RACE: RaceState = {
  phase: "prestart",
  countdownMs: 30_000,
  elapsedMs: 0,
  ruleEvents: [],
  events: [],
  finishOrder: []
};

export const INITIAL_WIND: WindState = {
  directionDeg: 0,
  speedKnots: 12,
  oscillationDeg: 0
};

const INITIAL_BOAT_SPEED = 3.2 * PIXELS_PER_KNOT;

export const INITIAL_OVERLAYS: OverlaySettings = {
  wind: true,
  current: true,
  tracks: true,
  laylines: true,
  noGoZone: true
};

export const INITIAL_BOATS: BoatState[] = [
  {
    id: "red",
    name: "红船",
    color: "#ff533d",
    position: { x: 1260, y: 1670 },
    headingDeg: 350,
    speed: INITIAL_BOAT_SPEED,
    velocity: { x: 0, y: 0 },
    boatType: "op",
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 0,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    startStatus: "prestart",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  },
  {
    id: "green",
    name: "绿船",
    color: "#43d17a",
    position: { x: 1120, y: 1720 },
    headingDeg: 342,
    speed: INITIAL_BOAT_SPEED,
    velocity: { x: 0, y: 0 },
    boatType: "op",
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 0,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    startStatus: "prestart",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  },
  {
    id: "yellow",
    name: "黄船",
    color: "#ffd34d",
    position: { x: 1680, y: 1720 },
    headingDeg: 18,
    speed: INITIAL_BOAT_SPEED,
    velocity: { x: 0, y: 0 },
    boatType: "op",
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 0,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    startStatus: "prestart",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  },
  {
    id: "blue",
    name: "蓝船",
    color: "#1597ff",
    position: { x: 1540, y: 1670 },
    headingDeg: 10,
    speed: INITIAL_BOAT_SPEED,
    velocity: { x: 0, y: 0 },
    boatType: "op",
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 0,
    tack: "starboard",
    tackTimerSec: 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    startStatus: "prestart",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  }
];

export const INITIAL_WIND_ZONES: WindZoneState[] = [
  {
    id: "left-pressure-lift",
    bounds: { x: 0, y: 0, width: 930, height: 1800 },
    speedDeltaKnots: 1.8,
    shiftDeg: -7,
    color: "#063f62",
    alpha: 0.28,
    phase: 0,
    phaseSpeed: 0.18
  },
  {
    id: "middle-soft-header",
    bounds: { x: 930, y: 0, width: 930, height: 1800 },
    speedDeltaKnots: -0.7,
    shiftDeg: 4,
    color: "#3bbfe8",
    alpha: 0.1,
    phase: 1.4,
    phaseSpeed: 0.12
  },
  {
    id: "right-pressure-header",
    bounds: { x: 1860, y: 0, width: 940, height: 1800 },
    speedDeltaKnots: 1.1,
    shiftDeg: 8,
    color: "#0a5378",
    alpha: 0.22,
    phase: 2.2,
    phaseSpeed: 0.16
  },
  {
    id: "mark-band",
    bounds: { x: 0, y: 0, width: 2800, height: 520 },
    speedDeltaKnots: 0.9,
    shiftDeg: -3,
    color: "#075174",
    alpha: 0.16,
    phase: 0.7,
    phaseSpeed: 0.1
  }
];

export const INITIAL_CURRENTS: CurrentZone[] = [
  { id: "left-river", center: { x: 650, y: 960 }, radius: 430, vector: { x: 11, y: -3 } },
  { id: "right-counter", center: { x: 2200, y: 1050 }, radius: 510, vector: { x: -9, y: 6 } },
  { id: "mark-current", center: { x: 1500, y: 410 }, radius: 360, vector: { x: 5, y: 8 } }
];

export const INITIAL_WIND_FIELD: WindFieldConfig = {
  baseDirectionDeg: 0,
  baseSpeedKnots: 12,
  oscillation: { kind: "pendulum", amplitudeDeg: 9, periodSec: 40, phase: 0 },
  gusts: [],
  zones: INITIAL_WIND_ZONES
};
