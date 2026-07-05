import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState } from "../types";
import { GraphicsShape } from "./GraphicsShape";

type BoatSpriteProps = {
  boat: BoatState;
};

export function BoatSprite({ boat }: BoatSpriteProps) {
  const drawWake = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      const wake = Math.min(120, 42 + boat.speed * 0.52);
      graphics.moveTo(boat.position.x - 14, boat.position.y + 20);
      graphics.lineTo(boat.position.x - 42, boat.position.y + wake);
      graphics.moveTo(boat.position.x + 14, boat.position.y + 20);
      graphics.lineTo(boat.position.x + 42, boat.position.y + wake);
      graphics.stroke({ color: "#dff9ff", alpha: 0.5, width: 6 });
    },
    [boat.position.x, boat.position.y, boat.speed]
  );

  const drawBoat = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      graphics.moveTo(0, -48);
      graphics.lineTo(24, 38);
      graphics.lineTo(0, 54);
      graphics.lineTo(-24, 38);
      graphics.lineTo(0, -48);
      graphics.fill("#f6fbff").stroke({ color: boat.color, width: 8 });
      graphics.moveTo(0, -38);
      graphics.lineTo(0, 40);
      graphics.stroke({ color: "#364653", width: 5 });
      // Boom swings to the leeward side: port side on starboard tack.
      const side = boat.tack === "starboard" ? -1 : 1;
      graphics.moveTo(side * 4, -32);
      graphics.lineTo(side * 4, 28);
      graphics.lineTo(side * 32, 16);
      graphics.lineTo(side * 4, -32);
      graphics.fill({ color: boat.color, alpha: 0.92 });
    },
    [boat.color, boat.tack]
  );

  return (
    <pixiContainer>
      <GraphicsShape draw={drawWake} />
      <pixiContainer x={boat.position.x} y={boat.position.y} rotation={(boat.headingDeg * Math.PI) / 180}>
        <GraphicsShape draw={drawBoat} />
      </pixiContainer>
      <pixiText
        text={boat.name}
        x={boat.position.x - 48}
        y={boat.position.y + 58}
        style={{ fill: "#ffffff", fontFamily: "Arial", fontSize: 24, fontWeight: "700", stroke: { color: "#06324a", width: 5 } }}
      />
    </pixiContainer>
  );
}
