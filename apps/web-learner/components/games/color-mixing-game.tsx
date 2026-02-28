import { GameShell } from "./game-shell";
import { Palette } from "lucide-react";

export default function ColorMixingGame(props: any) {
  return (
    <GameShell title="Color Mixing" icon={<Palette />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Color Mixing Game coming soon!</div>
    </GameShell>
  );
}
