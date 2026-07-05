import { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import type { BoatId } from "../types";

const keyMap: Record<string, { boat: BoatId; rudder: -1 | 1 }> = {
  KeyA: { boat: "red", rudder: -1 },
  KeyD: { boat: "red", rudder: 1 },
  ArrowLeft: { boat: "blue", rudder: -1 },
  ArrowRight: { boat: "blue", rudder: 1 },
  KeyJ: { boat: "green", rudder: -1 },
  KeyL: { boat: "green", rudder: 1 },
  Numpad4: { boat: "yellow", rudder: -1 },
  Numpad6: { boat: "yellow", rudder: 1 }
};

export function useKeyboardControls() {
  const setControl = useGameStore((state) => state.setControl);
  const togglePause = useGameStore((state) => state.togglePause);
  const toggleHud = useGameStore((state) => state.toggleHud);
  const restart = useGameStore((state) => state.restart);

  useEffect(() => {
    const downKeys = new Set<string>();

    const updateRudder = (boat: BoatId) => {
      const rudder = Object.entries(keyMap).reduce<number>((next, [code, mapping]) => {
        if (mapping.boat !== boat || !downKeys.has(code)) return next;
        return mapping.rudder;
      }, 0);
      setControl(boat, { rudder });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        togglePause();
        return;
      }
      if (event.code === "KeyR") {
        restart();
        return;
      }
      if (event.code === "KeyH") {
        toggleHud();
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [restart, setControl, toggleHud, togglePause]);
}
