import { useGameStore } from "../../store/gameStore";

export function RuleEventLog() {
  const events = useGameStore((state) => state.race.events);
  if (events.length === 0) return null;

  return (
    <section className="rule-log">
      <strong>比赛事件</strong>
      {events.slice(0, 6).map((event) => (
        <span key={event.id} className={event.kind === "rule" || event.kind === "ocs" ? "alert" : ""}>
          {formatTime(event.timeMs)} · {event.message}
        </span>
      ))}
    </section>
  );
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}
