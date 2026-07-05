import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindState } from "../types";
import { WORLD } from "../constants";
import { headingToVector } from "../utils/math";
import { GraphicsShape } from "./GraphicsShape";

type WindLayerProps = {
  wind: WindState;
  visible: boolean;
};

export function WindLayer({ wind, visible }: WindLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visible) return;

      // directionDeg is where the wind comes FROM; arrows show where it blows TO.
      const vector = headingToVector(wind.directionDeg + 180);
      for (let y = 150; y < WORLD.height - 120; y += 190) {
        for (let x = 160; x < WORLD.width - 130; x += 260) {
          drawArrow(graphics, x, y, vector.x * 74, vector.y * 74, "#c5f6ff", 0.34, 7);
        }
      }
    },
    [visible, wind]
  );

  return <GraphicsShape draw={draw} />;
}

export function drawArrow(
  graphics: PixiGraphics,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  alpha: number,
  width: number
) {
  graphics.moveTo(x, y);
  graphics.lineTo(x + dx, y + dy);
  graphics.stroke({ color, alpha, width });

  const angle = Math.atan2(dy, dx);
  const head = 12;
  graphics.moveTo(x + dx, y + dy);
  graphics.lineTo(x + dx - Math.cos(angle - 0.55) * head, y + dy - Math.sin(angle - 0.55) * head);
  graphics.moveTo(x + dx, y + dy);
  graphics.lineTo(x + dx - Math.cos(angle + 0.55) * head, y + dy - Math.sin(angle + 0.55) * head);
  graphics.stroke({ color, alpha, width });
}
