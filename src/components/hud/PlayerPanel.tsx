import type { BoatId } from "../../game/types";
import { PIXELS_PER_KNOT } from "../../sim/boat/units";
import { currentTarget } from "../../sim/course/progress";
import { useGameStore } from "../../store/gameStore";

type PlayerPanelProps = {
  boatId: BoatId;
};

export function PlayerPanel({ boatId }: PlayerPanelProps) {
  const boat = useGameStore((state) => state.boats.find((item) => item.id === boatId));
  const course = useGameStore((state) => state.course);
  const elapsedMs = useGameStore((state) => state.race.elapsedMs);
  if (!boat) return null;

  const target = currentTarget(course, boat.legIndex);
  const legName = `leg ${boat.legIndex + 1}`;
  const legLabel = boat.finished ? "已完赛" : target.kind === "mark" ? `${legName} · 去 ${target.mark.label}` : `${legName} · 冲终点`;
  const stw = boat.speed / PIXELS_PER_KNOT;
  const sog = Math.hypot(boat.velocity.x, boat.velocity.y) / PIXELS_PER_KNOT;
  const penaltyLeftSec = boat.penaltyUntilMs ? Math.max(0, (boat.penaltyUntilMs - elapsedMs) / 1000) : 0;

  return (
    <section className={`player-panel ${boatId}`}>
      <span className="player-dot" style={{ backgroundColor: boat.color }} />
      <strong>{boat.name}</strong>
      <span>
        相对水速 {stw.toFixed(1)} · 对地速度 {sog.toFixed(1)} 节
      </span>
      <span>
        真风角 {Math.round(boat.twaDeg)}°
      </span>
      {penaltyLeftSec > 0 ? (
        <span className="penalty">减速 {penaltyLeftSec.toFixed(1)}s</span>
      ) : boat.startStatus === "ocs" ? (
        <span className="penalty">OCS 抢航 · 回线重启</span>
      ) : (
        <span>{boat.startStatus === "prestart" ? "未起航" : legLabel}</span>
      )}
    </section>
  );
}
