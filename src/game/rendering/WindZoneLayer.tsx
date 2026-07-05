import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindZoneState } from "../types";
import { THEME } from "../theme";
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
          graphics.stroke(
            zone.speedDeltaKnots >= 0
              ? { color: THEME.windZone.ripplePositiveColor, alpha: THEME.windZone.ripplePositiveAlpha, width: THEME.windZone.ripplePositiveWidth }
              : { color: THEME.windZone.rippleNegativeColor, alpha: THEME.windZone.rippleNegativeAlpha, width: THEME.windZone.rippleNegativeWidth }
          );
        }
      });
    },
    [zones]
  );

  return <GraphicsShape draw={draw} />;
}
