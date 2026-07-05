import type { Graphics as PixiGraphics } from "pixi.js";

type GraphicsShapeProps = {
  draw: (graphics: PixiGraphics) => void;
};

export function GraphicsShape({ draw }: GraphicsShapeProps) {
  return <pixiGraphics draw={draw} />;
}
