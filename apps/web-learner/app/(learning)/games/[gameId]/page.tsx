"use client";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import MathSpeedGame from "../../../components/games/math-speed-game";
import WordScrambleGame from "../../../components/games/word-scramble-game";
import PatternMatchGame from "../../../components/games/pattern-match-game";
import MemoryCardsGame from "../../../components/games/memory-cards-game";
import SortingGame from "../../../components/games/sorting-game";
import ColorMixingGame from "../../../components/games/color-mixing-game";
import MazeRunnerGame from "../../../components/games/maze-runner-game";
import RhymeTimeGame from "../../../components/games/rhyme-time-game";
import BreathingExerciseGame from "../../../components/games/breathing-exercise-game";

const GAME_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "math-speed": MathSpeedGame,
  "word-scramble": WordScrambleGame,
  "pattern-match": PatternMatchGame,
  "memory-cards": MemoryCardsGame,
  "sorting": SortingGame,
  "color-mixing": ColorMixingGame,
  "maze-runner": MazeRunnerGame,
  "rhyme-time": RhymeTimeGame,
  "breathing": BreathingExerciseGame,
};

export default function GamePlayerPage() {
  const { gameId } = useParams();
  const router = useRouter();
  const GameComponent = typeof gameId === "string" ? GAME_COMPONENTS[gameId] : undefined;

  if (!GameComponent) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
        <p className="mb-6">Sorry, that game does not exist.</p>
        <button
          className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          onClick={() => router.push("/games")}
        >
          Back to Games
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="py-16 text-center">Loading game…</div>}>
      <GameComponent />
    </Suspense>
  );
}
