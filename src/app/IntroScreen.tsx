import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { BoatState, OverlaySettings, WindState } from "../game/types";
import type { CourseDefinition } from "../sim/course/types";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { CourseLayer } from "../game/rendering/CourseLayer";
import { TacticalOverlayLayer } from "../game/rendering/TacticalOverlayLayer";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import { WindZoneLayer } from "../game/rendering/WindZoneLayer";
import type { BoatMotionState } from "../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../sim/boat/boatPhysics";
import { PIXELS_PER_KNOT } from "../sim/boat/units";
import { LessonStage } from "../lessons/LessonStage";
import { useFixedStepLoop } from "../lessons/useFixedStepLoop";
import { useGameStore } from "../store/gameStore";
import { LadderLayer } from "./intro/LadderLayer";
import { RudderGauge } from "./intro/RudderGauge";
import type { DemoBoat, IntroDemoState, ZoneDemoState } from "./intro/introDemoSim";
import {
  DEMO_MARK,
  DEMO_START_Y,
  DEMO_WIND_SPEED_KNOTS,
  boatSpeedKnots,
  chooseCornerTack,
  createIntroDemoState,
  createZoneDemoState,
  leadMeters,
  stepDemoBoat,
  stepIntroDemo,
  stepZoneDemo
} from "./intro/introDemoSim";

type Slide =
  | { kind: "text"; title: string; brand?: boolean; body: string[]; extra?: ReactNode }
  | { kind: "shift" | "zones"; corner: string; line: string }
  | { kind: "live"; corner: string; line: string };

const SLIDES: Slide[] = [
  {
    kind: "text",
    brand: true,
    title: "Sailing Tactics",
    body: ["把看不见的风，画到屏幕上", "一个帆船战术训练器 · 3 分钟看明白"]
  },
  {
    kind: "text",
    title: "跑得最快，不一定赢",
    body: [
      "帆船是靠风走的。但风看不见，还每隔几分钟就摆一次方向——这叫「风摆」。",
      "两条船，一条猜对了风往哪摆，一条猜错了，一下就差出几百米。",
      "所以帆船比的不是速度，是读风——像下围棋，棋盘还一直在变。"
    ],
    extra: <RaceSketch />
  },
  {
    kind: "text",
    title: "风看不见，教起来很难",
    body: ["在海上，教练只能靠喊。学员练一整天，真正搞明白的没几次。"],
    extra: (
      <div className="intro-bubbles">
        <div className="bubble bubble-coach">教练：“风摆了！快转！”</div>
        <div className="bubble bubble-student">学员：“啊？哪摆了？我什么都没看见……”</div>
      </div>
    )
  },
  {
    kind: "shift",
    corner: "看懂风摆",
    line: "两船分边去 1 标。风从 355° 一路摆到 15°——同样的船，站对边就是先到。"
  },
  {
    kind: "zones",
    corner: "会挑风区",
    line: "风不是处处一样。红船的路线吃住强风顺角区，蓝船一头扎进弱风区。"
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
            <p>风向、风力、风摆、风区，全画在屏幕上，一眼就懂。</p>
          </div>
          <div className="feature">
            <TillerIcon />
            <h3>控制船</h3>
            <p>手里的舵柄一转，屏幕里的船就跟着转，跟海上一个感觉。</p>
          </div>
          <div className="feature">
            <CheckIcon />
            <h3>立刻知道对不对</h3>
            <p>航迹、等高线、领先米数，每个决定当场见分晓。</p>
          </div>
        </div>
        <p className="intro-note">接下来：绕标 · 起航 · 多人对战</p>
      </>
    )
  },
  {
    kind: "live",
    corner: "看得见，也练得会",
    line: "先在这里练懂风，再去海上，真的知道该怎么走。"
  }
];

