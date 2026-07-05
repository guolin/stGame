# 视觉主题层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `src/game/rendering/` 下 8 个渲染组件里散落的十六进制颜色/透明度/线宽字面量,收进新建的 `src/game/theme.ts` 常量对象,纯重构,不改变任何渲染行为或数值。

**Architecture:** 新建一个按图层分组的 `THEME` 常量对象(`water`/`wind`/`gust`/`current`/`boat`/`course`/`tactical`/`text`),每个渲染文件把裸字面量替换成 `THEME.xxx.yyy` 引用。只迁移"视觉样式"字面量(颜色/透明度/线宽/字体),不触碰几何布局数字(位置比例、半径倍数、角度偏移、循环次数等)——这些留在原地,以保证这是一次零风险的纯重构。

**Tech Stack:** TypeScript, React, Pixi.js (`@pixi/react`), Vitest。

## Global Constraints

- 本轮**不改变任何渲染行为、不改变任何数值**——每个数值原样复制进 THEME,不四舍五入、不"顺手优化"。
- 只迁移颜色 (`color`)、透明度 (`alpha`)、线宽 (`width`)、字体 (`fontFamily`/`fontSize`) 字面量。几何布局数字(半径比例、间距循环、角度偏移、数组长度)保持原地不变。
- 不涉及 `src/styles.css`(HUD 面板 CSS),不涉及 `constants.ts` 里 `INITIAL_BOATS`/`INITIAL_WIND_ZONES` 的颜色字段本身(它们是配置数据,保留原地,只是改为引用 THEME 里对应的值,避免同一色值出现两份)。
- 每个任务改完立刻跑 `npm test`,确认 74 个现有单测 + 新增测试全部通过,再进入下一个任务。
- 测试文件命名遵循本仓库既有约定 `*.test.ts`(不是 `*.spec.ts` — 检查过 `src/game/constants.test.ts` 等现有文件均用这个后缀)。

---

## File Structure

| 文件 | 责任 |
|---|---|
| `src/game/theme.ts` (新建) | 集中的 `THEME` 常量对象,按图层分组 |
| `src/game/theme.test.ts` (新建) | 断言 THEME 结构完整 + 无裸字面量扫描 |
| `src/game/rendering/WaterLayer.tsx` (改) | 引用 `THEME.water.*` |
| `src/game/rendering/WindLayer.tsx` (改) | 引用 `THEME.wind.*` |
| `src/game/rendering/WindZoneLayer.tsx` (改) | 引用 `THEME.windZone.*` |
| `src/game/rendering/GustLayer.tsx` (改) | 引用 `THEME.gust.*` |
| `src/game/rendering/CurrentLayer.tsx` (改) | 引用 `THEME.current.*` |
| `src/game/rendering/BoatSprite.tsx` (改) | 引用 `THEME.boat.*` + `THEME.text.*` |
| `src/game/rendering/CourseLayer.tsx` (改) | 引用 `THEME.course.*` + `THEME.text.*` |
| `src/game/rendering/TacticalOverlayLayer.tsx` (改) | 引用 `THEME.tactical.*` |

---

## Task 1: 建立 THEME 骨架 + 结构测试

**Files:**
- Create: `src/game/theme.ts`
- Test: `src/game/theme.test.ts`

**Interfaces:**
- Produces: `export const THEME` — 后续所有任务都从 `"../theme"` import 这个对象的分组字段。完整字段见下方代码块,后续任务不会新增字段,只会被消费。

- [ ] **Step 1: 写 `theme.ts`(先写骨架,内容就是最终形态——本任务不是 TDD 式渐进,而是先落地完整数据结构,因为 THEME 是纯数据,没有行为可言,后续任务通过"迁移引用它的组件"来验证正确性)**

