import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import type { BoatId } from "../types";

const BOAT_ORDER: BoatId[] = ["red", "blue", "green", "yellow"];
const STEERING_AXIS = 0;
const AXIS_DEADZONE = 0.05;
const GAMEPAD_STEERING_SENSITIVITY = 1.6;

export function gamepadAxisToRudder(axisValue: number | undefined) {
  if (axisValue === undefined || Math.abs(axisValue) < AXIS_DEADZONE) return 0;
  return Math.max(-1, Math.min(1, axisValue * GAMEPAD_STEERING_SENSITIVITY));
}

export function useGamepadControls() {
  const setControl = useGameStore((state) => state.setControl);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const lastRudderRef = useRef<Record<BoatId, number>>({ red: 0, blue: 0, green: 0, yellow: 0 });

  useEffect(() => {
    let frame = 0;

    const poll = () => {
      const gamepads = navigator.getGamepads?.() ?? [];
      const connected = Array.from(gamepads).filter((item): item is Gamepad => Boolean(item?.connected));

      activeBoatIds.forEach((boatId, index) => {
        const channel = BOAT_ORDER.indexOf(boatId);
        const gamepad = connected[index];
        const rudder = gamepadAxisToRudder(gamepad?.axes[STEERING_AXIS] ?? connected[0]?.axes[channel]);

        if (rudder !== lastRudderRef.current[boatId]) {
          lastRudderRef.current = { ...lastRudderRef.current, [boatId]: rudder };
          setControl(boatId, { rudder });
        }
      });

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [activeBoatIds, setControl]);
}
