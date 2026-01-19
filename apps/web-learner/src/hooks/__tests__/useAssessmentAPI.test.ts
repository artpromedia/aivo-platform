import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssessmentAPI } from '../useAssessmentAPI';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-session' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAssessmentAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('startAssessment', () => {
    it('initializes a new assessment session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'api-session-123',
          startedAt: new Date().toISOString(),
          currentPhase: 'learning_style',
        }),
      });

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        const response = await result.current.startAssessment({
          type: 'baseline',
          learnerId: 'learner-123',
        });

        expect(response.session).toBeDefined();
        expect(response.session.type).toBe('baseline');
        expect(response.session.learnerId).toBe('learner-123');
      });

      expect(result.current.session).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('falls back to local session when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        const response = await result.current.startAssessment({
          type: 'baseline',
          learnerId: 'learner-456',
        });

        expect(response.session).toBeDefined();
        expect(response.session.learnerId).toBe('learner-456');
      });
    });

    it('sets loading state during request', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: false }), 100))
      );

      const { result } = renderHook(() => useAssessmentAPI());

      expect(result.current.loading).toBe(false);

      const startPromise = act(async () => {
        await result.current.startAssessment({
          type: 'baseline',
          learnerId: 'learner-789',
        });
      });

      // Loading should be true during request
      await waitFor(() => expect(result.current.loading).toBe(true));

      await startPromise;

      // Loading should be false after request
      expect(result.current.loading).toBe(false);
    });
  });

  describe('fetchDomainQuestions', () => {
    it('fetches questions from API', async () => {
      const mockQuestions = [
        { id: 'q1', domain: 'MATH', questionText: 'What is 2+2?', options: ['3', '4', '5', '6'] },
        { id: 'q2', domain: 'MATH', questionText: 'What is 3+3?', options: ['5', '6', '7', '8'] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        const questions = await result.current.fetchDomainQuestions('MATH', 2);
        expect(questions).toHaveLength(2);
        expect(questions[0].domain).toBe('MATH');
      });

      expect(result.current.currentQuestions).toHaveLength(2);
    });

    it('returns stub questions when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        const questions = await result.current.fetchDomainQuestions('MATH', 5);
        expect(questions).toHaveLength(5);
        expect(questions[0].domain).toBe('MATH');
      });
    });

    it('generates stub questions for all domains', async () => {
      mockFetch.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useAssessmentAPI());

      const domains = ['MATH', 'ELA', 'SPEECH', 'SEL', 'SPELLING', 'CREATIVE_WRITING', 'LIFE_SKILLS'] as const;

      for (const domain of domains) {
        await act(async () => {
          const questions = await result.current.fetchDomainQuestions(domain, 5);
          expect(questions).toHaveLength(5);
          expect(questions.every((q) => q.domain === domain)).toBe(true);
        });
      }
    });
  });

  describe('submitAnswer', () => {
    it('requires an active session', async () => {
      const { result } = renderHook(() => useAssessmentAPI());

      await expect(
        act(async () => {
          await result.current.submitAnswer('q1', 2, 5000);
        })
      ).rejects.toThrow('No active assessment session');
    });

    it('submits answer to API and Supabase', async () => {
      // Start a session first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          startedAt: new Date().toISOString(),
        }),
      });

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        await result.current.startAssessment({
          type: 'baseline',
          learnerId: 'learner-123',
        });
      });

      // Mock answer submission
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isCorrect: true, feedback: 'Great job!' }),
      });

      await act(async () => {
        const response = await result.current.submitAnswer('q1', 2, 3500);
        expect(response.isCorrect).toBe(true);
      });
    });
  });

  describe('completeAssessment', () => {
    it('requires an active session', async () => {
      const { result } = renderHook(() => useAssessmentAPI());

      await expect(
        act(async () => {
          await result.current.completeAssessment();
        })
      ).rejects.toThrow('No active assessment session');
    });

    it('generates results when API is unavailable', async () => {
      // Start a session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-456',
          startedAt: new Date().toISOString(),
        }),
      });

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        await result.current.startAssessment({
          type: 'baseline',
          learnerId: 'learner-456',
        });
      });

      // Mock API failure for completion
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      await act(async () => {
        const response = await result.current.completeAssessment();
        expect(response.results).toBeDefined();
        expect(response.results.domainScores).toBeDefined();
        expect(response.results.overallProficiency).toBeDefined();
      });
    });
  });

  describe('resetAssessment', () => {
    it('clears all state', async () => {
      // Start a session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-789',
          startedAt: new Date().toISOString(),
        }),
      });

      const { result } = renderHook(() => useAssessmentAPI());

      await act(async () => {
        await result.current.startAssessment({
          type: 'baseline',
          learnerId: 'learner-789',
        });
      });

      expect(result.current.session).toBeDefined();

      act(() => {
        result.current.resetAssessment();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.currentQuestions).toHaveLength(0);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});
