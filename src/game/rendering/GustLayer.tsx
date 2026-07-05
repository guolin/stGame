import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindFieldConfig } from "../../sim/wind/windField";
import { gustPositionAt } from "../../sim/wind/windField";
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
        const color = isLull ? "#8fd8ef" : "#053a5c";

        graphics.circle(center.x, center.y, gust.radius).fill({ color, alpha: isLull ? 0.18 : 0.3 });
        graphics.circle(center.x, center.y, gust.radius * 0.62).fill({ color, alpha: isLull ? 0.1 : 0.18 });
        graphics.circle(center.x, center.y, gust.radius).stroke({ color, alpha: 0.4, width: 3 });
      }
    },
    [windField, timeSec, visible]
  );

  return <GraphicsShape draw={draw} />;
}
