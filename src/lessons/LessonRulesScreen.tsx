import { useRef, useState } from "react";
import type { BoatState, Vec2 } from "../game/types";
import { distance, headingToVector, normalizeDeg } from "../game/utils/math";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { RuleNumber, RulesEngineState } from "../sim/rules/rulesEngine";
import { createRulesEngineState, ruleTitle, stepRules } from "../sim/rules/rulesEngine";
import { useGameStore } from "../store/gameStore";
import { LessonStage } from "./LessonStage";
import { useFixedStepLoop } from "./useFixedStepLoop";

const WIND_FROM = 0;
const QUESTION_DISTANCE = 210;
const AVOID_DISTANCE = 250;

type ScenarioBoat = {
  id: "red" | "blue";
  name: string;
  color: string;
  start: Vec2;
  headingDeg: number;
  speedPx: number;
  tack: "port" | "starboard";
  twaDeg: number;
  tackTimerSec?: number;
};

type Scenario = {
  id: string;
  rule: RuleNumber;
  title: string;
  setupText: string;
  boats: [ScenarioBoat, ScenarioBoat];
  giveWayId: "red" | "blue";
  avoidHeadingDeg: number;
  avoidText: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "rule10",
    rule: "10",
    title: "左舷船 vs 右舷船交叉",
    setupText: "两条船在不同舷受风上交叉相遇：红船左舷受风，蓝船右舷受风。",
    boats: [
      { id: "red", name: "红船", color: "#ff533d", start: { x: 950, y: 1150 }, headingDeg: 45, speedPx: 21, tack: "port", twaDeg: 45 },
      { id: "blue", name: "蓝船", color: "#1597ff", start: { x: 1850, y: 1150 }, headingDeg: 315, speedPx: 21, tack: "starboard", twaDeg: 45 }
    ],
    giveWayId: "red",
    avoidHeadingDeg: 100,
    avoidText: "红船提前转向下风，从蓝船船尾后方通过——这就是正确的避让动作。"
  },
  {
    id: "rule11",
    rule: "11",
    title: "上风船 vs 下风船",
    setupText: "两条船同为右舷受风并且重叠：红船在上风位置，正在向下风压过来。",
    boats: [
      { id: "red", name: "红船", color: "#ff533d", start: { x: 1750, y: 960 }, headingDeg: 290, speedPx: 22, tack: "starboard", twaDeg: 70 },
      { id: "blue", name: "蓝船", color: "#1597ff", start: { x: 1430, y: 1080 }, headingDeg: 315, speedPx: 19, tack: "starboard", twaDeg: 45 }
    ],
    giveWayId: "red",
    avoidHeadingDeg: 330,
    avoidText: "红船（上风船）转回上风，给下风船留出空间——下风船有权保持航线。"
  },
  {
    id: "rule12",
    rule: "12",
    title: "后船追前船",
    setupText: "两条船同舷顺风航行：红船从正后方追上速度较慢的蓝船。",
    boats: [
      { id: "red", name: "红船", color: "#ff533d", start: { x: 1430, y: 830 }, headingDeg: 195, speedPx: 26, tack: "starboard", twaDeg: 165 },
      { id: "blue", name: "蓝船", color: "#1597ff", start: { x: 1400, y: 1120 }, headingDeg: 200, speedPx: 13, tack: "starboard", twaDeg: 160 }
    ],
    giveWayId: "red",
    avoidHeadingDeg: 155,
    avoidText: "后船提前改变航向，从旁边超越而不是撞上前船船尾。"
  },
  {
    id: "rule13",
    rule: "13",
    title: "正在换舷的船",
    setupText: "红船正处于迎风换舷过程中（船头还没落到新航向），蓝船正常抢风驶来。",
    boats: [
      {
        id: "red",
        name: "红船",
        color: "#ff533d",
        start: { x: 1400, y: 940 },
        headingDeg: 355,
        speedPx: 7,
        tack: "starboard",
        twaDeg: 5,
        tackTimerSec: 1.5
      },
      { id: "blue", name: "蓝船", color: "#1597ff", start: { x: 1120, y: 1180 }, headingDeg: 45, speedPx: 20, tack: "port", twaDeg: 45 }
    ],
    giveWayId: "red",
    avoidHeadingDeg: 90,
    avoidText: "换舷中的船尽快完成转向并驶离对方航线——换舷期间它对所有船都要让路。"
  }
];

