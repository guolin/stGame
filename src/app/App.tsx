import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";
import { IntroScreen } from "./IntroScreen";
import { ResultsScreen } from "./ResultsScreen";
import { SetupScreen } from "./SetupScreen";
import { LessonBoatScreen } from "../lessons/LessonBoatScreen";
import { LessonMenuScreen } from "../lessons/LessonMenuScreen";
import { LessonRaceFlowScreen } from "../lessons/LessonRaceFlowScreen";
import { LessonRulesScreen } from "../lessons/LessonRulesScreen";
import { LessonWindScreen } from "../lessons/LessonWindScreen";
import { useGameStore } from "../store/gameStore";
import "./navigation/spatialNavigation";
import { useBackNavigation } from "./navigation/useBackNavigation";
import "../styles.css";

export function App() {
  const view = useGameStore((state) => state.view);

  useBackNavigation();

  if (view === "race") return <GameScreen />;
  if (view === "setup") return <SetupScreen />;
  if (view === "results") return <ResultsScreen />;
  if (view === "lessons") return <LessonMenuScreen />;
  if (view === "lessonBoat") return <LessonBoatScreen />;
  if (view === "lessonWind") return <LessonWindScreen />;
  if (view === "lessonRules") return <LessonRulesScreen />;
  if (view === "lessonRaceFlow") return <LessonRaceFlowScreen />;
  if (view === "intro") return <IntroScreen />;
  return <HomeScreen />;
}
