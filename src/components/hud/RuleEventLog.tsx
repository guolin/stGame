import { useGameStore } from "../../store/gameStore";

export function RuleEventLog() {
  const events = useGameStore((state) => state.race.events);
  if (events.length === 0) return null;
  const latest = events[0];

  return (
    <section className="rule-log">
      <strong>最近事件</strong>
      <span className={latest.kind === "rule" || latest.kind === "ocs" ? "alert" : ""}>
        {formatTime(latest.timeMs)} · {latest.message}
      </span>
    </section>
  );
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}
