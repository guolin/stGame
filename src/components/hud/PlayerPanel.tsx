import type { BoatId } from "../../game/types";
import { AI_DIFFICULTY_LABEL } from "../../game/loop/aiControls";
import { PIXELS_PER_KNOT } from "../../sim/boat/units";
import { currentTarget } from "../../sim/course/progress";
import { useGameStore } from "../../store/gameStore";

type PlayerPanelProps = {
  boatId: BoatId;
};

export function PlayerPanel({ boatId }: PlayerPanelProps) {
  const boat = useGameStore((state) => state.boats.find((item) => item.id === boatId));
  const pilot = useGameStore((state) => state.boatPilots[boatId]);
  const course = useGameStore((state) => state.course);
  const elapsedMs = useGameStore((state) => state.race.elapsedMs);
  if (!boat) return null;

  const target = currentTarget(course, boat.legIndex);
  const legLabel = boat.finished ? "已完赛" : target.kind === "mark" ? `去 ${target.mark.label}` : "冲终点";
  const pilotLabel =
    pilot.mode === "ai" && pilot.aiDifficulty
      ? `AI${AI_DIFFICULTY_LABEL[pilot.aiDifficulty]}`
      : pilot.mode === "human"
        ? "玩家"
        : "待接入";
  const sog = Math.hypot(boat.velocity.x, boat.velocity.y) / PIXELS_PER_KNOT;
  const penaltyLeftSec = boat.penaltyUntilMs ? Math.max(0, (boat.penaltyUntilMs - elapsedMs) / 1000) : 0;
  const status =
    penaltyLeftSec > 0
      ? `减速 ${penaltyLeftSec.toFixed(1)}s`
      : boat.startStatus === "ocs"
        ? "OCS 回线"
        : boat.startStatus === "prestart"
          ? pilotLabel
          : `${pilotLabel} · ${legLabel}`;

  return (
    <section className={`player-panel ${boatId}`}>
      <div className="metric-stack">
        <div className="speed-readout">
          <strong>{sog.toFixed(1)}</strong>
          <span>节</span>
        </div>
        <div className="angle-readout">{Math.round(boat.twaDeg)}°</div>
      </div>
      <aside>
        <span className="player-dot" style={{ backgroundColor: boat.color }} />
        <span className={`status-pill ${penaltyLeftSec > 0 || boat.startStatus === "ocs" ? "penalty" : ""}`}>{status}</span>
      </aside>
    </section>
  );
}
