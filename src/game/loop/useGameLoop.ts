import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";

export function useGameLoop() {
  const tick = useGameStore((state) => state.tick);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let frame = 0;

    const loop = (time: number) => {
      if (lastTimeRef.current === undefined) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      tick(dt);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [tick]);
}
