import { CoachControls } from "../components/hud/CoachControls";
import { Countdown } from "../components/hud/Countdown";
import { CurrentPanel } from "../components/hud/CurrentPanel";
import { PlayerPanel } from "../components/hud/PlayerPanel";
import { RuleAlert } from "../components/hud/RuleAlert";
import { RuleEventLog } from "../components/hud/RuleEventLog";
import { WindPanel } from "../components/hud/WindPanel";
import { useGameLoop } from "../game/loop/useGameLoop";
import { useGamepadControls } from "../game/loop/gamepadControls";
import { useKeyboardControls } from "../game/loop/useKeyboardControls";
import { GameStage } from "../game/rendering/GameStage";
import { useGameStore } from "../store/gameStore";

export function GameScreen() {
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const hudVisible = useGameStore((state) => state.hudVisible);
  const toggleHud = useGameStore((state) => state.toggleHud);
  const phase = useGameStore((state) => state.race.phase);
  useGameLoop();
  useGamepadControls();
  useKeyboardControls();

  return (
    <main className="game-screen">
      <GameStage />
      <div className="hud">
        <Countdown />
        <RuleAlert />
        {hudVisible && (
          <>
            <WindPanel />
            <CurrentPanel />
            {activeBoatIds.map((boatId) => (
              <PlayerPanel key={boatId} boatId={boatId} />
            ))}
            <RuleEventLog />
            <CoachControls />
            {phase === "prestart" && (
              <div className="controls-hint">手柄通道 1-4 控制船 1-4 · 键盘 P1 A/D · P2 ←/→ · P3 J/L · P4 小键盘 4/6 · Space 暂停 · H 隐藏界面</div>
            )}
          </>
        )}
        <button type="button" className="hud-toggle" onClick={toggleHud}>
          {hudVisible ? "隐藏界面 (H)" : "显示界面 (H)"}
        </button>
      </div>
    </main>
  );
}
