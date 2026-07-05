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
