/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * useAssessmentBuilder Hook
 *
 * React hook for assessment builder state management
 * Features:
 * - Question management (add, remove, reorder, update)
 * - Auto-save functionality
 * - Assessment loading and saving
 * - Class assignment
 */

'use client';

import * as React from 'react';
import { assessmentsApi } from '@/lib/api/assessments';
import type {
  Assessment,
  Question,
  AssessmentRubric,
  AutoGradeConfig,
  CreateAssessmentDto,
  AssessmentType,
} from '@/lib/types';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface AssessmentBuilderState {
  id?: string;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  type: AssessmentType;
  timeLimit: number | null;
  questions: Question[];
  rubric: AssessmentRubric | null;
  autoGrade: boolean;
  adaptiveDifficulty: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback: Assessment['showFeedback'];
  allowRetakes: boolean;
  maxRetakes?: number;
  passingScore?: number;
  autoGradeConfig?: AutoGradeConfig;
}

interface UseAssessmentBuilderOptions {
  assessmentId?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface UseAssessmentBuilderReturn {
  assessment: AssessmentBuilderState;
  setAssessment: React.Dispatch<React.SetStateAction<AssessmentBuilderState>>;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  isDirty: boolean;

  // Question operations
  addQuestion: (question: Omit<Question, 'id' | 'order'>) => void;
  updateQuestion: (questionId: string, updates: Partial<Question>) => void;
  removeQuestion: (questionId: string) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;

  // Assessment operations
  saveAssessment: () => Promise<Assessment | null>;
  publishAssessment: () => Promise<Assessment | null>;
  assignToClass: (classId: string, dueDate?: Date | null) => Promise<void>;

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT STATE
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_STATE: AssessmentBuilderState = {
  title: '',
  subject: '',
  gradeLevel: '',
  type: 'quiz',
  timeLimit: null,
  questions: [],
  rubric: null,
  autoGrade: true,
  adaptiveDifficulty: false,
  shuffleQuestions: false,
  shuffleOptions: false,
  showFeedback: 'after-submit',
  allowRetakes: false,
};

// ════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════

export function useAssessmentBuilder(
  options: UseAssessmentBuilderOptions = {}
): UseAssessmentBuilderReturn {
  const { assessmentId, autoSave = false, autoSaveDelay = 5000 } = options;

  const [assessment, setAssessment] = React.useState<AssessmentBuilderState>(DEFAULT_STATE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = React.useRef(true);

  // ══════════════════════════════════════════════════════════════════════════
  // LOAD ASSESSMENT
  // ══════════════════════════════════════════════════════════════════════════

  const loadAssessment = React.useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await assessmentsApi.getById(id);
      setAssessment({
        id: data.id,
        title: data.title,
        description: data.description,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        type: data.type,
        timeLimit: data.timeLimit,
        questions: data.questions,
        rubric: data.rubric,
        autoGrade: data.autoGrade,
        adaptiveDifficulty: data.adaptiveDifficulty,
        shuffleQuestions: data.shuffleQuestions,
        shuffleOptions: data.shuffleOptions,
        showFeedback: data.showFeedback,
        allowRetakes: data.allowRetakes,
        maxRetakes: data.maxRetakes,
        passingScore: data.passingScore,
      });
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load assessment'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load assessment on mount if ID provided
  React.useEffect(() => {
    if (assessmentId && initialLoadRef.current) {
      initialLoadRef.current = false;
      loadAssessment(assessmentId);
    }
  }, [assessmentId, loadAssessment]);

  // ══════════════════════════════════════════════════════════════════════════
  // AUTO-SAVE
  // ══════════════════════════════════════════════════════════════════════════

  React.useEffect(() => {
    if (!autoSave || !isDirty || !assessment.id) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveAssessment();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, autoSave, autoSaveDelay, assessment]);

  // Mark as dirty when assessment changes
  React.useEffect(() => {
    if (!initialLoadRef.current) {
      setIsDirty(true);
    }
  }, [assessment]);

  // ══════════════════════════════════════════════════════════════════════════
  // QUESTION OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const addQuestion = React.useCallback((question: Omit<Question, 'id' | 'order'>) => {
    setAssessment((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          ...question,
          id: crypto.randomUUID(),
          order: prev.questions.length,
        } as Question,
      ],
    }));
  }, []);

  const updateQuestion = React.useCallback((questionId: string, updates: Partial<Question>) => {
    setAssessment((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    }));
  }, []);

  const removeQuestion = React.useCallback((questionId: string) => {
    setAssessment((prev) => ({
      ...prev,
      questions: prev.questions
        .filter((q) => q.id !== questionId)
        .map((q, index) => ({ ...q, order: index })),
    }));
  }, []);

  const reorderQuestions = React.useCallback((startIndex: number, endIndex: number) => {
    setAssessment((prev) => {
      const questions = [...prev.questions];
      const [removed] = questions.splice(startIndex, 1);
      questions.splice(endIndex, 0, removed);

      return {
        ...prev,
        questions: questions.map((q, index) => ({ ...q, order: index })),
      };
    });
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE & PUBLISH
  // ══════════════════════════════════════════════════════════════════════════

  const saveAssessment = React.useCallback(async (): Promise<Assessment | null> => {
    setSaving(true);
    setError(null);

    try {
      const dto: CreateAssessmentDto = {
        title: assessment.title,
        description: assessment.description,
        subject: assessment.subject,
        gradeLevel: assessment.gradeLevel,
        type: assessment.type,
        timeLimit: assessment.timeLimit,
        questions: assessment.questions,
        rubric: assessment.rubric,
        autoGrade: assessment.autoGrade,
        adaptiveDifficulty: assessment.adaptiveDifficulty,
        shuffleQuestions: assessment.shuffleQuestions,
        shuffleOptions: assessment.shuffleOptions,
        showFeedback: assessment.showFeedback,
        allowRetakes: assessment.allowRetakes,
        maxRetakes: assessment.maxRetakes,
        passingScore: assessment.passingScore,
        status: 'draft',
      };

      let result: Assessment;

      if (assessment.id) {
        result = await assessmentsApi.update(assessment.id, dto);
      } else {
        result = await assessmentsApi.create(dto);
        setAssessment((prev) => ({ ...prev, id: result.id }));
      }

      setIsDirty(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save assessment'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [assessment]);

  const publishAssessment = React.useCallback(async (): Promise<Assessment | null> => {
    // Save first if dirty
    if (isDirty || !assessment.id) {
      const saved = await saveAssessment();
      if (!saved) return null;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await assessmentsApi.publish(assessment.id!);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to publish assessment'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [assessment.id, isDirty, saveAssessment]);

  const assignToClass = React.useCallback(
    async (classId: string, dueDate?: Date | null) => {
      // Save first if dirty
      if (isDirty || !assessment.id) {
        const saved = await saveAssessment();
        if (!saved) throw new Error('Failed to save assessment before assigning');
      }

      setError(null);

      try {
        await assessmentsApi.assignToClass({
          assessmentId: assessment.id!,
          classId,
          dueDate,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to assign assessment'));
        throw err;
      }
    },
    [assessment.id, isDirty, saveAssessment]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  const validationErrors = React.useMemo(() => {
    const errors: string[] = [];

    if (!assessment.title.trim()) {
      errors.push('Title is required');
    }

    if (!assessment.subject) {
      errors.push('Subject is required');
    }

    if (!assessment.gradeLevel) {
      errors.push('Grade level is required');
    }

    if (assessment.questions.length === 0) {
      errors.push('At least one question is required');
    }

    // Validate each question
    assessment.questions.forEach((q, index) => {
      if (!q.text.trim()) {
        errors.push(`Question ${index + 1}: Text is required`);
      }

      if (q.type === 'multiple-choice') {
        if (!q.options || q.options.length < 2) {
          errors.push(`Question ${index + 1}: At least 2 options required`);
        }
        if (!q.options?.some((opt) => opt.isCorrect)) {
          errors.push(`Question ${index + 1}: Must select a correct answer`);
        }
      }

      if (q.type === 'true-false' && q.correctAnswer === undefined) {
        errors.push(`Question ${index + 1}: Must select True or False`);
      }

      if (q.type === 'short-answer' && !q.expectedAnswer) {
        errors.push(`Question ${index + 1}: Expected answer is required`);
      }

      if (q.type === 'math' && !q.correctAnswer) {
        errors.push(`Question ${index + 1}: Correct answer is required`);
      }
    });

    // Project type requires rubric
    if (assessment.type === 'project' && !assessment.rubric) {
      errors.push('Projects require a rubric');
    }

    return errors;
  }, [assessment]);

  const isValid = validationErrors.length === 0;

  // ══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════════════

  return {
    assessment,
    setAssessment,
    loading,
    saving,
    error,
    isDirty,

    addQuestion,
    updateQuestion,
    removeQuestion,
    reorderQuestions,

    saveAssessment,
    publishAssessment,
    assignToClass,

    isValid,
    validationErrors,
  };
}