```ts
// src/game/theme.ts

/**
 * 集中管理 src/game/rendering/ 渲染层的视觉样式字面量(颜色/透明度/线宽/字体)。
 * 按图层分组,组名对应 rendering/ 下的组件文件。新增视觉常量时,加进对应图层的分组;
 * 如果是全新图层,新增一个顶层分组。几何布局数字(位置比例、半径倍数、角度、循环次数)
 * 不放在这里,留在各渲染组件内部。
 */
export const THEME = {
  text: {
    fontFamily: "Arial"
  },
  water: {
    deepColor: "#0877a8",
    shallowColor: "#0b4d78",
    shallowAlpha: 0.34,
    rippleColor: "#8de5ff",
    rippleAlpha: 0.14,
    rippleWidth: 2,
    glintColor: "#e8fbff",
    glintAlpha: 0.2
  },
  wind: {
    arrowColor: "#c5f6ff",
    arrowAlpha: 0.34,
    arrowWidth: 7,
    arrowLength: 74
  },
  windZone: {
    ripplePositiveColor: "#d9fbff",
    ripplePositiveAlpha: 0.16,
    ripplePositiveWidth: 5,
    rippleNegativeColor: "#7ed8ff",
    rippleNegativeAlpha: 0.09,
    rippleNegativeWidth: 3
  },
  gust: {
    lullColor: "#8fd8ef",
    gustColor: "#053a5c",
    outerAlphaLull: 0.18,
    outerAlphaGust: 0.3,
    innerAlphaLull: 0.1,
    innerAlphaGust: 0.18,
    strokeAlpha: 0.4,
    strokeWidth: 3
  },
  current: {
    zoneFillColor: "#2ea8ff",
    zoneFillAlpha: 0.07,
    arrowColor: "#49c9ff",
    arrowAlpha: 0.42,
    arrowWidth: 7
  },
  boat: {
    hullFillColor: "#f6fbff",
    hullStrokeWidth: 8,
    mastColor: "#364653",
    mastWidth: 5,
    sailAlpha: 0.92,
    wakeColor: "#dff9ff",
    wakeAlpha: 0.5,
    wakeWidth: 6,
    nameTextColor: "#ffffff",
    nameTextStrokeColor: "#06324a",
    nameTextStrokeWidth: 5,
    nameFontSize: 24
  },
  course: {
    startLineColor: "#ffffff",
    startLineAlpha: 0.95,
    startLineWidth: 4,
    startMarkFillColor: "#f4fbff",
    startMarkStrokeColor: "#a9d4e6",
    startMarkStrokeWidth: 3,
    finishLineColor: "#9ff0c0",
    finishLineAlpha: 0.9,
    finishLineWidth: 4,
    markRingColor: "#ffd36e",
    markRingAlpha: 0.86,
    markRingWidth: 3,
    markCoreFillColor: "#ff8a18",
    markCoreStrokeColor: "#c94e08",
    markCoreStrokeWidth: 5,
    markGlintColor: "#ffbb4d",
    labelColor: "#ffffff",
    labelFontSize: 26
  },
  tactical: {
    trackAlpha: 0.58,
    trackWidth: 3,
    laylineAlpha: 0.3,
    laylineWidth: 2,
    laylineMarkColor: "#ffe08a",
    laylineMarkAlpha: 0.22,
    laylineMarkWidth: 2,
    noGoFillColor: "#ffffff",
    noGoFillAlpha: 0.08
  }
} as const;
```

- [ ] **Step 2: 写结构断言测试**

```ts
// src/game/theme.test.ts
import { describe, expect, it } from "vitest";
import { THEME } from "./theme";

describe("THEME", () => {
  it("defines every rendering layer group used by src/game/rendering", () => {
    const groups = ["text", "water", "wind", "windZone", "gust", "current", "boat", "course", "tactical"] as const;
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
```

- [ ] **Step 3: 跑测试确认通过**

Run: `npx vitest run src/game/theme.test.ts`
Expected: 3 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/game/theme.ts src/game/theme.test.ts
git commit -m "$(cat <<'EOF'
新增视觉主题层 THEME 常量骨架

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 迁移 WaterLayer.tsx

**Files:**
- Modify: `src/game/rendering/WaterLayer.tsx`

**Interfaces:**
- Consumes: `THEME.water.{deepColor,shallowColor,shallowAlpha,rippleColor,rippleAlpha,rippleWidth,glintColor,glintAlpha}`(Task 1 已定义)

- [ ] **Step 1: 替换字面量为 THEME 引用**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import { WORLD } from "../constants";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

