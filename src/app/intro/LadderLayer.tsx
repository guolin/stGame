import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Vec2 } from "../../game/types";
import { GraphicsShape } from "../../game/rendering/GraphicsShape";

type LadderLayerProps = {
  windDeg: number;
  boats: { position: Vec2; color: string }[];
};

const RUNG_HALF_LENGTH = 1100;

/**
 * One ladder rung per boat: a line through the hull, perpendicular to the
 * wind. The gap between the two lines IS the lead — no line forest to
 * decode, and both rungs rotate together when the wind shifts.
 */
export function LadderLayer({ windDeg, boats }: LadderLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      const rad = (windDeg * Math.PI) / 180;
      const along = { x: Math.cos(rad), y: Math.sin(rad) };

      boats.forEach((boat) => {
        const { x, y } = boat.position;
        graphics.moveTo(x - along.x * RUNG_HALF_LENGTH, y - along.y * RUNG_HALF_LENGTH);
        graphics.lineTo(x + along.x * RUNG_HALF_LENGTH, y + along.y * RUNG_HALF_LENGTH);
        graphics.stroke({ color: boat.color, alpha: 0.55, width: 4 });
      });
    },
    [windDeg, boats]
  );

  return <GraphicsShape draw={draw} />;
}
