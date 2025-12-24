/**
 * useStudentRisk Hook
 *
 * React hook for fetching and managing student risk predictions.
 * Integrates with the predictive analytics API and provides real-time updates.
 *
 * Features:
 * - Fetch individual student risk predictions
 * - Batch predictions for classrooms
 * - Intervention management
 * - Real-time updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useWebSocket } from './use-websocket';

// ============================================================================
// Types
// ============================================================================

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type RiskTrend = 'increasing' | 'stable' | 'decreasing';
export type InterventionStatus =
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RiskFactor {
  feature: string;
  category: 'academic' | 'engagement' | 'behavioral' | 'temporal';
  description: string;
  currentValue: number | string;
  contribution: number;
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface ProtectiveFactor {
  feature: string;
  category: string;
  description: string;
  currentValue: number | string;
  contribution: number;
}

export interface RiskPrediction {
  studentId: string;
  timestamp: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  categoryScores: {
    academic: number;
    engagement: number;
    behavioral: number;
    temporal: number;
  };
  topRiskFactors: RiskFactor[];
  protectiveFactors: ProtectiveFactor[];
  riskTrend: RiskTrend;
  previousRiskScore?: number;
  scoreChange?: number;
  modelVersion: string;
}

export interface InterventionRecommendation {
  interventionId: string;
  name: string;
  type: string;
  intensity: 'light' | 'moderate' | 'intensive';
  urgency: 'immediate' | 'short_term' | 'medium_term';
  relevanceScore: number;
  expectedEffectiveness: number;
  confidence: number;
  targetRiskFactors: string[];
  rationale: string;
  implementationNotes: string;
  estimatedDurationDays: number;
  requiresParentConsent: boolean;
  requiresEducatorApproval: boolean;
  successIndicators: string[];
}

export interface InterventionPlan {
  studentId: string;
  createdAt: string;
  riskLevel: RiskLevel;
  primaryRecommendations: InterventionRecommendation[];
  secondaryRecommendations: InterventionRecommendation[];
  excludedInterventions: { interventionId: string; name: string; reason: string }[];
  reviewDate: string;
  notes: string;
  requiresImmediateAction: boolean;
  educatorApprovalRequired: boolean;
}

export interface ClassroomRiskSummary {
  classroomId: string;
  totalStudents: number;
  riskDistribution: Record<RiskLevel, number>;
  averageRiskScore: number;
  studentsNeedingAttention: number;
  trendImproving: number;
  trendWorsening: number;
}

export interface StudentRiskWithInterventions {
  prediction: RiskPrediction;
  interventions?: InterventionPlan;
}

// ============================================================================
// API Client Functions
// ============================================================================

const API_BASE = '/api/ml-recommendation/predictive-analytics';

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const existingHeaders =
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : Array.isArray(options.headers)
        ? Object.fromEntries(options.headers)
        : (options.headers ?? {});

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...existingHeaders,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData: { message?: string } = await response
      .json()
      .catch(() => ({ message: undefined }));
    throw new Error(errorData.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function predictStudentRisk(
  studentId: string,
  includeInterventions = true,
  context?: Record<string, unknown>
): Promise<StudentRiskWithInterventions> {
  return fetchWithAuth<StudentRiskWithInterventions>(`${API_BASE}/risk/predict`, {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentId,
      include_interventions: includeInterventions,
      context,
    }),
  });
}

async function predictBatchRisk(
  studentIds: string[],
  includeInterventions = false
): Promise<RiskPrediction[]> {
  return fetchWithAuth<RiskPrediction[]>(`${API_BASE}/risk/predict/batch`, {
    method: 'POST',
    body: JSON.stringify({
      student_ids: studentIds,
      include_interventions: includeInterventions,
    }),
  });
}

async function getClassroomRiskSummary(classroomId: string): Promise<ClassroomRiskSummary> {
  return fetchWithAuth<ClassroomRiskSummary>(`${API_BASE}/risk/classroom/${classroomId}`);
}

async function approveIntervention(
  studentId: string,
  interventionId: string,
  notes?: string
): Promise<{ status: string; approvedAt: string }> {
  return fetchWithAuth(`${API_BASE}/interventions/${studentId}/approve/${interventionId}`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

// ============================================================================
// useStudentRisk Hook
// ============================================================================

export interface UseStudentRiskOptions {
  studentId?: string;
  autoFetch?: boolean;
  refreshInterval?: number; // in milliseconds
  includeInterventions?: boolean;
  context?: Record<string, unknown>;
  onRiskChange?: (prediction: RiskPrediction) => void;
}

export interface UseStudentRiskResult {
  prediction: RiskPrediction | null;
  interventions: InterventionPlan | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  approveIntervention: (interventionId: string, notes?: string) => Promise<void>;
  isApproving: boolean;
}

export function useStudentRisk(options: UseStudentRiskOptions = {}): UseStudentRiskResult {
  const {
    studentId,
    autoFetch = true,
    refreshInterval,
    includeInterventions = true,
    context,
    onRiskChange,
  } = options;

  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [interventions, setInterventions] = useState<InterventionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const previousRiskLevel = useRef<RiskLevel | null>(null);

  // Fetch risk prediction
  const refetch = useCallback(async () => {
    if (!studentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await predictStudentRisk(studentId, includeInterventions, context);

      setPrediction(result.prediction);
      if (result.interventions) {
        setInterventions(result.interventions);
      }

      // Check for risk level change
      if (
        onRiskChange &&
        previousRiskLevel.current !== null &&
        previousRiskLevel.current !== result.prediction.riskLevel
      ) {
        onRiskChange(result.prediction);
      }
      previousRiskLevel.current = result.prediction.riskLevel;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch risk'));
    } finally {
      setIsLoading(false);
    }
  }, [studentId, includeInterventions, context, onRiskChange]);

  // Auto-fetch on mount and studentId change
  useEffect(() => {
    if (autoFetch && studentId) {
      void refetch();
    }
  }, [autoFetch, studentId, refetch]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval || !studentId) return;

    const interval = setInterval(() => {
      void refetch();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [refreshInterval, studentId, refetch]);

  // Approve intervention
  const handleApproveIntervention = useCallback(
    async (interventionId: string, notes?: string) => {
      if (!studentId) return;

      setIsApproving(true);
      try {
        await approveIntervention(studentId, interventionId, notes);
        // Refetch to get updated intervention status
        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to approve'));
        throw err;
      } finally {
        setIsApproving(false);
      }
    },
    [studentId, refetch]
  );

  return {
    prediction,
    interventions,
    isLoading,
    error,
    refetch,
    approveIntervention: handleApproveIntervention,
    isApproving,
  };
}

// ============================================================================
// useClassroomRisk Hook
// ============================================================================

export interface UseClassroomRiskOptions {
  classroomId?: string;
  autoFetch?: boolean;
  refreshInterval?: number;
  onHighRiskStudent?: (studentId: string, level: RiskLevel) => void;
}

export interface UseClassroomRiskResult {
  summary: ClassroomRiskSummary | null;
  predictions: Map<string, RiskPrediction>;
  highRiskStudents: RiskPrediction[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  fetchStudentPredictions: (studentIds: string[]) => Promise<void>;
}

export function useClassroomRisk(options: UseClassroomRiskOptions = {}): UseClassroomRiskResult {
  const { classroomId, autoFetch = true, refreshInterval, onHighRiskStudent } = options;

  const [summary, setSummary] = useState<ClassroomRiskSummary | null>(null);
  const [predictions, setPredictions] = useState<Map<string, RiskPrediction>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch classroom summary
  const refetch = useCallback(async () => {
    if (!classroomId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getClassroomRiskSummary(classroomId);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch summary'));
    } finally {
      setIsLoading(false);
    }
  }, [classroomId]);

  // Fetch predictions for specific students
  const fetchStudentPredictions = useCallback(
    async (studentIds: string[]) => {
      if (studentIds.length === 0) return;

      try {
        const results = await predictBatchRisk(studentIds);

        setPredictions((prev) => {
          const next = new Map(prev);
          for (const pred of results) {
            // Check for high-risk students
            if (onHighRiskStudent && (pred.riskLevel === 'high' || pred.riskLevel === 'critical')) {
              const prevPred = prev.get(pred.studentId);
              if (!prevPred || prevPred.riskLevel !== pred.riskLevel) {
                onHighRiskStudent(pred.studentId, pred.riskLevel);
              }
            }
            next.set(pred.studentId, pred);
          }
          return next;
        });
      } catch (err) {
        console.error('Failed to fetch student predictions:', err);
      }
    },
    [onHighRiskStudent]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && classroomId) {
      void refetch();
    }
  }, [autoFetch, classroomId, refetch]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval || !classroomId) return;

    const interval = setInterval(() => {
      void refetch();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [refreshInterval, classroomId, refetch]);

  // Computed high-risk students
  const highRiskStudents = useMemo(() => {
    return Array.from(predictions.values())
      .filter((p) => p.riskLevel === 'high' || p.riskLevel === 'critical')
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [predictions]);

  return {
    summary,
    predictions,
    highRiskStudents,
    isLoading,
    error,
    refetch,
    fetchStudentPredictions,
  };
}

// ============================================================================
// useRiskRealtime Hook - WebSocket Integration
// ============================================================================

export interface UseRiskRealtimeOptions {
  classroomId: string;
  onRiskUpdate?: (studentId: string, prediction: RiskPrediction) => void;
  onHighRiskAlert?: (studentId: string, level: RiskLevel) => void;
}

export function useRiskRealtime(options: UseRiskRealtimeOptions): {
  isConnected: boolean;
  realtimePredictions: Map<string, RiskPrediction>;
} {
  const { classroomId, onRiskUpdate, onHighRiskAlert } = options;

  const [realtimePredictions, setRealtimePredictions] = useState<Map<string, RiskPrediction>>(
    new Map()
  );

  const { isConnected, on, joinRoom, leaveRoom } = useWebSocket();

  useEffect(() => {
    const channelId = `classroom:${classroomId}:risk`;

    // Join the room for this classroom
    void joinRoom(classroomId, 'classroom');

    // Subscribe to risk updates
    const handleRiskUpdate = (rawData: unknown) => {
      const data = rawData as {
        type: string;
        studentId: string;
        prediction: RiskPrediction;
      };

      if (data.type !== 'risk_update') return;

      setRealtimePredictions((prev) => {
        const next = new Map(prev);
        next.set(data.studentId, data.prediction);
        return next;
      });

      // Notify callback
      if (onRiskUpdate) {
        onRiskUpdate(data.studentId, data.prediction);
      }

      // Check for high-risk alert
      if (
        onHighRiskAlert &&
        (data.prediction.riskLevel === 'high' || data.prediction.riskLevel === 'critical')
      ) {
        onHighRiskAlert(data.studentId, data.prediction.riskLevel);
      }
    };

    const unsubscribe = on(channelId, handleRiskUpdate);

    return () => {
      unsubscribe();
      void leaveRoom(classroomId);
    };
  }, [classroomId, on, joinRoom, leaveRoom, onRiskUpdate, onHighRiskAlert]);

  return {
    isConnected,
    realtimePredictions,
  };
}
