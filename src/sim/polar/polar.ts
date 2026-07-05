import { clamp } from "../../game/utils/math";

export type BoatType = "op" | "topper";

/**
 * Polar tables: speed through water in knots by TWS (columns) and TWA (rows).
 * Values are teaching-grade approximations for youth dinghies, not VPP output;
 * the shape matters (no-go, close-hauled, beam-reach peak, slow run).
 */
const TWS_STOPS = [4, 8, 12, 16, 20];
const TWA_STOPS = [0, 25, 35, 40, 45, 52, 60, 75, 90, 110, 135, 150, 180];

const OP_TABLE: number[][] = [
  // TWS:    4     8     12    16    20
  /*   0 */ [0.0, 0.0, 0.0, 0.0, 0.0],
  /*  25 */ [0.2, 0.3, 0.4, 0.4, 0.4],
  /*  35 */ [0.9, 1.2, 1.4, 1.5, 1.5],
  /*  40 */ [1.8, 2.4, 2.8, 2.9, 3.0],
  /*  45 */ [2.2, 2.9, 3.3, 3.5, 3.5],
  /*  52 */ [2.5, 3.2, 3.6, 3.8, 3.8],
  /*  60 */ [2.7, 3.4, 3.8, 4.0, 4.1],
  /*  75 */ [2.9, 3.7, 4.1, 4.3, 4.4],
  /*  90 */ [3.0, 3.8, 4.3, 4.5, 4.6],
  /* 110 */ [2.9, 3.7, 4.2, 4.5, 4.7],
  /* 135 */ [2.5, 3.3, 3.9, 4.3, 4.5],
  /* 150 */ [2.2, 2.9, 3.4, 3.8, 4.1],
  /* 180 */ [1.8, 2.4, 2.9, 3.3, 3.6]
];

const TOPPER_TABLE: number[][] = OP_TABLE.map((row) => row.map((v) => v * 1.3));

const TABLES: Record<BoatType, number[][]> = { op: OP_TABLE, topper: TOPPER_TABLE };

const NO_GO_ANGLE: Record<BoatType, number> = { op: 43, topper: 41 };

export const BOAT_TYPE_LABEL: Record<BoatType, string> = { op: "OP", topper: "Topper" };

export function getNoGoAngle(boatType: BoatType): number {
  return NO_GO_ANGLE[boatType];
}

export function getPolarSpeed(boatType: BoatType, twsKnots: number, twaDeg: number): number {
  const table = TABLES[boatType];
  const tws = clamp(twsKnots, TWS_STOPS[0], TWS_STOPS[TWS_STOPS.length - 1]);
  const twa = clamp(Math.abs(twaDeg), 0, 180);

  const col = segmentIndex(TWS_STOPS, tws);
  const row = segmentIndex(TWA_STOPS, twa);

  const tCol = (tws - TWS_STOPS[col]) / (TWS_STOPS[col + 1] - TWS_STOPS[col]);
  const tRow = (twa - TWA_STOPS[row]) / (TWA_STOPS[row + 1] - TWA_STOPS[row]);

  const top = lerp(table[row][col], table[row][col + 1], tCol);
  const bottom = lerp(table[row + 1][col], table[row + 1][col + 1], tCol);
  return lerp(top, bottom, tRow);
}

function segmentIndex(stops: number[], value: number): number {
  for (let index = 0; index < stops.length - 2; index += 1) {
    if (value <= stops[index + 1]) return index;
  }
  return stops.length - 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
