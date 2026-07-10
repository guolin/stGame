import { describe, expect, it } from "vitest";
import { buildEnvironment, DIFFICULTY_IDS, ENVIRONMENT_IDS } from "./environment";

describe("buildEnvironment", () => {
  it("provides every difficulty and environment preset", () => {
    for (const difficulty of DIFFICULTY_IDS) {
      for (const environment of ENVIRONMENT_IDS) {
        const env = buildEnvironment(difficulty, environment);
        expect(env.windField.baseSpeedKnots).toBeGreaterThan(0);
        expect(env.countdownMs).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the wind steady in the stable preset", () => {
    const env = buildEnvironment("standard", "stable");
    expect(env.windField.oscillation.kind).toBe("none");
    expect(env.windField.gusts).toHaveLength(0);
  });

  it("adds moving gusts in the gust demo preset", () => {
    const env = buildEnvironment("standard", "gust");
    expect(env.windField.gusts.length).toBeGreaterThan(0);
    expect(env.windField.gusts.some((g) => g.movementVector.x !== 0 || g.movementVector.y !== 0)).toBe(true);
  });

  it("scales wind speed with difficulty", () => {
    expect(buildEnvironment("easy", "stable").windField.baseSpeedKnots).toBeLessThan(
      buildEnvironment("race", "stable").windField.baseSpeedKnots
    );
  });

  it("turns on more assists at lower difficulty", () => {
    const easy = buildEnvironment("easy", "stable");
    const race = buildEnvironment("race", "stable");
    expect(easy.overlays.laylines).toBe(true);
    expect(easy.overlays.noGoZone).toBe(true);
    expect(race.overlays.laylines).toBe(false);
    expect(race.overlays.noGoZone).toBe(false);
  });
});
