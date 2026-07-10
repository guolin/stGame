import { useCallback, useRef, useState } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState, Vec2 } from "../game/types";
import { clamp, distance, normalizeDeg } from "../game/utils/math";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { GraphicsShape } from "../game/rendering/GraphicsShape";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { BoatMotionState } from "../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../sim/boat/boatPhysics";
import type { OscillationConfig } from "../sim/wind/windField";
import { oscillationDegAt } from "../sim/wind/windField";
import { useGameStore } from "../store/gameStore";
import { LessonStage } from "./LessonStage";
import { WindHistoryStrip } from "./WindHistoryStrip";
import { useFixedStepLoop } from "./useFixedStepLoop";
import { FocusableButton } from "../app/navigation/FocusableButton";

const BASE_WIND_DEG = 0;
const TWS = 12;
const MARK: Vec2 = { x: 1400, y: 300 };
const MARK_REACH_RADIUS = 100;
const CLOSE_HAULED = 45;

type ShiftMode = "persistentRight" | "persistentLeft" | "pendulum";

const MODE_LABEL: Record<ShiftMode, string> = {
  persistentRight: "持续右摆",
  persistentLeft: "持续左摆",
  pendulum: "钟摆式风摆"
};

const MODE_OSC: Record<ShiftMode, OscillationConfig> = {
  persistentRight: { kind: "persistent", shiftDirection: "right", shiftRateDegPerSec: 0.4, maxShiftDeg: 14 },
  persistentLeft: { kind: "persistent", shiftDirection: "left", shiftRateDegPerSec: 0.4, maxShiftDeg: 14 },
  pendulum: { kind: "pendulum", amplitudeDeg: 10, periodSec: 30, phase: 0 }
};

const MODE_EXPLAIN: Record<ShiftMode, string> = {
  persistentRight: "风在持续往右摆：先走右边的船会越走越顺（被抬升），先走左边的船会被顶头。",
  persistentLeft: "风在持续往左摆：这次轮到左边的航线占便宜。同样的两条船，只是风变了。",
  pendulum: "风像钟摆一样来回摆。诀窍：被顶头（TWA 变小）时立刻换舷。用按钮试试你的时机！"
};

type SideStrategy = "left" | "right";

export function LessonWindScreen() {
  const setView = useGameStore((state) => state.setView);

  const [mode, setMode] = useState<ShiftMode>("persistentRight");
  const [running, setRunning] = useState(true);
  const [verdict, setVerdict] = useState<string | undefined>();
  const [history, setHistory] = useState<number[]>([]);
  const [playerTack, setPlayerTack] = useState<"port" | "starboard">("starboard");
  const playerTackRef = useRef(playerTack);
  playerTackRef.current = playerTack;

  const boatLRef = useRef<BoatMotionState>(spawn("left"));
  const boatRRef = useRef<BoatMotionState>(spawn("right"));
  const [renderBoats, setRenderBoats] = useState(() => ({ L: boatLRef.current, R: boatRRef.current }));
  const tickRef = useRef(0);
  const doneRef = useRef(false);

  const restart = (nextMode: ShiftMode = mode) => {
    setMode(nextMode);
    boatLRef.current = spawn("left");
    boatRRef.current = spawn("right");
    setRenderBoats({ L: boatLRef.current, R: boatRRef.current });
    setHistory([]);
    setVerdict(undefined);
    setPlayerTack("starboard");
    tickRef.current = 0;
    doneRef.current = false;
    setRunning(true);
  };

  useFixedStepLoop(() => {
    // demo runs at 4x wall time so a full beat to the mark takes ~25s, not minutes
    const TIME_WARP = 4;
    let windDir = BASE_WIND_DEG;
    const isPendulum = mode === "pendulum";

    for (let warp = 0; warp < TIME_WARP; warp += 1) {
      tickRef.current += 1;
      const timeSec = tickRef.current / 60;
      windDir = normalizeDeg(BASE_WIND_DEG + oscillationDegAt(MODE_OSC[mode], timeSec));
      const wind = { directionDeg: windDir, speedKnots: TWS };

      boatLRef.current = stepAutopilot(
        boatLRef.current,
        wind,
        isPendulum ? { kind: "manual", tack: playerTackRef.current } : { kind: "side", side: "left" }
      );
      boatRRef.current = stepAutopilot(boatRRef.current, wind, { kind: "side", side: "right" });
    }

    if (tickRef.current % 16 < TIME_WARP) {
      const latest = windDir;
      setHistory((prev) => [...prev, latest].slice(-260));
    }

    if (!doneRef.current) {
      const dl = distance(boatLRef.current.position, MARK);
      const dr = distance(boatRRef.current.position, MARK);
      if (dl < MARK_REACH_RADIUS || dr < MARK_REACH_RADIUS) {
        doneRef.current = true;
        const winner = dl < dr ? (isPendulum ? "你的船（左路）" : "黄船（左路）") : "蓝船（右路）";
        const gapMeters = Math.round(Math.abs(dl - dr) / 5.4);
        setVerdict(`${winner} 先到上风标，另一条船还差约 ${gapMeters} 米 —— 这就是${MODE_LABEL[mode]}造成的差距。`);
        setRunning(false);
      }
    }

    setRenderBoats({ L: boatLRef.current, R: boatRRef.current });
  }, running);

  const windDirNow = history[history.length - 1] ?? BASE_WIND_DEG;
  const yellow = toBoatState(renderBoats.L, "yellow", mode === "pendulum" ? "你的船" : "黄船 · 左路", "#ffd34d");
  const blue = toBoatState(renderBoats.R, "blue", "蓝船 · 右路", "#1597ff");

  const drawMark = useCallback((graphics: PixiGraphics) => {
    graphics.clear();
    graphics.circle(MARK.x, MARK.y, 56).stroke({ color: "#ffd36e", alpha: 0.86, width: 3 });
    graphics.circle(MARK.x, MARK.y, 23).fill("#ff8a18").stroke({ color: "#c94e08", width: 5 });
  }, []);

  return (
    <main className="lesson-screen">
      <header className="lesson-header">
        <div>
          <p className="eyebrow">讲解模式 · 风摆</p>
          <h1>风不是固定的：风摆决定哪条航线更快</h1>
        </div>
        <div className="lesson-nav">
          <FocusableButton type="button" onClick={() => setView("lessonRules")}>
            下一课：你来当裁判
          </FocusableButton>
          <FocusableButton type="button" onClick={() => setView("lessons")} autoFocus>
            返回讲解目录
          </FocusableButton>
        </div>
      </header>

      <div className="lesson-body">
        <section className="lesson-stage-panel">
          <LessonStage>
            <WaterLayer />
            <WindLayer wind={{ directionDeg: windDirNow, speedKnots: TWS, oscillationDeg: 0 }} visible />
            <GraphicsShape draw={drawMark} />
            <BoatSprite boat={yellow} />
            <BoatSprite boat={blue} />
          </LessonStage>
          {verdict && <div className="lesson-banner win">{verdict}</div>}
        </section>

        <aside className="lesson-side">
          <WindHistoryStrip history={history} baseDirectionDeg={BASE_WIND_DEG} />

          <div className="lesson-status">{MODE_EXPLAIN[mode]}</div>

          <div className="lesson-mode-buttons">
            {(Object.keys(MODE_LABEL) as ShiftMode[]).map((item) => (
              <FocusableButton key={item} type="button" className={mode === item ? "active" : ""} onClick={() => restart(item)}>
                {MODE_LABEL[item]}
              </FocusableButton>
            ))}
          </div>

          <div className="lesson-readouts">
            <span>
              {mode === "pendulum" ? "你的船" : "黄船"}距标 <strong>{Math.round(distance(renderBoats.L.position, MARK) / 5.4)}</strong> m
            </span>
            <span>
              蓝船距标 <strong>{Math.round(distance(renderBoats.R.position, MARK) / 5.4)}</strong> m
            </span>
          </div>

          {mode === "pendulum" && (
            <FocusableButton
              type="button"
              className="accent tack-button"
              onClick={() => setPlayerTack((tack) => (tack === "starboard" ? "port" : "starboard"))}
            >
              立即换舷（当前：{playerTack === "starboard" ? "右舷受风" : "左舷受风"}）
            </FocusableButton>
          )}

          <div className="lesson-actions">
            <FocusableButton type="button" onClick={() => restart()}>
              重新演示
            </FocusableButton>
            <FocusableButton type="button" onClick={() => setRunning((v) => !v)} disabled={doneRef.current}>
              {running ? "暂停" : "继续"}
            </FocusableButton>
          </div>
        </aside>
      </div>
    </main>
  );
}

