import { useGameStore } from "../../store/gameStore";

export function CurrentPanel() {
  const currents = useGameStore((state) => state.currents);
  const average = currents.reduce(
    (total, zone) => ({ x: total.x + zone.vector.x / currents.length, y: total.y + zone.vector.y / currents.length }),
    { x: 0, y: 0 }
  );
  const speed = Math.hypot(average.x, average.y) / 12;

  return (
    <section className="hud-panel current-panel">
      <span className="label">水流</span>
      <div className="current-arrows">➜➜➜</div>
      <strong>{speed.toFixed(1)} 节</strong>
    </section>
  );
}
