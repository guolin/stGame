import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { WindState } from "../types";
import { WORLD } from "../constants";
import { headingToVector } from "../utils/math";
import { GraphicsShape } from "./GraphicsShape";
import type { WindFieldConfig } from "../../sim/wind/windField";
import { getLocalWind } from "../../sim/wind/windField";
import { THEME } from "../theme";

type WindLayerProps =
  | {
      windField: WindFieldConfig;
      timeSec: number;
      visible: boolean;
      wind?: never;
    }
  | {
      wind: WindState;
      visible: boolean;
      windField?: never;
      timeSec?: never;
    };

const MIN_WIND_KNOTS = 7;
const MAX_WIND_KNOTS = 18;

export function WindLayer(props: WindLayerProps) {
  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!props.visible) return;
      const config =
        props.windField ??
        ({
          baseDirectionDeg: props.wind.directionDeg,
          baseSpeedKnots: props.wind.speedKnots,
          oscillation: { kind: "none" },
          gusts: [],
          zones: []
        } satisfies WindFieldConfig);
      const sampleTimeSec = props.timeSec ?? 0;

      for (let y = 140; y < WORLD.height - 100; y += 185) {
        for (let x = 150; x < WORLD.width - 120; x += 250) {
          const local = getLocalWind(config, { x, y }, sampleTimeSec);
          const strength = Math.max(0, Math.min(1, (local.speedKnots - MIN_WIND_KNOTS) / (MAX_WIND_KNOTS - MIN_WIND_KNOTS)));
          const pulse = 1 + Math.sin(sampleTimeSec * 2.2 + x * 0.01 + y * 0.007) * 0.07;
          const scale = (0.72 + strength * 0.72) * pulse;
          const alpha = (0.26 + strength * 0.48) * (0.94 + (pulse - 1) * 0.8);
          drawWindGlyph(graphics, x, y, local.directionDeg, scale, alpha);
        }
      }
    },
    [props]
  );

  return <GraphicsShape draw={draw} />;
}

export function drawWindGlyph(graphics: PixiGraphics, x: number, y: number, windFromDeg: number, scale: number, alpha: number) {
  // directionDeg is where the wind comes FROM; arrows show where it blows TO.
  const vector = headingToVector(windFromDeg + 180);
  const angle = Math.atan2(vector.y, vector.x);
  const shaftLength = 54 * scale;
  const headLength = 22 * scale;
  const headWidth = 17 * scale;
  const tailX = x - vector.x * shaftLength * 0.5;
  const tailY = y - vector.y * shaftLength * 0.5;
  const tipX = x + vector.x * shaftLength * 0.5;
  const tipY = y + vector.y * shaftLength * 0.5;
  const baseX = tipX - Math.cos(angle) * headLength;
  const baseY = tipY - Math.sin(angle) * headLength;
  const normalX = -Math.sin(angle);
  const normalY = Math.cos(angle);

  graphics.moveTo(tailX, tailY);
  graphics.lineTo(baseX, baseY);
  graphics.stroke({ color: THEME.wind.arrowColor, alpha, width: THEME.wind.arrowWidth * scale, cap: "round" });

  graphics
    .moveTo(tipX, tipY)
    .lineTo(baseX + normalX * headWidth, baseY + normalY * headWidth)
    .lineTo(baseX - normalX * headWidth, baseY - normalY * headWidth)
    .lineTo(tipX, tipY)
    .fill({ color: THEME.wind.arrowHeadColor, alpha: Math.min(0.92, alpha + 0.16) });

  graphics.circle(tailX, tailY, 3.4 * scale).fill({ color: THEME.wind.arrowHeadColor, alpha: alpha * 0.75 });
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
