import { describe, expect, it } from "vitest";
import { getBackTarget } from "./backNavigation";

describe("getBackTarget", () => {
  it("sends lesson sub-screens back to the lesson menu, not the home screen", () => {
    expect(getBackTarget("lessonBoat")).toBe("lessons");
    expect(getBackTarget("lessonWind")).toBe("lessons");
    expect(getBackTarget("lessonRules")).toBe("lessons");
    expect(getBackTarget("lessonRaceFlow")).toBe("lessons");
  });

  it("sends top-level screens back to home", () => {
    expect(getBackTarget("intro")).toBe("home");
    expect(getBackTarget("lessons")).toBe("home");
    expect(getBackTarget("setup")).toBe("home");
  });

  it("treats results as a race modal", () => {
    expect(getBackTarget("results")).toBe("race");
  });

  it("sends race back to home because settings now live in the home modal", () => {
    expect(getBackTarget("race")).toBe("home");
  });

  it("has no back target from home", () => {
    expect(getBackTarget("home")).toBeUndefined();
  });
});
