import type { BoatId, BoatState } from "../../game/types";
import { distance, headingToVector, normalizeDeg } from "../../game/utils/math";

/**
 * Explainable umpire for the core right-of-way rules (RRS 10-13) with the
 * right-of-way limitations of rules 15/16. Pure and deterministic: state in,
 * state out, judgements as data. UI text lives in the messages it emits.
 */

export type RuleNumber = "10" | "11" | "12" | "13" | "15" | "16";

export type RuleJudgement = {
  type: "warning" | "breach";
  rule: RuleNumber;
  offenderId: BoatId;
  rightOfWayId: BoatId;
  message: string;
};

type PairState = {
  lastRowId?: BoatId;
  rowSinceMs: number;
  lastWarningMs: number;
  lastBreachMs: number;
};

export type RulesEngineState = {
  pairs: Record<string, PairState>;
  /** Recent headings per boat (~1s of history) for detecting sharp course changes. */
  headings: Record<string, number[]>;
};

export const COLLISION_RADIUS = 76;
const WARNING_RADIUS = 190;
const WARNING_COOLDOWN_MS = 4000;
const BREACH_COOLDOWN_MS = 2500;
const ROW_FRESH_MS = 1500;
const SHARP_TURN_DEG = 25;
const HEADING_HISTORY = 60;
/** Distance along the leader's heading beyond which the other boat counts as clear astern. */
const CLEAR_ASTERN_OFFSET = 55;

export function createRulesEngineState(): RulesEngineState {
  return { pairs: {}, headings: {} };
}

type StepRulesInput = {
  boats: BoatState[];
  activeBoatIds: BoatId[];
  windFromDeg: number;
  elapsedMs: number;
  state: RulesEngineState;
};

export function stepRules({ boats, activeBoatIds, windFromDeg, elapsedMs, state }: StepRulesInput): {
  state: RulesEngineState;
  events: RuleJudgement[];
} {
  const active = boats.filter((boat) => activeBoatIds.includes(boat.id));
  const events: RuleJudgement[] = [];

  const headings: Record<string, number[]> = { ...state.headings };
  for (const boat of active) {
    const history = [...(headings[boat.id] ?? []), boat.headingDeg];
    headings[boat.id] = history.slice(-HEADING_HISTORY);
  }

  const pairs: Record<string, PairState> = { ...state.pairs };

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      const key = pairKey(a.id, b.id);
      const pair: PairState = pairs[key] ?? { rowSinceMs: elapsedMs, lastWarningMs: -Infinity, lastBreachMs: -Infinity };

      const relation = relate(a, b, windFromDeg);
      if (!relation) {
        pairs[key] = pair;
        continue;
      }

      const { rowBoat, giveWayBoat, rule } = relation;

      // track when right of way last changed hands (rule 15)
      let rowSinceMs = pair.rowSinceMs;
      if (pair.lastRowId !== rowBoat.id) {
        rowSinceMs = elapsedMs;
      }

      const dist = distance(a.position, b.position);

      if (dist < WARNING_RADIUS && dist >= COLLISION_RADIUS && isClosing(a, b) && elapsedMs - pair.lastWarningMs > WARNING_COOLDOWN_MS) {
        events.push({
          type: "warning",
          rule,
          offenderId: giveWayBoat.id,
          rightOfWayId: rowBoat.id,
          message: warningText(rule, giveWayBoat, rowBoat)
        });
        pairs[key] = { lastRowId: rowBoat.id, rowSinceMs, lastWarningMs: elapsedMs, lastBreachMs: pair.lastBreachMs };
        continue;
      }

      if (dist < COLLISION_RADIUS && elapsedMs - pair.lastBreachMs > BREACH_COOLDOWN_MS) {
        // Rules 15/16: the right-of-way boat cannot ambush the give-way boat.
        const rowFresh = elapsedMs - rowSinceMs < ROW_FRESH_MS && pair.lastRowId !== undefined && pair.lastRowId !== rowBoat.id;
        const rowTurnedSharply = headingSwing(headings[rowBoat.id] ?? []) > SHARP_TURN_DEG;

        let judgement: RuleJudgement;
        if (rowTurnedSharply) {
          judgement = {
            type: "breach",
            rule: "16",
            offenderId: rowBoat.id,
            rightOfWayId: giveWayBoat.id,
            message: `${rowBoat.name} 原本拥有航权，但改变航向时没有给 ${giveWayBoat.name} 足够的避让空间，违反规则 16。处罚：减速 3 秒。`
          };
        } else if (rowFresh) {
          judgement = {
            type: "breach",
            rule: "15",
            offenderId: rowBoat.id,
            rightOfWayId: giveWayBoat.id,
            message: `${rowBoat.name} 刚取得航权，必须先给 ${giveWayBoat.name} 避让空间，违反规则 15。处罚：减速 3 秒。`
          };
        } else {
          judgement = {
            type: "breach",
            rule,
            offenderId: giveWayBoat.id,
            rightOfWayId: rowBoat.id,
            message: breachText(rule, giveWayBoat, rowBoat)
          };
        }
        events.push(judgement);
        pairs[key] = { lastRowId: rowBoat.id, rowSinceMs, lastWarningMs: pair.lastWarningMs, lastBreachMs: elapsedMs };
        continue;
      }

      pairs[key] = { lastRowId: rowBoat.id, rowSinceMs, lastWarningMs: pair.lastWarningMs, lastBreachMs: pair.lastBreachMs };
    }
  }

  return { state: { pairs, headings }, events };
}

