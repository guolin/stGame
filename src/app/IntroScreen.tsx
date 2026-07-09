import { useEffect, useRef, useState } from "react";
import type { BoatState, OverlaySettings, WindState } from "../game/types";
import type { CourseDefinition } from "../sim/course/types";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { CourseLayer } from "../game/rendering/CourseLayer";
import { TacticalOverlayLayer } from "../game/rendering/TacticalOverlayLayer";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { BoatMotionState } from "../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../sim/boat/units";
import { LessonStage } from "../lessons/LessonStage";
import { useFixedStepLoop } from "../lessons/useFixedStepLoop";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";
import { LadderLayer } from "./intro/LadderLayer";
import { RudderGauge } from "./intro/RudderGauge";
import type { DemoBoat, IntroDemoState } from "./intro/introDemoSim";
import {
  DEMO_MARK,
  DEMO_START_Y,
  DEMO_WIND_SPEED_KNOTS,
  advanceIntroDemoMode,
  createIntroDemoState,
  leadMeters,
  stepIntroDemo
} from "./intro/introDemoSim";

type Slide =
  | { kind: "text"; title: string; body: string; brand?: boolean }
  | { kind: "stage"; corner: string; line: string }
  | { kind: "live"; corner: string; line: string };

const SLIDES: Slide[] = [
  { kind: "text", brand: true, title: "Sailing Tactics", body: "把看不见的风，画到屏幕上" },
  {
    kind: "text",
    title: "跑得最快，不一定赢",
    body: "帆船比赛里，风一直在变。\n谁先读懂风，谁就先占优势。"
  },
  {
    kind: "text",
    title: "风看不见，教起来很难",
    body: "教练喊：“风摆了！”\n学员心里想：啊？哪摆了？"
  },
  {
    kind: "stage",
    corner: "起航分边，第一摆定胜负",
    line: "红船去右边，蓝船去左边。风往哪摆，先到那边的船赢。"
  },
  {
    kind: "stage",
    corner: "风摆回来了",
    line: "蓝船一条道走到黑；红船每次被顶就换舷，优势一摆一摆积攒出来。"
  },
  {
    kind: "text",
    title: "我们把训练过程拆开了",
    body: "看见风 · 控制船 · 立刻知道对不对"
  },
  {
    kind: "live",
    corner: "看得见，也练得会",
    line: "先在这里练懂风，再去海上，真的知道该怎么走。"
  }
];

const STAGE_A = 3;
const STAGE_B = 4;
const LIVE = 6;

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

type LiveBoat = { motion: BoatMotionState; track: { x: number; y: number }[] };

function createLiveBoat(): LiveBoat {
  return {
    motion: createBoatMotionState({ position: { x: 1400, y: 1150 }, headingDeg: 20, speed: 3.2 * PIXELS_PER_KNOT }),
    track: []
  };
}

