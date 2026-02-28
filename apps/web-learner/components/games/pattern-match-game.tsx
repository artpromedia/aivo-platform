import { GameShell } from "./game-shell";
import { Shapes } from "lucide-react";

export default function PatternMatchGame(props: any) {
  return (
    <GameShell title="Pattern Match" icon={<Shapes />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Pattern Match Game coming soon!</div>
    </GameShell>
  );
}
