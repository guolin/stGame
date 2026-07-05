import { useCallback, useEffect, useRef, useState } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import { WORLD } from "../game/constants";
import type { BoatState, Vec2 } from "../game/types";
import { clamp, headingToVector, normalizeDeg } from "../game/utils/math";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { GraphicsShape } from "../game/rendering/GraphicsShape";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { BoatMotionState } from "../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../sim/boat/units";
import { getNoGoAngle } from "../sim/polar/polar";
import { useGameStore } from "../store/gameStore";
import { LessonStage } from "./LessonStage";
import { PolarDial } from "./PolarDial";
import { useFixedStepLoop } from "./useFixedStepLoop";

const WIND = { directionDeg: 0, speedKnots: 12 };
const CURRENT: Vec2 = { x: 16, y: 4 };
const PLAYER_SPAWN = { position: { x: 1000, y: 1500 }, headingDeg: 50 };
const GHOST_SPAWN = { position: { x: 1800, y: 1500 }, headingDeg: 310 };
const FINISH_Y = 320;

type RaceResult = "player" | "ghost" | undefined;

export function LessonBoatScreen() {
  const setView = useGameStore((state) => state.setView);

  const motionRef = useRef<BoatMotionState>(createBoatMotionState(PLAYER_SPAWN));
  const ghostRef = useRef<BoatMotionState | undefined>(undefined);
  const trackRef = useRef<Vec2[]>([]);
  const ghostTackRef = useRef<"left" | "right">("right");
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const rudderRef = useRef(0);

  const [frame, setFrame] = useState(0);
  const [rudder, setRudder] = useState(0);
  const [currentOn, setCurrentOn] = useState(false);
  const [raceResult, setRaceResult] = useState<RaceResult>(undefined);
  rudderRef.current = rudder;
  const currentOnRef = useRef(currentOn);
  currentOnRef.current = currentOn;
  const raceResultRef = useRef(raceResult);
  raceResultRef.current = raceResult;

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "KeyA" || event.code === "ArrowLeft") keysRef.current.left = true;
      if (event.code === "KeyD" || event.code === "ArrowRight") keysRef.current.right = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "KeyA" || event.code === "ArrowLeft") keysRef.current.left = false;
      if (event.code === "KeyD" || event.code === "ArrowRight") keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFixedStepLoop(() => {
    const current = currentOnRef.current ? CURRENT : { x: 0, y: 0 };

    // --- player boat ---
    const keyRudder = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    const command = keyRudder !== 0 ? keyRudder : rudderRef.current;
    motionRef.current = clampToWorld(
      stepBoatPhysics({
        motion: motionRef.current,
        rudder: command,
        boatType: "op",
        wind: WIND,
        current,
        penaltyFactor: 1,
        dt: 1 / 60
      })
    );

    const track = trackRef.current;
    const position = motionRef.current.position;
    const last = track[track.length - 1];
    if (!last || Math.hypot(last.x - position.x, last.y - position.y) > 8) {
      trackRef.current = [...track, { ...position }].slice(-240);
    }

    // --- ghost boat: VMG autopilot zigzag ---
    if (ghostRef.current) {
      const ghost = ghostRef.current;
      if (ghost.position.x < 700) ghostTackRef.current = "right";
      if (ghost.position.x > 2100) ghostTackRef.current = "left";
      const targetHeading = ghostTackRef.current === "right" ? 46 : 314;
      const delta = signedDelta(ghost.headingDeg, targetHeading);
      ghostRef.current = clampToWorld(
        stepBoatPhysics({
          motion: ghost,
          rudder: clamp(delta * 0.06, -1, 1),
          boatType: "op",
          wind: WIND,
          current,
          penaltyFactor: 1,
          dt: 1 / 60
        })
      );
    }

    if (ghostRef.current && !raceResultRef.current) {
      if (motionRef.current.position.y <= FINISH_Y) setRaceResult("player");
      else if (ghostRef.current.position.y <= FINISH_Y) setRaceResult("ghost");
    }

    setFrame((value) => value + 1);
  }, true);

  const startGhostRace = () => {
    trackRef.current = [];
    motionRef.current = createBoatMotionState(PLAYER_SPAWN);
    ghostRef.current = createBoatMotionState(GHOST_SPAWN);
    ghostTackRef.current = "left";
    setRaceResult(undefined);
  };

  const reset = () => {
    trackRef.current = [];
    motionRef.current = createBoatMotionState(PLAYER_SPAWN);
    ghostRef.current = undefined;
    setRaceResult(undefined);
  };

  void frame;
  const motion = motionRef.current;
  const stwKnots = motion.speed / PIXELS_PER_KNOT;
  const sogKnots = Math.hypot(motion.velocity.x, motion.velocity.y) / PIXELS_PER_KNOT;
  const noGo = getNoGoAngle("op");
  const inNoGo = motion.twaDeg < noGo;

  const status = inNoGo
    ? "顶风了！帆在抖，船正在失速——把船头转离风向"
    : motion.twaDeg < 55
      ? "迎风抢风航行：这是逼近上风标的最快角度"
      : motion.twaDeg < 110
        ? "横风航行：整条极曲线上最快的角度"
        : motion.twaDeg < 155
          ? "宽横风：依然很快，注意帆的另一侧"
          : "顺风航行：比想象中慢，很多船宁可走 Z 字";

  const playerBoat = toBoatState(motion, "red", "你的船", "#ff533d");
  const ghostBoat = ghostRef.current ? toBoatState(ghostRef.current, "green", "幽灵船", "#9aa7b0") : undefined;

  const drawOverlay = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      if (ghostBoat) {
        graphics.moveTo(200, FINISH_Y);
        graphics.lineTo(WORLD.width - 200, FINISH_Y);
        graphics.stroke({ color: "#9ff0c0", alpha: 0.7, width: 5 });
      }

      const track = trackRef.current;
      if (track.length > 1) {
        graphics.moveTo(track[0].x, track[0].y);
        track.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
        graphics.stroke({ color: "#ffd34d", alpha: 0.65, width: 4 });
      }

      const left = headingToVector(WIND.directionDeg - noGo);
      const right = headingToVector(WIND.directionDeg + noGo);
      const radius = 260;
      graphics.moveTo(playerBoat.position.x, playerBoat.position.y);
      graphics.lineTo(playerBoat.position.x + left.x * radius, playerBoat.position.y + left.y * radius);
      graphics.arc(playerBoat.position.x, playerBoat.position.y, radius, Math.atan2(left.y, left.x), Math.atan2(right.y, right.x));
      graphics.lineTo(playerBoat.position.x, playerBoat.position.y);
      graphics.fill({ color: inNoGo ? "#ff5a3c" : "#ffffff", alpha: inNoGo ? 0.2 : 0.07 });
    },
    [playerBoat.position.x, playerBoat.position.y, inNoGo, noGo, ghostBoat]
  );

  return (
    <main className="lesson-screen">
      <header className="lesson-header">
        <div>
          <p className="eyebrow">讲解模式 · 船只运行逻辑</p>
          <h1>风角实验台：角度不同，速度不同</h1>
        </div>
        <div className="lesson-nav">
          <button type="button" onClick={() => setView("lessonWind")}>
            下一课：风摆
          </button>
          <button type="button" onClick={() => setView("lessons")}>
            返回讲解目录
          </button>
        </div>
      </header>

      <div className="lesson-body">
        <section className="lesson-stage-panel">
          <LessonStage>
            <WaterLayer />
            <WindLayer wind={{ ...WIND, oscillationDeg: 0 }} visible />
            <GraphicsShape draw={drawOverlay} />
            {ghostBoat && <BoatSprite boat={ghostBoat} />}
            <BoatSprite boat={playerBoat} />
          </LessonStage>
          {raceResult && (
            <div className={`lesson-banner ${raceResult === "player" ? "win" : "lose"}`}>
              {raceResult === "player"
                ? "你赢了幽灵船！合适的迎风角度就是最短的时间"
                : "幽灵船先到：它始终保持约 45° 迎风角走 Z 字。直接顶风是走不到上风的"}
            </div>
          )}
        </section>

        <aside className="lesson-side">
          <PolarDial boatType="op" twsKnots={WIND.speedKnots} twaDeg={motion.twaDeg} stwKnots={stwKnots} />

          <div className={`lesson-status ${inNoGo ? "alert" : ""}`}>{status}</div>

          <label className="lesson-slider">
            舵杆 {Math.round(rudder * 100)}%（或按住 A / D）
            <input
              type="range"
              min="-100"
              max="100"
              value={Math.round(rudder * 100)}
              onChange={(event) => setRudder(Number(event.target.value) / 100)}
              onPointerUp={() => setRudder(0)}
            />
          </label>

          <div className="lesson-readouts">
            <span>
              STW <strong>{stwKnots.toFixed(1)}</strong> kt
            </span>
            <span>
              SOG <strong>{sogKnots.toFixed(1)}</strong> kt
            </span>
            <span>
              TWA <strong>{Math.round(motion.twaDeg)}</strong>°
            </span>
            <span>{motion.tack === "starboard" ? "右舷受风" : "左舷受风"}</span>
          </div>

          <div className="lesson-actions">
            <label className="lesson-toggle">
              <input type="checkbox" checked={currentOn} onChange={() => setCurrentOn((v) => !v)} />
              打开水流（看航迹被推歪，STW 不变、SOG 变）
            </label>
            <button type="button" className="accent" onClick={startGhostRace}>
              和幽灵船比赛到上方绿线
            </button>
            <button type="button" onClick={reset}>
              重置
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
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

function clampToWorld(motion: BoatMotionState): BoatMotionState {
  return {
    ...motion,
    position: {
      x: Math.max(60, Math.min(WORLD.width - 60, motion.position.x)),
      y: Math.max(120, Math.min(WORLD.height - 60, motion.position.y))
    }
  };
}

function signedDelta(fromDeg: number, toDeg: number): number {
  let delta = normalizeDeg(toDeg) - normalizeDeg(fromDeg);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}
