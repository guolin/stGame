import { useState } from "react";
import { CoachControls } from "../components/hud/CoachControls";
import { Countdown } from "../components/hud/Countdown";
import { PlayerPanel } from "../components/hud/PlayerPanel";
import { RuleEventLog } from "../components/hud/RuleEventLog";
import { WindPanel } from "../components/hud/WindPanel";
import { useGameLoop } from "../game/loop/useGameLoop";
import { useGamepadControls } from "../game/loop/gamepadControls";
import { useKeyboardControls } from "../game/loop/useKeyboardControls";
import { GameStage } from "../game/rendering/GameStage";
import { useGameStore } from "../store/gameStore";
import { RaceSetupDialog } from "./RaceSetupDialog";

export function GameScreen() {
  const [setupOpen, setSetupOpen] = useState(false);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  useGameLoop();
  useGamepadControls();
  useKeyboardControls();

  return (
    <main className="game-screen">
      <GameStage />
      <div className="hud">
        <Countdown />
        <WindPanel />
        {activeBoatIds.map((boatId) => (
          <PlayerPanel key={boatId} boatId={boatId} />
        ))}
        <RuleEventLog />
        <CoachControls onRestartSetup={() => setSetupOpen(true)} />
      </div>
      {setupOpen ? <RaceSetupDialog onClose={() => setSetupOpen(false)} /> : null}
    </main>
  );
}
