import { MAX_RUDDER_DEG } from "../../sim/boat/boatPhysics";

type RudderGaugeProps = {
  rudderAngleDeg: number;
};

/**
 * Live tiller readout for the hands-on demo page: the needle mirrors the
 * physical tiller so the audience can see hand → rudder → boat in one line.
 */
export function RudderGauge({ rudderAngleDeg }: RudderGaugeProps) {
  const clamped = Math.max(-MAX_RUDDER_DEG, Math.min(MAX_RUDDER_DEG, rudderAngleDeg));
  const needleDeg = (clamped / MAX_RUDDER_DEG) * 60;

  return (
    <div className="rudder-gauge">
      <svg viewBox="0 0 200 120" role="img" aria-label={`舵角 ${Math.round(clamped)} 度`}>
        <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#9fd2e8" strokeWidth="4" opacity="0.5" />
        <line x1="100" y1="100" x2="100" y2="38" stroke="#9fd2e8" strokeWidth="2" opacity="0.35" />
        <g transform={`rotate(${needleDeg} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="34" stroke="#ffe082" strokeWidth="6" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="8" fill="#ffe082" />
      </svg>
      <div className="rudder-gauge-label">
        舵角 <strong>{Math.round(clamped)}°</strong>
      </div>
    </div>
  );
}
