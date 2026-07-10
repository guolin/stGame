import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState } from "../types";
import { THEME } from "../theme";
import { clamp } from "../utils/math";
import { GraphicsShape } from "./GraphicsShape";

type BoatSpriteProps = {
  boat: BoatState;
};

export function BoatSprite({ boat }: BoatSpriteProps) {
  const drawBoat = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      graphics.moveTo(0, -48);
      graphics.lineTo(24, 38);
      graphics.lineTo(0, 54);
      graphics.lineTo(-24, 38);
      graphics.lineTo(0, -48);
      graphics.fill(THEME.boat.hullFillColor).stroke({ color: boat.color, width: THEME.boat.hullStrokeWidth });
      const side = boat.tack === "starboard" ? -1 : 1;
      const boomRoot = { x: side * 4, y: 6 };
      const boomAngleRad = (clamp(boat.sailAngleDeg, 8, 89) * Math.PI) / 180;
      const boomLength = 46;
      const boomTip = {
        x: boomRoot.x + side * Math.sin(boomAngleRad) * boomLength,
        y: boomRoot.y - Math.cos(boomAngleRad) * boomLength
      };
      graphics.moveTo(boomRoot.x, boomRoot.y);
      graphics.lineTo(boomTip.x, boomTip.y);
      graphics.stroke({ color: boat.color, width: THEME.boat.mastWidth + 3 });
    },
    [boat.color, boat.sailAngleDeg, boat.tack]
  );

  return (
    <pixiContainer>
      <pixiContainer x={boat.position.x} y={boat.position.y} rotation={(boat.headingDeg * Math.PI) / 180}>
        <GraphicsShape draw={drawBoat} />
      </pixiContainer>
    </pixiContainer>
  );
}
