import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";
import { RaceSetupDialog } from "./RaceSetupDialog";
import { HomeStageBackground } from "./HomeStageBackground";
import { gamepadAxisToRudder } from "../game/loop/gamepadControls";
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
  const [restoreSetupFocus, setRestoreSetupFocus] = useState(false);
  const [restoreAboutFocus, setRestoreAboutFocus] = useState(false);
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

  const openAbout = () => {
    setRestoreAboutFocus(false);
    setAboutOpen(true);
  };

  const closeAbout = () => {
    setAboutOpen(false);
    setRestoreAboutFocus(true);
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
            <FocusableButton type="button" className="primary" onClick={openSetup} autoFocus={!setupOpen && !aboutOpen && !gamepadOpen && !restoreAboutFocus}>
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
        <FocusableButton type="button" onClick={() => setView("intro")}>
          项目介绍
        </FocusableButton>
      </footer>
      {setupOpen ? <RaceSetupDialog onClose={closeSetup} /> : null}
      {gamepadOpen ? <GamepadTestDialog onClose={() => setGamepadOpen(false)} /> : null}
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
