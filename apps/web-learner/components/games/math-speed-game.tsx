import { GameShell } from "./game-shell";
import { Calculator } from "lucide-react";

export default function MathSpeedGame(props: any) {
  // Placeholder: implement core mechanic
  return (
    <GameShell title="Math Speed Game" icon={<Calculator />} timeLimit={60} onComplete={props.onComplete}>
      {/* ...existing code... */}
      <div className="text-center py-8">Math Speed Game coming soon!</div>
    </GameShell>
  );
}
