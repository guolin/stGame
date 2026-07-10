import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState, OverlaySettings, Vec2, WindState } from "../types";
import type { CourseDefinition } from "../../sim/course/types";
import { currentTarget } from "../../sim/course/progress";
import { headingToVector, normalizeDeg } from "../utils/math";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type TacticalOverlayLayerProps = {
  boats: BoatState[];
  overlays: OverlaySettings;
  wind: WindState;
  course: CourseDefinition;
};

export function TacticalOverlayLayer({ boats, overlays, wind, course }: TacticalOverlayLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      boats.forEach((boat) => {
        if (overlays.tracks && boat.track.length > 1) {
          drawDottedTrack(graphics, boat);
        }

        if (overlays.laylines) {
          const target = currentTarget(course, boat.legIndex);
          const markPosition = target.kind === "mark" ? target.mark.position : undefined;
          drawLayline(graphics, boat, wind.directionDeg + 42, markPosition);
          drawLayline(graphics, boat, wind.directionDeg - 42, markPosition);
        }

        if (overlays.noGoZone) {
          drawNoGoZone(graphics, boat, wind.directionDeg);
        }
      });
    },
    [boats, overlays, wind.directionDeg, course]
  );

  return <GraphicsShape draw={draw} />;
}

function drawDottedTrack(graphics: PixiGraphics, boat: BoatState) {
  const dotRadius = 6.2;

  for (let index = boat.track.length - 1; index >= 0; index -= 1) {
    const current = boat.track[index];
    const age = (boat.track.length - 1 - index) / Math.max(1, boat.track.length - 1);
    const radius = dotRadius * (1 - age * 0.28);
    const alpha = Math.max(0.18, 0.9 * (1 - age) ** 0.72);
    graphics.circle(current.x, current.y, radius + 2.2).fill({ color: THEME.boat.wakeColor, alpha: alpha * 0.26 });
    graphics.circle(current.x, current.y, radius).fill({ color: boat.color, alpha });
  }
}

function drawLayline(graphics: PixiGraphics, boat: BoatState, deg: number, markPosition?: Vec2) {
  const vector = headingToVector(normalizeDeg(deg));
  graphics.moveTo(boat.position.x, boat.position.y);
  graphics.lineTo(boat.position.x + vector.x * 720, boat.position.y + vector.y * 720);
  graphics.stroke({ color: boat.color, alpha: THEME.tactical.laylineAlpha, width: THEME.tactical.laylineWidth });

  if (markPosition) {
    graphics.moveTo(markPosition.x, markPosition.y);
    graphics.lineTo(markPosition.x - vector.x * 720, markPosition.y - vector.y * 720);
    graphics.stroke({ color: THEME.tactical.laylineMarkColor, alpha: THEME.tactical.laylineMarkAlpha, width: THEME.tactical.laylineMarkWidth });
  }
}

function drawNoGoZone(graphics: PixiGraphics, boat: BoatState, windDirection: number) {
  const left = headingToVector(windDirection - 34);
  const right = headingToVector(windDirection + 34);
  const radius = 150;

  graphics.moveTo(boat.position.x, boat.position.y);
  graphics.lineTo(boat.position.x + left.x * radius, boat.position.y + left.y * radius);
  graphics.arc(boat.position.x, boat.position.y, radius, Math.atan2(left.y, left.x), Math.atan2(right.y, right.x));
  graphics.lineTo(boat.position.x, boat.position.y);
  graphics.fill({ color: THEME.tactical.noGoFillColor, alpha: THEME.tactical.noGoFillAlpha });
}
