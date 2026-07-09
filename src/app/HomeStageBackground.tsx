import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text } from "pixi.js";
import { useEffect, useMemo, useState } from "react";
import { INITIAL_BOATS, WORLD } from "../game/constants";
import { BoatSprite } from "../game/rendering/BoatSprite";
import { CourseLayer } from "../game/rendering/CourseLayer";
import { WaterLayer } from "../game/rendering/WaterLayer";
import { WindLayer } from "../game/rendering/WindLayer";
import type { BoatState, Vec2 } from "../game/types";
import { normalizeDeg } from "../game/utils/math";
import { getCourse } from "../sim/course/courses";
import { buildWindZones } from "../sim/environment";
import type { WindFieldConfig } from "../sim/wind/windField";

extend({ Container, Graphics, Text });

const HOME_WIND_FIELD: WindFieldConfig = {
  baseDirectionDeg: 0,
  baseSpeedKnots: 12,
  oscillation: { kind: "pendulum", amplitudeDeg: 8, periodSec: 42, phase: 0 },
  gusts: [],
  zones: buildWindZones(3)
};

const ROUTE: Vec2[] = [
  { x: 1180, y: 1640 },
  { x: 760, y: 980 },
  { x: 1400, y: 300 },
  { x: 2040, y: 980 },
  { x: 1400, y: 1240 },
  { x: 1180, y: 1640 }
];

const BOAT_IDS: BoatState["id"][] = ["red", "green", "yellow", "blue"];

export function HomeStageBackground() {
  const [timeSec, setTimeSec] = useState(0);
  const course = useMemo(() => getCourse("windwardLeeward"), []);
  const boats = useMemo(() => buildBackgroundBoats(timeSec), [timeSec]);

  useEffect(() => {
    let frame = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      if (start === undefined) start = time;
      setTimeSec((time - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="home-stage-bg" aria-hidden="true">
      <Application
        width={WORLD.width}
        height={WORLD.height}
        backgroundAlpha={0}
        antialias
        resolution={window.devicePixelRatio || 1}
        className="home-stage-canvas"
      >
        <pixiContainer alpha={0.42}>
          <WaterLayer timeSec={timeSec} />
          <WindLayer windField={HOME_WIND_FIELD} timeSec={timeSec} visible />
          <CourseLayer course={course} />
          {boats.map((boat) => (
            <BoatSprite key={boat.id} boat={boat} />
          ))}
        </pixiContainer>
      </Application>
    </div>
  );
}

function buildBackgroundBoats(timeSec: number): BoatState[] {
  return BOAT_IDS.map((id, index) => {
    const base = INITIAL_BOATS.find((boat) => boat.id === id)!;
    const progress = ((timeSec * (0.028 + index * 0.003) + index * 0.22) % 1 + 1) % 1;
    const { position, headingDeg } = pointOnRoute(progress);
    return {
      ...base,
      position,
      headingDeg,
      speed: 18 + index * 2,
      tack: headingDeg < 180 ? "port" : "starboard",
      track: []
    };
  });
}

function pointOnRoute(progress: number): { position: Vec2; headingDeg: number } {
  const segmentProgress = progress * (ROUTE.length - 1);
  const index = Math.min(ROUTE.length - 2, Math.floor(segmentProgress));
  const local = segmentProgress - index;
  const from = ROUTE[index];
  const to = ROUTE[index + 1];
  const position = {
    x: from.x + (to.x - from.x) * local,
    y: from.y + (to.y - from.y) * local
  };
  const headingDeg = normalizeDeg((Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI);
  return { position, headingDeg };
}
