import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import type { BoatId } from "../types";
import { DEFAULT_GAMEPAD_STEERING, gamepadSteeringResponse } from "./gamepadTuning";
import type { GamepadSteeringSettings } from "./gamepadTuning";

const BOAT_ORDER: BoatId[] = ["red", "green", "yellow", "blue"];
const DIGITAL_RUDDER_RATE_PER_SEC = 7;
const DIGITAL_RUDDER_RETURN_PER_SEC = 4;

export function gamepadAxisToRudder(axisValue: number | undefined, settings: GamepadSteeringSettings = DEFAULT_GAMEPAD_STEERING) {
  if (axisValue === undefined) return 0;
  const normalized = normalizeGamepadAxis(axisValue);
  const magnitude = Math.abs(normalized);
  const scaled = gamepadSteeringResponse(magnitude, settings);
  if (scaled === 0) return 0;
  return -Math.sign(normalized) * Math.max(0, Math.min(1, scaled));
}

export function normalizeGamepadAxis(axisValue: number) {
  const raw = Math.max(-100, Math.min(100, axisValue));
  return Math.max(-1, Math.min(1, Math.abs(raw) > 1 ? raw / 100 : raw));
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

export type RudderGamepad = {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
  connected: boolean;
  id?: string;
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
  return (left ? 1 : 0) - (right ? 1 : 0);
}

export function resolveControllerPad(
  pads: readonly RudderGamepad[],
  channel: number,
  activeBoatCount: number
): { pad: RudderGamepad | undefined; localChannel: number } {
  if (pads.length >= activeBoatCount) return { pad: pads[channel], localChannel: 0 };

  const advIndex = Math.floor(channel / 2);
  const localChannel = channel % 2;
  return pads[advIndex] ? { pad: pads[advIndex], localChannel } : { pad: pads[0], localChannel: channel };
}

export function resolveAnalogRudder(
  pads: readonly RudderGamepad[],
  channel: number,
  activeBoatCount: number,
  settings: GamepadSteeringSettings = DEFAULT_GAMEPAD_STEERING
) {
  const { pad, localChannel } = resolveControllerPad(pads, channel, activeBoatCount);
  const axisValue = pad?.axes[localChannel] ?? pads[0]?.axes[channel];
  return gamepadAxisToRudder(axisValue, settings);
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
  const claimHumanControl = useGameStore((state) => state.claimHumanControl);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const gamepadSteering = useGameStore((state) => state.gamepadSteering);
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
        const { pad, localChannel } = resolveControllerPad(connected, channel, activeBoatIds.length);
        const digital = resolveDigitalRudderOverride(pad ?? connected[0], localChannel);
        const analog = resolveAnalogRudder(connected, channel, activeBoatIds.length, gamepadSteering);
        const nextDigitalRudder = stepDigitalRudder(digitalRudderRef.current[boatId], digital, dt);
        digitalRudderRef.current = { ...digitalRudderRef.current, [boatId]: nextDigitalRudder };
        const rudder = Math.abs(nextDigitalRudder) > 0 ? nextDigitalRudder : analog;
        if (digital !== 0 || Math.abs(analog) > 0) claimHumanControl(boatId);

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
  }, [activeBoatIds, claimHumanControl, gamepadSteering, setControl]);
}
