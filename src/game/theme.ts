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
    legLineColor: "#fff0a8",
    legLineAlpha: 0.34,
    legLineWidth: 3,
    labelColor: "#ffffff",
    labelFontSize: 26,
    legLabelColor: "#fff7c2",
    legLabelFontSize: 24
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
