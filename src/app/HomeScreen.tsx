import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";
import { RaceSetupDialog } from "./RaceSetupDialog";
import { HomeStageBackground } from "./HomeStageBackground";

export function HomeScreen() {
  const [setupOpen, setSetupOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const setView = useGameStore((state) => state.setView);

  return (
    <main className="demo-screen home-screen">
      <HomeStageBackground />
      <section className="home-shell">
        <div className="demo-hero">
          <p className="eyebrow">Sailing Tactic</p>
          <h1>把风、航线和规则变成一场大屏比赛</h1>
          <p>用实体小船手柄控制屏幕里的帆船。读风、抢线、避让，系统实时记录犯规和比赛结果。</p>
          <div className="home-primary-actions">
            <FocusableButton type="button" className="primary" onClick={() => setSetupOpen(true)} autoFocus>
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
        <FocusableButton type="button" onClick={() => setAboutOpen(true)}>
          关于我们
        </FocusableButton>
        <FocusableButton type="button" onClick={() => setView("intro")}>
          项目介绍
        </FocusableButton>
      </footer>
      {setupOpen ? <RaceSetupDialog onClose={() => setSetupOpen(false)} /> : null}
      {aboutOpen ? (
        <div className="modal-scrim" role="presentation">
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <p className="eyebrow">About</p>
            <h2 id="about-title">关于我们</h2>
            <p>团队成员信息将在这里补充。</p>
            <div className="modal-actions">
              <FocusableButton type="button" className="accent" onClick={() => setAboutOpen(false)} autoFocus>
                关闭
              </FocusableButton>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
