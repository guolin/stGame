import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import { WORLD } from "../constants";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type WaterLayerProps = {
  timeSec?: number;
};

export function WaterLayer({ timeSec = 0 }: WaterLayerProps) {
  // Quantize the background animation so the dense ripple layer updates at a
  // small fixed visual rate rather than every simulation tick.
  const phase = Math.floor(timeSec * 6) / 6;
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      graphics.rect(0, 0, WORLD.width, WORLD.height).fill(THEME.water.deepColor);
      graphics.rect(0, 0, WORLD.width, WORLD.height).fill({ color: THEME.water.shallowColor, alpha: THEME.water.shallowAlpha });

      for (let y = 26; y < WORLD.height; y += 82) {
        const drift = Math.sin(phase * 0.7 + y * 0.013) * 18;
        graphics.moveTo(0, y);
        for (let x = 0; x <= WORLD.width; x += 58) {
          graphics.lineTo(x, y + Math.sin(x * 0.012 + y * 0.02 + phase * 0.9) * 9 + drift * 0.18);
        }
        graphics.stroke({ color: THEME.water.rippleColor, alpha: THEME.water.rippleAlpha, width: THEME.water.rippleWidth });
      }

      for (let x = 0; x < WORLD.width; x += 150) {
        const y = 100 + ((x * 13) % (WORLD.height - 180));
        const shimmer = 0.65 + Math.sin(phase * 1.4 + x * 0.04) * 0.35;
        graphics.circle(x + 18 + Math.sin(phase + x * 0.01) * 2, y, 3).fill({ color: THEME.water.glintColor, alpha: THEME.water.glintAlpha * shimmer });
      }
    },
    [phase]
  );

  return <GraphicsShape draw={draw} />;
}
