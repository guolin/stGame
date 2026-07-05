import { useGameStore } from "../../store/gameStore";

export function WindPanel() {
  const wind = useGameStore((state) => state.wind);

  return (
    <section className="hud-panel wind-panel">
      <span className="label">风向 {Math.round(wind.directionDeg)}°</span>
      <div className="wind-arrow" style={{ transform: `rotate(${wind.directionDeg + 180}deg)` }}>
        ↑
      </div>
      <strong>{wind.speedKnots.toFixed(1)} kt</strong>
      <span className={wind.oscillationDeg >= 0 ? "lift" : "header"}>{wind.oscillationDeg >= 0 ? "右摆" : "左摆"}</span>
    </section>
  );
}
