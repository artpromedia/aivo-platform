import { GameShell } from "./game-shell";
import { Wind } from "lucide-react";

export default function BreathingExerciseGame(props: any) {
  return (
    <GameShell title="Breathing Exercise" icon={<Wind />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Breathing Exercise Game coming soon!</div>
    </GameShell>
  );
}
