'use client';

/**
 * Assessment Builder State Hook
 * 
 * Manages the state for the assessment builder with:
 * - Undo/redo support
 * - Optimistic updates
 * - Auto-save
 * - Validation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Assessment,
  Question,
  AssessmentSettings,
  QuestionType,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

interface UseAssessmentBuilderOptions {
  assessmentId?: string;
  tenantId: string;
}

interface AssessmentState {
  assessment: Assessment;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  errors: Record<string, string[]>;
}

interface HistoryEntry {
  assessment: Assessment;
  timestamp: number;
}

const MAX_HISTORY = 50;

// ============================================================================
// DEFAULT ASSESSMENT
// ============================================================================

const createDefaultAssessment = (tenantId: string): Assessment => ({
  id: crypto.randomUUID(),
  tenantId,
  name: 'Untitled Assessment',
  type: 'QUIZ',
  status: 'DRAFT',
  questions: [],
  questionPools: [],
  settings: {
    timeLimit: undefined,
    allowLateSubmissions: false,
    allowBackNavigation: true,
    showOneQuestionAtATime: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    requireLockdownBrowser: false,
    preventCopyPaste: false,
    detectTabSwitch: false,
    maxViolations: 5,
    maxAttempts: 1,
    attemptsGradingPolicy: 'HIGHEST',
    showCorrectAnswers: true,
    showCorrectAnswersAfter: 'IMMEDIATE',
    showPointValues: true,
    showFeedback: true,
    gradeReleasePolicy: 'IMMEDIATE',
  },
  totalPoints: 0,
  createdBy: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
});

// ============================================================================
// HOOK
// ============================================================================

export function useAssessmentBuilder({ assessmentId, tenantId }: UseAssessmentBuilderOptions) {
  // State
  const [state, setState] = useState<AssessmentState>({
    assessment: createDefaultAssessment(tenantId),
    isDirty: false,
    isSaving: false,
    isLoading: !!assessmentId,
    errors: {},
  });

  // History for undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const skipHistoryRef = useRef<boolean>(false);

  // Load existing assessment
  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId]);

  // Save to history when assessment changes
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }

    // Don't save to history if we're loading
    if (state.isLoading) return;

    // Truncate future history if we're not at the end
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // Add to history
    historyRef.current.push({
      assessment: JSON.parse(JSON.stringify(state.assessment)),
      timestamp: Date.now(),
    });

    // Trim history if too long
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }

    historyIndexRef.current = historyRef.current.length - 1;
  }, [state.assessment, state.isLoading]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadAssessment = async (id: string) => {
    try {
      const response = await fetch(`/api/assessments/${id}`, {
        headers: {
          'x-tenant-id': tenantId,
        },
      });

      if (!response.ok) throw new Error('Failed to load assessment');

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        assessment: {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
          availableUntil: data.availableUntil ? new Date(data.availableUntil) : undefined,
        },
        isLoading: false,
        isDirty: false,
      }));
    } catch (error) {
      console.error('Failed to load assessment:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: { load: ['Failed to load assessment'] },
      }));
    }
  };

  const save = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true }));

    try {
      const isNew = !assessmentId;
      const url = isNew 
        ? '/api/assessments' 
        : `/api/assessments/${state.assessment.id}`;
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(state.assessment),
      });

      if (!response.ok) throw new Error('Failed to save assessment');

      const saved = await response.json();

      setState(prev => ({
        ...prev,
        assessment: {
          ...prev.assessment,
          ...saved,
          updatedAt: new Date(),
          version: (prev.assessment.version ?? 0) + 1,
        },
        isSaving: false,
        isDirty: false,
      }));
    } catch (error) {
      console.error('Failed to save assessment:', error);
      setState(prev => ({
        ...prev,
        isSaving: false,
        errors: { ...prev.errors, save: ['Failed to save assessment'] },
      }));
    }
  }, [assessmentId, tenantId, state.assessment]);

  // ============================================================================
  // ASSESSMENT ACTIONS
  // ============================================================================

  const updateAssessment = useCallback((updates: Partial<Assessment>) => {
    setState(prev => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        ...updates,
        updatedAt: new Date(),
      },
      isDirty: true,
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<AssessmentSettings>) => {
    setState(prev => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        settings: {
          ...prev.assessment.settings,
          ...settings,
        },
        updatedAt: new Date(),
      },
      isDirty: true,
    }));
  }, []);

  // ============================================================================
  // QUESTION ACTIONS
  // ============================================================================

  const addQuestion = useCallback((question: Question) => {
    setState(prev => {
      const newQuestions = [...prev.assessment.questions, question];
      const totalPoints = newQuestions.reduce((sum, q) => sum + q.points, 0);

      return {
        ...prev,
        assessment: {
          ...prev.assessment,
          questions: newQuestions,
          totalPoints,
          updatedAt: new Date(),
        },
        isDirty: true,
      };
    });
  }, []);

  const updateQuestion = useCallback((question: Question) => {
    setState(prev => {
      const index = prev.assessment.questions.findIndex(q => q.id === question.id);
      if (index === -1) return prev;

      const newQuestions = [...prev.assessment.questions];
      newQuestions[index] = question;
      const totalPoints = newQuestions.reduce((sum, q) => sum + q.points, 0);

      return {
        ...prev,
        assessment: {
          ...prev.assessment,
          questions: newQuestions,
          totalPoints,
          updatedAt: new Date(),
        },
        isDirty: true,
      };
    });
  }, []);

  const deleteQuestion = useCallback((questionId: string) => {
    setState(prev => {
      const newQuestions = prev.assessment.questions.filter(q => q.id !== questionId);
      const totalPoints = newQuestions.reduce((sum, q) => sum + q.points, 0);

      // Remove error for this question
      const { [questionId]: _, ...remainingErrors } = prev.errors;

      return {
        ...prev,
        assessment: {
          ...prev.assessment,
          questions: newQuestions,
          totalPoints,
          updatedAt: new Date(),
        },
        errors: remainingErrors,
        isDirty: true,
      };
    });
  }, []);

  const reorderQuestions = useCallback((oldIndex: number, newIndex: number) => {
    setState(prev => {
      const newQuestions = [...prev.assessment.questions];
      const [removed] = newQuestions.splice(oldIndex, 1);
      newQuestions.splice(newIndex, 0, removed);

      return {
        ...prev,
        assessment: {
          ...prev.assessment,
          questions: newQuestions,
          updatedAt: new Date(),
        },
        isDirty: true,
      };
    });
  }, []);

  const duplicateQuestion = useCallback((questionId: string) => {
    setState(prev => {
      const originalIndex = prev.assessment.questions.findIndex(q => q.id === questionId);
      if (originalIndex === -1) return prev;

      const original = prev.assessment.questions[originalIndex];
      const duplicate: Question = {
        ...JSON.parse(JSON.stringify(original)),
        id: crypto.randomUUID(),
        stem: `${original.stem} (Copy)`,
      };

      // Regenerate IDs for nested objects
      if (duplicate.options) {
        duplicate.options = duplicate.options.map(opt => ({
          ...opt,
          id: crypto.randomUUID(),
        }));
      }
      if (duplicate.blanks) {
        duplicate.blanks = duplicate.blanks.map(blank => ({
          ...blank,
          id: crypto.randomUUID(),
        }));
      }
      if (duplicate.pairs) {
        duplicate.pairs = duplicate.pairs.map(pair => ({
          ...pair,
          id: crypto.randomUUID(),
        }));
      }

      const newQuestions = [...prev.assessment.questions];
      newQuestions.splice(originalIndex + 1, 0, duplicate);
      const totalPoints = newQuestions.reduce((sum, q) => sum + q.points, 0);

      return {
        ...prev,
        assessment: {
          ...prev.assessment,
          questions: newQuestions,
          totalPoints,
          updatedAt: new Date(),
        },
        isDirty: true,
      };
    });
  }, []);

  // ============================================================================
  // UNDO/REDO
  // ============================================================================

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    skipHistoryRef.current = true;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];

    setState(prev => ({
      ...prev,
      assessment: JSON.parse(JSON.stringify(entry.assessment)),
      isDirty: true,
    }));
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    skipHistoryRef.current = true;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];

    setState(prev => ({
      ...prev,
      assessment: JSON.parse(JSON.stringify(entry.assessment)),
      isDirty: true,
    }));
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validate = useCallback((): string[] => {
    const errors: Record<string, string[]> = {};
    const allErrors: string[] = [];

    // Assessment-level validation
    if (!state.assessment.name?.trim()) {
      errors['assessment'] = ['Assessment name is required'];
      allErrors.push('Assessment name is required');
    }

    if (state.assessment.questions.length === 0) {
      errors['assessment'] = [...(errors['assessment'] ?? []), 'At least one question is required'];
      allErrors.push('At least one question is required');
    }

    // Question-level validation
    for (const question of state.assessment.questions) {
      const questionErrors: string[] = [];

      if (!question.stem?.trim()) {
        questionErrors.push('Question text is required');
      }

      if (question.points <= 0) {
        questionErrors.push('Points must be greater than 0');
      }

      // Type-specific validation
      switch (question.type) {
        case 'MULTIPLE_CHOICE':
        case 'MULTIPLE_SELECT':
          if (!question.options?.length || question.options.length < 2) {
            questionErrors.push('At least 2 options are required');
          }
          if (question.type === 'MULTIPLE_CHOICE' && question.correctOption === undefined) {
            questionErrors.push('A correct answer must be selected');
          }
          if (question.type === 'MULTIPLE_SELECT' && (!question.correctOptions || question.correctOptions.length === 0)) {
            questionErrors.push('At least one correct answer must be selected');
          }
          break;

        case 'FILL_BLANK':
          if (!question.blanks?.length) {
            questionErrors.push('At least one blank is required');
          }
          if (question.blanks?.some(b => !b.correctAnswers?.length)) {
            questionErrors.push('All blanks must have correct answers');
          }
          break;

        case 'MATCHING':
          if (!question.pairs?.length || question.pairs.length < 2) {
            questionErrors.push('At least 2 matching pairs are required');
          }
          break;

        case 'ESSAY':
        case 'SHORT_ANSWER':
          // Essays don't require validation beyond stem
          break;

        case 'CODE':
          if (!question.language) {
            questionErrors.push('Programming language is required');
          }
          if (!question.testCases?.length) {
            questionErrors.push('At least one test case is required');
          }
          break;
      }

      if (questionErrors.length > 0) {
        errors[question.id] = questionErrors;
        allErrors.push(...questionErrors);
      }
    }

    setState(prev => ({ ...prev, errors }));
    return allErrors;
  }, [state.assessment]);

  return {
    assessment: state.assessment,
    isDirty: state.isDirty,
    isSaving: state.isSaving,
    isLoading: state.isLoading,
    errors: state.errors,
    canUndo,
    canRedo,

    // Actions
    updateAssessment,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    duplicateQuestion,
    updateSettings,
    save,
    undo,
    redo,
    validate,
  };
}
