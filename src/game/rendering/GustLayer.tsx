import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindFieldConfig } from "../../sim/wind/windField";
import { gustPositionAt } from "../../sim/wind/windField";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type GustLayerProps = {
  windField: WindFieldConfig;
  timeSec: number;
  visible: boolean;
};

export function GustLayer({ windField, timeSec, visible }: GustLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visible) return;

      for (const gust of windField.gusts) {
        const center = gustPositionAt(gust, timeSec);
        const isLull = gust.windSpeedDeltaKnots < 0;
        const color = isLull ? THEME.gust.lullColor : THEME.gust.gustColor;
        const outerAlpha = isLull ? THEME.gust.outerAlphaLull : THEME.gust.outerAlphaGust;
        const innerAlpha = isLull ? THEME.gust.innerAlphaLull : THEME.gust.innerAlphaGust;

        graphics.circle(center.x, center.y, gust.radius).fill({ color, alpha: outerAlpha });
        graphics.circle(center.x, center.y, gust.radius * 0.62).fill({ color, alpha: innerAlpha });
        graphics.circle(center.x, center.y, gust.radius).stroke({ color, alpha: THEME.gust.strokeAlpha, width: THEME.gust.strokeWidth });
      }
    },
    [windField, timeSec, visible]
  );

  return <GraphicsShape draw={draw} />;
}