const SHIFT_SLIDE = 3;
const ZONE_SLIDE = 4;
const LIVE_SLIDE = 6;

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

  const shiftRef = useRef<IntroDemoState>(createIntroDemoState());
  const zoneRef = useRef<ZoneDemoState>(createZoneDemoState());
  const liveRef = useRef<LiveBoat>(createLiveBoat());
  const liveRudderRef = useRef(0);
  const liveTimeRef = useRef(0);
  const ambientRef = useRef<{ boats: DemoBoat[]; timeSec: number }>({
    boats: [createAmbientBoat(700, 1500, 45, "port"), createAmbientBoat(2100, 1350, 315, "starboard")],
    timeSec: 0
  });

  const current = SLIDES[slide];

  useFixedStepLoop(() => {
    const dt = 1 / 60;
    if (current.kind === "shift") {
      shiftRef.current = stepIntroDemo(shiftRef.current, dt);
    } else if (current.kind === "zones") {
      zoneRef.current = stepZoneDemo(zoneRef.current, dt);
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
      const ambient = ambientRef.current;
      ambient.timeSec += dt;
      const wind = { directionDeg: ambientWindDeg(ambient.timeSec), speedKnots: DEMO_WIND_SPEED_KNOTS };
      ambient.boats = ambient.boats.map((boat, index) => {
        if (boat.motion.position.y < 160) {
          return createAmbientBoat(index === 0 ? 600 : 2200, 1650, index === 0 ? 45 : 315, index === 0 ? "port" : "starboard");
        }
        const tack = chooseCornerTack(boat.motion.position.x, boat.tackHeld);
        return stepDemoBoat(boat, tack, wind, dt);
      });
    }
    setFrame((value) => value + 1);
  }, true);
  void frame;

  const goTo = (index: number) => {
    if (index < 0 || index >= SLIDES.length) return;
    if (index === SHIFT_SLIDE) shiftRef.current = createIntroDemoState();
    if (index === ZONE_SLIDE) zoneRef.current = createZoneDemoState();
    if (index === LIVE_SLIDE) {
      liveRef.current = createLiveBoat();
      liveRudderRef.current = 0;
    }
    setSlide(index);
  };

  const next = () => {
    goTo(slide + 1);
  };

  const resetScenario = () => {
    if (slide === SHIFT_SLIDE) shiftRef.current = createIntroDemoState();
    if (slide === ZONE_SLIDE) zoneRef.current = createZoneDemoState();
    if (slide === LIVE_SLIDE) {
      liveRef.current = createLiveBoat();
      liveRudderRef.current = 0;
    }
  };

  const actionsRef = useRef({ next, resetScenario, goTo, slide });
  actionsRef.current = { next, resetScenario, goTo, slide };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowRight") {
        event.preventDefault();
        actionsRef.current.next();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        actionsRef.current.goTo(actionsRef.current.slide - 1);
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
      <button type="button" onClick={next} disabled={slide === SLIDES.length - 1} aria-label="下一页">
        ›
      </button>
      <button type="button" className="intro-exit" onClick={() => setView("home")}>
        退出
      </button>
    </div>
  );

  if (current.kind === "text") {
    const ambientWind: WindState = {
      directionDeg: ambientWindDeg(ambientRef.current.timeSec),
      speedKnots: DEMO_WIND_SPEED_KNOTS,
      oscillationDeg: 0
    };
    const ambientBoats = ambientRef.current.boats.map((boat, index) =>
      toBoatState(index === 0 ? "red" : "blue", "", index === 0 ? "#ff533d" : "#1597ff", boat)
    );
    return (
      <main className="intro-carousel">
        <div className="intro-backdrop">
          <LessonStage className="intro-canvas">
            <WaterLayer />
            <WindLayer wind={ambientWind} visible />
            {ambientBoats.map((boat) => (
              <BoatSprite key={boat.id} boat={boat} />
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

  const shift = shiftRef.current;
  const zone = zoneRef.current;

  let wind: WindState;
  let boats: BoatState[];
  if (current.kind === "shift") {
    wind = { directionDeg: shift.windDeg, speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: shift.windOscDeg };
    boats = [toBoatState("red", "红船", "#ff533d", shift.red), toBoatState("blue", "蓝船", "#1597ff", shift.blue)];
  } else if (current.kind === "zones") {
    wind = { directionDeg: 0, speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: 0 };
    boats = [toBoatState("red", "红船", "#ff533d", zone.red), toBoatState("blue", "蓝船", "#1597ff", zone.blue)];
  } else {
    wind = { directionDeg: liveWindDeg(liveTimeRef.current), speedKnots: DEMO_WIND_SPEED_KNOTS, oscillationDeg: 0 };
    boats = [
      toBoatState("red", "红船", "#ff533d", {
        motion: liveRef.current.motion,
        track: liveRef.current.track,
        tackHeld: liveRef.current.motion.tack
      })
    ];
  }

  const demoState = current.kind === "zones" ? zone : shift;
  const lead =
    current.kind === "live" ? 0 : leadMeters(demoState.red.motion.position, demoState.blue.motion.position);
  const oscRounded = Math.round(shift.windOscDeg);

  return (
    <main className="intro-carousel">
      <div className="intro-backdrop intro-backdrop-full">
        <LessonStage className="intro-canvas">
          <WaterLayer />
          {current.kind === "zones" && <WindZoneLayer zones={zone.zones} />}
          {current.kind === "shift" && (
            <LadderLayer
              windDeg={wind.directionDeg}
              boats={[
                { position: shift.red.motion.position, color: "#ff533d" },
                { position: shift.blue.motion.position, color: "#1597ff" }
              ]}
            />
          )}
          <WindLayer wind={wind} visible />
          {current.kind !== "live" && <CourseLayer course={DEMO_COURSE} />}
          {current.kind === "zones" && (
            <>
              <pixiText text="强风区" x={1880} y={450} style={{ fill: "#bfeeff", fontSize: 40, fontWeight: "700" }} />
              <pixiText text="弱风区" x={730} y={450} style={{ fill: "#7fa8bd", fontSize: 40, fontWeight: "700" }} />
            </>
          )}
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

        {current.kind === "shift" && (
          <div className="stage-readouts">
            <div className="hud-chip">
              风摆 {oscRounded >= 0 ? "+" : ""}
              {oscRounded}°
            </div>
            {shift.redAtMarkSec === undefined && Math.abs(lead) >= 2 && (
              <div className={`hud-chip ${lead >= 0 ? "hud-chip-red" : ""}`}>
                红船{lead >= 0 ? "领先" : "落后"} {Math.abs(Math.round(lead))} 米
              </div>
            )}
            {shift.redAtMarkSec !== undefined && !shift.finished && (
              <div className="hud-chip hud-chip-finish">红船到 1 标！</div>
            )}
            {shift.finished && (
              <div className="hud-chip hud-chip-finish">
                红船先到 · 蓝船晚了 {Math.round((shift.blueAtMarkSec ?? 0) - (shift.redAtMarkSec ?? 0))} 秒
              </div>
            )}
          </div>
        )}

        {current.kind === "zones" && (
          <div className="stage-readouts">
            <div className="hud-chip hud-chip-red">红船 {boatSpeedKnots(zone.red).toFixed(1)} 节</div>
            <div className="hud-chip hud-chip-blue">蓝船 {boatSpeedKnots(zone.blue).toFixed(1)} 节</div>
            {!zone.finished && lead > 2 && <div className="hud-chip">红船领先 {Math.round(lead)} 米</div>}
            {zone.finished && <div className="hud-chip hud-chip-finish">红船到 1 标！领先 {Math.abs(Math.round(lead))} 米</div>}
          </div>
        )}

        {current.kind === "live" && (
          <>
            <RudderGauge rudderAngleDeg={liveRef.current.motion.rudderAngleDeg} />
            <button type="button" className="intro-home-btn" onClick={() => setView("home")}>
              返回首页
            </button>
          </>
        )}

        <div className="stage-bottom">{pager}</div>
      </div>
    </main>
  );
}

function liveWindDeg(timeSec: number): number {
  return 8 * Math.sin((2 * Math.PI * timeSec) / 25);
}

function ambientWindDeg(timeSec: number): number {
  return 8 * Math.sin(timeSec / 6);
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

function RaceSketch() {
  return (
    <svg className="intro-illust" viewBox="0 0 340 190" aria-hidden="true">
      <circle cx="170" cy="26" r="9" fill="#ff9f43" />
      <polyline
        points="130,180 205,118 158,62 168,40"
        fill="none"
        stroke="#ff533d"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="210,180 74,124 48,74 150,38"
        fill="none"
        stroke="#1597ff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="10 8"
        opacity="0.8"
      />
      <g stroke="#9fd2e8" strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <path d="M 268 52 q 18 10 8 30" fill="none" />
        <path d="M 292 44 q 18 10 8 30" fill="none" />
      </g>
    </svg>
  );
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
