import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";
import { RaceSetupDialog } from "./RaceSetupDialog";
import { HomeStageBackground } from "./HomeStageBackground";
import { gamepadAxisToRudder, normalizeGamepadAxis } from "../game/loop/gamepadControls";
import type { GamepadSteeringSettings } from "../game/loop/gamepadTuning";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import { WORLD } from "../game/constants";
import type { BoatState, WindState } from "../game/types";
import { createBoatMotionState, stepBoatPhysics } from "../sim/boat/boatPhysics";
import type { BoatMotionState, LocalWind } from "../sim/boat/boatPhysics";
import { LessonStage } from "../lessons/LessonStage";

export function HomeScreen() {
  const [setupOpen, setSetupOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [gamepadOpen, setGamepadOpen] = useState(false);
  const [rudderDemoOpen, setRudderDemoOpen] = useState(false);
  const [restoreSetupFocus, setRestoreSetupFocus] = useState(false);
  const [restoreAboutFocus, setRestoreAboutFocus] = useState(false);
  const [restoreRudderDemoFocus, setRestoreRudderDemoFocus] = useState(false);
  const setView = useGameStore((state) => state.setView);

  useEffect(() => {
    if (!restoreSetupFocus && !restoreAboutFocus) return;
    const timer = window.setTimeout(() => {
      setRestoreSetupFocus(false);
      setRestoreAboutFocus(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [restoreSetupFocus, restoreAboutFocus]);

  const openSetup = () => {
    setRestoreSetupFocus(false);
    setSetupOpen(true);
  };

  const closeSetup = () => {
    setSetupOpen(false);
    setRestoreSetupFocus(true);
  };

  useEffect(() => {
    if (!restoreRudderDemoFocus) return;
    const timer = window.setTimeout(() => setRestoreRudderDemoFocus(false), 0);
    return () => window.clearTimeout(timer);
  }, [restoreRudderDemoFocus]);

  const openAbout = () => {
    setRestoreAboutFocus(false);
    setAboutOpen(true);
  };

  const closeAbout = () => {
    setAboutOpen(false);
    setRestoreAboutFocus(true);
  };

  const openRudderDemo = () => {
    setRestoreRudderDemoFocus(false);
    setRudderDemoOpen(true);
  };

  const closeRudderDemo = () => {
    setRudderDemoOpen(false);
    setRestoreRudderDemoFocus(true);
  };

  return (
    <main className="demo-screen home-screen">
      <HomeStageBackground />
      <section className="home-shell">
        <div className="demo-hero">
          <p className="eyebrow">Sailing Tactic</p>
          <h1>把风、航线和规则变成一场大屏比赛</h1>
          <p>用实体小船手柄控制屏幕里的帆船。读风、抢线、避让，系统实时记录犯规和比赛结果。</p>
          <div className="home-primary-actions">
            <FocusableButton
              type="button"
              className="primary"
              onClick={openSetup}
              autoFocus={restoreSetupFocus || (!setupOpen && !aboutOpen && !gamepadOpen && !rudderDemoOpen && !restoreAboutFocus && !restoreRudderDemoFocus)}
            >
              开始游戏
            </FocusableButton>
          </div>
          <div className="home-feature-row" aria-label="核心功能">
            <span>1-4 船同屏</span>
            <span>局部风区</span>
            <span>自动裁判</span>
          </div>
        </div>
        <figure className="home-logo-card" aria-label="Sailing Tactic">
          <img src="/assets/sailing-tactic-logo.png" alt="Sailing Tactic" />
        </figure>
      </section>
      <footer className="home-footer">
        <FocusableButton type="button" onClick={openAbout} autoFocus={restoreAboutFocus}>
          关于我们
        </FocusableButton>
        <FocusableButton type="button" onClick={() => setGamepadOpen(true)}>
          手柄测试
        </FocusableButton>
        <FocusableButton type="button" onClick={openRudderDemo} autoFocus={restoreRudderDemoFocus}>
          船舵展示
        </FocusableButton>
        <FocusableButton type="button" onClick={() => setView("intro")}>
          项目介绍
        </FocusableButton>
      </footer>
      {setupOpen ? <RaceSetupDialog onClose={closeSetup} /> : null}
      {gamepadOpen ? <GamepadTestDialog onClose={() => setGamepadOpen(false)} /> : null}
      {rudderDemoOpen ? <RudderDemoDialog onClose={closeRudderDemo} /> : null}
      {aboutOpen ? (
        <div className="modal-scrim" role="presentation">
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <img className="about-team-image" src="/assets/sailing-tactics-team.png" alt="Sailing Tactics 研发团队" />
            <div className="about-copy">
              <h2 id="about-title">Sailing Tactics 研发团队</h2>
              <p className="about-lead">
                我们是五位 5 至 9 年级少创客。围绕“让帆船运动触手可及”的目标，我们把航线判断、读风技巧与竞赛规则，转化为更易上手的数字网页游戏。
              </p>
              <div className="about-role-grid" aria-label="团队分工">
                <article>
                  <strong>软件研发</strong>
                  <span>袁嘉佑（Pai） · 陈新宇 · Charan</span>
                </article>
                <article>
                  <strong>硬件与视觉</strong>
                  <span>崔书菡</span>
                </article>
                <article>
                  <strong>交互与演示</strong>
                  <span>Emily</span>
                </article>
              </div>
              <p className="about-closing">用技术降低学习门槛，让更多人感受乘风前行的乐趣。</p>
              <div className="modal-actions">
                <FocusableButton type="button" className="accent" onClick={closeAbout} autoFocus>
                  关闭
                </FocusableButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function RudderDemoDialog({ onClose }: { onClose: () => void }) {
  const demo = useRudderDemo();

  return (
    <div className="modal-scrim" role="presentation">
      <section className="rudder-demo-modal" role="dialog" aria-modal="true" aria-labelledby="rudder-demo-title">
        <header className="rudder-demo-header">
          <div>
            <p className="eyebrow">Rudder</p>
            <h2 id="rudder-demo-title">船舵展示</h2>
          </div>
          <div className="rudder-demo-readout" aria-label="船舵输入">
            <span>手柄 {demo.connected ? "已连接" : "未连接"}</span>
            <span>输入 {Math.round(demo.axis)}</span>
            <span>舵量 {Math.round(demo.rudder * 100)}%</span>
          </div>
          <FocusableButton type="button" className="rudder-demo-home-button" onClick={onClose} autoFocus>
            返回主页
          </FocusableButton>
        </header>
        <div className="rudder-demo-stage" aria-label="船舵展示运行区">
          <svg viewBox="0 0 1200 720" role="img" aria-label="手柄控制船舵和船只转向">
            <rect width="1200" height="720" />
            <path className="rudder-demo-wave" d="M0 120 C180 80 300 154 480 112 S780 82 960 126 1110 152 1200 122" />
            <path className="rudder-demo-wave" d="M0 520 C150 480 320 550 470 512 S760 480 930 520 1090 560 1200 518" />
            <g transform={`translate(${demo.x} ${demo.y}) rotate(${demo.heading})`}>
              <path className="rudder-demo-hull-shadow" d="M0 -76 C36 -58 50 -2 36 54 C22 84 -22 84 -36 54 C-50 -2 -36 -58 0 -76 Z" />
              <path className="rudder-demo-hull" d="M0 -76 C36 -58 50 -2 36 54 C22 84 -22 84 -36 54 C-50 -2 -36 -58 0 -76 Z" />
              <path className="rudder-demo-deck" d="M0 -60 C26 -44 36 -2 26 42 C16 62 -16 62 -26 42 C-36 -2 -26 -44 0 -60 Z" />
              <line className="rudder-demo-panel" x1="-23" y1="-28" x2="23" y2="-28" />
              <line className="rudder-demo-panel" x1="-30" y1="22" x2="30" y2="22" />
              <line className="rudder-demo-panel" x1="0" y1="-58" x2="0" y2="64" />
              <circle className="rudder-demo-cockpit" cx="0" cy="16" r="19" />
              <g transform={`translate(0 66) rotate(${demo.rudderAngle})`}>
                <rect className="rudder-demo-rudder" x="-6" y="-2" width="12" height="44" />
              </g>
            </g>
          </svg>
        </div>
      </section>
    </div>
  );
}

function GamepadTestDialog({ onClose }: { onClose: () => void }) {
  const settings = useGameStore((state) => state.gamepadSteering);
  const setGamepadSteering = useGameStore((state) => state.setGamepadSteering);
  const [manualAxis, setManualAxis] = useState(0);
  const preview = useGamepadPreview(settings, manualAxis);
  const sampleInputs = [20, 30, 50, 60, 80, 100];

  const setPercent = (key: keyof GamepadSteeringSettings, value: string) => {
    setGamepadSteering({ [key]: Number(value) / 100 });
  };

  return (
    <div className="modal-scrim" role="presentation">
      <section className="gamepad-test-modal" role="dialog" aria-modal="true" aria-labelledby="gamepad-test-title">
        <div className="gamepad-test-controls">
          <p className="eyebrow">Controller</p>
          <h2 id="gamepad-test-title">手柄测试</h2>
          <div className="gamepad-live-readout">
            <span>输入 {Math.round(preview.axis)}</span>
            <span>舵量 {Math.round(preview.rudder * 100)}%</span>
          </div>
          <div className="gamepad-tuning-grid">
            <TuningSlider label="死区 +/-" value={settings.deadzone} min={0} max={45} onChange={(value) => setPercent("deadzone", value)} />
            <TuningSlider
              label="第一点"
              value={settings.precisionPoint}
              min={Math.ceil(settings.deadzone * 100 + 5)}
              max={95}
              onChange={(value) => setPercent("precisionPoint", value)}
            />
            <TuningSlider
              label="第二点"
              value={settings.boostPoint}
              min={Math.ceil(settings.precisionPoint * 100 + 5)}
              max={100}
              onChange={(value) => setPercent("boostPoint", value)}
            />
            <label className="tuning-slider">
              <span>
                模拟输入
                <strong>{manualAxis}</strong>
              </span>
              <input type="range" min="-100" max="100" step="1" value={manualAxis} onChange={(event) => setManualAxis(Number(event.currentTarget.value))} />
            </label>
          </div>
          <div className="gamepad-tuning-note">
            <p>
              死区以内的输入会被当作 0，用来过滤手柄回中抖动。第一点之前是微调区，舵量用三次方慢慢增加，适合小角度修正。
            </p>
            <p>第二点之后进入快速区，输入越靠近满量，舵量增长越快，适合需要立刻大幅转向的动作。</p>
          </div>
          <div className="gamepad-samples" aria-label="当前曲线">
            {sampleInputs.map((input) => (
              <span key={input}>
                {input}: {Math.round(Math.abs(gamepadAxisToRudder(input, settings)) * 100)}%
              </span>
            ))}
          </div>
          <div className="modal-actions">
            <FocusableButton type="button" className="accent" onClick={onClose} autoFocus>
              完成
            </FocusableButton>
          </div>
        </div>
        <div className="gamepad-test-stage" aria-label="手柄测试运行区">
          <LessonStage className="gamepad-test-canvas">
            <WaterLayer timeSec={preview.timeSec} />
            <WindLayer wind={PREVIEW_DISPLAY_WIND} visible />
            <BoatSprite boat={preview.boat} />
          </LessonStage>
        </div>
      </section>
    </div>
  );
}

function TuningSlider({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const percent = Math.round(value * 100);

  return (
    <label className="tuning-slider">
      <span>
        {label}
        <strong>{percent}</strong>
      </span>
      <input type="range" min={min} max={max} step="1" value={percent} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

const PREVIEW_WIND: LocalWind = { directionDeg: 0, speedKnots: 12 };
const PREVIEW_DISPLAY_WIND: WindState = { ...PREVIEW_WIND, oscillationDeg: 0 };
const PREVIEW_SPAWN = { position: { x: WORLD.width / 2, y: WORLD.height * 0.68 }, headingDeg: 45, speed: 0 };

function useGamepadPreview(settings: GamepadSteeringSettings, manualAxis: number) {
  const motionRef = useRef<BoatMotionState>(createBoatMotionState(PREVIEW_SPAWN));
  const [preview, setPreview] = useState(() => ({
    timeSec: 0,
    axis: manualAxis,
    rudder: gamepadAxisToRudder(manualAxis, settings),
    boat: toPreviewBoat(motionRef.current)
  }));

  useEffect(() => {
    let frame = 0;
    let lastTime: number | undefined;
    let elapsed = 0;

    const tick = (time: number) => {
      if (lastTime === undefined) lastTime = time;
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      elapsed += dt;

      const gamepads = navigator.getGamepads?.() ?? [];
      const first = Array.from(gamepads).find((pad): pad is Gamepad => Boolean(pad?.connected));
      const axis = first?.axes[0] ?? manualAxis;
      const rudder = gamepadAxisToRudder(axis, settings);
      const next = stepBoatPhysics({
        motion: motionRef.current,
        rudder,
        boatType: "op",
        wind: PREVIEW_WIND,
        penaltyFactor: 1,
        dt
      });

      if (next.position.x < 220 || next.position.x > WORLD.width - 220 || next.position.y < 220 || next.position.y > WORLD.height - 220) {
        motionRef.current = createBoatMotionState(PREVIEW_SPAWN);
      } else {
        motionRef.current = next;
      }

      setPreview({ timeSec: elapsed, axis, rudder, boat: toPreviewBoat(motionRef.current) });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [manualAxis, settings]);

  return preview;
}

const RUDDER_DEMO_SPEED_MULTIPLIER = 1;
const RUDDER_DEMO_BASE_SPEED = 120;
const RUDDER_DEMO_TURN_RATE_DEG = 82;
const RUDDER_DEMO_RUDDER_MAX_DEG = 38;
const RUDDER_DEMO_DEADZONE = 0.05;

function useRudderDemo() {
  const stateRef = useRef({ x: 600, y: 360, heading: -18 });
  const [demo, setDemo] = useState(() => ({
    ...stateRef.current,
    axis: 0,
    rudder: 0,
    rudderAngle: 0,
    connected: false
  }));

  useEffect(() => {
    let frame = 0;
    let lastTime: number | undefined;

    const tick = (time: number) => {
      if (lastTime === undefined) lastTime = time;
      const rawDt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const dt = rawDt * RUDDER_DEMO_SPEED_MULTIPLIER;
      const gamepads = navigator.getGamepads?.() ?? [];
      const first = Array.from(gamepads).find((pad): pad is Gamepad => Boolean(pad?.connected));
      const axis = first?.axes[0] ?? 0;
      const rudder = rudderDemoAxisToRudder(axis);
      const nextHeading = stateRef.current.heading - rudder * RUDDER_DEMO_TURN_RATE_DEG * dt;
      const rad = ((nextHeading - 90) * Math.PI) / 180;
      const nextX = wrapValue(stateRef.current.x + Math.cos(rad) * RUDDER_DEMO_BASE_SPEED * dt, -70, 1270);
      const nextY = wrapValue(stateRef.current.y + Math.sin(rad) * RUDDER_DEMO_BASE_SPEED * dt, -70, 790);

      stateRef.current = { x: nextX, y: nextY, heading: nextHeading };
      setDemo({
        ...stateRef.current,
        axis,
        rudder,
        rudderAngle: rudder * RUDDER_DEMO_RUDDER_MAX_DEG,
        connected: Boolean(first)
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return demo;
}

function rudderDemoAxisToRudder(axisValue: number | undefined) {
  if (axisValue === undefined) return 0;
  const normalized = normalizeGamepadAxis(axisValue);
  if (Math.abs(normalized) <= RUDDER_DEMO_DEADZONE) return 0;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function wrapValue(value: number, min: number, max: number) {
  if (value < min) return max;
  if (value > max) return min;
  return value;
}

function toPreviewBoat(motion: BoatMotionState): BoatState {
  return {
    id: "red",
    name: "测试船",
    color: "#ff533d",
    boatType: "op",
    position: motion.position,
    headingDeg: motion.headingDeg,
    speed: motion.speed,
    velocity: motion.velocity,
    rudderAngleDeg: motion.rudderAngleDeg,
    sailAngleDeg: motion.sailAngleDeg,
    twaDeg: motion.twaDeg,
    tack: motion.tack,
    tackTimerSec: motion.tackTimerSec,
    sailEfficiency: motion.sailEfficiency,
    legIndex: 0,
    finished: false,
    startStatus: "started",
    markSweepDeg: 0,
    tackCount: 0,
    penaltyCount: 0,
    track: []
  };
}
