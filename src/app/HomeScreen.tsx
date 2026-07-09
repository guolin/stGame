import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";

export function HomeScreen() {
  const setView = useGameStore((state) => state.setView);
  const setSetupStep = useGameStore((state) => state.setSetupStep);
  const setBoatCount = useGameStore((state) => state.setBoatCount);
  const startRace = useGameStore((state) => state.startRace);

  const entries = [
    {
      title: "比赛",
      blurb: "选择人数、难度、场地，开始 1-4 船对抗",
      accent: true,
      onClick: () => {
        setSetupStep("players");
        setView("setup");
      }
    },
    {
      title: "讲解模式",
      blurb: "船为什么这样走 · 比赛规则 · 两船相遇 Demo",
      onClick: () => setView("lessons")
    },
    {
      title: "项目介绍",
      blurb: "为什么做这个项目：风、流、规则都看不见",
      onClick: () => setView("intro")
    },
    {
      title: "快速开始",
      blurb: "一键进入 4 船标准比赛（现场兜底）",
      onClick: () => {
        setBoatCount(4);
        startRace();
      }
    }
  ];

  return (
    <main className="demo-screen home-screen">
      <section className="demo-hero">
        <p className="eyebrow">帆船战术对抗模拟器</p>
        <h1>把看不见的风、流、战术和规则变成大屏互动</h1>
        <p>1-4 名玩家用蓝牙帆船模型手柄同屏比赛。风摆、阵风、水流、Layline 和自动裁判全部可视化。</p>
        <div className="home-entries">
          {entries.map((entry, index) => (
            <FocusableButton
              key={entry.title}
              type="button"
              className={entry.accent ? "accent" : ""}
              onClick={entry.onClick}
              autoFocus={index === 0}
            >
              <strong>{entry.title}</strong>
              <span>{entry.blurb}</span>
            </FocusableButton>
          ))}
        </div>
      </section>
      <section className="demo-strip">
        <span>黑客松主链路</span>
        <strong>{"项目介绍 -> 讲解模式 -> 比赛 -> 赛后总结"}</strong>
      </section>
    </main>
  );
}
