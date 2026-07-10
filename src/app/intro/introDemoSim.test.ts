import { describe, expect, it } from "vitest";
import {
  DEMO_MARK,
  DEMO_SHIFT_FROM_DEG,
  DEMO_SHIFT_TO_DEG,
  chooseAdaptiveTack,
  chooseCornerTack,
  createDuelState,
  demoWindOscDeg,
  leadMeters,
  recordIntroRace,
  speedKnotsOf,
  stepDuel
} from "./introDemoSim";

describe("demoWindOscDeg", () => {
  it("starts left of the base direction and veers through to the right cap", () => {
    expect(demoWindOscDeg(0)).toBe(DEMO_SHIFT_FROM_DEG);
    expect(demoWindOscDeg(2)).toBe(DEMO_SHIFT_FROM_DEG);
    expect(demoWindOscDeg(10)).toBeGreaterThan(DEMO_SHIFT_FROM_DEG);
    expect(demoWindOscDeg(60)).toBe(DEMO_SHIFT_TO_DEG);
    expect(demoWindOscDeg(500)).toBe(DEMO_SHIFT_TO_DEG);
  });
});

describe("chooseAdaptiveTack (tack on headers)", () => {
  const mark = DEMO_MARK;

  it("switches to starboard after a big right shift when port no longer points at the mark", () => {
    const position = { x: mark.x + 500, y: mark.y + 1000 };
    const tack = chooseAdaptiveTack({ position, currentTack: "port", windDeg: 25, mark, hysteresisDeg: 12 });
    expect(tack).toBe("starboard");
  });

  it("keeps the current tack when the mark is dead upwind (hysteresis)", () => {
    const position = { x: mark.x, y: mark.y + 1000 };
    expect(chooseAdaptiveTack({ position, currentTack: "port", windDeg: 0, mark, hysteresisDeg: 12 })).toBe("port");
    expect(chooseAdaptiveTack({ position, currentTack: "starboard", windDeg: 0, mark, hysteresisDeg: 12 })).toBe("starboard");
  });
});

describe("chooseCornerTack", () => {
  it("tacks toward the middle at the arena edges and otherwise holds", () => {
    expect(chooseCornerTack(100, "starboard")).toBe("port");
    expect(chooseCornerTack(2700, "port")).toBe("starboard");
    expect(chooseCornerTack(1400, "starboard")).toBe("starboard");
    expect(chooseCornerTack(1400, "port")).toBe("port");
  });
});

describe("leadMeters", () => {
  it("is positive when red is closer to the mark, negative when further", () => {
    expect(leadMeters({ x: DEMO_MARK.x, y: DEMO_MARK.y + 800 }, { x: DEMO_MARK.x, y: DEMO_MARK.y + 1000 })).toBeGreaterThan(0);
    expect(leadMeters({ x: DEMO_MARK.x, y: DEMO_MARK.y + 1200 }, { x: DEMO_MARK.x, y: DEMO_MARK.y + 1000 })).toBeLessThan(0);
  });
});

describe("recorded race", () => {
  const recording = recordIntroRace();

  it("both boats really reach the mark, red clearly first", () => {
    expect(recording.redAtMarkSec).toBeLessThan(recording.blueAtMarkSec);
    expect(recording.blueAtMarkSec - recording.redAtMarkSec).toBeGreaterThan(8);

    const redFinish = recording.frames.find((frame) => frame.timeSec >= recording.redAtMarkSec)!.red.position;
    const blueFinish = recording.frames.find((frame) => frame.timeSec >= recording.blueAtMarkSec)!.blue.position;
    expect(Math.hypot(redFinish.x - DEMO_MARK.x, redFinish.y - DEMO_MARK.y)).toBeLessThan(80);
    expect(Math.hypot(blueFinish.x - DEMO_MARK.x, blueFinish.y - DEMO_MARK.y)).toBeLessThan(80);
  });

  it("uses clean left/right routes with one tack per boat", () => {
    const countTacks = (boat: "red" | "blue") => {
      let count = 0;
      let tack = recording.frames[0][boat].tack;
      for (const frame of recording.frames) {
        if (frame[boat].tack !== tack) {
          count += 1;
          tack = frame[boat].tack;
        }
      }
      return count;
    };
    expect(countTacks("red")).toBe(1);
    expect(countTacks("blue")).toBe(1);
  });

  it("the boats sail at essentially the same speed off the line (the whole puzzle)", () => {
    for (const t of [10, 20]) {
      const frame = recording.frames[t * 60];
      expect(Math.abs(speedKnotsOf(frame.red) - speedKnotsOf(frame.blue))).toBeLessThan(0.4);
    }
  });

  it("frames carry monotonically growing track lengths for playback slicing", () => {
    const last = recording.frames[recording.frames.length - 1];
    expect(last.redTrackLen).toBe(recording.redTrack.length);
    expect(last.blueTrackLen).toBe(recording.blueTrack.length);
    expect(recording.frames[0].redTrackLen).toBeLessThanOrEqual(last.redTrackLen);
  });

  it("is deterministic, so the dark page and the replay show the same race", () => {
    const again = recordIntroRace();
    expect(again.redAtMarkSec).toBe(recording.redAtMarkSec);
    const mid = 20 * 60;
    expect(again.frames[mid].red.position).toEqual(recording.frames[mid].red.position);
  });
});

describe("live duel", () => {
  it("is winnable: the autopilot stand-in beats the blue AI", () => {
    let state = createDuelState();
    state = { ...state, autopilot: true };
    const dt = 1 / 60;
    for (let i = 0; i < 180 * 60 && !state.finished; i += 1) {
      state = stepDuel(state, 0, dt);
    }
    expect(state.finished).toBe(true);
    expect(state.redAtMarkSec!).toBeLessThan(state.blueAtMarkSec!);
  });
});
