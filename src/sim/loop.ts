const DEFAULT_MAX_STEPS = 5;

export function splitFrameIntoSteps(
  accumulator: number,
  frameDt: number,
  simDt: number,
  maxSteps: number = DEFAULT_MAX_STEPS
): { steps: number; remainder: number } {
  let remainder = accumulator + frameDt;
  let steps = 0;
  while (remainder >= simDt && steps < maxSteps) {
    remainder -= simDt;
    steps += 1;
  }
  if (steps >= maxSteps) {
    // A long stall (tab switch, breakpoint) must not queue a burst of catch-up ticks.
    remainder = 0;
  }
  return { steps, remainder };
}