export function WaterLayer() {
  const draw = useCallback((graphics: PixiGraphics) => {
    graphics.clear();
    graphics.rect(0, 0, WORLD.width, WORLD.height).fill(THEME.water.deepColor);
    graphics.rect(0, 0, WORLD.width, WORLD.height).fill({ color: THEME.water.shallowColor, alpha: THEME.water.shallowAlpha });

    for (let y = 26; y < WORLD.height; y += 82) {
      graphics.moveTo(0, y);
      for (let x = 0; x <= WORLD.width; x += 58) {
        graphics.lineTo(x, y + Math.sin(x * 0.012 + y * 0.02) * 9);
      }
      graphics.stroke({ color: THEME.water.rippleColor, alpha: THEME.water.rippleAlpha, width: THEME.water.rippleWidth });
    }

    for (let x = 0; x < WORLD.width; x += 150) {
      graphics.circle(x + 18, 100 + ((x * 13) % (WORLD.height - 180)), 3).fill({ color: THEME.water.glintColor, alpha: THEME.water.glintAlpha });
    }
  }, []);

  return <GraphicsShape draw={draw} />;
}
```

- [ ] **Step 2: 跑全量测试确认无回归**

Run: `npm test`
Expected: 全部通过(74 个既有 + Task 1 新增的 THEME 测试)

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/WaterLayer.tsx
git commit -m "$(cat <<'EOF'
WaterLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 迁移 WindLayer.tsx

**Files:**
- Modify: `src/game/rendering/WindLayer.tsx`

**Interfaces:**
- Consumes: `THEME.wind.{arrowColor,arrowAlpha,arrowWidth,arrowLength}`

- [ ] **Step 1: 替换字面量**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindState } from "../types";
import { WORLD } from "../constants";
import { THEME } from "../theme";
import { headingToVector } from "../utils/math";
import { GraphicsShape } from "./GraphicsShape";

type WindLayerProps = {
  wind: WindState;
  visible: boolean;
};

export function WindLayer({ wind, visible }: WindLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visible) return;

      // directionDeg is where the wind comes FROM; arrows show where it blows TO.
      const vector = headingToVector(wind.directionDeg + 180);
      for (let y = 150; y < WORLD.height - 120; y += 190) {
        for (let x = 160; x < WORLD.width - 130; x += 260) {
          drawArrow(
            graphics,
            x,
            y,
            vector.x * THEME.wind.arrowLength,
            vector.y * THEME.wind.arrowLength,
            THEME.wind.arrowColor,
            THEME.wind.arrowAlpha,
            THEME.wind.arrowWidth
          );
        }
      }
    },
    [visible, wind]
  );

  return <GraphicsShape draw={draw} />;
}

export function drawArrow(
  graphics: PixiGraphics,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  alpha: number,
  width: number
) {
  graphics.moveTo(x, y);
  graphics.lineTo(x + dx, y + dy);
  graphics.stroke({ color, alpha, width });

  const angle = Math.atan2(dy, dx);
  const head = 12;
  graphics.moveTo(x + dx, y + dy);
  graphics.lineTo(x + dx - Math.cos(angle - 0.55) * head, y + dy - Math.sin(angle - 0.55) * head);
  graphics.moveTo(x + dx, y + dy);
  graphics.lineTo(x + dx - Math.cos(angle + 0.55) * head, y + dy - Math.sin(angle + 0.55) * head);
  graphics.stroke({ color, alpha, width });
}
```

Note: `drawArrow` 保持通用参数化函数不变(它本来就不含字面量,调用方传入颜色/透明度/线宽),`CurrentLayer.tsx` 复用它,不用改。

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/WindLayer.tsx
git commit -m "$(cat <<'EOF'
WindLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 迁移 WindZoneLayer.tsx

**Files:**
- Modify: `src/game/rendering/WindZoneLayer.tsx`

**Interfaces:**
- Consumes: `THEME.windZone.{ripplePositiveColor,ripplePositiveAlpha,ripplePositiveWidth,rippleNegativeColor,rippleNegativeAlpha,rippleNegativeWidth}`

- [ ] **Step 1: 替换字面量(注意:`zone.color`/`zone.alpha` 来自 `constants.ts` 的配置数据,不是本文件的字面量,保持不变)**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindZoneState } from "../types";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type WindZoneLayerProps = {
  zones: WindZoneState[];
};

