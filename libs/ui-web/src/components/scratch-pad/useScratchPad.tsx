'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  Stroke,
  CanvasState,
  MathRecognitionResult,
  ScratchPadSession,
  AnswerValidationResult,
  RecognitionOptions,
} from '@aivo/ts-types';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface UseScratchPadOptions {
  /** Base API URL */
  apiBaseUrl?: string;
  /** Learner ID for sessions */
  learnerId?: string;
  /** Activity ID for context */
  activityId?: string;
  /** Question ID for context */
  questionId?: string;
  /** Auto-start session */
  autoStartSession?: boolean;
}

export interface ScratchPadState {
  isRecognizing: boolean;
  recognitionResult: MathRecognitionResult | null;
  session: ScratchPadSession | null;
  isSessionActive: boolean;
  error: string | null;
}

export interface ScratchPadActions {
  recognizeMath: (strokes: Stroke[], canvasWidth: number, canvasHeight: number, options?: RecognitionOptions) => Promise<MathRecognitionResult | null>;
  recognizeImage: (imageBase64: string, options?: RecognitionOptions) => Promise<MathRecognitionResult | null>;
  validateAnswer: (submitted: string, expected: string, allowEquivalent?: boolean) => Promise<AnswerValidationResult | null>;
  startSession: () => Promise<ScratchPadSession | null>;
  saveSnapshot: (canvasState: CanvasState, recognizedText?: string, confidence?: number) => Promise<boolean>;
  submitAnswer: (answer: string, workShown: CanvasState) => Promise<AnswerValidationResult | null>;
  endSession: () => Promise<boolean>;
  clearError: () => void;
}

// ════════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════════

export function useScratchPad(options: UseScratchPadOptions = {}): [ScratchPadState, ScratchPadActions] {
  const {
    apiBaseUrl = '/api/v1',
    learnerId,
    activityId,
    questionId,
  } = options;

  // State
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<MathRecognitionResult | null>(null);
  const [session, setSession] = useState<ScratchPadSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const sessionIdRef = useRef<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // RECOGNITION
  // ──────────────────────────────────────────────────────────────────────────

  const recognizeMath = useCallback(
    async (
      strokes: Stroke[],
      canvasWidth: number,
      canvasHeight: number,
      recognitionOptions?: RecognitionOptions
    ): Promise<MathRecognitionResult | null> => {
      if (strokes.length === 0) return null;

      setIsRecognizing(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/math-recognition/recognize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strokes,
            canvasWidth,
            canvasHeight,
            options: {
              evaluateExpression: true,
              includeAlternatives: true,
              ...recognitionOptions,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Recognition failed: ${response.statusText}`);
        }

        const result: MathRecognitionResult = await response.json();
        setRecognitionResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Recognition failed';
        setError(message);
        console.error('Recognition error:', err);
        return null;
      } finally {
        setIsRecognizing(false);
      }
    },
    [apiBaseUrl]
  );

  const recognizeImage = useCallback(
    async (
      imageBase64: string,
      recognitionOptions?: RecognitionOptions
    ): Promise<MathRecognitionResult | null> => {
      setIsRecognizing(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/math-recognition/recognize-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageBase64,
            options: {
              evaluateExpression: true,
              includeAlternatives: true,
              ...recognitionOptions,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Recognition failed: ${response.statusText}`);
        }

        const result: MathRecognitionResult = await response.json();
        setRecognitionResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Recognition failed';
        setError(message);
        console.error('Recognition error:', err);
        return null;
      } finally {
        setIsRecognizing(false);
      }
    },
    [apiBaseUrl]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ──────────────────────────────────────────────────────────────────────────

  const validateAnswer = useCallback(
    async (
      submitted: string,
      expected: string,
      allowEquivalent = true
    ): Promise<AnswerValidationResult | null> => {
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/math-recognition/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submittedAnswer: submitted,
            expectedAnswer: expected,
            allowEquivalent,
          }),
        });

        if (!response.ok) {
          throw new Error(`Validation failed: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Validation failed';
        setError(message);
        console.error('Validation error:', err);
        return null;
      }
    },
    [apiBaseUrl]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  const startSession = useCallback(async (): Promise<ScratchPadSession | null> => {
    if (!learnerId) {
      setError('Learner ID is required to start a session');
      return null;
    }

    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/scratch-pad/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          activityId,
          questionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const newSession: ScratchPadSession = await response.json();
      setSession(newSession);
      sessionIdRef.current = newSession.id;
      return newSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
      console.error('Start session error:', err);
      return null;
    }
  }, [apiBaseUrl, learnerId, activityId, questionId]);

  const saveSnapshot = useCallback(
    async (
      canvasState: CanvasState,
      recognizedText?: string,
      confidence?: number
    ): Promise<boolean> => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        setError('No active session');
        return false;
      }

      setError(null);

      try {
        const response = await fetch(
          `${apiBaseUrl}/scratch-pad/sessions/${currentSessionId}/snapshot`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              snapshot: canvasState,
              recognition:
                recognizedText !== undefined
                  ? { recognizedText, confidence: confidence ?? 0 }
                  : undefined,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to save snapshot: ${response.statusText}`);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save snapshot';
        setError(message);
        console.error('Save snapshot error:', err);
        return false;
      }
    },
    [apiBaseUrl]
  );

  const submitAnswer = useCallback(
    async (
      answer: string,
      workShown: CanvasState
    ): Promise<AnswerValidationResult | null> => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        setError('No active session');
        return null;
      }

      setError(null);

      try {
        const response = await fetch(
          `${apiBaseUrl}/scratch-pad/sessions/${currentSessionId}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answer,
              questionId,
              workShown,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to submit answer: ${response.statusText}`);
        }

        const result = await response.json();

        // Update session status
        setSession((prev) =>
          prev ? { ...prev, status: 'submitted', completedAt: new Date().toISOString() } : null
        );

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit answer';
        setError(message);
        console.error('Submit answer error:', err);
        return null;
      }
    },
    [apiBaseUrl, questionId]
  );

  const endSession = useCallback(async (): Promise<boolean> => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      return true; // No session to end
    }

    setError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/scratch-pad/sessions/${currentSessionId}/end`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }

      setSession(null);
      sessionIdRef.current = null;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      setError(message);
      console.error('End session error:', err);
      return false;
    }
  }, [apiBaseUrl]);

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR
  // ──────────────────────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────

  const state: ScratchPadState = {
    isRecognizing,
    recognitionResult,
    session,
    isSessionActive: session !== null && session.status === 'active',
    error,
  };

  const actions: ScratchPadActions = {
    recognizeMath,
    recognizeImage,
    validateAnswer,
    startSession,
    saveSnapshot,
    submitAnswer,
    endSession,
    clearError,
  };

  return [state, actions];
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT (Optional - for providing scratch pad state to nested components)
// ════════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, type ReactNode } from 'react';

interface ScratchPadContextValue {
  state: ScratchPadState;
  actions: ScratchPadActions;
}

const ScratchPadContext = createContext<ScratchPadContextValue | null>(null);

export interface ScratchPadProviderProps {
  children: ReactNode;
  options?: UseScratchPadOptions;
}

export function ScratchPadProvider({ children, options }: ScratchPadProviderProps) {
  const [state, actions] = useScratchPad(options);

  return (
    <ScratchPadContext.Provider value={{ state, actions }}>
      {children}
    </ScratchPadContext.Provider>
  );
}

export function useScratchPadContext(): ScratchPadContextValue {
  const context = useContext(ScratchPadContext);
  if (!context) {
    throw new Error('useScratchPadContext must be used within a ScratchPadProvider');
  }
  return context;
}
