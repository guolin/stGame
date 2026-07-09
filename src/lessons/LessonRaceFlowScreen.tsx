import { useCallback, useRef, useState } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState, Vec2 } from "../game/types";
import { headingToVector, normalizeDeg } from "../game/utils/math";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { GraphicsShape } from "../game/rendering/GraphicsShape";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import { useGameStore } from "../store/gameStore";
import { LessonStage } from "./LessonStage";
import { useFixedStepLoop } from "./useFixedStepLoop";
import { FocusableButton } from "../app/navigation/FocusableButton";

const WIND_FROM = 0;
const START_LINE_Y = 1260;
const MARK: Vec2 = { x: 1400, y: 760 };

type Topic = "start" | "rounding";
type DemoBoat = {
  id: BoatState["id"];
  name: string;
  color: string;
  path: Vec2[];
};

type RulePoint = {
  title: string;
  body: string;
};

const TOPIC_TITLE: Record<Topic, string> = {
  start: "启航规则",
  rounding: "绕标规则"
};

const TOPIC_DESCRIPTION: Record<Topic, string> = {
  start: "看船在起航信号前后，怎样才算合法起航；抢航后为什么必须回线。",
  rounding: "看船怎样把航标留在规定一侧，并按顺序进入下一航段。"
};

const RULE_POINTS: Record<Topic, RulePoint[]> = {
  start: [
    { title: "1. 信号前不能在航线一侧", body: "起航线以上是航线一侧。倒计时结束那一刻，船如果已经在线上方，就属于抢航 OCS。" },
    { title: "2. 合法起航是从线后穿过线", body: "船要从起航线后方穿过起航线，进入航线一侧，才算正式开始这一轮。" },
    { title: "3. 抢航后要回到线后", body: "OCS 的船不能继续跑航线，必须先回到起航线后方，再重新穿线起航。" }
  ],
  rounding: [
    { title: "1. 只认当前目标标", body: "比赛按航线顺序检查航标。没有绕过 1 标，就算经过 2 标也不会进入下一段。" },
    { title: "2. 按规定一侧留下航标", body: "如果写着 port rounding，就要把标留在左舷；starboard rounding 就要把标留在右舷。" },
    { title: "3. 正确侧通过并离开标区", body: "现在的判定更接近正常比赛：船进入标区后，从正确一侧通过并离开，就算完成绕标。" }
  ]
};

const START_BOATS: DemoBoat[] = [
  {
    id: "red",
    name: "合法起航",
    color: "#ff533d",
    path: [
      { x: 1180, y: 1510 },
      { x: 1220, y: 1320 },
      { x: 1260, y: 1110 },
      { x: 1330, y: 900 }
    ]
  },
  {
    id: "blue",
    name: "抢航后回线",
    color: "#1597ff",
    path: [
      { x: 1660, y: 1160 },
      { x: 1620, y: 1340 },
      { x: 1580, y: 1480 },
      { x: 1540, y: 1240 },
      { x: 1500, y: 980 }
    ]
  }
];

const ROUNDING_BOATS: DemoBoat[] = [
  {
    id: "red",
    name: "正确绕标",
    color: "#ff533d",
    path: [
      { x: 1260, y: 1010 },
      { x: 1510, y: 920 },
      { x: 1580, y: 760 },
      { x: 1510, y: 610 },
      { x: 1240, y: 520 }
    ]
  },
  {
    id: "blue",
    name: "错误侧通过",
    color: "#1597ff",
    path: [
      { x: 1540, y: 1010 },
      { x: 1260, y: 920 },
      { x: 1220, y: 760 },
      { x: 1320, y: 610 },
      { x: 1620, y: 520 }
    ]
  }
];