type Strategy = { kind: "side"; side: SideStrategy } | { kind: "manual"; tack: "port" | "starboard" };

function stepAutopilot(
  motion: BoatMotionState,
  wind: { directionDeg: number; speedKnots: number },
  strategy: Strategy
): BoatMotionState {
  let desiredTack: "port" | "starboard";

  if (strategy.kind === "manual") {
    desiredTack = strategy.tack;
  } else {
    // hold the tack that leads to the chosen side, then tack on the layline to the mark
    desiredTack = strategy.side === "left" ? "starboard" : "port";
    const bearing = compassBearing(motion.position, MARK);
    const portLayline = normalizeDeg(wind.directionDeg + CLOSE_HAULED);
    const starboardLayline = normalizeDeg(wind.directionDeg - CLOSE_HAULED);
    if (strategy.side === "left" && Math.abs(signedDelta(bearing, portLayline)) < 4) desiredTack = "port";
    if (strategy.side === "right" && Math.abs(signedDelta(bearing, starboardLayline)) < 4) desiredTack = "starboard";
    if (motion.position.x < 500) desiredTack = "port";
    if (motion.position.x > 2300) desiredTack = "starboard";
  }

  const targetHeading =
    desiredTack === "starboard" ? normalizeDeg(wind.directionDeg - CLOSE_HAULED) : normalizeDeg(wind.directionDeg + CLOSE_HAULED);
  const rudder = clamp(signedDelta(motion.headingDeg, targetHeading) * 0.06, -1, 1);

  return stepBoatPhysics({
    motion,
    rudder,
    boatType: "op",
    wind,
    penaltyFactor: 1,
    dt: 1 / 60
  });
}

function spawn(side: SideStrategy): BoatMotionState {
  return createBoatMotionState({
    position: { x: side === "left" ? 1250 : 1550, y: 1560 },
    headingDeg: side === "left" ? 315 : 45,
    speed: 10
  });
}

function toBoatState(motion: BoatMotionState, id: BoatState["id"], name: string, color: string): BoatState {
  return {
    id,
    name,
    color,
    boatType: "op",
    ...motion,
    legIndex: 0,
    finished: false,
    startStatus: "started",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  };
}

function compassBearing(from: Vec2, to: Vec2): number {
  return normalizeDeg((Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI);
}

function signedDelta(fromDeg: number, toDeg: number): number {
  let delta = normalizeDeg(toDeg) - normalizeDeg(fromDeg);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}
