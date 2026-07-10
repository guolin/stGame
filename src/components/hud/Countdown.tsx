import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { playCountdownBeep, playFinishHorn, playStartHorn } from "../../game/audio/raceSounds";

export function Countdown() {
  const race = useGameStore((state) => state.race);
  const boats = useGameStore((state) => state.boats);
  const setView = useGameStore((state) => state.setView);
  const seconds = Math.ceil(race.countdownMs / 1000);
  const lastBeepSecondRef = useRef<number | undefined>(undefined);
  const previousPhaseRef = useRef(race.phase);
  const playedFinishCountRef = useRef(race.finishOrder.length);

  useEffect(() => {
    if (race.phase === "prestart" && seconds >= 1 && seconds <= 5 && lastBeepSecondRef.current !== seconds) {
      lastBeepSecondRef.current = seconds;
      playCountdownBeep();
    }

    if (race.phase !== "prestart") {
      lastBeepSecondRef.current = undefined;
    }
  }, [race.phase, seconds]);

  useEffect(() => {
    if (previousPhaseRef.current === "prestart" && race.phase === "racing") {
      playStartHorn();
    }
    previousPhaseRef.current = race.phase;
  }, [race.phase]);

  useEffect(() => {
    if (race.finishOrder.length > playedFinishCountRef.current) {
      playFinishHorn();
    }
    playedFinishCountRef.current = race.finishOrder.length;
  }, [race.finishOrder.length]);

  if (race.phase === "finished") {
    const winner = boats.find((boat) => boat.id === race.winner);
    return (
      <div className="countdown winner">
        <span>{winner ? `${winner.name} 获胜` : "比赛结束"}</span>
        <button type="button" onClick={() => setView("results")}>
          查看赛后总结
        </button>
      </div>
    );
  }

  if (race.phase === "racing") {
    return <div className="countdown racing">{formatTime(race.elapsedMs)}</div>;
  }

  if (race.phase === "paused") {
    return <div className="countdown paused">已暂停</div>;
  }

  return <div className={`countdown ${seconds <= 10 ? "urgent" : ""}`}>{`起航倒计时 00:${seconds.toString().padStart(2, "0")}`}</div>;
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}
