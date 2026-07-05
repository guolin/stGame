import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindZoneState } from "../types";
import { GraphicsShape } from "./GraphicsShape";

type WindZoneLayerProps = {
  zones: WindZoneState[];
};

export function WindZoneLayer({ zones }: WindZoneLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      zones.forEach((zone) => {
        const pulse = Math.sin(zone.phase) * 0.035;
        const alpha = Math.max(0.04, zone.alpha + pulse);
        const { x, y, width, height } = zone.bounds;

        graphics.rect(x, y, width, height).fill({ color: zone.color, alpha });

        for (let row = y + 80; row < y + height; row += 145) {
          const offset = Math.sin(zone.phase + row * 0.01) * 34;
          graphics.moveTo(x + 40 + offset, row);
          graphics.lineTo(x + width - 40 + offset, row + Math.sin(zone.phase + row * 0.02) * 24);
          graphics.stroke({
            color: zone.speedDeltaKnots >= 0 ? "#d9fbff" : "#7ed8ff",
            alpha: zone.speedDeltaKnots >= 0 ? 0.16 : 0.09,
            width: zone.speedDeltaKnots >= 0 ? 5 : 3
          });
        }
      });
    },
    [zones]
  );

  return <GraphicsShape draw={draw} />;
}
