import { useMemo } from "react";
import type { BoatType } from "../sim/polar/polar";
import { getNoGoAngle, getPolarSpeed } from "../sim/polar/polar";

type PolarDialProps = {
  boatType: BoatType;
  twsKnots: number;
  twaDeg: number;
  stwKnots: number;
};

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_RADIUS = SIZE / 2 - 28;

/**
 * Live polar diagram: the curve is the boat's theoretical speed at every wind
 * angle; the glowing dot is where the boat is right now. Wind blows from the
 * top of the dial, matching the race view.
 */
export function PolarDial({ boatType, twsKnots, twaDeg, stwKnots }: PolarDialProps) {
  const maxSpeed = useMemo(() => {
    let max = 0.1;
    for (let angle = 0; angle <= 180; angle += 5) {
      max = Math.max(max, getPolarSpeed(boatType, twsKnots, angle));
    }
    return max;
  }, [boatType, twsKnots]);

  const curve = useMemo(() => {
    const points: string[] = [];
    for (let angle = 0; angle <= 180; angle += 3) {
      const speed = getPolarSpeed(boatType, twsKnots, angle);
      const { x, y } = polarPoint(angle, speed / maxSpeed);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const mirrored = [...points]
      .reverse()
      .map((point) => {
        const [x, y] = point.split(",").map(Number);
        return `${(2 * CENTER - x).toFixed(1)},${y.toFixed(1)}`;
      });
    return [...points, ...mirrored].join(" ");
  }, [boatType, twsKnots, maxSpeed]);

  const noGo = getNoGoAngle(boatType);
  const currentSpeed = getPolarSpeed(boatType, twsKnots, twaDeg);
  const dot = polarPoint(twaDeg, Math.min(1.05, currentSpeed / maxSpeed));
  const inNoGo = twaDeg < noGo;

  const noGoLeft = polarPoint(noGo, 1.08);
  const noGoRight = { x: 2 * CENTER - noGoLeft.x, y: noGoLeft.y };

  return (
    <svg className="polar-dial" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="船速极曲线">
      {[0.33, 0.66, 1].map((ring) => (
        <circle key={ring} cx={CENTER} cy={CENTER} r={MAX_RADIUS * ring} fill="none" stroke="#1d5b80" strokeWidth="1" />
      ))}

      {/* no-go wedge */}
      <path
        d={`M ${CENTER} ${CENTER} L ${noGoLeft.x} ${noGoLeft.y} A ${MAX_RADIUS * 1.08} ${MAX_RADIUS * 1.08} 0 0 1 ${noGoRight.x} ${noGoRight.y} Z`}
        fill={inNoGo ? "rgba(255, 90, 60, 0.34)" : "rgba(255, 255, 255, 0.08)"}
      />

      {/* wind arrow blowing down from the top */}
      <g stroke="#9fdcff" strokeWidth="3" fill="#9fdcff">
        <line x1={CENTER} y1={6} x2={CENTER} y2={30} />
        <path d={`M ${CENTER - 6} 26 L ${CENTER} 38 L ${CENTER + 6} 26 Z`} stroke="none" />
      </g>

      <polygon points={curve} fill="rgba(72, 199, 255, 0.16)" stroke="#48c7ff" strokeWidth="2.5" />

      <line x1={CENTER} y1={CENTER} x2={dot.x} y2={dot.y} stroke={inNoGo ? "#ff7a5c" : "#ffe082"} strokeWidth="2" strokeDasharray="4 4" />
      <circle cx={dot.x} cy={dot.y} r="9" fill={inNoGo ? "#ff7a5c" : "#ffe082"}>
        <animate attributeName="r" values="7;10;7" dur="1.2s" repeatCount="indefinite" />
      </circle>

      <text x={CENTER} y={SIZE - 8} textAnchor="middle" fill="#bcecff" fontSize="14">
        TWA {Math.round(twaDeg)}° · 理论 {currentSpeed.toFixed(1)} kt · 实际 {stwKnots.toFixed(1)} kt
      </text>
    </svg>
  );
}

/** Angle 0 = pointing up (into the wind), mirrored to the right side. */
function polarPoint(twaDeg: number, normalizedRadius: number) {
  const rad = (twaDeg * Math.PI) / 180;
  return {
    x: CENTER + Math.sin(rad) * MAX_RADIUS * normalizedRadius,
    y: CENTER - Math.cos(rad) * MAX_RADIUS * normalizedRadius
  };
}
