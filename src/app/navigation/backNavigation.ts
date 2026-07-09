import type { AppView } from "../../game/types";

const BACK_TARGET: Partial<Record<AppView, AppView>> = {
  intro: "home",
  lessons: "home",
  lessonBoat: "lessons",
  lessonWind: "lessons",
  lessonRules: "lessons",
  lessonRaceFlow: "lessons",
  setup: "home",
  results: "home",
  race: "setup"
};

/** Where the TV remote/gamepad "back" button should take you, if anywhere. */
export function getBackTarget(view: AppView): AppView | undefined {
  return BACK_TARGET[view];
}
