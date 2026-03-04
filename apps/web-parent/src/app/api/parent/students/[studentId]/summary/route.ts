import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:3000';
const GAMIFICATION_SVC_URL = process.env.GAMIFICATION_SVC_URL || 'http://gamification-svc:3000';

// Category mapping from gamification-svc categories to frontend categories
const CATEGORY_MAP: Record<string, string> = {
  academic: 'learning',
  streak: 'streak',
  mastery: 'mastery',
  social: 'engagement',
  special: 'special',
  exploration: 'learning',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  const authHeader = request.headers.get('Authorization') || '';

  try {
    // Fetch parent-svc summary and gamification-svc dashboard in parallel
    const [summaryRes, gamificationRes] = await Promise.all([
      fetch(`${PARENT_SERVICE_URL}/api/v1/parent/students/${studentId}/summary`, {
        headers: { Authorization: authHeader },
      }),
      fetch(`${GAMIFICATION_SVC_URL}/api/gamification/dashboard`, {
        headers: { Authorization: authHeader, 'x-student-id': studentId },
        signal: AbortSignal.timeout(3000),
      }).catch(() => null),
    ]);

    const summaryData = await summaryRes.json();

    if (!summaryRes.ok) {
      return NextResponse.json(summaryData, { status: summaryRes.status });
    }

    // Parse gamification data (optional — graceful fallback)
    let gamification: {
      streak?: { currentDays: number; longestDays: number; lastActivityDate: string | null };
      achievements?: { earned: any[]; progress: any[] };
    } | null = null;

    if (gamificationRes?.ok) {
      try {
        const gData = await gamificationRes.json();
        gamification = gData.data ?? gData;
      } catch {
        // ignore parse errors
      }
    }

    // Build weeklyActivity from streak/calendar or fallback to daysActive count
    const weeklyActivity = [false, false, false, false, false, false, false];
    if (gamification?.streak) {
      // If the student was active today or recently, fill in recent days based on streak length
      const streakDays = Math.min(gamification.streak.currentDays, 7);
      const today = new Date().getDay(); // 0=Sun
      for (let i = 0; i < streakDays; i++) {
        const dayIdx = (today - i + 7) % 7;
        weeklyActivity[dayIdx] = true;
      }
    }

    // Map gamification achievements to frontend shape
    const achievements: any[] = [];
    if (gamification?.achievements) {
      // Earned achievements
      for (const a of gamification.achievements.earned) {
        achievements.push({
          id: a.id,
          title: a.name,
          description: a.description,
          icon: mapIconUrl(a.iconUrl),
          category: CATEGORY_MAP[a.category] || 'learning',
          rarity: a.rarity,
          earnedAt: a.earnedAt,
        });
      }
      // In-progress achievements (show as locked with progress)
      for (const p of gamification.achievements.progress) {
        achievements.push({
          id: p.achievementId,
          title: p.achievement.name,
          description: p.achievement.description,
          icon: mapIconUrl(p.achievement.iconUrl),
          category: CATEGORY_MAP[p.achievement.category] || 'learning',
          rarity: p.achievement.rarity,
          progress: p.currentValue,
          total: p.targetValue,
        });
      }
    }

    // Merge gamification data into summary response
    const merged = {
      ...summaryData,
      // Frontend-expected fields for StreakWidget
      currentStreak: gamification?.streak?.currentDays ?? summaryData.weeklyStats?.daysActive ?? 0,
      longestStreak: gamification?.streak?.longestDays ?? 0,
      weeklyActivity,
      lastActiveDate: gamification?.streak?.lastActivityDate ?? summaryData.lastActivityAt ?? null,
      // Frontend-expected fields for AchievementBadges
      achievements:
        achievements.length > 0
          ? achievements
          : (summaryData.recentAchievements ?? []).map((a: any) => ({
              id: a.id,
              title: a.name,
              description: a.description || '',
              icon: 'star',
              category: 'learning',
              earnedAt: a.earnedAt,
            })),
    };

    return NextResponse.json(merged);
  } catch (error) {
    console.error('Failed to fetch student summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}

/** Map iconUrl (e.g. "🌟" or URL) to a lucide icon name for the frontend */
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
