import { NextRequest, NextResponse } from "next/server";

// POST /api/games/complete
// Body: { gameId, score, timeSpent, difficulty }
// Proxies to gamification-svc: POST /api/gamification/record-event
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { gameId, score, timeSpent, difficulty } = body;

  // Proxy to gamification-svc
  const GAMIFICATION_URL = process.env.GAMIFICATION_SVC_URL || "http://localhost:3460";
  const res = await fetch(`${GAMIFICATION_URL}/api/gamification/record-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "game_complete",
      gameId,
      score,
      timeSpent,
      difficulty,
      timestamp: Date.now(),
    }),
  });

  const result = await res.json();
  return NextResponse.json(result);
}
