import { Gauge, List, Pause, Settings2 } from "lucide-react";
import { FocusableButton } from "../../app/navigation/FocusableButton";
import { useGameStore } from "../../store/gameStore";

type CoachControlsProps = {
  onRestartSetup: () => void;
};

const SPEED_STEPS = [1, 2, 4];

export function CoachControls({ onRestartSetup }: CoachControlsProps) {
  const setView = useGameStore((state) => state.setView);
  const timeScale = useGameStore((state) => state.timeScale);
  const setTimeScale = useGameStore((state) => state.setTimeScale);
  const togglePause = useGameStore((state) => state.togglePause);
  const speedIndex = SPEED_STEPS.indexOf(timeScale);
  const nextSpeed = SPEED_STEPS[(speedIndex + 1) % SPEED_STEPS.length] ?? 1;

  return (
    <section className="coach-controls">
      <FocusableButton type="button" className="icon-button" onClick={togglePause} aria-label="暂停或继续" title="暂停/继续" autoFocus>
        <Pause aria-hidden="true" />
      </FocusableButton>
      <FocusableButton type="button" className="icon-button" onClick={() => setTimeScale(nextSpeed)} aria-label={`速度 ${timeScale} 倍`} title="切换速度">
        <Gauge aria-hidden="true" />
        <span className="speed-badge">{timeScale}x</span>
      </FocusableButton>
      <FocusableButton type="button" className="icon-button" onClick={onRestartSetup} aria-label="重新配置比赛" title="重新配置比赛">
        <Settings2 aria-hidden="true" />
      </FocusableButton>
      <FocusableButton type="button" className="icon-button" onClick={() => setView("results")} aria-label="查看结果" title="查看结果">
        <List aria-hidden="true" />
      </FocusableButton>
    </section>
  );
}
