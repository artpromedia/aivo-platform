import { GameShell } from "./game-shell";
import { MoveRight } from "lucide-react";

export default function MazeRunnerGame(props: any) {
  return (
    <GameShell title="Maze Runner" icon={<MoveRight />} timeLimit={60} onComplete={props.onComplete}>
      <div className="text-center py-8">Maze Runner Game coming soon!</div>
    </GameShell>
  );
}
