import { useEffect, useRef } from "react";
import { splitFrameIntoSteps } from "../sim/loop";
import { SIM_DT } from "../sim/simulation";

/**
 * Drives a lesson simulation with the same fixed timestep as the race,
 * so lesson physics behave identically to race physics.
 */
export function useFixedStepLoop(step: () => void, running: boolean) {
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let last: number | undefined;
    let accumulator = 0;

    const loop = (time: number) => {
      if (last === undefined) last = time;
      const frameDt = (time - last) / 1000;
      last = time;
      const { steps, remainder } = splitFrameIntoSteps(accumulator, frameDt, SIM_DT);
      accumulator = remainder;
      for (let index = 0; index < steps; index += 1) {
        stepRef.current();
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}
