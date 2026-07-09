import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CourseDefinition } from "../../sim/course/types";
import type { LineSegment, Vec2 } from "../types";
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
      const routePoints = buildRoutePoints(course);
      if (routePoints.length > 1) {
        graphics.moveTo(routePoints[0].x, routePoints[0].y);
        for (const point of routePoints.slice(1)) {
          graphics.lineTo(point.x, point.y);
        }
        graphics.stroke({ color: THEME.course.legLineColor, alpha: THEME.course.legLineAlpha, width: THEME.course.legLineWidth });
      }

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

      if (!sameLine(finishLine, startLine)) {
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
      {buildLegLabels(course).map((leg) => (
        <pixiText
          key={leg.label}
          text={leg.label}
          x={leg.position.x}
          y={leg.position.y}
          anchor={0.5}
          style={{ fill: THEME.course.legLabelColor, fontFamily: THEME.text.fontFamily, fontSize: THEME.course.legLabelFontSize, fontWeight: "700" }}
        />
      ))}
    </pixiContainer>
  );
}

function buildRoutePoints(course: CourseDefinition): Vec2[] {
  return [lineCenter(course.startLine), ...course.legMarkIds.map((markId) => course.marks.find((mark) => mark.id === markId)!.position), lineCenter(course.finishLine)];
}

function buildLegLabels(course: CourseDefinition): { label: string; position: Vec2 }[] {
  const routePoints = buildRoutePoints(course);
  return routePoints.slice(1).map((point, index) => {
    const prev = routePoints[index];
    const midpoint = { x: (prev.x + point.x) / 2, y: (prev.y + point.y) / 2 };
    const dx = point.x - prev.x;
    const dy = point.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const offset = 44 + (index % 2) * 18;
    return {
      label: `leg ${index + 1}`,
      position: {
        x: midpoint.x + (-dy / length) * offset,
        y: midpoint.y + (dx / length) * offset
      }
    };
  });
}

function lineCenter(line: LineSegment): Vec2 {
  return {
    x: (line.left.x + line.right.x) / 2,
    y: (line.left.y + line.right.y) / 2
  };
}

function sameLine(a: LineSegment, b: LineSegment): boolean {
  return a.left.x === b.left.x && a.left.y === b.left.y && a.right.x === b.right.x && a.right.y === b.right.y;
}
