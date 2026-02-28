import { GameShell } from "./game-shell";
import { ListChecks } from "lucide-react";

export default function SortingGame(props: any) {
  return (
    <GameShell title="Sorting Game" icon={<ListChecks />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Sorting Game coming soon!</div>
    </GameShell>
  );
}
