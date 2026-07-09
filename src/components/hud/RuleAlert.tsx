import { ruleTitle } from "../../sim/rules/rulesEngine";
import { useGameStore } from "../../store/gameStore";

export function RuleAlert() {
  const ruleEvents = useGameStore((state) => state.race.ruleEvents);
  const elapsedMs = useGameStore((state) => state.race.elapsedMs);

  const event = ruleEvents.find((item) => item.severity === "breach" && elapsedMs - item.timeMs <= 4200);

  if (!event) return null;

  return (
    <section className={`rule-alert ${event.severity}`}>
      <strong>
        犯规 · 规则 {event.rule} · {ruleTitle(event.rule)}
      </strong>
      <span>{event.message}</span>
    </section>
  );
}
