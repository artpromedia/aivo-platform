/**
 * Gamification Hooks
 *
 * React hooks for gamification data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const API_BASE = '/api/gamification';

// ============================================================================
// PROFILE HOOKS
// ============================================================================

export function usePlayerProfile() {
  return useQuery<PlayerProfile>({
    queryKey: ['gamification', 'profile'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/profile`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

export function useDailyProgress() {
  return useQuery<DailyProgress>({
    queryKey: ['gamification', 'daily-progress'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/daily-progress`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 10_000, // 10 seconds
  });
}

export function useXPHistory(limit = 20) {
  return useQuery<XPTransaction[]>({
    queryKey: ['gamification', 'xp-history', limit],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/xp/history?limit=${limit}`);
      const data = await res.json();
      return data.data;
    },
  });
}

// ============================================================================
// ACHIEVEMENT HOOKS
// ============================================================================

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: ['gamification', 'achievements'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/achievements`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useAchievementCategories() {
  return useQuery({
    queryKey: ['gamification', 'achievement-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/achievements/categories/list`);
      const data = await res.json();
      return data.data;
    },
  });
}

export function useRecentAchievements(limit = 5) {
  return useQuery<Achievement[]>({
    queryKey: ['gamification', 'recent-achievements', limit],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/achievements/recent/list?limit=${limit}`);
      const data = await res.json();
      return data.data;
    },
  });
}

// ============================================================================
// STREAK HOOKS
// ============================================================================

export function useStreak() {
  return useQuery<Streak>({
    queryKey: ['gamification', 'streak'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/streaks`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useStreakCalendar(year?: number, month?: number) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return useQuery<StreakDay[]>({
    queryKey: ['gamification', 'streak-calendar', year, month],
    queryFn: async () => {
      const params = new URLSearchParams({ timezone });
      if (year) params.set('year', year.toString());
      if (month) params.set('month', month.toString());
      
      const res = await fetch(`${API_BASE}/streaks/calendar?${params}`);
      const data = await res.json();
      return data.data;
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
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/challenges`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useDailyChallenges() {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges', 'daily'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/challenges/daily`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useWeeklyChallenges() {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges', 'weekly'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/challenges/weekly`);
      const data = await res.json();
      return data.data;
    },
  });
}

export function useClassChallenges(classId: string) {
  return useQuery<Challenge[]>({
    queryKey: ['gamification', 'challenges', 'class', classId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/challenges/class/${classId}`);
      const data = await res.json();
      return data.data;
    },
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
    queryFn: async () => {
      const params = new URLSearchParams({ scope, period });
      if (scopeId) {
        if (scope === 'school') params.set('schoolId', scopeId);
        if (scope === 'class') params.set('classId', scopeId);
      }
      
      const res = await fetch(`${API_BASE}/leaderboards?${params}`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function usePlayerRank(
  scope: LeaderboardScope = 'class',
  period: LeaderboardPeriod = 'weekly',
  scopeId?: string
) {
  return useQuery({
    queryKey: ['gamification', 'rank', scope, period, scopeId],
    queryFn: async () => {
      const params = new URLSearchParams({ scope, period });
      if (scopeId) {
        if (scope === 'school') params.set('schoolId', scopeId);
        if (scope === 'class') params.set('classId', scopeId);
      }
      
      const res = await fetch(`${API_BASE}/leaderboards/rank?${params}`);
      const data = await res.json();
      return data.data;
    },
  });
}

export function useTop3(scope: LeaderboardScope = 'class', period: LeaderboardPeriod = 'weekly') {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['gamification', 'top3', scope, period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/leaderboards/top3?scope=${scope}&period=${period}`);
      const data = await res.json();
      return data.data;
    },
  });
}

// ============================================================================
// SHOP HOOKS
// ============================================================================

export function useShop() {
  return useQuery({
    queryKey: ['gamification', 'shop'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shop`);
      const data = await res.json();
      return data.data;
    },
  });
}

export function useInventory() {
  return useQuery<ShopItem[]>({
    queryKey: ['gamification', 'inventory'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shop/inventory`);
      const data = await res.json();
      return data.data;
    },
  });
}

export function useEquippedItems() {
  return useQuery({
    queryKey: ['gamification', 'equipped'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shop/equipped`);
      const data = await res.json();
      return data.data;
    },
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
