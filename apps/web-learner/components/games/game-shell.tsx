import React, { useState, useEffect, useRef } from "react";

interface GameShellProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onComplete: (score: number) => void;
  timeLimit?: number; // seconds, 0 = untimed
}

export function GameShell({ title, icon, children, onComplete, timeLimit = 0 }: GameShellProps) {
  const [timer, setTimer] = useState(timeLimit);
  const [running, setRunning] = useState(timeLimit > 0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeLimit > 0 && running && !completed) {
      intervalRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            setRunning(false);
            setCompleted(true);
            onComplete(score);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [running, completed, timeLimit, score, onComplete]);

  const handleComplete = (finalScore: number) => {
    setScore(finalScore);
    setCompleted(true);
    setRunning(false);
    onComplete(finalScore);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">{icon}</div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      {timeLimit > 0 && (
        <div className="mb-4 text-sm text-gray-500">Time left: <span className="font-semibold text-indigo-600">{timer}s</span></div>
      )}
      <div>{React.cloneElement(children as React.ReactElement, { onComplete: handleComplete, running: running && !completed, score })}</div>
      {completed && (
        <div className="mt-8 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">+XP!</div>
          <div className="mb-4">Score: <span className="font-semibold">{score}</span></div>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 mr-2" onClick={() => window.location.reload()}>Play Again</button>
          <button className="px-5 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={() => window.location.href = "/games"}>Back to Games</button>
        </div>
      )}
    </div>
  );
}