export function WindZoneLayer({ zones }: WindZoneLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      zones.forEach((zone) => {
        const pulse = Math.sin(zone.phase) * 0.035;
        const alpha = Math.max(0.04, zone.alpha + pulse);
        const { x, y, width, height } = zone.bounds;

        graphics.rect(x, y, width, height).fill({ color: zone.color, alpha });

        for (let row = y + 80; row < y + height; row += 145) {
          const offset = Math.sin(zone.phase + row * 0.01) * 34;
          graphics.moveTo(x + 40 + offset, row);
          graphics.lineTo(x + width - 40 + offset, row + Math.sin(zone.phase + row * 0.02) * 24);
          graphics.stroke(
            zone.speedDeltaKnots >= 0
              ? { color: THEME.windZone.ripplePositiveColor, alpha: THEME.windZone.ripplePositiveAlpha, width: THEME.windZone.ripplePositiveWidth }
              : { color: THEME.windZone.rippleNegativeColor, alpha: THEME.windZone.rippleNegativeAlpha, width: THEME.windZone.rippleNegativeWidth }
          );
        }
      });
    },
    [zones]
  );

  return <GraphicsShape draw={draw} />;
}
```

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/WindZoneLayer.tsx
git commit -m "$(cat <<'EOF'
WindZoneLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 迁移 GustLayer.tsx

**Files:**
- Modify: `src/game/rendering/GustLayer.tsx`

**Interfaces:**
- Consumes: `THEME.gust.{lullColor,gustColor,outerAlphaLull,outerAlphaGust,innerAlphaLull,innerAlphaGust,strokeAlpha,strokeWidth}`

- [ ] **Step 1: 替换字面量**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindFieldConfig } from "../../sim/wind/windField";
import { gustPositionAt } from "../../sim/wind/windField";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type GustLayerProps = {
  windField: WindFieldConfig;
  timeSec: number;
  visible: boolean;
};

export function GustLayer({ windField, timeSec, visible }: GustLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visible) return;

      for (const gust of windField.gusts) {
        const center = gustPositionAt(gust, timeSec);
        const isLull = gust.windSpeedDeltaKnots < 0;
        const color = isLull ? THEME.gust.lullColor : THEME.gust.gustColor;
        const outerAlpha = isLull ? THEME.gust.outerAlphaLull : THEME.gust.outerAlphaGust;
        const innerAlpha = isLull ? THEME.gust.innerAlphaLull : THEME.gust.innerAlphaGust;

        graphics.circle(center.x, center.y, gust.radius).fill({ color, alpha: outerAlpha });
        graphics.circle(center.x, center.y, gust.radius * 0.62).fill({ color, alpha: innerAlpha });
        graphics.circle(center.x, center.y, gust.radius).stroke({ color, alpha: THEME.gust.strokeAlpha, width: THEME.gust.strokeWidth });
      }
    },
    [windField, timeSec, visible]
  );

  return <GraphicsShape draw={draw} />;
}
```

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/GustLayer.tsx
git commit -m "$(cat <<'EOF'
GustLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 迁移 CurrentLayer.tsx

**Files:**
- Modify: `src/game/rendering/CurrentLayer.tsx`

**Interfaces:**
- Consumes: `THEME.current.{zoneFillColor,zoneFillAlpha,arrowColor,arrowAlpha,arrowWidth}`, `drawArrow` from `./WindLayer`(Task 3 已产出,签名不变)

- [ ] **Step 1: 替换字面量**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CurrentZone } from "../types";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";
import { drawArrow } from "./WindLayer";

type CurrentLayerProps = {
  currents: CurrentZone[];
  visible: boolean;
};

