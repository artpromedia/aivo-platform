/**
 * Gamification Hooks
 *
 * React hooks for gamification data
 */

import type {
  PlayerProfile,
  DailyProgress,
  Achievement,
  Streak,
  StreakDay,
  Challenge,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardPeriod,
  ShopItem,
  XPTransaction,
} from '@aivo/ts-types/gamification.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/gamification';

/** API response wrapper for type-safe JSON parsing */
interface ApiResponse<T> {
  data: T;
  success?: boolean;
  error?: string;
}

async function fetchJson<T>(url: string, init?: globalThis.RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

// ============================================================================
// PROFILE HOOKS
// ============================================================================

export function usePlayerProfile() {
  return useQuery<PlayerProfile>({
    queryKey: ['gamification', 'profile'],
    queryFn: () => fetchJson<PlayerProfile>(`${API_BASE}/profile`),
    staleTime: 30_000, // 30 seconds
  });
}

export function useDailyProgress() {
  return useQuery<DailyProgress>({
    queryKey: ['gamification', 'daily-progress'],
    queryFn: () => fetchJson<DailyProgress>(`${API_BASE}/daily-progress`),
    staleTime: 10_000, // 10 seconds
  });
}

export function useXPHistory(limit = 20) {
  return useQuery<XPTransaction[]>({
    queryKey: ['gamification', 'xp-history', limit],
    queryFn: () => fetchJson<XPTransaction[]>(`${API_BASE}/xp/history?limit=${limit}`),
  });
}

// ============================================================================
// ACHIEVEMENT HOOKS
// ============================================================================

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: ['gamification', 'achievements'],
    queryFn: () => fetchJson<Achievement[]>(`${API_BASE}/achievements`),
    staleTime: 60_000, // 1 minute
  });
}

export function useAchievementCategories() {
  return useQuery<string[]>({
    queryKey: ['gamification', 'achievement-categories'],
    queryFn: () => fetchJson<string[]>(`${API_BASE}/achievements/categories/list`),
  });
}

export function useRecentAchievements(limit = 5) {
  return useQuery<Achievement[]>({
    queryKey: ['gamification', 'recent-achievements', limit],
    queryFn: () => fetchJson<Achievement[]>(`${API_BASE}/achievements/recent/list?limit=${limit}`),
  });
}

// ============================================================================
// STREAK HOOKS
// ============================================================================

export function useStreak() {
  return useQuery<Streak>({
    queryKey: ['gamification', 'streak'],
    queryFn: () => fetchJson<Streak>(`${API_BASE}/streaks`),
    staleTime: 30_000,
  });
}

export function useStreakCalendar(year?: number, month?: number) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<StreakDay[]>({
    queryKey: ['gamification', 'streak-calendar', year, month],
    queryFn: () => {
      const params = new URLSearchParams({ timezone });
      if (year) params.set('year', year.toString());
      if (month) params.set('month', month.toString());
      return fetchJson<StreakDay[]>(`${API_BASE}/streaks/calendar?${params}`);
    },
  });
}

export function useStreakFreeze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date?: string) => {
      const res = await fetch(`${API_BASE}/streaks/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'streak'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'profile'] });
    },
  });
}

// ============================================================================
// CHALLENGE HOOKS
// ============================================================================

export function useChallenges() {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges'],
    queryFn: () => fetchJson<Challenge[]>(`${API_BASE}/challenges`),
    staleTime: 30_000,
  });
}

export function useDailyChallenges() {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges', 'daily'],
    queryFn: () => fetchJson<Challenge[]>(`${API_BASE}/challenges/daily`),
    staleTime: 30_000,
  });
}

export function useWeeklyChallenges() {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges', 'weekly'],
    queryFn: () => fetchJson<Challenge[]>(`${API_BASE}/challenges/weekly`),
  });
}

export function useClassChallenges(classId: string) {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges', 'class', classId],
    queryFn: () => fetchJson<Challenge[]>(`${API_BASE}/challenges/class/${classId}`),
    enabled: !!classId,
  });
}

// ============================================================================
// LEADERBOARD HOOKS
// ============================================================================

export function useLeaderboard(
  scope: LeaderboardScope = 'class',
  period: LeaderboardPeriod = 'weekly',
  scopeId?: string
) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['gamification', 'leaderboard', scope, period, scopeId],
    queryFn: () => {
      const params = new URLSearchParams({ scope, period });
      if (scopeId) {
        if (scope === 'school') params.set('schoolId', scopeId);
        if (scope === 'class') params.set('classId', scopeId);
      }
      return fetchJson<LeaderboardEntry[]>(`${API_BASE}/leaderboards?${params}`);
    },
    staleTime: 60_000,
  });
}

interface PlayerRankInfo {
  rank: number;
  xp: number;
  total: number;
}

export function usePlayerRank(
  scope: LeaderboardScope = 'class',
  period: LeaderboardPeriod = 'weekly',
  scopeId?: string
) {
  return useQuery<PlayerRankInfo>({
    queryKey: ['gamification', 'rank', scope, period, scopeId],
    queryFn: () => {
      const params = new URLSearchParams({ scope, period });
      if (scopeId) {
        if (scope === 'school') params.set('schoolId', scopeId);
        if (scope === 'class') params.set('classId', scopeId);
      }
      return fetchJson<PlayerRankInfo>(`${API_BASE}/leaderboards/rank?${params}`);
    },
  });
}

export function useTop3(scope: LeaderboardScope = 'class', period: LeaderboardPeriod = 'weekly') {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['gamification', 'top3', scope, period],
    queryFn: () =>
      fetchJson<LeaderboardEntry[]>(
        `${API_BASE}/leaderboards/top3?scope=${scope}&period=${period}`
      ),
  });
}

// ============================================================================
// SHOP HOOKS
// ============================================================================

interface ShopData {
  categories: string[];
  items: ShopItem[];
}

export function useShop() {
  return useQuery<ShopData>({
    queryKey: ['gamification', 'shop'],
    queryFn: () => fetchJson<ShopData>(`${API_BASE}/shop`),
  });
}

export function useInventory() {
  return useQuery<ShopItem[]>({
    queryKey: ['gamification', 'inventory'],
    queryFn: () => fetchJson<ShopItem[]>(`${API_BASE}/shop/inventory`),
  });
}

interface EquippedItems {
  avatar?: string;
  theme?: string;
  badge?: string;
}

export function useEquippedItems() {
  return useQuery<EquippedItems>({
    queryKey: ['gamification', 'equipped'],
    queryFn: () => fetchJson<EquippedItems>(`${API_BASE}/shop/equipped`),
  });
}

export function usePurchaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`${API_BASE}/shop/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'shop'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'profile'] });
    },
  });
}

export function useEquipItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, slot }: { itemId: string; slot: string }) => {
      const res = await fetch(`${API_BASE}/shop/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, slot }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'equipped'] });
    },
  });
}
