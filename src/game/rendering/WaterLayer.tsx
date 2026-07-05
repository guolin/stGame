import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import { WORLD } from "../constants";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

export function WaterLayer() {
  const draw = useCallback((graphics: PixiGraphics) => {
    graphics.clear();
    graphics.rect(0, 0, WORLD.width, WORLD.height).fill(THEME.water.deepColor);
    graphics.rect(0, 0, WORLD.width, WORLD.height).fill({ color: THEME.water.shallowColor, alpha: THEME.water.shallowAlpha });

    for (let y = 26; y < WORLD.height; y += 82) {
      graphics.moveTo(0, y);
      for (let x = 0; x <= WORLD.width; x += 58) {
        graphics.lineTo(x, y + Math.sin(x * 0.012 + y * 0.02) * 9);
      }
      graphics.stroke({ color: THEME.water.rippleColor, alpha: THEME.water.rippleAlpha, width: THEME.water.rippleWidth });
    }

    for (let x = 0; x < WORLD.width; x += 150) {
      graphics.circle(x + 18, 100 + ((x * 13) % (WORLD.height - 180)), 3).fill({ color: THEME.water.glintColor, alpha: THEME.water.glintAlpha });
    }
  }, []);

  return <GraphicsShape draw={draw} />;
}