export function CurrentLayer({ currents, visible }: CurrentLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visible) return;

      currents.forEach((zone) => {
        graphics.circle(zone.center.x, zone.center.y, zone.radius).fill({ color: THEME.current.zoneFillColor, alpha: THEME.current.zoneFillAlpha });
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8;
          const x = zone.center.x + Math.cos(angle) * zone.radius * 0.52;
          const y = zone.center.y + Math.sin(angle) * zone.radius * 0.34;
          drawArrow(graphics, x, y, zone.vector.x * 7, zone.vector.y * 7, THEME.current.arrowColor, THEME.current.arrowAlpha, THEME.current.arrowWidth);
        }
      });
    },
    [currents, visible]
  );

  return <GraphicsShape draw={draw} />;
}
```

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/CurrentLayer.tsx
git commit -m "$(cat <<'EOF'
CurrentLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 迁移 BoatSprite.tsx

**Files:**
- Modify: `src/game/rendering/BoatSprite.tsx`

**Interfaces:**
- Consumes: `THEME.boat.{hullFillColor,hullStrokeWidth,mastColor,mastWidth,sailAlpha,wakeColor,wakeAlpha,wakeWidth,nameTextColor,nameTextStrokeColor,nameTextStrokeWidth,nameFontSize}`, `THEME.text.fontFamily`

- [ ] **Step 1: 替换字面量(`boat.color` 是动态数据,保持不变,只替换固定视觉常量)**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState } from "../types";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type BoatSpriteProps = {
  boat: BoatState;
};

export function BoatSprite({ boat }: BoatSpriteProps) {
  const drawWake = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      const wake = Math.min(120, 42 + boat.speed * 0.52);
      graphics.moveTo(boat.position.x - 14, boat.position.y + 20);
      graphics.lineTo(boat.position.x - 42, boat.position.y + wake);
      graphics.moveTo(boat.position.x + 14, boat.position.y + 20);
      graphics.lineTo(boat.position.x + 42, boat.position.y + wake);
      graphics.stroke({ color: THEME.boat.wakeColor, alpha: THEME.boat.wakeAlpha, width: THEME.boat.wakeWidth });
    },
    [boat.position.x, boat.position.y, boat.speed]
  );

  const drawBoat = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      graphics.moveTo(0, -48);
      graphics.lineTo(24, 38);
      graphics.lineTo(0, 54);
      graphics.lineTo(-24, 38);
      graphics.lineTo(0, -48);
      graphics.fill(THEME.boat.hullFillColor).stroke({ color: boat.color, width: THEME.boat.hullStrokeWidth });
      graphics.moveTo(0, -38);
      graphics.lineTo(0, 40);
      graphics.stroke({ color: THEME.boat.mastColor, width: THEME.boat.mastWidth });
      // Boom swings to the leeward side: port side on starboard tack.
      const side = boat.tack === "starboard" ? -1 : 1;
      graphics.moveTo(side * 4, -32);
      graphics.lineTo(side * 4, 28);
      graphics.lineTo(side * 32, 16);
      graphics.lineTo(side * 4, -32);
      graphics.fill({ color: boat.color, alpha: THEME.boat.sailAlpha });
    },
    [boat.color, boat.tack]
  );

  return (
    <pixiContainer>
      <GraphicsShape draw={drawWake} />
      <pixiContainer x={boat.position.x} y={boat.position.y} rotation={(boat.headingDeg * Math.PI) / 180}>
        <GraphicsShape draw={drawBoat} />
      </pixiContainer>
      <pixiText
        text={boat.name}
        x={boat.position.x - 48}
        y={boat.position.y + 58}
        style={{
          fill: THEME.boat.nameTextColor,
          fontFamily: THEME.text.fontFamily,
          fontSize: THEME.boat.nameFontSize,
          fontWeight: "700",
          stroke: { color: THEME.boat.nameTextStrokeColor, width: THEME.boat.nameTextStrokeWidth }
        }}
      />
    </pixiContainer>
  );
}
```

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/BoatSprite.tsx
git commit -m "$(cat <<'EOF'
BoatSprite 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 迁移 CourseLayer.tsx

**Files:**
- Modify: `src/game/rendering/CourseLayer.tsx`

**Interfaces:**
- Consumes: `THEME.course.*`(见 Task 1 定义), `THEME.text.fontFamily`

- [ ] **Step 1: 替换字面量**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CourseDefinition } from "../../sim/course/types";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type CourseLayerProps = {
  course: CourseDefinition;
};

