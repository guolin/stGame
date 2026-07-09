import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";

export function ResultsScreen() {
  const boats = useGameStore((state) => state.boats);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const race = useGameStore((state) => state.race);
  const setView = useGameStore((state) => state.setView);

  const finishedIds = race.finishOrder.map((entry) => entry.boatId);
  const activeBoats = boats.filter((boat) => activeBoatIds.includes(boat.id));
  const ranked = [
    ...race.finishOrder.map((entry) => ({ boat: activeBoats.find((b) => b.id === entry.boatId)!, timeMs: entry.timeMs })),
    ...activeBoats.filter((boat) => !finishedIds.includes(boat.id)).map((boat) => ({ boat, timeMs: undefined }))
  ].filter((row) => row.boat);

  const advice = buildAdvice(ranked.map((r) => r.boat));

  return (
    <main className="results-screen">
      <div className="modal-scrim result-scrim" role="presentation">
      <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <p className="eyebrow">赛后总结</p>
        <h1 id="results-title">{race.winner ? `${activeBoats.find((b) => b.id === race.winner)?.name ?? ""} 获胜` : "比赛结束"}</h1>

        <table className="results-table">
          <thead>
            <tr>
              <th>名次</th>
              <th>船</th>
              <th>用时</th>
              <th>换舷</th>
              <th>犯规</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => (
              <tr key={row.boat.id}>
                <td>{row.timeMs !== undefined ? `第 ${index + 1} 名` : "-"}</td>
                <td>
                  <span className="player-dot" style={{ backgroundColor: row.boat.color }} /> {row.boat.name}
                </td>
                <td>{row.timeMs !== undefined ? formatTime(row.timeMs) : "未完赛"}</td>
                <td>{row.boat.tackCount}</td>
                <td>{row.boat.penaltyCount}</td>
                <td>{row.boat.finished ? "完赛" : row.boat.startStatus === "ocs" ? "OCS 未修正" : "未完成航线"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {advice.length > 0 && (
          <div className="advice">
            <strong>战术点评</strong>
            {advice.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        )}

        <div className="event-recap">
          <strong>关键事件</strong>
          {race.events.slice(0, 8).map((event) => (
            <span key={event.id}>
              {formatTime(event.timeMs)} · {event.message}
            </span>
          ))}
        </div>

        <div className="demo-actions">
          <FocusableButton type="button" className="accent" onClick={() => setView("race")} autoFocus>
            关闭
          </FocusableButton>
        </div>
      </section>
      </div>
    </main>
  );
}

function buildAdvice(boats: { name: string; tackCount: number; penaltyCount: number; speed: number; finished: boolean }[]): string[] {
  const advice: string[] = [];
  const penalized = boats.filter((b) => b.penaltyCount > 0).sort((a, b) => b.penaltyCount - a.penaltyCount)[0];
  if (penalized) {
    advice.push(`${penalized.name} 共 ${penalized.penaltyCount} 次犯规减速——右舷受风船有航权，交叉前请提前避让。`);
  }
  const busiest = [...boats].sort((a, b) => b.tackCount - a.tackCount)[0];
  if (busiest && busiest.tackCount >= 6) {
    advice.push(`${busiest.name} 换舷 ${busiest.tackCount} 次偏多，每次换舷都损失速度，试着一条舷走得更久。`);
  }
  const dnf = boats.find((b) => !b.finished);
  if (dnf) {
    advice.push(`${dnf.name} 未完成航线——注意按顺序、按规定一侧绕标，抢航后必须回线重新起航。`);
  }
  return advice.slice(0, 3);
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}
