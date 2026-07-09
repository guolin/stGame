import { useGameStore } from "../../store/gameStore";
import type { OverlaySettings } from "../../game/types";
import { FocusableButton } from "../../app/navigation/FocusableButton";

const overlayLabels: Record<keyof OverlaySettings, string> = {
  wind: "风",
  current: "流",
  tracks: "航迹",
  laylines: "Layline",
  noGoZone: "禁航角"
};

export function CoachControls() {
  const overlays = useGameStore((state) => state.overlays);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const timeScale = useGameStore((state) => state.timeScale);
  const setBoatCount = useGameStore((state) => state.setBoatCount);
  const setSetupStep = useGameStore((state) => state.setSetupStep);
  const setView = useGameStore((state) => state.setView);
  const setupRule10Demo = useGameStore((state) => state.setupRule10Demo);
  const toggleOverlay = useGameStore((state) => state.toggleOverlay);
  const togglePause = useGameStore((state) => state.togglePause);
  const toggleSlowMotion = useGameStore((state) => state.toggleSlowMotion);
  const restart = useGameStore((state) => state.restart);
  const returnToSetup = () => {
    setSetupStep("players");
    setView("setup");
  };

  return (
    <section className="coach-controls">
      <FocusableButton type="button" onClick={togglePause} autoFocus>
        暂停/继续
      </FocusableButton>
      <FocusableButton type="button" onClick={toggleSlowMotion}>
        {timeScale > 1 ? "慢放" : "正常速度"}
      </FocusableButton>
      <FocusableButton type="button" onClick={restart}>
        重开
      </FocusableButton>
      <FocusableButton type="button" onClick={returnToSetup}>
        设置
      </FocusableButton>
      <FocusableButton type="button" onClick={() => setView("results")}>
        结果
      </FocusableButton>
      <FocusableButton type="button" onClick={setupRule10Demo}>
        规则10
      </FocusableButton>
      <div className="boat-count">
        {[1, 2, 3, 4].map((count) => (
          <FocusableButton
            key={count}
            type="button"
            className={activeBoatIds.length === count ? "active" : ""}
            onClick={() => setBoatCount(count)}
          >
            {count}船
          </FocusableButton>
        ))}
      </div>
      <div className="overlay-toggles">
        {(Object.keys(overlayLabels) as Array<keyof OverlaySettings>).map((key) => (
          <label key={key}>
            <input type="checkbox" checked={overlays[key]} onChange={() => toggleOverlay(key)} />
            {overlayLabels[key]}
          </label>
        ))}
      </div>
    </section>
  );
}