type Phase = "approach" | "question" | "resolving" | "verdict" | "avoided" | "missed";

type SimBoat = { position: Vec2; headingDeg: number; def: ScenarioBoat };

export function LessonRulesScreen() {
  const setView = useGameStore((state) => state.setView);

  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = SCENARIOS[scenarioIndex];

  const boatsRef = useRef<SimBoat[]>(spawnBoats(SCENARIOS[0]));
  const rulesRef = useRef<RulesEngineState>(createRulesEngineState());
  const tickRef = useRef(0);
  const closedInRef = useRef(false);

  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState<Phase>("approach");
  const [choice, setChoice] = useState<"red" | "blue" | undefined>();
  const [verdictMessage, setVerdictMessage] = useState<string | undefined>();
  const [avoidMode, setAvoidMode] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const avoidModeRef = useRef(avoidMode);
  avoidModeRef.current = avoidMode;

  const load = (index: number, avoid: boolean) => {
    setScenarioIndex(index);
    boatsRef.current = spawnBoats(SCENARIOS[index]);
    rulesRef.current = createRulesEngineState();
    tickRef.current = 0;
    closedInRef.current = false;
    setPhase("approach");
    setChoice(undefined);
    setVerdictMessage(undefined);
    setAvoidMode(avoid);
  };

  const running = phase === "approach" || phase === "resolving";

  useFixedStepLoop(() => {
    const current = SCENARIOS[scenarioIndex];
    tickRef.current += 1;
    const elapsedMs = (tickRef.current / 60) * 1000;
    const boats = boatsRef.current;
    const dist = distance(boats[0].position, boats[1].position);

    // pause once for the audience question, just before the boats meet
    if (!avoidModeRef.current && phaseRef.current === "approach" && dist < QUESTION_DISTANCE) {
      setPhase("question");
      return;
    }

    boatsRef.current = boats.map((boat) => {
      let headingDeg = boat.headingDeg;
      if (avoidModeRef.current && boat.def.id === current.giveWayId && dist < AVOID_DISTANCE) {
        headingDeg = approach(headingDeg, current.avoidHeadingDeg, 1.4);
      }
      const forward = headingToVector(headingDeg);
      const speed = boat.def.speedPx * 3.2;
      return {
        ...boat,
        headingDeg,
        position: {
          x: boat.position.x + (forward.x * speed) / 60,
          y: boat.position.y + (forward.y * speed) / 60
        }
      };
    });

    const judged = stepRules({
      boats: boatsRef.current.map((boat) => toBoatState(boat)),
      activeBoatIds: ["red", "blue"],
      windFromDeg: WIND_FROM,
      elapsedMs,
      state: rulesRef.current
    });
    rulesRef.current = judged.state;

    if (!avoidModeRef.current) {
      const breach = judged.events.find((event) => event.type === "breach");
      if (breach) {
        setVerdictMessage(breach.message);
        setPhase("verdict");
      } else if (tickRef.current > 60 * 18) {
        setPhase("missed");
      }
    } else {
      const newDist = distance(boatsRef.current[0].position, boatsRef.current[1].position);
      if (newDist < AVOID_DISTANCE) closedInRef.current = true;
      if (closedInRef.current && newDist > 420) {
        setPhase("avoided");
      }
    }

    setFrame((value) => value + 1);
  }, running);

  const answer = (picked: "red" | "blue") => {
    setChoice(picked);
    setPhase("resolving");
  };

  void frame;
  const correct = choice === scenario.giveWayId;

  return (
    <main className="lesson-screen">
      <header className="lesson-header">
        <div>
          <p className="eyebrow">讲解模式 · 比赛规则</p>
          <h1>你来当裁判：{scenario.title}</h1>
        </div>
        <div className="lesson-nav">
          <button type="button" onClick={() => setView("lessons")}>
            返回讲解目录
          </button>
        </div>
      </header>

      <div className="lesson-body">
        <section className="lesson-stage-panel">
          <LessonStage>
            <WaterLayer />
            <WindLayer wind={{ directionDeg: WIND_FROM, speedKnots: 12, oscillationDeg: 0 }} visible />
            {boatsRef.current.map((boat) => (
              <BoatSprite key={boat.def.id} boat={toBoatState(boat)} />
            ))}
          </LessonStage>

          {phase === "question" && (
            <div className="lesson-question">
              <strong>两船即将相遇——谁必须避让？</strong>
              <div className="question-buttons">
                {scenario.boats.map((boat) => (
                  <button key={boat.id} type="button" style={{ borderColor: boat.color }} onClick={() => answer(boat.id)}>
                    {boat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "verdict" && verdictMessage && (
            <div className={`lesson-banner ${correct ? "win" : "lose"}`}>
              <strong>{choice ? (correct ? "答对了！" : "再想想——") : ""}</strong> {verdictMessage}
            </div>
          )}

          {phase === "avoided" && <div className="lesson-banner win">避让成功，没有犯规。{scenario.avoidText}</div>}
          {phase === "missed" && <div className="lesson-banner win">两船擦肩而过，没有接触，也就没有判罚。</div>}
        </section>

        <aside className="lesson-side">
          <div className="lesson-status">
            <strong>
              规则 {scenario.rule} · {ruleTitle(scenario.rule)}
            </strong>
            <p>{scenario.setupText}</p>
          </div>

          <div className="scenario-buttons">
            {SCENARIOS.map((item, index) => (
              <button key={item.id} type="button" className={index === scenarioIndex ? "active" : ""} onClick={() => load(index, false)}>
                规则 {item.rule}
              </button>
            ))}
          </div>

          <div className="lesson-actions">
            <button type="button" className="accent" onClick={() => load(scenarioIndex, false)}>
              重播（犯规版本）
            </button>
            <button type="button" onClick={() => load(scenarioIndex, true)}>
              换一个结果（避让成功）
            </button>
          </div>

          <div className="lesson-hint">
            演示自动在相遇前暂停并提问；判决由比赛内同一套自动裁判给出，不是预先写死的答案。
          </div>
        </aside>
      </div>
    </main>
  );
}

function spawnBoats(scenario: Scenario): SimBoat[] {
  return scenario.boats.map((def) => ({ position: { ...def.start }, headingDeg: def.headingDeg, def }));
}

function toBoatState(boat: SimBoat): BoatState {
  const forward = headingToVector(boat.headingDeg);
  return {
    id: boat.def.id,
    name: boat.def.name,
    color: boat.def.color,
    boatType: "op",
    position: boat.position,
    headingDeg: boat.headingDeg,
    speed: boat.def.speedPx,
    velocity: { x: forward.x * boat.def.speedPx * 3.2, y: forward.y * boat.def.speedPx * 3.2 },
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: boat.def.twaDeg,
    tack: boat.def.tack,
    tackTimerSec: boat.def.tackTimerSec ?? 0,
    sailEfficiency: 1,
    legIndex: 0,
    finished: false,
    startStatus: "started",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  };
}

function approach(currentDeg: number, targetDeg: number, ratePerTick: number): number {
  let delta = normalizeDeg(targetDeg) - normalizeDeg(currentDeg);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  const step = Math.max(-ratePerTick, Math.min(ratePerTick, delta));
  return normalizeDeg(currentDeg + step);
}
