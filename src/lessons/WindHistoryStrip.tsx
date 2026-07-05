type WindHistoryStripProps = {
  /** Recent wind directions in degrees, oldest first. */
  history: number[];
  baseDirectionDeg: number;
};

const WIDTH = 560;
const HEIGHT = 96;
const RANGE_DEG = 18;

/**
 * Rolling "ECG" of the wind direction: the center line is the base wind,
 * above the line = shifted right, below = shifted left.
 */
export function WindHistoryStrip({ history, baseDirectionDeg }: WindHistoryStripProps) {
  const points = history
    .map((dir, index) => {
      const x = (index / Math.max(1, history.length - 1)) * WIDTH;
      const delta = clampDelta(dir - baseDirectionDeg);
      const y = HEIGHT / 2 - (delta / RANGE_DEG) * (HEIGHT / 2 - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const latest = history[history.length - 1];
  const latestDelta = latest === undefined ? 0 : clampDelta(latest - baseDirectionDeg);

  return (
    <div className="wind-strip">
      <div className="wind-strip-labels">
        <span>右摆 →</span>
        <span className={latestDelta >= 0 ? "lift" : "header"}>
          当前 {latestDelta >= 0 ? "右摆" : "左摆"} {Math.abs(latestDelta).toFixed(1)}°
        </span>
        <span>← 左摆</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} stroke="#2a6a92" strokeWidth="1.5" strokeDasharray="6 5" />
        {history.length > 1 && <polyline points={points} fill="none" stroke="#48c7ff" strokeWidth="2.5" />}
      </svg>
    </div>
  );
}

function clampDelta(delta: number): number {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.max(-RANGE_DEG, Math.min(RANGE_DEG, d));
}
