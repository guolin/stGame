# 视觉主题层设计 — `src/game/theme.ts`

日期:2026-07-05

## 背景

比赛画面(`src/game/rendering/`)里的颜色、透明度、线宽、间距等视觉字面量,目前分散写死在 9 个渲染组件和 `constants.ts` 里(船只颜色、风区颜色/透明度、风箭头样式等)。这带来两个问题:

1. 想调整任意一处视觉表现,都需要在多个文件里搜索十六进制值,容易漏改、难以统一。
2. 风区(`WindZoneLayer.tsx`)之间的颜色/透明度硬切换在场地上形成肉眼可见的接缝——本轮**不解决**这个问题本身(那是渲染逻辑改动),但会先把相关常量集中,为后续单独处理接缝问题打好地基。

## 目标 / 非目标

**目标**:把渲染层的视觉字面量从 9 个 `.tsx` 文件 + `constants.ts` 收敛到一个集中的 `THEME` 常量对象,各处引用 `THEME.xxx.yyy` 而不是裸字面量。纯重构,**不改变任何渲染行为、不改变任何数值**。

**非目标**:
- 不做 `styles.css`(HUD 面板的 CSS 颜色)——量级大、体系不同,不在本轮范围。
- 不实现风区边界羽化或任何新的视觉效果。
- 不做"可切换皮肤"(白天/夜晚模式等)——这次只解决"字面量分散",不解决"主题可切换",后者是在这个地基上才能做的下一步。

## 范围清单

| 文件 | 涉及内容 |
|---|---|
| `src/game/rendering/WaterLayer.tsx` | 水色(深/浅)、波纹颜色、反光颜色 |
| `src/game/rendering/WindLayer.tsx` | 箭头颜色/透明度/线宽/长度、网格间距(x/y) |
| `src/game/rendering/WindZoneLayer.tsx` | 风区色块颜色(沿用 `constants.ts` 里各 zone 自带的 `color`/`alpha` 字段,不新增独立常量) |
| `src/game/rendering/GustLayer.tsx` | 阵风填充色/描边色 |
| `src/game/rendering/CurrentLayer.tsx` | 水流箭头色/光晕色 |
| `src/game/rendering/BoatSprite.tsx` | 船体填充/描边、帆填充、尾流颜色 |
| `src/game/rendering/CourseLayer.tsx` | 航线颜色、起终点线、标志颜色(圆形标/线形标/终点标) |
| `src/game/rendering/TacticalOverlayLayer.tsx` | Layline 颜色、禁航区填充色 |
| `src/game/constants.ts` | `INITIAL_BOATS` 的船只 `color` 字段、`INITIAL_WIND_ZONES` 的 `color`/`alpha` 字段 |

## THEME 结构

按渲染层(图层)分组,不按抽象色板分组——现状是"某个图层用某个颜色",按图层组织可以逐文件对照搬迁,不需要做语义映射判断:

```ts
// src/game/theme.ts
export const THEME = {
  water: { deep, shallow, ripple, glint },
  wind: { arrowColor, arrowAlpha, arrowWidth, arrowLength, gridStepX, gridStepY },
  gust: { fill, stroke },
  current: { arrow, glow },
  boat: { hullFill, hullStroke, sailFill, wakeColor },
  course: { lineColor, startFill, startStroke, finishFill, finishStroke, markFill, markCore, markGlow },
  tactical: { laylineColor, noGoFill },
} as const;
```

`constants.ts` 里 `INITIAL_BOATS`/`INITIAL_WIND_ZONES` 的颜色字段保持原地不动(它们本来就是"配置数据"而非"渲染层字面量"),但会从 `THEME` 里取值赋给这些字段,避免同一个颜色值在两处各写一份。

## 迁移方式

逐文件替换:每改完一个渲染文件,立刻跑一次 `npm test` + 目测截图确认无视觉变化,再进行下一个文件。不批量一次性改完 9 个文件再测试,降低出错定位成本。

## 测试

1. 新增 `src/game/theme.spec.ts`:断言 `THEME` 顶层分组齐全,抽样字段是合法 hex 颜色或数值类型。
2. 新增一个"无裸字面量"检查(Vitest 测试内跑正则扫描,而非新增 lint 规则,避免引入额外工具链):对 9 个渲染文件做 `#[0-9a-fA-F]{3,8}` 匹配,断言除 `theme.ts` 本身外无匹配,防止以后有人绕过 THEME 直接写死颜色。
3. 现有 74 个单测跑一遍,确认无回归(本轮不改变行为,这些测试全绿是唯一需要的回归证据)。

## 文档

- `theme.ts` 顶部注释:说明分组规则、以及新增视觉常量时应该放进哪个分组。
- 本设计文档本身作为记录留存。

## 验收标准

- [ ] 9 个渲染文件 + `constants.ts` 中不再有裸的十六进制颜色字面量(除 `theme.ts` 内部)。
- [ ] `theme.spec.ts` 通过。
- [ ] 无裸字面量扫描测试通过。
- [ ] 现有 74 个单测全部通过。
- [ ] 生产构建(`npm run build`)成功。
- [ ] 目测比赛画面(水面/船只/风箭头/风区/航线/layline)与改动前一致,无视觉差异。
