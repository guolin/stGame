import { useState } from "react";
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

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

function formatSpeedOption(option: number) {
  return Number.isInteger(option) || option === 1.5 ? option.toFixed(1) : option.toFixed(2);
}

export function CoachControls() {
  const [speedPanelOpen, setSpeedPanelOpen] = useState(false);
  const overlays = useGameStore((state) => state.overlays);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const timeScale = useGameStore((state) => state.timeScale);
  const setBoatCount = useGameStore((state) => state.setBoatCount);
  const setTimeScale = useGameStore((state) => state.setTimeScale);
  const setView = useGameStore((state) => state.setView);
  const toggleOverlay = useGameStore((state) => state.toggleOverlay);
  const togglePause = useGameStore((state) => state.togglePause);
  const restart = useGameStore((state) => state.restart);
  const sliderValue = Math.max(SPEED_OPTIONS[0], Math.min(SPEED_OPTIONS[SPEED_OPTIONS.length - 1], timeScale));

  return (
    <section className="coach-controls">
      <FocusableButton type="button" onClick={togglePause} autoFocus>
        暂停/继续
      </FocusableButton>
      <div className="speed-control">
        <FocusableButton type="button" className={speedPanelOpen ? "active" : ""} onClick={() => setSpeedPanelOpen((open) => !open)}>
          加速
        </FocusableButton>
        {speedPanelOpen ? (
          <div className="speed-popover" role="dialog" aria-label="速度调整">
            <div className="speed-popover-header">
              <span>速度</span>
              <strong>{sliderValue.toFixed(2)}x</strong>
            </div>
            <input
              type="range"
              min={SPEED_OPTIONS[0]}
              max={SPEED_OPTIONS[SPEED_OPTIONS.length - 1]}
              step={0.25}
              value={sliderValue}
              onChange={(event) => setTimeScale(Number(event.currentTarget.value))}
              list="speed-options"
            />
            <datalist id="speed-options">
              {SPEED_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <div className="speed-marks" aria-hidden="true">
              {SPEED_OPTIONS.map((option) => (
                <span key={option}>{formatSpeedOption(option)}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <FocusableButton type="button" onClick={restart}>
        重开
      </FocusableButton>
      <FocusableButton type="button" onClick={() => setView("results")}>
        结果
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