export function IntroScreen() {
  const setView = useGameStore((state) => state.setView);
  const [slide, setSlide] = useState(0);
  const [frame, setFrame] = useState(0);

  const demoRef = useRef<IntroDemoState>(createIntroDemoState());
  const liveRef = useRef<LiveBoat>(createLiveBoat());
  const liveRudderRef = useRef(0);
  const liveTimeRef = useRef(0);
  const ambientTimeRef = useRef(0);

  const current = SLIDES[slide];

  useFixedStepLoop(() => {
    const dt = 1 / 60;
    if (current.kind === "stage") {
      demoRef.current = stepIntroDemo(demoRef.current, dt);
    } else if (current.kind === "live") {
      liveTimeRef.current += dt;
      const boat = liveRef.current;
      const motion = stepBoatPhysics({
        motion: boat.motion,
        rudder: liveRudderRef.current,
        boatType: "op",
        wind: { directionDeg: liveWindDeg(liveTimeRef.current), speedKnots: DEMO_WIND_SPEED_KNOTS },
        current: { x: 0, y: 0 },
        penaltyFactor: 1,
        dt
      });
      motion.position.x = Math.min(2740, Math.max(60, motion.position.x));
      motion.position.y = Math.min(1740, Math.max(60, motion.position.y));
      const last = boat.track[boat.track.length - 1];
      if (!last || Math.hypot(motion.position.x - last.x, motion.position.y - last.y) > 24) {
        boat.track.push({ ...motion.position });
        if (boat.track.length > 500) boat.track.shift();
      }
      liveRef.current = { motion, track: boat.track };
    } else {
      ambientTimeRef.current += dt;
    }
    setFrame((value) => value + 1);
  }, true);
  void frame;

  const goTo = (index: number) => {
    if (index === STAGE_A) demoRef.current = createIntroDemoState();
    if (index === STAGE_B && slide !== STAGE_A) {
      // Direct jump: skip straight to a running pendulum from a fresh start.
      demoRef.current = advanceIntroDemoMode(advanceIntroDemoMode(createIntroDemoState()));
    }
    if (index === LIVE) {
      liveRef.current = createLiveBoat();
      liveRudderRef.current = 0;
    }
    setSlide(index);
  };

  const next = () => {
    if (slide === STAGE_A) {
      if (demoRef.current.mode === "split") {
        demoRef.current = advanceIntroDemoMode(demoRef.current);
        return;
      }
      demoRef.current = advanceIntroDemoMode(demoRef.current);
      setSlide(STAGE_B);
      return;
    }
    if (slide < SLIDES.length - 1) goTo(slide + 1);
  };

  const resetScenario = () => {
    if (slide === STAGE_A || slide === STAGE_B) goTo(STAGE_A);
    if (slide === LIVE) {
      liveRef.current = createLiveBoat();
      liveRudderRef.current = 0;
    }
  };

  const actionsRef = useRef({ next, resetScenario, slide });
  actionsRef.current = { next, resetScenario, slide };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        actionsRef.current.next();
      } else if (event.code === "KeyR") {
        actionsRef.current.resetScenario();
      } else if (event.code === "KeyA") {
        liveRudderRef.current = -1;
      } else if (event.code === "KeyD") {
        liveRudderRef.current = 1;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyA" && liveRudderRef.current < 0) liveRudderRef.current = 0;
      if (event.code === "KeyD" && liveRudderRef.current > 0) liveRudderRef.current = 0;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const demo = demoRef.current;
  const isLast = slide === SLIDES.length - 1;
  const nextLabel = slide === STAGE_A && demo.mode === "split" ? "风摆来了 ▶" : "下一页";

  const controls = (
    <>
      <div className="demo-actions">
        {slide > 0 && (
          <FocusableButton type="button" onClick={() => goTo(slide - 1)}>
            上一页
          </FocusableButton>
        )}
        {!isLast && (
          <FocusableButton type="button" className="accent" onClick={next} autoFocus>
            {nextLabel}
          </FocusableButton>
        )}
        {isLast && (
          <>
            <FocusableButton type="button" className="accent" onClick={() => setView("lessons")} autoFocus>
              进入讲解模式
            </FocusableButton>
            <FocusableButton type="button" onClick={() => setView("setup")}>
              直接开始比赛
            </FocusableButton>
          </>
        )}
        <FocusableButton type="button" onClick={() => setView("home")}>
          返回首页
        </FocusableButton>
      </div>
      <div className="intro-dots">
        {SLIDES.map((item, index) => (
          <FocusableButton
            key={`${item.kind}-${index}`}
            type="button"
            className={index === slide ? "active" : ""}
            onClick={() => goTo(index)}
            aria-label={`第 ${index + 1} 页`}
          />
        ))}
      </div>
    </>
  );

  if (current.kind === "text") {
    const ambientWind: WindState = {
      directionDeg: 8 * Math.sin(ambientTimeRef.current / 6),
      speedKnots: DEMO_WIND_SPEED_KNOTS,
      oscillationDeg: 0
    };
    return (
      <main className="intro-carousel">
        <div className="intro-backdrop">
          <LessonStage className="intro-canvas">
            <WaterLayer />
            <WindLayer wind={ambientWind} visible />
          </LessonStage>
        </div>
        <section className="intro-slide">
          <p className="eyebrow">Sailing Tactics · {slide + 1} / {SLIDES.length}</p>
          <h1 className={current.brand ? "intro-brand" : undefined}>{current.title}</h1>
          <p className="intro-body">{current.body}</p>
          {controls}
        </section>
      </main>
    );
  }

  const wind: WindState =
    current.kind === "stage"
      ? { directionDeg: demo.windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: demo.windOscDeg }
      : { directionDeg: liveWindDeg(liveTimeRef.current), speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: 0 };

  const boats: BoatState[] =
    current.kind === "stage"
      ? [toBoatState("red", "红船", "#ff533d", demo.red), toBoatState("blue", "蓝船", "#1597ff", demo.blue)]
      : [
          toBoatState("red", "红船", "#ff533d", {
            motion: liveRef.current.motion,
            track: liveRef.current.track,
            tackHeld: liveRef.current.motion.tack
          })
        ];

  const lead = current.kind === "stage" ? leadMeters(demo.red.motion.position, demo.blue.motion.position) : 0;
  const oscRounded = Math.round(demo.windOscDeg);

  return (
    <main className="intro-carousel">
      <div className="intro-backdrop intro-backdrop-full">
        <LessonStage className="intro-canvas">
          <WaterLayer />
          <LadderLayer windDeg={wind.directionDeg} mark={DEMO_MARK} />
          <WindLayer wind={wind} visible />
          {current.kind === "stage" && <CourseLayer course={DEMO_COURSE} />}
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

        {current.kind === "stage" && (
          <div className="stage-readouts">
            <div className="hud-chip">
              风摆 {oscRounded >= 0 ? "+" : ""}
              {oscRounded}°
            </div>
            {demo.mode === "pendulum" && !demo.finished && <div className="hud-chip hud-chip-accent">3× 加速</div>}
            {demo.mode !== "split" && !demo.finished && (
              <div className={`hud-chip ${lead >= 0 ? "hud-chip-red" : ""}`}>
                红船{lead >= 0 ? "领先" : "落后"} {Math.abs(Math.round(lead))} 米
              </div>
            )}
            {demo.finished && <div className="hud-chip hud-chip-finish">红船到 1 标！领先 {Math.abs(Math.round(lead))} 米</div>}
          </div>
        )}

        {current.kind === "live" && <RudderGauge rudderAngleDeg={liveRef.current.motion.rudderAngleDeg} />}

        <div className="stage-bottom">{controls}</div>
      </div>
    </main>
  );
}

function liveWindDeg(timeSec: number): number {
  return 8 * Math.sin((2 * Math.PI * timeSec) / 25);
}

function toBoatState(id: string, name: string, color: string, boat: DemoBoat): BoatState {
  return {
    id: id as BoatState["id"],
    name,
    color,
    boatType: "op",
    ...boat.motion,
    legIndex: 0,
    finished: false,
    startStatus: "started",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: boat.track
  };
}