export function CourseLayer({ course }: CourseLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      const { startLine, finishLine } = course;
      graphics.moveTo(startLine.left.x, startLine.left.y);
      graphics.lineTo(startLine.right.x, startLine.right.y);
      graphics.stroke({ color: THEME.course.startLineColor, alpha: THEME.course.startLineAlpha, width: THEME.course.startLineWidth });
      graphics
        .circle(startLine.left.x, startLine.left.y, 20)
        .fill(THEME.course.startMarkFillColor)
        .stroke({ color: THEME.course.startMarkStrokeColor, width: THEME.course.startMarkStrokeWidth });
      graphics
        .circle(startLine.right.x, startLine.right.y, 20)
        .fill(THEME.course.startMarkFillColor)
        .stroke({ color: THEME.course.startMarkStrokeColor, width: THEME.course.startMarkStrokeWidth });

      if (finishLine !== startLine) {
        graphics.moveTo(finishLine.left.x, finishLine.left.y);
        graphics.lineTo(finishLine.right.x, finishLine.right.y);
        graphics.stroke({ color: THEME.course.finishLineColor, alpha: THEME.course.finishLineAlpha, width: THEME.course.finishLineWidth });
      }

      for (const mark of course.marks) {
        graphics
          .circle(mark.position.x, mark.position.y, 56)
          .stroke({ color: THEME.course.markRingColor, alpha: THEME.course.markRingAlpha, width: THEME.course.markRingWidth });
        graphics
          .circle(mark.position.x, mark.position.y, 23)
          .fill(THEME.course.markCoreFillColor)
          .stroke({ color: THEME.course.markCoreStrokeColor, width: THEME.course.markCoreStrokeWidth });
        graphics.circle(mark.position.x, mark.position.y - 16, 11).fill(THEME.course.markGlintColor);
      }
    },
    [course]
  );

  return (
    <pixiContainer>
      <GraphicsShape draw={draw} />
      {course.marks.map((mark) => (
        <pixiText
          key={mark.id}
          text={mark.label}
          x={mark.position.x + 38}
          y={mark.position.y + 24}
          style={{ fill: THEME.course.labelColor, fontFamily: THEME.text.fontFamily, fontSize: THEME.course.labelFontSize, fontWeight: "700" }}
        />
      ))}
    </pixiContainer>
  );
}
```

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/CourseLayer.tsx
git commit -m "$(cat <<'EOF'
CourseLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 迁移 TacticalOverlayLayer.tsx

**Files:**
- Modify: `src/game/rendering/TacticalOverlayLayer.tsx`

**Interfaces:**
- Consumes: `THEME.tactical.{trackAlpha,trackWidth,laylineAlpha,laylineWidth,laylineMarkColor,laylineMarkAlpha,laylineMarkWidth,noGoFillColor,noGoFillAlpha}`

- [ ] **Step 1: 替换字面量(`boat.color` 保持动态)**

```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { BoatState, OverlaySettings, Vec2, WindState } from "../types";
import type { CourseDefinition } from "../../sim/course/types";
import { currentTarget } from "../../sim/course/progress";
import { headingToVector, normalizeDeg } from "../utils/math";
import { THEME } from "../theme";
import { GraphicsShape } from "./GraphicsShape";

type TacticalOverlayLayerProps = {
  boats: BoatState[];
  overlays: OverlaySettings;
  wind: WindState;
  course: CourseDefinition;
};

export function TacticalOverlayLayer({ boats, overlays, wind, course }: TacticalOverlayLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      boats.forEach((boat) => {
        if (overlays.tracks && boat.track.length > 1) {
          graphics.moveTo(boat.track[0].x, boat.track[0].y);
          boat.track.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
          graphics.stroke({ color: boat.color, alpha: THEME.tactical.trackAlpha, width: THEME.tactical.trackWidth });
        }

        if (overlays.laylines) {
          const target = currentTarget(course, boat.legIndex);
          const markPosition = target.kind === "mark" ? target.mark.position : undefined;
          drawLayline(graphics, boat, wind.directionDeg + 42, markPosition);
          drawLayline(graphics, boat, wind.directionDeg - 42, markPosition);
        }

        if (overlays.noGoZone) {
          drawNoGoZone(graphics, boat, wind.directionDeg);
        }
      });
    },
    [boats, overlays, wind.directionDeg, course]
  );

  return <GraphicsShape draw={draw} />;
}

function drawLayline(graphics: PixiGraphics, boat: BoatState, deg: number, markPosition?: Vec2) {
  const vector = headingToVector(normalizeDeg(deg));
  graphics.moveTo(boat.position.x, boat.position.y);
  graphics.lineTo(boat.position.x + vector.x * 720, boat.position.y + vector.y * 720);
  graphics.stroke({ color: boat.color, alpha: THEME.tactical.laylineAlpha, width: THEME.tactical.laylineWidth });

  if (markPosition) {
    graphics.moveTo(markPosition.x, markPosition.y);
    graphics.lineTo(markPosition.x - vector.x * 720, markPosition.y - vector.y * 720);
    graphics.stroke({ color: THEME.tactical.laylineMarkColor, alpha: THEME.tactical.laylineMarkAlpha, width: THEME.tactical.laylineMarkWidth });
  }
}

