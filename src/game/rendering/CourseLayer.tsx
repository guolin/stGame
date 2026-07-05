import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CourseDefinition } from "../../sim/course/types";
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
      graphics.stroke({ color: "#ffffff", alpha: 0.95, width: 4 });
      graphics.circle(startLine.left.x, startLine.left.y, 20).fill("#f4fbff").stroke({ color: "#a9d4e6", width: 3 });
      graphics.circle(startLine.right.x, startLine.right.y, 20).fill("#f4fbff").stroke({ color: "#a9d4e6", width: 3 });

      if (finishLine !== startLine) {
        graphics.moveTo(finishLine.left.x, finishLine.left.y);
        graphics.lineTo(finishLine.right.x, finishLine.right.y);
        graphics.stroke({ color: "#9ff0c0", alpha: 0.9, width: 4 });
      }

      for (const mark of course.marks) {
        graphics.circle(mark.position.x, mark.position.y, 56).stroke({ color: "#ffd36e", alpha: 0.86, width: 3 });
        graphics.circle(mark.position.x, mark.position.y, 23).fill("#ff8a18").stroke({ color: "#c94e08", width: 5 });
        graphics.circle(mark.position.x, mark.position.y - 16, 11).fill("#ffbb4d");
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
          style={{ fill: "#ffffff", fontFamily: "Arial", fontSize: 26, fontWeight: "700" }}
        />
      ))}
    </pixiContainer>
  );
}
