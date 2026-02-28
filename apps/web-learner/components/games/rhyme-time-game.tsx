import { GameShell } from "./game-shell";
import { Mic2 } from "lucide-react";

export default function RhymeTimeGame(props: any) {
  return (
    <GameShell title="Rhyme Time" icon={<Mic2 />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Rhyme Time Game coming soon!</div>
    </GameShell>
  );
}
