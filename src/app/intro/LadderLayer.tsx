import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Vec2 } from "../../game/types";
import { GraphicsShape } from "../../game/rendering/GraphicsShape";

type LadderLayerProps = {
  windDeg: number;
  mark: Vec2;
};

const RUNG_SPACING = 180;
const RUNG_HALF_LENGTH = 1900;
const RUNGS_DOWNWIND = 10;
const RUNGS_UPWIND = 2;

/**
 * Ladder rungs: evenly spaced lines perpendicular to the wind, anchored at
 * the mark. They rotate with every shift — the visual proof that a shift
 * re-ranks boats that were previously level.
 */
export function LadderLayer({ windDeg, mark }: LadderLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      const rad = (windDeg * Math.PI) / 180;
      // Upwind unit vector (toward the wind source) and the rung direction.
      const up = { x: Math.sin(rad), y: -Math.cos(rad) };
      const along = { x: Math.cos(rad), y: Math.sin(rad) };

      for (let k = -RUNGS_UPWIND; k <= RUNGS_DOWNWIND; k += 1) {
        const cx = mark.x - up.x * k * RUNG_SPACING;
        const cy = mark.y - up.y * k * RUNG_SPACING;
        graphics.moveTo(cx - along.x * RUNG_HALF_LENGTH, cy - along.y * RUNG_HALF_LENGTH);
        graphics.lineTo(cx + along.x * RUNG_HALF_LENGTH, cy + along.y * RUNG_HALF_LENGTH);
        graphics.stroke({
          color: "#c9f2ff",
          alpha: k === 0 ? 0.65 : 0.3,
          width: k === 0 ? 4 : 3
        });
      }
    },
    [windDeg, mark]
  );

  return <GraphicsShape draw={draw} />;
}
