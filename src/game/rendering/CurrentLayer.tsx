import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CurrentZone } from "../types";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";
import { drawArrow } from "./WindLayer";

type CurrentLayerProps = {
  currents: CurrentZone[];
  visible: boolean;
};

export function CurrentLayer({ currents, visible }: CurrentLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visible) return;

      currents.forEach((zone) => {
        graphics.circle(zone.center.x, zone.center.y, zone.radius).fill({ color: THEME.current.zoneFillColor, alpha: THEME.current.zoneFillAlpha });
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8;
          const x = zone.center.x + Math.cos(angle) * zone.radius * 0.52;
          const y = zone.center.y + Math.sin(angle) * zone.radius * 0.34;
          drawArrow(graphics, x, y, zone.vector.x * 7, zone.vector.y * 7, THEME.current.arrowColor, THEME.current.arrowAlpha, THEME.current.arrowWidth);
        }
      });
    },
    [currents, visible]
  );

  return <GraphicsShape draw={draw} />;
}
