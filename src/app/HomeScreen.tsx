import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";
import { RaceSetupDialog } from "./RaceSetupDialog";

export function HomeScreen() {
  const [setupOpen, setSetupOpen] = useState(false);
  const setView = useGameStore((state) => state.setView);

  return (
    <main className="demo-screen home-screen">
      <section className="demo-hero">
        <p className="eyebrow">Tactic</p>
        <h1>把看不见的风，画到屏幕上</h1>
        <p>用手里的小船控制屏幕里的船。看懂风，转对方向，就能超出去。</p>
        <div className="home-primary-actions">
          <FocusableButton type="button" className="primary" onClick={() => setSetupOpen(true)} autoFocus>
            开始比赛
          </FocusableButton>
          <FocusableButton type="button" onClick={() => setView("intro")}>
            项目 Demo
          </FocusableButton>
        </div>
      </section>
      <section className="demo-strip">
        <span>现场顺序</span>
        <strong>{"项目 Demo -> 比赛设置 -> 倒计时 -> 赛后总结"}</strong>
      </section>
      {setupOpen ? <RaceSetupDialog onClose={() => setSetupOpen(false)} /> : null}
    </main>
  );
}
