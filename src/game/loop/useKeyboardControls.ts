import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import type { BoatId } from "../types";

const keyMap: Record<string, { boat: BoatId; rudder: -1 | 1 }> = {
  KeyA: { boat: "red", rudder: -1 },
  KeyD: { boat: "red", rudder: 1 },
  ArrowLeft: { boat: "green", rudder: -1 },
  ArrowRight: { boat: "green", rudder: 1 },
  KeyJ: { boat: "yellow", rudder: -1 },
  KeyL: { boat: "yellow", rudder: 1 },
  Numpad4: { boat: "blue", rudder: -1 },
  Numpad6: { boat: "blue", rudder: 1 }
};

export function useKeyboardControls() {
  const setControl = useGameStore((state) => state.setControl);
  const togglePause = useGameStore((state) => state.togglePause);
  const lastRudderRef = useRef<Record<BoatId, number>>({ red: 0, blue: 0, green: 0, yellow: 0 });

  useEffect(() => {
    const downKeys = new Set<string>();

    const readRudder = (boat: BoatId) => {
      const rudder = Object.entries(keyMap).reduce<number>((next, [code, mapping]) => {
        if (mapping.boat !== boat || !downKeys.has(code)) return next;
        return mapping.rudder;
      }, 0);
      return rudder;
    };

    const updateRudder = (boat: BoatId, rudder = readRudder(boat)) => {
      if (rudder === lastRudderRef.current[boat]) return;
      lastRudderRef.current = { ...lastRudderRef.current, [boat]: rudder };
      setControl(boat, { rudder });
    };

    let frame = 0;
    const pollHeldKeys = () => {
      (["red", "green", "yellow", "blue"] as BoatId[]).forEach((boat) => updateRudder(boat));
      frame = requestAnimationFrame(pollHeldKeys);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) event.preventDefault();
      if (event.code === "Space") {
        event.preventDefault();
        togglePause();
        return;
      }
      const mapping = keyMap[event.code];
      if (!mapping) return;
      event.preventDefault();
      downKeys.add(event.code);
      updateRudder(mapping.boat);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const mapping = keyMap[event.code];
      if (!mapping) return;
      event.preventDefault();
      downKeys.delete(event.code);
      updateRudder(mapping.boat);
    };

    const handleBlur = () => {
      downKeys.clear();
      (["red", "green", "yellow", "blue"] as BoatId[]).forEach((boat) => updateRudder(boat, 0));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    frame = requestAnimationFrame(pollHeldKeys);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [setControl, togglePause]);
}
