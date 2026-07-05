import type { ReactNode } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text } from "pixi.js";
import { WORLD } from "../game/constants";

extend({ Container, Graphics, Text });

type LessonStageProps = {
  children: ReactNode;
  className?: string;
};

/**
 * A lesson-sized PixiJS stage that shares the race world coordinates, so the
 * same rendering components (BoatSprite, WindLayer, ...) work unchanged.
 */
export function LessonStage({ children, className }: LessonStageProps) {
  return (
    <Application
      width={WORLD.width}
      height={WORLD.height}
      backgroundAlpha={0}
      antialias
      resolution={1}
      className={className ?? "lesson-canvas"}
    >
      <pixiContainer>{children}</pixiContainer>
    </Application>
  );
}
