import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text } from "pixi.js";
import { useGameStore } from "../../store/gameStore";
import { WORLD } from "../constants";
import { BoatSprite } from "./BoatSprite";
import { CourseLayer } from "./CourseLayer";
import { GustLayer } from "./GustLayer";
import { TacticalOverlayLayer } from "./TacticalOverlayLayer";
import { WaterLayer } from "./WaterLayer";
import { WindLayer } from "./WindLayer";

extend({ Container, Graphics, Text });

export function GameStage() {
  const boats = useGameStore((state) => state.boats);
  const course = useGameStore((state) => state.course);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const windField = useGameStore((state) => state.windField);
  const elapsedMs = useGameStore((state) => state.race.elapsedMs);
  const overlays = useGameStore((state) => state.overlays);
  const wind = useGameStore((state) => state.wind);
  const activeBoats = boats.filter((boat) => activeBoatIds.includes(boat.id));

  return (
    <Application
      width={WORLD.width}
      height={WORLD.height}
      backgroundAlpha={0}
      antialias
      resolution={window.devicePixelRatio || 1}
      className="game-canvas"
    >
      <pixiContainer>
        <WaterLayer timeSec={elapsedMs / 1000} />
        <GustLayer windField={windField} timeSec={elapsedMs / 1000} visible={overlays.wind} />
        <WindLayer windField={windField} timeSec={elapsedMs / 1000} visible={overlays.wind} />
        <CourseLayer course={course} />
        <TacticalOverlayLayer boats={activeBoats} overlays={overlays} wind={wind} course={course} />
        {activeBoats.map((boat) => (
          <BoatSprite key={boat.id} boat={boat} />
        ))}
      </pixiContainer>
    </Application>
  );
}
