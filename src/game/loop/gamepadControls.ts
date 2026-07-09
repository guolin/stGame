import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import type { BoatId } from "../types";

const BOAT_ORDER: BoatId[] = ["red", "green", "yellow", "blue"];
const STEERING_AXIS = 0;
const AXIS_DEADZONE = 0.02;
const GAMEPAD_STEERING_SENSITIVITY = 2.6;
const DIGITAL_RUDDER_RATE_PER_SEC = 7;
const DIGITAL_RUDDER_RETURN_PER_SEC = 4;

export function gamepadAxisToRudder(axisValue: number | undefined) {
  if (axisValue === undefined || Math.abs(axisValue) < AXIS_DEADZONE) return 0;
  return Math.max(-1, Math.min(1, axisValue * GAMEPAD_STEERING_SENSITIVITY));
}

// Per the "Sailing Tactics Rudder" firmware spec, buttons 3-10 (buttons[2..9])
// are digital left/right nudge commands for a rudder channel with no analog
// Chain Angle module attached: Q/E -> R1 (channel 0), I/P -> R2 (channel 1),
// Z/C -> R3 (channel 2), B/M -> R4 (channel 3). These live on the shared
// 4-channel device (connected[0]), the same one the analog fallback reads.
const DIGITAL_RUDDER_BUTTONS: Record<number, { left: number; right: number }> = {
  0: { left: 2, right: 3 },
  1: { left: 4, right: 5 },
  2: { left: 6, right: 7 },
  3: { left: 8, right: 9 }
};

/** Pure so it can be unit-tested without a real Gamepad object. */
export function resolveDigitalRudderOverride(
  pad: { buttons: readonly { pressed: boolean }[] } | undefined,
  channel: number
): number {
  const mapping = DIGITAL_RUDDER_BUTTONS[channel];
  if (!mapping || !pad) return 0;
  const left = Boolean(pad.buttons[mapping.left]?.pressed);
  const right = Boolean(pad.buttons[mapping.right]?.pressed);
  return (right ? 1 : 0) - (left ? 1 : 0);
}

export function stepDigitalRudder(current: number, direction: number, dt: number): number {
  if (direction !== 0) {
    return Math.max(-1, Math.min(1, current + direction * DIGITAL_RUDDER_RATE_PER_SEC * dt));
  }
  if (Math.abs(current) <= DIGITAL_RUDDER_RETURN_PER_SEC * dt) return 0;
  return current - Math.sign(current) * DIGITAL_RUDDER_RETURN_PER_SEC * dt;
}

export function useGamepadControls() {
  const setControl = useGameStore((state) => state.setControl);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const lastRudderRef = useRef<Record<BoatId, number>>({ red: 0, blue: 0, green: 0, yellow: 0 });
  const digitalRudderRef = useRef<Record<BoatId, number>>({ red: 0, blue: 0, green: 0, yellow: 0 });
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let frame = 0;

    const poll = (time: number) => {
      if (lastTimeRef.current === undefined) lastTimeRef.current = time;
      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;
      const gamepads = navigator.getGamepads?.() ?? [];
      const connected = Array.from(gamepads).filter((item): item is Gamepad => Boolean(item?.connected));

      activeBoatIds.forEach((boatId, index) => {
        const channel = BOAT_ORDER.indexOf(boatId);
        const gamepad = connected[index];
        const digital = resolveDigitalRudderOverride(connected[0], channel);
        const analog = gamepadAxisToRudder(gamepad?.axes[STEERING_AXIS] ?? connected[0]?.axes[channel]);
        const nextDigitalRudder = stepDigitalRudder(digitalRudderRef.current[boatId], digital, dt);
        digitalRudderRef.current = { ...digitalRudderRef.current, [boatId]: nextDigitalRudder };
        const rudder = Math.abs(nextDigitalRudder) > 0 ? nextDigitalRudder : analog;

        if (rudder !== lastRudderRef.current[boatId]) {
          lastRudderRef.current = { ...lastRudderRef.current, [boatId]: rudder };
          setControl(boatId, { rudder });
        }
      });

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => {
      lastTimeRef.current = undefined;
      cancelAnimationFrame(frame);
    };
  }, [activeBoatIds, setControl]);
}
