import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";
import { RaceSetupDialog } from "./RaceSetupDialog";
import { HomeStageBackground } from "./HomeStageBackground";

export function HomeScreen() {
  const [setupOpen, setSetupOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [restoreAboutFocus, setRestoreAboutFocus] = useState(false);
  const setView = useGameStore((state) => state.setView);

  useEffect(() => {
    if (!restoreAboutFocus) return;
    const timer = window.setTimeout(() => setRestoreAboutFocus(false), 0);
    return () => window.clearTimeout(timer);
  }, [restoreAboutFocus]);

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
        <FocusableButton type="button" onClick={openAbout} autoFocus={restoreAboutFocus}>
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