function drawNoGoZone(graphics: PixiGraphics, boat: BoatState, windDirection: number) {
  const left = headingToVector(windDirection - 34);
  const right = headingToVector(windDirection + 34);
  const radius = 150;

  graphics.moveTo(boat.position.x, boat.position.y);
  graphics.lineTo(boat.position.x + left.x * radius, boat.position.y + left.y * radius);
  graphics.arc(boat.position.x, boat.position.y, radius, Math.atan2(left.y, left.x), Math.atan2(right.y, right.x));
  graphics.lineTo(boat.position.x, boat.position.y);
  graphics.fill({ color: THEME.tactical.noGoFillColor, alpha: THEME.tactical.noGoFillAlpha });
}
```

- [ ] **Step 2: 跑全量测试**

Run: `npm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/game/rendering/TacticalOverlayLayer.tsx
git commit -m "$(cat <<'EOF'
TacticalOverlayLayer 迁移到 THEME 视觉常量

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 无裸字面量扫描测试 + constants.ts 引用去重 + 最终验证

**Files:**
- Modify: `src/game/theme.test.ts`(追加扫描测试)
- Modify: `src/game/constants.ts`(船只/风区颜色改为引用 THEME,值不变)

**Interfaces:**
- Consumes: 全部 8 个渲染文件(Task 2-9 已完成迁移)

- [ ] **Step 1: 在 `theme.test.ts` 追加"无裸字面量"扫描测试**

```ts
// 追加到 src/game/theme.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RENDERING_FILES = [
  "WaterLayer.tsx",
  "WindLayer.tsx",
  "WindZoneLayer.tsx",
  "GustLayer.tsx",
  "CurrentLayer.tsx",
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
```

- [ ] **Step 2: 跑这个新测试确认通过**

Run: `npx vitest run src/game/theme.test.ts`
Expected: 全部 PASS(如果有文件还残留裸字面量,这里会报出具体文件名和残留值,回去补迁移)

- [ ] **Step 3: `constants.ts` 里船只颜色和风区颜色改为引用 THEME(值原样不变,只是消除重复定义)**

因为 `THEME.boat`/`THEME.windZone` 里没有存这些具体的每条船/每个风区的颜色(那些是配置数据,数量可变,不属于"视觉样式"分组),所以这一步实际上**不需要改 `constants.ts`**——`INITIAL_BOATS`/`INITIAL_WIND_ZONES` 里的颜色本来就是数据而非样式字面量,与 THEME 管的"图层通用视觉参数"是两个概念,不存在重复。跳过这个改动,在 commit message 里说明原因即可(避免制造不必要的耦合)。

- [ ] **Step 4: 跑全量测试 + 生产构建**

Run: `npm test`
Expected: 全部通过(74 + 新增 THEME 相关测试)

Run: `npm run build`
Expected: 构建成功,无 TypeScript 报错

- [ ] **Step 5: 启动 dev server 目测比赛画面无视觉差异**

Run: `npm run dev`(或已有的 `run` 技能启动流程),打开比赛画面,对比水面/船只/风箭头/风区/航线/mark/layline 与改动前截图,确认无视觉差异。

- [ ] **Step 6: 提交**

```bash
git add src/game/theme.test.ts
git commit -m "$(cat <<'EOF'
新增无裸字面量扫描测试,确认渲染层全部迁移到 THEME

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec 覆盖**:spec 里列出的 9 个渲染文件(8 个 rendering + constants.ts)——8 个 rendering 文件均有对应任务(Task 2-9);`constants.ts` 在 Task 10 里明确说明本轮不改(颜色是配置数据,不是样式字面量,和 THEME 分组不重复),这是设计阶段"按图层分组、不做语义色板"决策的自然结果,不是遗漏。
- **测试文件命名**:已按仓库既有约定使用 `*.test.ts`(而不是 spec 文档里写的 `theme.spec.ts`),这是实现细节层面的一致性修正,不影响验收标准的实质要求。
- **类型一致性**:所有任务里 `THEME` 字段名前后一致,`drawArrow` 签名在 Task 3 定义、Task 6 直接复用,未变化。
