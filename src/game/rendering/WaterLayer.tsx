import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import { WORLD } from "../constants";
import { GraphicsShape } from "./GraphicsShape";

export function WaterLayer() {
  const draw = useCallback((graphics: PixiGraphics) => {
    graphics.clear();
    graphics.rect(0, 0, WORLD.width, WORLD.height).fill("#0877a8");
    graphics.rect(0, 0, WORLD.width, WORLD.height).fill({ color: "#0b4d78", alpha: 0.34 });

    for (let y = 26; y < WORLD.height; y += 82) {
      graphics.moveTo(0, y);
      for (let x = 0; x <= WORLD.width; x += 58) {
        graphics.lineTo(x, y + Math.sin(x * 0.012 + y * 0.02) * 9);
      }
      graphics.stroke({ color: "#8de5ff", alpha: 0.14, width: 2 });
    }

    for (let x = 0; x < WORLD.width; x += 150) {
      graphics.circle(x + 18, 100 + ((x * 13) % (WORLD.height - 180)), 3).fill({ color: "#e8fbff", alpha: 0.2 });
    }
  }, []);

  return <GraphicsShape draw={draw} />;
}
