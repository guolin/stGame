import { clamp } from "../../game/utils/math";

export type InputFrame = {
  rudder: number;
};

export type InputSource = {
  sample: (tick: number) => InputFrame;
};

export type RudderKeyframe = {
  tick: number;
  rudder: number;
};

export function createConstantInputSource(rudder: number): InputSource {
  const frame = { rudder: clamp(rudder, -1, 1) };
  return { sample: () => frame };
}

export function createScriptInputSource(keyframes: RudderKeyframe[]): InputSource {
  const frames = [...keyframes].sort((a, b) => a.tick - b.tick);

  return {
    sample: (tick) => {
      if (frames.length === 0) return { rudder: 0 };
      if (tick <= frames[0].tick) return { rudder: clamp(frames[0].rudder, -1, 1) };
      const last = frames[frames.length - 1];
      if (tick >= last.tick) return { rudder: clamp(last.rudder, -1, 1) };

      for (let index = 0; index < frames.length - 1; index += 1) {
        const from = frames[index];
        const to = frames[index + 1];
        if (tick >= from.tick && tick <= to.tick) {
          const t = (tick - from.tick) / (to.tick - from.tick);
          return { rudder: clamp(from.rudder + (to.rudder - from.rudder) * t, -1, 1) };
        }
      }

      return { rudder: clamp(last.rudder, -1, 1) };
    }
  };
}
