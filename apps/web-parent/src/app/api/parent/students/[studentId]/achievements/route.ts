import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const GAMIFICATION_SVC_URL = process.env.GAMIFICATION_SVC_URL || 'http://gamification-svc:3000';
const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:3000';

// Category mapping from gamification-svc categories to frontend categories
const CATEGORY_MAP: Record<string, string> = {
  academic: 'learning',
  streak: 'streak',
  mastery: 'mastery',
  social: 'engagement',
  special: 'special',
  exploration: 'learning',
};

// ---------- Response shapes from gamification-svc ----------
interface GamificationAchievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string | null;
  category: string;
  rarity?: string;
  earnedAt?: string;
}

interface GamificationProgress {
  achievementId: string;
  achievement: GamificationAchievement;
  currentValue: number;
  targetValue: number;
  percentage: number;
}

interface GamificationAchievementsResponse {
  success: boolean;
  data: {
    earned: GamificationAchievement[];
    progress: GamificationProgress[];
  };
}

interface ParentAchievement {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  iconUrl?: string | null;
  earnedAt?: string;
}

/** Map iconUrl (emoji or URL) to a lucide icon name for the frontend */
function mapIconUrl(iconUrl?: string | null): string {
  if (!iconUrl) return 'star';
  const emojiMap: Record<string, string> = {
    '🌟': 'star',
    '⭐': 'star',
    '🏆': 'trophy',
    '🎯': 'target',
    '⚡': 'zap',
    '📚': 'book',
    '🧠': 'brain',
    '❤️': 'heart',
    '🏅': 'award',
    '🔥': 'zap',
    '💪': 'trophy',
    '🎓': 'award',
    '👑': 'trophy',
    '💎': 'star',
    '🌍': 'target',
    '🤝': 'heart',
  };
  return emojiMap[iconUrl] || 'star';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  const authHeader = request.headers.get('Authorization') || '';

  try {
    // Try gamification-svc first, fall back to parent-svc
    const gamificationRes = await fetch(`${GAMIFICATION_SVC_URL}/api/gamification/achievements`, {
      headers: { Authorization: authHeader, 'x-student-id': studentId },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (gamificationRes?.ok) {
      const gData = (await gamificationRes.json()) as GamificationAchievementsResponse;
      const data = gData.data;

      const achievements = [
        // Earned achievements
        ...data.earned.map((a) => ({
          id: a.id,
          title: a.name,
          description: a.description,
          icon: mapIconUrl(a.iconUrl),
          category: CATEGORY_MAP[a.category] || 'learning',
          rarity: a.rarity,
          earnedAt: a.earnedAt,
        })),
        // In-progress achievements (locked with progress bar)
        ...data.progress.map((p) => ({
          id: p.achievementId,
          title: p.achievement.name,
          description: p.achievement.description,
          icon: mapIconUrl(p.achievement.iconUrl),
          category: CATEGORY_MAP[p.achievement.category] || 'learning',
          rarity: p.achievement.rarity,
          progress: p.currentValue,
          total: p.targetValue,
        })),
      ];

      return NextResponse.json({ achievements });
    }

    // Fallback: proxy to parent-svc
    const parentRes = await fetch(
      `${PARENT_SERVICE_URL}/api/v1/parent/students/${studentId}/achievements`,
      { headers: { Authorization: authHeader } }
    );
    const parentData = (await parentRes.json()) as { achievements?: ParentAchievement[] };

    // Map parent-svc shape to frontend shape
    const achievements = (parentData.achievements ?? []).map((a) => ({
      id: a.id,
      title: a.name || a.title || '',
      description: a.description || '',
      icon: mapIconUrl(a.iconUrl),
      category: 'learning' as const,
      earnedAt: a.earnedAt,
    }));

    return NextResponse.json({ achievements }, { status: parentRes.status });
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    return NextResponse.json({ achievements: [] }, { status: 200 });
  }
}
