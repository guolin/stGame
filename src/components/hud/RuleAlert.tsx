import { ruleTitle } from "../../sim/rules/rulesEngine";
import { useGameStore } from "../../store/gameStore";

export function RuleAlert() {
  const ruleEvents = useGameStore((state) => state.race.ruleEvents);
  const elapsedMs = useGameStore((state) => state.race.elapsedMs);

  // A breach stays on screen for its full window even if warnings follow it.
  const recent = ruleEvents.filter((item) => elapsedMs - item.timeMs <= 5200);
  const event = recent.find((item) => item.severity === "breach") ?? recent[0];

  if (!event) return null;

  return (
    <section className={`rule-alert ${event.severity}`}>
      <strong>
        {event.severity === "breach" ? `犯规 · 规则 ${event.rule}` : `风险提示 · 规则 ${event.rule}`} · {ruleTitle(event.rule)}
      </strong>
      <span>{event.message}</span>
    </section>
  );
}
