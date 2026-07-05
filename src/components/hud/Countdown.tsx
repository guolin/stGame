import { useGameStore } from "../../store/gameStore";

export function Countdown() {
  const race = useGameStore((state) => state.race);
  const boats = useGameStore((state) => state.boats);
  const setView = useGameStore((state) => state.setView);
  const seconds = Math.ceil(race.countdownMs / 1000);

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
