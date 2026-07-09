import { useCallback, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { getBackTarget } from "./backNavigation";
import { useDpadGamepadNavigation } from "./gamepadNavigation";

/**
 * Wires up "back" for TV remotes: Escape/Backspace on a keyboard (how most
 * TV browsers report a hardware back button) and the gamepad's Backspace
 * button (buttons[1] per the controller's firmware spec) both navigate to
 * the previous screen per `getBackTarget`. Direction and confirm input are
 * handled separately by the spatial navigation library itself (see
 * gamepadNavigation.ts and FocusableButton).
 */
export function useBackNavigation() {
  const view = useGameStore((state) => state.view);
  const setSetupStep = useGameStore((state) => state.setSetupStep);
  const setView = useGameStore((state) => state.setView);

  const goBack = useCallback(() => {
    const target = getBackTarget(view);
    if (!target) return;
    if (view === "race" && target === "setup") setSetupStep("players");
    setView(target);
  }, [view, setSetupStep, setView]);

  useDpadGamepadNavigation(goBack);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Backspace") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);
}
