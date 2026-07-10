export type BoatId = "red" | "blue" | "green" | "yellow";

export type Vec2 = {
  x: number;
  y: number;
};

export type BoatState = {
  id: BoatId;
  name: string;
  color: string;
  boatType: "op" | "topper";
  position: Vec2;
  headingDeg: number;
  /** Speed through water (STW) in px/s. */
  speed: number;
  /** Speed over ground (SOG) vector in px/s. */
  velocity: Vec2;
  rudderAngleDeg: number;
  sailAngleDeg: number;
  twaDeg: number;
  tack: "port" | "starboard";
  tackTimerSec: number;
  sailEfficiency: number;
  /** Index into the course leg order: 0..marks.length-1 targets a mark, marks.length targets the finish line. */
  legIndex: number;
  finished: boolean;
  startStatus: "prestart" | "ocs" | "started";
  /** Accumulated bearing sweep (deg) around the current target mark; sign encodes direction. */
  markSweepDeg: number;
  lastMarkBearingDeg?: number;
  tackCount: number;
  penaltyCount: number;
  penaltyUntilMs?: number;
  track: Vec2[];
};

export type RaceEventKind = "start" | "ocs" | "ocs-cleared" | "mark" | "finish" | "rule" | "penalty-end";

export type RaceEvent = {
  id: string;
  timeMs: number;
  kind: RaceEventKind;
  boatId?: BoatId;
  message: string;
};

export type WindState = {
  directionDeg: number;
  speedKnots: number;
  oscillationDeg: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WindZoneState = {
  id: string;
  bounds: Rect;
  speedDeltaKnots: number;
  shiftDeg: number;
  color: string;
  alpha: number;
  phase: number;
  phaseSpeed: number;
};

export type RacePhase = "prestart" | "racing" | "finished" | "paused";

export type RaceState = {
  phase: RacePhase;
  countdownMs: number;
  elapsedMs: number;
  winner?: BoatId;
  ruleEvents: RuleEvent[];
  events: RaceEvent[];
  finishOrder: { boatId: BoatId; timeMs: number }[];
};

export type BoatControls = {
  /** Normalized rudder command in [-1, 1]; the only axis the sailing gamepad provides. */
  rudder: number;
};

export type RuleEvent = {
  id: string;
  timeMs: number;
  rule: "10" | "11" | "12" | "13" | "15" | "16";
  severity: "warning" | "breach";
  offenderId: BoatId;
  rightOfWayId: BoatId;
  message: string;
};

export type AppView =
  | "home"
  | "intro"
  | "lessons"
  | "lessonBoat"
  | "lessonWind"
  | "lessonRules"
  | "lessonRaceFlow"
  | "setup"
  | "race"
  | "results";

export type LineSegment = {
  left: Vec2;
  right: Vec2;
};

export type OverlaySettings = {
  wind: boolean;
  tracks: boolean;
  laylines: boolean;
  noGoZone: boolean;
};
