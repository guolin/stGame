import { useEffect, useMemo, useState } from "react";
import { COURSE_IDS, getCourse } from "../sim/course/courses";
import { DIFFICULTY_IDS, DIFFICULTY_LABEL, ENVIRONMENT_IDS, ENVIRONMENT_LABEL } from "../sim/environment";
import type { SetupStep } from "../store/gameStore";
import { useGameStore } from "../store/gameStore";

const STEP_ORDER: SetupStep[] = ["players", "course", "difficulty", "environment", "controllers"];

const STEP_TITLE: Record<SetupStep, string> = {
  players: "选择人数",
  course: "选择场地",
  difficulty: "选择难度 / 天气",
  environment: "选择环境",
  controllers: "手柄检查"
};

export function SetupScreen() {
  const setupStep = useGameStore((state) => state.setupStep);
  const setSetupStep = useGameStore((state) => state.setSetupStep);
  const setView = useGameStore((state) => state.setView);
  const startRace = useGameStore((state) => state.startRace);

  const stepIndex = STEP_ORDER.indexOf(setupStep);
  const isLast = stepIndex === STEP_ORDER.length - 1;

  return (
    <main className="demo-screen setup-screen">
      <section className="demo-panel wide">
        <p className="eyebrow">
          比赛设置 · 第 {stepIndex + 1} / {STEP_ORDER.length} 步
        </p>
        <h1>{STEP_TITLE[setupStep]}</h1>
        <div className="setup-progress">
          {STEP_ORDER.map((step, index) => (
            <button
              key={step}
              type="button"
              className={index === stepIndex ? "active" : index < stepIndex ? "done" : ""}
              onClick={() => setSetupStep(step)}
            >
              {STEP_TITLE[step]}
            </button>
          ))}
        </div>

        {setupStep === "players" && <PlayersStep />}
        {setupStep === "course" && <CourseStep />}
        {setupStep === "difficulty" && <DifficultyStep />}
        {setupStep === "environment" && <EnvironmentStep />}
        {setupStep === "controllers" && <ControllersStep />}

        <div className="demo-actions">
          {stepIndex > 0 && (
            <button type="button" onClick={() => setSetupStep(STEP_ORDER[stepIndex - 1])}>
              上一步
            </button>
          )}
          {!isLast && (
            <button type="button" className="accent" onClick={() => setSetupStep(STEP_ORDER[stepIndex + 1])}>
              下一步
            </button>
          )}
          {isLast && (
            <button type="button" className="accent" onClick={startRace}>
              开始比赛
            </button>
          )}
          <button type="button" onClick={() => setView("home")}>
            返回首页
          </button>
        </div>
      </section>
    </main>
  );
}

function PlayersStep() {
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const setBoatCount = useGameStore((state) => state.setBoatCount);

  return (
    <div className="option-cards">
      {[1, 2, 3, 4].map((count) => (
        <button
          key={count}
          type="button"
          className={`option-card ${activeBoatIds.length === count ? "selected" : ""}`}
          onClick={() => setBoatCount(count)}
        >
          <strong>{count} 人</strong>
          <span>{count === 1 ? "教学 / 计时" : count === 2 ? "规则演示" : count === 3 ? "中等对抗" : "大电视主 Demo"}</span>
          <em>{Array.from({ length: count }, (_, i) => `${i + 1}号船 Ch${i + 1}`).join(" · ")}</em>
        </button>
      ))}
    </div>
  );
}

function CourseStep() {
  const course = useGameStore((state) => state.course);
  const setCourse = useGameStore((state) => state.setCourse);

  return (
    <div className="option-cards">
      {COURSE_IDS.map((id) => {
        const def = getCourse(id);
        return (
          <button
            key={id}
            type="button"
            className={`option-card ${course.id === id ? "selected" : ""}`}
            onClick={() => setCourse(id)}
          >
            <CourseMiniMap courseId={id} />
            <strong>{def.name}</strong>
            <span>{def.description}</span>
            <em>
              {def.marks.length} 标 · 适合 {def.recommendedPlayers.min}-{def.recommendedPlayers.max} 人
            </em>
          </button>
        );
      })}
    </div>
  );
}

function CourseMiniMap({ courseId }: { courseId: (typeof COURSE_IDS)[number] }) {
  const def = useMemo(() => getCourse(courseId), [courseId]);
  const scale = 120 / 2800;
  const offsetY = (120 - 1800 * scale) / 2;

  return (
    <svg className="mini-map" viewBox="0 0 120 120" aria-hidden>
      <line
        x1={def.startLine.left.x * scale}
        y1={def.startLine.left.y * scale + offsetY}
        x2={def.startLine.right.x * scale}
        y2={def.startLine.right.y * scale + offsetY}
        stroke="#ffffff"
        strokeWidth="2"
      />
      {def.marks.map((mark, index) => (
        <g key={mark.id}>
          <circle cx={mark.position.x * scale} cy={mark.position.y * scale + offsetY} r="5" fill="#ff8a18" />
          <text x={mark.position.x * scale + 8} y={mark.position.y * scale + offsetY + 4} fill="#ffffff" fontSize="10">
            {index + 1}
          </text>
        </g>
      ))}
      <path d="M60 8 l4 8 h-8 z" fill="#9fdcff" />
    </svg>
  );
}

function DifficultyStep() {
  const difficulty = useGameStore((state) => state.difficulty);
  const setDifficulty = useGameStore((state) => state.setDifficulty);

  return (
    <div className="option-cards three">
      {DIFFICULTY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={`option-card ${difficulty === id ? "selected" : ""}`}
          onClick={() => setDifficulty(id)}
        >
          <strong>{DIFFICULTY_LABEL[id].name}</strong>
          <span>{DIFFICULTY_LABEL[id].blurb}</span>
        </button>
      ))}
    </div>
  );
}

function EnvironmentStep() {
  const environment = useGameStore((state) => state.environment);
  const setEnvironment = useGameStore((state) => state.setEnvironment);

  return (
    <div className="option-cards three">
      {ENVIRONMENT_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={`option-card ${environment === id ? "selected" : ""}`}
          onClick={() => setEnvironment(id)}
        >
          <strong>{ENVIRONMENT_LABEL[id].name}</strong>
          <span>{ENVIRONMENT_LABEL[id].blurb}</span>
        </button>
      ))}
    </div>
  );
}

function ControllersStep() {
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const [, setPollTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPollTick((tick) => tick + 1), 200);
    return () => window.clearInterval(timer);
  }, []);

  const gamepads = typeof navigator !== "undefined" && navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
  const connected = gamepads.filter((pad): pad is Gamepad => Boolean(pad?.connected));

  return (
    <div className="controller-check">
      {activeBoatIds.map((boatId, index) => {
        const pad = connected[index];
        return (
          <div key={boatId} className="controller-row">
            <strong>
              {index + 1}号船 · 通道{index + 1}
            </strong>
            {pad ? (
              <span className="ok">已连接 {pad.id.slice(0, 28)} · 舵 {Math.round((pad.axes[0] ?? 0) * 100)}%</span>
            ) : (
              <span className="fallback">未检测到手柄 · 使用键盘兜底（{["A/D", "←/→", "J/L", "小键盘4/6"][index]}）</span>
            )}
          </div>
        );
      })}
      <p className="hint">没有手柄也可以直接开始，键盘和自动演示输入随时可用。</p>
    </div>
  );
}
