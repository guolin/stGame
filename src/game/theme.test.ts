import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME } from "./theme";

describe("THEME", () => {
  it("defines every rendering layer group used by src/game/rendering", () => {
    const groups = ["text", "water", "wind", "windZone", "gust", "boat", "course", "tactical"] as const;
    for (const group of groups) {
      expect(THEME[group]).toBeDefined();
    }
  });

  it("keeps color fields as hex strings", () => {
    expect(THEME.water.deepColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(THEME.boat.hullFillColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(THEME.course.markCoreFillColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("keeps alpha fields within 0-1", () => {
    expect(THEME.wind.arrowAlpha).toBeGreaterThan(0);
    expect(THEME.wind.arrowAlpha).toBeLessThanOrEqual(1);
    expect(THEME.tactical.noGoFillAlpha).toBeGreaterThan(0);
    expect(THEME.tactical.noGoFillAlpha).toBeLessThanOrEqual(1);
  });
});

const RENDERING_FILES = [
  "WaterLayer.tsx",
  "WindLayer.tsx",
  "WindZoneLayer.tsx",
  "GustLayer.tsx",
  "BoatSprite.tsx",
  "CourseLayer.tsx",
  "TacticalOverlayLayer.tsx"
];

describe("no bare hex literals in rendering layer", () => {
  it("keeps all visual style literals inside theme.ts", () => {
    for (const file of RENDERING_FILES) {
      const content = readFileSync(join(__dirname, "rendering", file), "utf-8");
      const matches = content.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
      expect(matches, `${file} should not contain bare hex literals: ${matches.join(", ")}`).toHaveLength(0);
    }
  });
});
