import { useGameStore } from "../../store/gameStore";

export function WindPanel() {
  const wind = useGameStore((state) => state.wind);
  const shiftLabel = wind.oscillationDeg >= 0 ? "右摆" : "左摆";

  return (
    <section className="hud-panel wind-panel">
      <div className="wind-dial">
        <div className="wind-arrow" style={{ transform: `rotate(${wind.directionDeg + 180}deg)` }}>
          ↑
        </div>
      </div>
      <div className="wind-readout">
        <strong>{wind.speedKnots.toFixed(1)} 节</strong>
        <span>{Math.round(wind.directionDeg)}°</span>
        <em className={wind.oscillationDeg >= 0 ? "lift" : "header"}>{shiftLabel}</em>
      </div>
    </section>
  );
}
