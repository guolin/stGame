import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { BoatState, OverlaySettings, Vec2, WindState } from "../game/types";
import type { CourseDefinition } from "../sim/course/types";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { CourseLayer } from "../game/rendering/CourseLayer";
import { TacticalOverlayLayer } from "../game/rendering/TacticalOverlayLayer";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { BoatMotionState } from "../sim/boat/boatPhysics";
import { createBoatMotionState } from "../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../sim/boat/units";
import { LessonStage } from "../lessons/LessonStage";
import { useFixedStepLoop } from "../lessons/useFixedStepLoop";
import { useGameStore } from "../store/gameStore";
import { LadderLayer } from "./intro/LadderLayer";
import { RudderGauge } from "./intro/RudderGauge";
import type { DemoBoat, DuelState, RaceRecording } from "./intro/introDemoSim";
import {
  DEMO_MARK,
  DEMO_START_Y,
  DEMO_TIME_SCALE,
  DEMO_WIND_SPEED_KNOTS,
  chooseCornerTack,
  createDuelState,
  leadMeters,
  recordIntroRace,
  speedKnotsOf,
  stepDemoBoat,
  stepDuel
} from "./intro/introDemoSim";

type Slide =
  | { kind: "text"; title: string; brand?: boolean; body: string[]; extra?: ReactNode }
  | { kind: "dark" | "replay" | "duel"; corner: string; line: string };

const SLIDES: Slide[] = [
  {
    kind: "text",
    brand: true,
    title: "Sailing Tactics",
    body: ["把看不见的风，画到屏幕上"]
  },
  {
    kind: "dark",
    corner: "谁先到 1 标谁赢",
    line: "红船、蓝船：同样的船，同样的速度。"
  },
  {
    kind: "replay",
    corner: "同一场比赛，把风画出来",
    line: "一帧都没改——只是把看不见的东西画了出来。"
  },
  {
    kind: "duel",
    corner: "现在我下场",
    line: "红船我来开，蓝船还是刚才那个 AI。"
  },
  {
    kind: "text",
    title: "我们把训练拆开了",
    body: [],
    extra: (
      <>
        <div className="feature-row">
          <div className="feature">
            <EyeIcon />
            <h3>看见风</h3>
            <p>风向、风力、风摆，全画在屏幕上，一眼就懂。</p>
          </div>
          <div className="feature">
            <TillerIcon />
            <h3>控制船</h3>
            <p>手里的舵柄一转，屏幕里的船就跟着转，跟海上一个感觉。</p>
          </div>
          <div className="feature">
            <CheckIcon />
            <h3>立刻知道对不对</h3>
            <p>航迹、等高线、到标时间差，每个决定当场见分晓。</p>
          </div>
        </div>
        <p className="intro-note">接下来：绕标 · 起航 · 多人对战</p>
      </>
    )
  },
  {
    kind: "text",
    title: "看得见，也练得会",
    body: ["先在这里练懂风，再去海上，真的知道该怎么走。"]
  }
];

const DARK_SLIDE = 1;
const REPLAY_SLIDE = 2;
const DUEL_SLIDE = 3;

const DEMO_COURSE: CourseDefinition = (() => {
  const startLine = { left: { x: 1000, y: DEMO_START_Y }, right: { x: 1800, y: DEMO_START_Y } };
  return {
    id: "simple",
    name: "intro-demo",
    description: "",
    startLine,
    finishLine: startLine,
    marks: [{ id: "mark1", label: "1标", position: DEMO_MARK, rounding: "port" }],
    legMarkIds: ["mark1"],
    spawnPoints: [],
    recommendedPlayers: { min: 1, max: 2 }
  };
})();

const DEMO_OVERLAYS: OverlaySettings = { wind: false, current: false, tracks: true, laylines: false, noGoZone: false };

function createAmbientBoat(x: number, y: number, headingDeg: number, tackHeld: "port" | "starboard"): DemoBoat {
  return {
    motion: createBoatMotionState({ position: { x, y }, headingDeg, speed: 3 * PIXELS_PER_KNOT }),
    track: [],
    tackHeld
  };
}

