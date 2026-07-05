import { useRef, useState } from "react";
import type { BoatState } from "../game/types";
import { clamp, normalizeDeg } from "../game/utils/math";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { BoatMotionState } from "../sim/boat/boatPhysics";
import { createBoatMotionState, stepBoatPhysics } from "../sim/boat/boatPhysics";
import { LessonStage } from "../lessons/LessonStage";
import { useFixedStepLoop } from "../lessons/useFixedStepLoop";
import { useGameStore } from "../store/gameStore";

const SLIDES = [
  {
    title: "帆船战术对抗模拟器",
    body: "一个把帆船比赛搬上大屏的实时模拟器：1-4 名玩家用蓝牙帆船模型手柄，各自控制一条船同屏对抗。"
  },
  {
    title: "帆船比赛为什么难懂？",
    body: "风向、风摆、阵风、水流、航权规则——决定胜负的一切都是看不见的。观众只看到船在动，看不到为什么这条船更快、那条船犯规。"
  },
  {
    title: "我们的方案",
    body: "把看不见的变成看得见：风箭头、风向历史、阵风区、水流区、Layline、禁航角全部可视化，自动裁判用自然语言解释每一次判罚。"
  },
  {
    title: "核心技术组件",
    body: "共享模拟层：Polar 船速模型 + 舵效物理 + 可配置风场 + 规则 10-16 自动裁判。比赛、讲解、介绍页跑的是同一套代码，不是三套动画。"
  },
  {
    title: "现在就试试",
    body: "先进讲解模式 3 分钟看懂帆船原理和规则，再上手柄来一局 2-4 船比赛。"
  }
];

const WIND = { directionDeg: 0, speedKnots: 12 };

export function IntroScreen() {
  const setView = useGameStore((state) => state.setView);
  const [slide, setSlide] = useState(0);

  const boatsRef = useRef<BoatMotionState[]>([
    createBoatMotionState({ position: { x: 700, y: 1500 }, headingDeg: 45, speed: 15 }),
    createBoatMotionState({ position: { x: 2100, y: 1350 }, headingDeg: 315, speed: 15 })
  ]);
  const [frame, setFrame] = useState(0);

  useFixedStepLoop(() => {
    boatsRef.current = boatsRef.current.map((motion, index) => {
      // lazy autopilot: hold close-hauled, tack at the arena edges, respawn at the bottom
      const target = motion.tack === "starboard" ? 315 : 45;
      let next = stepBoatPhysics({
        motion,
        rudder: clamp(signedDelta(motion.headingDeg, target) * 0.05, -1, 1),
        boatType: index === 0 ? "op" : "topper",
        wind: WIND,
        current: { x: 0, y: 0 },
        penaltyFactor: 1,
        dt: 1 / 60
      });
      if (next.position.x < 400) next = { ...next, headingDeg: 45, tack: "port" };
      if (next.position.x > 2400) next = { ...next, headingDeg: 315, tack: "starboard" };
      if (next.position.y < 200) {
        next = createBoatMotionState({ position: { x: 500 + Math.abs(next.position.x % 1800), y: 1650 }, headingDeg: index === 0 ? 45 : 315, speed: 15 });
      }
      return next;
    });
    setFrame((value) => value + 1);
  }, true);

  void frame;
  const boats: BoatState[] = boatsRef.current.map((motion, index) => ({
    id: index === 0 ? "red" : "blue",
    name: index === 0 ? "OP" : "Topper",
    color: index === 0 ? "#ff533d" : "#1597ff",
    boatType: index === 0 ? "op" : "topper",
    ...motion,
    legIndex: 0,
    finished: false,
    startStatus: "started",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  }));

  const isLast = slide === SLIDES.length - 1;

  return (
    <main className="intro-carousel">
      <div className="intro-backdrop">
        <LessonStage className="intro-canvas">
          <WaterLayer />
          <WindLayer wind={{ ...WIND, oscillationDeg: 0 }} visible />
          {boats.map((boat) => (
            <BoatSprite key={boat.id} boat={boat} />
          ))}
        </LessonStage>
      </div>

      <section className="intro-slide">
        <p className="eyebrow">项目介绍 · {slide + 1} / {SLIDES.length}</p>
        <h1>{SLIDES[slide].title}</h1>
        <p className="intro-body">{SLIDES[slide].body}</p>

        <div className="demo-actions">
          {slide > 0 && (
            <button type="button" onClick={() => setSlide((s) => s - 1)}>
              上一页
            </button>
          )}
          {!isLast && (
            <button type="button" className="accent" onClick={() => setSlide((s) => s + 1)}>
              下一页
            </button>
          )}
          {isLast && (
            <>
              <button type="button" className="accent" onClick={() => setView("lessons")}>
                进入讲解模式
              </button>
              <button type="button" onClick={() => setView("setup")}>
                直接开始比赛
              </button>
            </>
          )}
          <button type="button" onClick={() => setView("home")}>
            返回首页
          </button>
        </div>

        <div className="intro-dots">
          {SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === slide ? "active" : ""}
              onClick={() => setSlide(index)}
              aria-label={`第 ${index + 1} 页`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function signedDelta(fromDeg: number, toDeg: number): number {
  let delta = normalizeDeg(toDeg) - normalizeDeg(fromDeg);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}
