import { GameShell } from "./game-shell";
import { SpellCheck } from "lucide-react";

export default function WordScrambleGame(props: any) {
  return (
    <GameShell title="Word Scramble" icon={<SpellCheck />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Word Scramble Game coming soon!</div>
    </GameShell>
  );
}