export function IntroScreen() {
  const setView = useGameStore((state) => state.setView);
  const [slide, setSlide] = useState(0);
  const [frame, setFrame] = useState(0);

  const recordingRef = useRef<RaceRecording | null>(null);
  if (!recordingRef.current) recordingRef.current = recordIntroRace();
  const recording = recordingRef.current;

  const playheadRef = useRef(0);
  const duelRef = useRef<DuelState>(createDuelState());
  const duelRudderRef = useRef(0);
  const ambientRef = useRef<{ boats: DemoBoat[]; timeSec: number }>({
    boats: [createAmbientBoat(700, 1500, 45, "port"), createAmbientBoat(2100, 1350, 315, "starboard")],
    timeSec: 0
  });

  const current = SLIDES[slide];

  useFixedStepLoop(() => {
    const dt = 1 / 60;
    if (current.kind === "dark" || current.kind === "replay") {
      playheadRef.current = Math.min(playheadRef.current + DEMO_TIME_SCALE, recording.frames.length - 1);
    } else if (current.kind === "duel") {
      duelRef.current = stepDuel(duelRef.current, duelRudderRef.current, dt);
    } else {
      const ambient = ambientRef.current;
      ambient.timeSec += dt;
      const wind = { directionDeg: 8 * Math.sin(ambient.timeSec / 6), speedKnots: DEMO_WIND_SPEED_KNOTS };
      ambient.boats = ambient.boats.map((boat, index) => {
        if (boat.motion.position.y < 160) {
          return createAmbientBoat(index === 0 ? 600 : 2200, 1650, index === 0 ? 45 : 315, index === 0 ? "port" : "starboard");
        }
        return stepDemoBoat(boat, chooseCornerTack(boat.motion.position.x, boat.tackHeld), wind, dt);
      });
    }
    setFrame((value) => value + 1);
  }, true);
  void frame;

  const goTo = (index: number) => {
    if (index < 0 || index >= SLIDES.length) return;
    if (index === DARK_SLIDE || index === REPLAY_SLIDE) playheadRef.current = 0;
    if (index === DUEL_SLIDE) {
      duelRef.current = createDuelState();
      duelRudderRef.current = 0;
    }
    setSlide(index);
  };

  const resetScenario = () => {
    if (slide === DARK_SLIDE || slide === REPLAY_SLIDE) playheadRef.current = 0;
    if (slide === DUEL_SLIDE) {
      duelRef.current = createDuelState();
      duelRudderRef.current = 0;
    }
  };

  const actionsRef = useRef({ goTo, resetScenario, slide });
  actionsRef.current = { goTo, resetScenario, slide };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowRight") {
        event.preventDefault();
        actionsRef.current.goTo(actionsRef.current.slide + 1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        actionsRef.current.goTo(actionsRef.current.slide - 1);
      } else if (event.code === "KeyR") {
        actionsRef.current.resetScenario();
      } else if (event.code === "KeyP") {
        duelRef.current = { ...duelRef.current, autopilot: !duelRef.current.autopilot };
      } else if (event.code === "KeyA") {
        duelRudderRef.current = -1;
      } else if (event.code === "KeyD") {
        duelRudderRef.current = 1;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyA" && duelRudderRef.current < 0) duelRudderRef.current = 0;
      if (event.code === "KeyD" && duelRudderRef.current > 0) duelRudderRef.current = 0;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const pager = (
    <div className="intro-pager">
      <button type="button" onClick={() => goTo(slide - 1)} disabled={slide === 0} aria-label="上一页">
        ‹
      </button>
      <div className="intro-dots">
        {SLIDES.map((item, index) => (
          <button
            key={`${item.kind}-${index}`}
            type="button"
            className={index === slide ? "active" : ""}
            onClick={() => goTo(index)}
            aria-label={`第 ${index + 1} 页`}
          />
        ))}
      </div>
      <button type="button" onClick={() => goTo(slide + 1)} disabled={slide === SLIDES.length - 1} aria-label="下一页">
        ›
      </button>
      <button type="button" className="intro-exit" onClick={() => setView("home")}>
        {slide === SLIDES.length - 1 ? "返回首页" : "退出"}
      </button>
    </div>
  );

  if (current.kind === "text") {
    const ambientWind: WindState = {
      directionDeg: 8 * Math.sin(ambientRef.current.timeSec / 6),
      speedKnots: DEMO_WIND_SPEED_KNOTS,
      oscillationDeg: 0
    };
    return (
      <main className="intro-carousel">
        <div className="intro-backdrop">
          <LessonStage className="intro-canvas">
            <WaterLayer />
            <WindLayer wind={ambientWind} visible />
            {ambientRef.current.boats.map((boat, index) => (
              <BoatSprite
                key={index === 0 ? "amb-red" : "amb-blue"}
                boat={toBoatState(index === 0 ? "red" : "blue", "", index === 0 ? "#ff533d" : "#1597ff", boat.motion, boat.track)}
              />
            ))}
          </LessonStage>
        </div>
        <section className="intro-slide">
          <p className="eyebrow">Sailing Tactics · {slide + 1} / {SLIDES.length}</p>
          <h1 className={current.brand ? "intro-brand" : undefined}>{current.title}</h1>
          {current.body.map((line) => (
            <p key={line} className="intro-body">
              {line}
            </p>
          ))}
          {current.extra}
          {pager}
        </section>
      </main>
    );
  }

  const duel = duelRef.current;
  const playFrame = recording.frames[playheadRef.current];
  const isPlayback = current.kind === "dark" || current.kind === "replay";

  const wind: WindState = isPlayback
    ? { directionDeg: playFrame.windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: playFrame.windOscDeg }
    : { directionDeg: duel.windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: duel.windOscDeg };

  const redMotion = isPlayback ? playFrame.red : duel.red.motion;
  const blueMotion = isPlayback ? playFrame.blue : duel.blue.motion;
  const redTrack = isPlayback ? recording.redTrack.slice(0, playFrame.redTrackLen) : duel.red.track;
  const blueTrack = isPlayback ? recording.blueTrack.slice(0, playFrame.blueTrackLen) : duel.blue.track;

  const boats: BoatState[] = [
    toBoatState("red", "红船", "#ff533d", redMotion, redTrack),
    toBoatState("blue", "蓝船", "#1597ff", blueMotion, blueTrack)
  ];

  const lead = leadMeters(redMotion.position, blueMotion.position);
  const oscRounded = Math.round(wind.oscillationDeg);
  const raceGapSec = Math.round(recording.blueAtMarkSec - recording.redAtMarkSec);
  const playbackRedDone = isPlayback && playFrame.timeSec >= recording.redAtMarkSec;
  const playbackBlueDone = isPlayback && playFrame.timeSec >= recording.blueAtMarkSec;

  return (
    <main className="intro-carousel">
      <div className="intro-backdrop intro-backdrop-full">
        <LessonStage className="intro-canvas">
          <WaterLayer />
          {current.kind !== "dark" && (
            <LadderLayer
              windDeg={wind.directionDeg}
              boats={[
                { position: redMotion.position, color: "#ff533d" },
                { position: blueMotion.position, color: "#1597ff" }
              ]}
            />
          )}
          {current.kind !== "dark" && <WindLayer wind={wind} visible />}
          <CourseLayer course={DEMO_COURSE} />
          <TacticalOverlayLayer boats={boats} overlays={DEMO_OVERLAYS} wind={wind} course={DEMO_COURSE} />
          {boats.map((boat) => (
            <BoatSprite key={boat.id} boat={boat} />
          ))}
        </LessonStage>
      </div>

      <div className="intro-stage-hud">
        <div className="stage-corner">
          <p className="eyebrow">Sailing Tactics · {slide + 1} / {SLIDES.length}</p>
          <h2>{current.corner}</h2>
          <p>{current.line}</p>
        </div>

        {current.kind === "dark" && (
          <div className="stage-readouts">
            {!playbackRedDone && (
              <>
                <div className="hud-chip hud-chip-red">红船 {speedKnotsOf(redMotion).toFixed(1)} 节</div>
                <div className="hud-chip hud-chip-blue">蓝船 {speedKnotsOf(blueMotion).toFixed(1)} 节</div>
              </>
            )}
            {playbackRedDone && !playbackBlueDone && <div className="hud-chip hud-chip-finish">红船到 1 标！</div>}
            {playbackBlueDone && (
              <div className="hud-chip hud-chip-finish">速度一样 · 红船先到！蓝船晚了 {raceGapSec} 秒</div>
            )}
          </div>
        )}

        {current.kind === "replay" && (
          <div className="stage-readouts">
            <div className="hud-chip">
              风摆 {oscRounded >= 0 ? "+" : ""}
              {oscRounded}°
            </div>
            {!playbackRedDone && Math.abs(lead) >= 2 && (
              <div className={`hud-chip ${lead >= 0 ? "hud-chip-red" : ""}`}>
                红船{lead >= 0 ? "领先" : "落后"} {Math.abs(Math.round(lead))} 米
              </div>
            )}
            {playbackRedDone && !playbackBlueDone && <div className="hud-chip hud-chip-finish">红船到 1 标！</div>}
            {playbackBlueDone && <div className="hud-chip hud-chip-finish">站对边，白赚 {raceGapSec} 秒</div>}
          </div>
        )}

        {current.kind === "duel" && (
          <>
            <div className="stage-readouts">
              <div className="hud-chip">
                风摆 {oscRounded >= 0 ? "+" : ""}
                {oscRounded}°
              </div>
              {duel.autopilot && <div className="hud-chip hud-chip-accent">自动舵</div>}
              {duel.redAtMarkSec !== undefined && duel.blueAtMarkSec === undefined && (
                <div className="hud-chip hud-chip-finish">你先到 1 标！</div>
              )}
              {duel.finished && duel.redAtMarkSec! < duel.blueAtMarkSec! && (
                <div className="hud-chip hud-chip-finish">
                  你先到 · AI 晚了 {Math.round(duel.blueAtMarkSec! - duel.redAtMarkSec!)} 秒
                </div>
              )}
              {duel.finished && duel.redAtMarkSec! >= duel.blueAtMarkSec! && (
                <div className="hud-chip hud-chip-blue">AI 先到了 · 按 R 再来一把</div>
              )}
            </div>
            <RudderGauge rudderAngleDeg={duel.red.motion.rudderAngleDeg} />
          </>
        )}

        <div className="stage-bottom">{pager}</div>
      </div>
    </main>
  );
}

function toBoatState(id: string, name: string, color: string, motion: BoatMotionState, track: Vec2[]): BoatState {
  return {
    id: id as BoatState["id"],
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
    track
  };
}

function EyeIcon() {
  return (
    <svg className="feature-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M4 24 Q24 6 44 24 Q24 42 4 24 Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function TillerIcon() {
  return (
    <svg className="feature-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 40 A 22 22 0 0 1 40 40" fill="none" stroke="currentColor" strokeWidth="3" />
      <line x1="24" y1="40" x2="34" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="40" r="4" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="feature-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
      <polyline points="15,25 22,32 34,17" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