export function LessonRaceFlowScreen() {
  const setView = useGameStore((state) => state.setView);
  const [topic, setTopic] = useState<Topic>("start");
  const [frame, setFrame] = useState(0);
  const tickRef = useRef(0);

  useFixedStepLoop(() => {
    tickRef.current = (tickRef.current + 1) % (60 * 10);
    setFrame((value) => value + 1);
  }, true);

  const switchTopic = (next: Topic) => {
    tickRef.current = 0;
    setTopic(next);
  };

  const boats = topic === "start" ? START_BOATS : ROUNDING_BOATS;
  const progress = (tickRef.current % (60 * 10)) / (60 * 10);
  const renderBoats = boats.map((boat) => toBoatState(boat, progress));

  const drawOverlay = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (topic === "start") {
        drawStartOverlay(graphics);
      } else {
        drawRoundingOverlay(graphics);
      }
    },
    [topic]
  );

  void frame;

  return (
    <main className="lesson-screen">
      <header className="lesson-header">
        <div>
          <p className="eyebrow">讲解模式 · 航线判定</p>
          <h1>{TOPIC_TITLE[topic]}：先看规则，再上比赛</h1>
        </div>
        <div className="lesson-nav">
          <FocusableButton type="button" onClick={() => setView("lessons")} autoFocus>
            返回讲解目录
          </FocusableButton>
        </div>
      </header>

      <div className="lesson-body">
        <section className="lesson-stage-panel">
          <LessonStage>
            <WaterLayer />
            <WindLayer wind={{ directionDeg: WIND_FROM, speedKnots: 12, oscillationDeg: 0 }} visible />
            <GraphicsShape draw={drawOverlay} />
            {renderBoats.map((boat) => (
              <BoatSprite key={boat.id} boat={boat} />
            ))}
          </LessonStage>
          <div className="lesson-banner win">
            {topic === "start" ? "红船合法穿线；蓝船抢航后必须先回到线后再重新起航。" : "红船把 1 标留在左舷，完成绕标；蓝船从错误侧通过，不算绕标。"}
          </div>
        </section>

        <aside className="lesson-side">
          <div className="lesson-mode-buttons">
            <FocusableButton type="button" className={topic === "start" ? "active" : ""} onClick={() => switchTopic("start")}>
              启航
            </FocusableButton>
            <FocusableButton type="button" className={topic === "rounding" ? "active" : ""} onClick={() => switchTopic("rounding")}>
              绕标
            </FocusableButton>
          </div>

          <div className="lesson-status">
            <strong>{TOPIC_TITLE[topic]}</strong>
            <p>{TOPIC_DESCRIPTION[topic]}</p>
          </div>

          <div className="lesson-rule-card">
            {RULE_POINTS[topic].map((item) => (
              <section key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </section>
            ))}
          </div>

          <div className="lesson-readouts">
            {topic === "start" ? (
              <>
                <span>红船：合法起航</span>
                <span>蓝船：OCS 后回线</span>
              </>
            ) : (
              <>
                <span>红船：正确侧绕标</span>
                <span>蓝船：错误侧通过</span>
              </>
            )}
          </div>

          <div className="lesson-hint">这页讲的是比赛进程判定：先合法启航，再按顺序、按规定一侧绕标，最后才能冲线。</div>
        </aside>
      </div>
    </main>
  );
}

function drawStartOverlay(graphics: PixiGraphics) {
  graphics.moveTo(820, START_LINE_Y);
  graphics.lineTo(1980, START_LINE_Y);
  graphics.stroke({ color: "#ffe082", alpha: 0.9, width: 6 });
  graphics.rect(820, 200, 1160, START_LINE_Y - 200).fill({ color: "#ffffff", alpha: 0.06 });
  graphics.circle(820, START_LINE_Y, 34).fill("#ff8a18").stroke({ color: "#ffe082", width: 4 });
  graphics.circle(1980, START_LINE_Y, 34).fill("#ff8a18").stroke({ color: "#ffe082", width: 4 });
}

function drawRoundingOverlay(graphics: PixiGraphics) {
  graphics.circle(MARK.x, MARK.y, 160).stroke({ color: "#9fdcff", alpha: 0.42, width: 4 });
  graphics.circle(MARK.x, MARK.y, 48).stroke({ color: "#ffe082", alpha: 0.95, width: 5 });
  graphics.circle(MARK.x, MARK.y, 22).fill("#ff8a18").stroke({ color: "#c94e08", width: 4 });
  graphics.moveTo(MARK.x + 78, MARK.y + 112);
  graphics.lineTo(MARK.x + 150, MARK.y + 32);
  graphics.lineTo(MARK.x + 142, MARK.y - 74);
  graphics.stroke({ color: "#9ff0c0", alpha: 0.74, width: 8 });
  graphics.moveTo(MARK.x - 92, MARK.y + 106);
  graphics.lineTo(MARK.x - 150, MARK.y + 12);
  graphics.lineTo(MARK.x - 114, MARK.y - 88);
  graphics.stroke({ color: "#ff9d7c", alpha: 0.72, width: 8 });
}

function toBoatState(boat: DemoBoat, progress: number): BoatState {
  const position = samplePath(boat.path, progress);
  const next = samplePath(boat.path, Math.min(1, progress + 0.02));
  const headingDeg = normalizeDeg((Math.atan2(next.x - position.x, -(next.y - position.y)) * 180) / Math.PI);
  const forward = headingToVector(headingDeg);
  return {
    id: boat.id,
    name: boat.name,
    color: boat.color,
    boatType: "op",
    position,
    headingDeg,
    speed: 26,
    velocity: { x: forward.x * 26, y: forward.y * 26 },
    rudderAngleDeg: 0,
    sailAngleDeg: 0,
    twaDeg: 45,
    tack: headingDeg > 180 ? "starboard" : "port",
    tackTimerSec: 0,
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

function samplePath(path: Vec2[], progress: number): Vec2 {
  const scaled = Math.min(0.999, Math.max(0, progress)) * (path.length - 1);
  const index = Math.floor(scaled);
  const t = scaled - index;
  const from = path[index];
  const to = path[Math.min(path.length - 1, index + 1)];
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t
  };
}