type Relation = {
  rowBoat: BoatState;
  giveWayBoat: BoatState;
  rule: RuleNumber;
};

/** Determine the give-way relationship between two boats per RRS 10-13. */
export function relate(a: BoatState, b: BoatState, windFromDeg: number): Relation | undefined {
  // Rule 13: a boat past head to wind must keep clear until on a close-hauled course.
  const aTacking = isTacking(a);
  const bTacking = isTacking(b);
  if (aTacking && !bTacking) return { rowBoat: b, giveWayBoat: a, rule: "13" };
  if (bTacking && !aTacking) return { rowBoat: a, giveWayBoat: b, rule: "13" };

  // Rule 10: opposite tacks.
  if (a.tack !== b.tack) {
    const portBoat = a.tack === "port" ? a : b;
    const starboardBoat = a.tack === "port" ? b : a;
    return { rowBoat: starboardBoat, giveWayBoat: portBoat, rule: "10" };
  }

  // Same tack: overlapped or clear astern (rules 11/12).
  const aBehindB = isClearAstern(a, b);
  const bBehindA = isClearAstern(b, a);
  if (!aBehindB && !bBehindA) {
    const windUnit = headingToVector(windFromDeg);
    const upwindness = (boat: BoatState) => boat.position.x * windUnit.x + boat.position.y * windUnit.y;
    const aWindward = upwindness(a) > upwindness(b);
    const windward = aWindward ? a : b;
    const leeward = aWindward ? b : a;
    return { rowBoat: leeward, giveWayBoat: windward, rule: "11" };
  }
  const astern = aBehindB ? a : b;
  const ahead = aBehindB ? b : a;
  return { rowBoat: ahead, giveWayBoat: astern, rule: "12" };
}

function isTacking(boat: BoatState): boolean {
  return boat.tackTimerSec > 0 && boat.twaDeg < 50;
}

/** True if `boat` is clear astern of `other`. */
function isClearAstern(boat: BoatState, other: BoatState): boolean {
  const forward = headingToVector(other.headingDeg);
  const relX = boat.position.x - other.position.x;
  const relY = boat.position.y - other.position.y;
  return relX * forward.x + relY * forward.y < -CLEAR_ASTERN_OFFSET;
}

function isClosing(a: BoatState, b: BoatState): boolean {
  const relVx = b.velocity.x - a.velocity.x;
  const relVy = b.velocity.y - a.velocity.y;
  const relX = b.position.x - a.position.x;
  const relY = b.position.y - a.position.y;
  return relVx * relX + relVy * relY < 0;
}

/** Largest heading change over the recorded history window. */
function headingSwing(history: number[]): number {
  if (history.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < history.length; index += 1) {
    total += signedDelta(history[index - 1], history[index]);
  }
  return Math.abs(total);
}

function signedDelta(fromDeg: number, toDeg: number): number {
  let delta = normalizeDeg(toDeg) - normalizeDeg(fromDeg);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function pairKey(a: BoatId, b: BoatId): string {
  return [a, b].sort().join("|");
}

const RULE_TITLE: Record<RuleNumber, string> = {
  "10": "左舷受风船避让右舷受风船",
  "11": "上风船避让下风船",
  "12": "后船避让前船",
  "13": "换舷中的船避让其他船",
  "15": "刚取得航权需给避让空间",
  "16": "改变航向需给避让空间"
};

export function ruleTitle(rule: RuleNumber): string {
  return RULE_TITLE[rule];
}

function warningText(rule: RuleNumber, giveWay: BoatState, row: BoatState): string {
  switch (rule) {
    case "10":
      return `${giveWay.name} 应避让：左舷受风船正在接近右舷受风的 ${row.name}`;
    case "11":
      return `${giveWay.name} 应避让：上风船正在逼近下风的 ${row.name}`;
    case "12":
      return `${giveWay.name} 应避让：后船正在追上前船 ${row.name}`;
    case "13":
      return `${giveWay.name} 应避让：换舷尚未完成，${row.name} 拥有航权`;
    default:
      return `${giveWay.name} 应给 ${row.name} 避让空间`;
  }
}

function breachText(rule: RuleNumber, offender: BoatState, row: BoatState): string {
  switch (rule) {
    case "10":
      return `${offender.name} 违反规则 10：左舷受风船未避让右舷受风的 ${row.name}。处罚：减速 3 秒。`;
    case "11":
      return `${offender.name} 违反规则 11：上风船未避让下风的 ${row.name}。处罚：减速 3 秒。`;
    case "12":
      return `${offender.name} 违反规则 12：后船未避让前船 ${row.name}。处罚：减速 3 秒。`;
    case "13":
      return `${offender.name} 违反规则 13：换舷中未避让 ${row.name}。处罚：减速 3 秒。`;
    default:
      return `${offender.name} 犯规。处罚：减速 3 秒。`;
  }
}
