import { GameShell } from "./game-shell";
import { Cards } from "lucide-react";

export default function MemoryCardsGame(props: any) {
  return (
    <GameShell title="Memory Cards" icon={<Cards />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Memory Cards Game coming soon!</div>
    </GameShell>
  );
}
