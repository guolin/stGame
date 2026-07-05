import type { CurrentZone, Vec2 } from "../types";
import { distance } from "../utils/math";

export function currentAt(position: Vec2, zones: CurrentZone[]): Vec2 {
  return zones.reduce<Vec2>(
    (total, zone) => {
      if (distance(position, zone.center) > zone.radius) return total;
      return { x: total.x + zone.vector.x, y: total.y + zone.vector.y };
    },
    { x: 0, y: 0 }
  );
}
