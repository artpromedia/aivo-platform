/**
 * Lesson Builder Context
 * Provides state management for the interactive lesson builder
 */

'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  InteractiveLesson,
  LessonSection,
  LessonActivity,
  LessonBuilderState,
  ValidationError,
  LessonSettings,
  LessonAccessibility,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════════════════════════════

type LessonBuilderAction =
  | { type: 'SET_LESSON'; payload: InteractiveLesson }
  | { type: 'UPDATE_LESSON'; payload: Partial<InteractiveLesson> }
  | { type: 'ADD_SECTION'; payload: Omit<LessonSection, 'id' | 'orderIndex'> }
  | { type: 'UPDATE_SECTION'; payload: { id: string; updates: Partial<LessonSection> } }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'REORDER_SECTIONS'; payload: string[] }
  | { type: 'ADD_ACTIVITY'; payload: { sectionId: string; activity: Omit<LessonActivity, 'id' | 'orderIndex'> } }
  | { type: 'UPDATE_ACTIVITY'; payload: { sectionId: string; activityId: string; updates: Partial<LessonActivity> } }
  | { type: 'DELETE_ACTIVITY'; payload: { sectionId: string; activityId: string } }
  | { type: 'REORDER_ACTIVITIES'; payload: { sectionId: string; activityIds: string[] } }
  | { type: 'SELECT_SECTION'; payload: string | null }
  | { type: 'SELECT_ACTIVITY'; payload: string | null }
  | { type: 'TOGGLE_PREVIEW'; payload?: boolean }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<LessonSettings> }
  | { type: 'UPDATE_ACCESSIBILITY'; payload: Partial<LessonAccessibility> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_CLEAN' };

// ══════════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════════════════════════════

const initialState: LessonBuilderState = {
  lesson: null,
  selectedSectionId: null,
  selectedActivityId: null,
  isPreviewMode: false,
  isDirty: false,
  validationErrors: [],
  undoStack: [],
  redoStack: [],
};

// ══════════════════════════════════════════════════════════════════════════════
// REDUCER
// ══════════════════════════════════════════════════════════════════════════════

function lessonBuilderReducer(
  state: LessonBuilderState,
  action: LessonBuilderAction
): LessonBuilderState {
  switch (action.type) {
    case 'SET_LESSON':
      return {
        ...state,
        lesson: action.payload,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      };

    case 'UPDATE_LESSON':
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: { ...state.lesson, ...action.payload, updatedAt: new Date().toISOString() },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };

    case 'ADD_SECTION': {
      if (!state.lesson) return state;
      const newSection: LessonSection = {
        ...action.payload,
        id: uuidv4(),
        orderIndex: state.lesson.sections.length,
      };
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: [...state.lesson.sections, newSection],
          updatedAt: new Date().toISOString(),
        },
        selectedSectionId: newSection.id,
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'UPDATE_SECTION': {
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: state.lesson.sections.map((section) =>
            section.id === action.payload.id
              ? { ...section, ...action.payload.updates }
              : section
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'DELETE_SECTION': {
      if (!state.lesson) return state;
      const remainingSections = state.lesson.sections
        .filter((s) => s.id !== action.payload)
        .map((s, index) => ({ ...s, orderIndex: index }));
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: remainingSections,
          updatedAt: new Date().toISOString(),
        },
        selectedSectionId: state.selectedSectionId === action.payload ? null : state.selectedSectionId,
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'REORDER_SECTIONS': {
      if (!state.lesson) return state;
      const sectionMap = new Map(state.lesson.sections.map((s) => [s.id, s]));
      const reorderedSections = action.payload
        .map((id, index) => {
          const section = sectionMap.get(id);
          return section ? { ...section, orderIndex: index } : null;
        })
        .filter((s): s is LessonSection => s !== null);
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: reorderedSections,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'ADD_ACTIVITY': {
      if (!state.lesson) return state;
      const newActivity: LessonActivity = {
        ...action.payload.activity,
        id: uuidv4(),
        orderIndex: 0,
      };
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: state.lesson.sections.map((section) =>
            section.id === action.payload.sectionId
              ? {
                  ...section,
                  activities: [
                    ...section.activities.map((a, i) => ({ ...a, orderIndex: i })),
                    { ...newActivity, orderIndex: section.activities.length },
                  ],
                }
              : section
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedActivityId: newActivity.id,
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'UPDATE_ACTIVITY': {
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: state.lesson.sections.map((section) =>
            section.id === action.payload.sectionId
              ? {
                  ...section,
                  activities: section.activities.map((activity) =>
                    activity.id === action.payload.activityId
                      ? { ...activity, ...action.payload.updates }
                      : activity
                  ),
                }
              : section
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'DELETE_ACTIVITY': {
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: state.lesson.sections.map((section) =>
            section.id === action.payload.sectionId
              ? {
                  ...section,
                  activities: section.activities
                    .filter((a) => a.id !== action.payload.activityId)
                    .map((a, index) => ({ ...a, orderIndex: index })),
                }
              : section
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedActivityId:
          state.selectedActivityId === action.payload.activityId ? null : state.selectedActivityId,
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'REORDER_ACTIVITIES': {
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: {
          ...state.lesson,
          sections: state.lesson.sections.map((section) => {
            if (section.id !== action.payload.sectionId) return section;
            const activityMap = new Map(section.activities.map((a) => [a.id, a]));
            const reorderedActivities = action.payload.activityIds
              .map((id, index) => {
                const activity = activityMap.get(id);
                return activity ? { ...activity, orderIndex: index } : null;
              })
              .filter((a): a is LessonActivity => a !== null);
            return { ...section, activities: reorderedActivities };
          }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };
    }

    case 'SELECT_SECTION':
      return { ...state, selectedSectionId: action.payload, selectedActivityId: null };

    case 'SELECT_ACTIVITY':
      return { ...state, selectedActivityId: action.payload };

    case 'TOGGLE_PREVIEW':
      return { ...state, isPreviewMode: action.payload ?? !state.isPreviewMode };

    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };

    case 'UPDATE_SETTINGS':
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: {
          ...state.lesson,
          settings: { ...state.lesson.settings, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };

    case 'UPDATE_ACCESSIBILITY':
      if (!state.lesson) return state;
      return {
        ...state,
        lesson: {
          ...state.lesson,
          accessibility: { ...state.lesson.accessibility, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: [],
      };

    case 'UNDO': {
      if (state.undoStack.length === 0 || !state.lesson) return state;
      const previousLesson = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        lesson: previousLesson,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.lesson],
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0 || !state.lesson) return state;
      const nextLesson = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        lesson: nextLesson,
        undoStack: [...state.undoStack, state.lesson],
        redoStack: state.redoStack.slice(0, -1),
        isDirty: true,
      };
    }

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

interface LessonBuilderContextValue {
  state: LessonBuilderState;
  dispatch: React.Dispatch<LessonBuilderAction>;
  // Helper methods
  createNewLesson: (title: string, lessonType: InteractiveLesson['lessonType']) => void;
  addSection: (title: string) => void;
  addActivity: (sectionId: string, activityType: LessonActivity['type']) => void;
  validateLesson: () => ValidationError[];
  getSelectedSection: () => LessonSection | null;
  getSelectedActivity: () => LessonActivity | null;
}

const LessonBuilderContext = createContext<LessonBuilderContextValue | null>(null);

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

interface LessonBuilderProviderProps {
  children: ReactNode;
  initialLesson?: InteractiveLesson;
}

export function LessonBuilderProvider({ children, initialLesson }: LessonBuilderProviderProps) {
  const [state, dispatch] = useReducer(lessonBuilderReducer, {
    ...initialState,
    lesson: initialLesson ?? null,
  });

  const createNewLesson = useCallback(
    (title: string, lessonType: InteractiveLesson['lessonType']) => {
      const now = new Date().toISOString();
      const newLesson: InteractiveLesson = {
        id: uuidv4(),
        title,
        description: '',
        lessonType,
        estimatedDuration: 30,
        objectives: [],
        prerequisiteSkills: [],
        targetSkills: [],
        gradeLevel: '',
        subject: '',
        sections: [],
        settings: {
          allowSkipping: false,
          showProgress: true,
          enableTimer: false,
          shuffleActivities: false,
          maxAttempts: 3,
          passingScore: 70,
          feedbackType: 'immediate',
          difficultyLevel: 'intermediate',
          adaptiveLearning: false,
          gamificationEnabled: false,
        },
        accessibility: {
          supportsScreenReader: true,
          supportsKeyboardNavigation: true,
          supportsHighContrast: false,
          supportsDyslexiaFont: false,
          supportsReducedMotion: false,
          audioDescriptionsAvailable: false,
          closedCaptionsAvailable: false,
          signLanguageAvailable: false,
          textToSpeechEnabled: false,
          readingLevelAdjustment: false,
        },
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'SET_LESSON', payload: newLesson });
    },
    []
  );

  const addSection = useCallback((title: string) => {
    dispatch({
      type: 'ADD_SECTION',
      payload: {
        title,
        isOptional: false,
        activities: [],
        transitionType: 'user_triggered',
      },
    });
  }, []);

  const addActivity = useCallback(
    (sectionId: string, activityType: LessonActivity['type']) => {
      const defaultContent = getDefaultActivityContent(activityType);
      dispatch({
        type: 'ADD_ACTIVITY',
        payload: {
          sectionId,
          activity: {
            type: activityType,
            title: `New ${activityType.replace(/_/g, ' ')}`,
            instructions: '',
            points: 10,
            required: true,
            content: defaultContent,
            feedback: {
              correct: { message: 'Great job!' },
              incorrect: { message: 'Try again!' },
              encouragement: ['You can do it!', 'Keep trying!'],
            },
            hints: [],
            media: [],
            accessibility: {
              ariaLabel: `${activityType} activity`,
            },
          },
        },
      });
    },
    []
  );

  const validateLesson = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!state.lesson) {
      errors.push({ path: 'lesson', message: 'No lesson loaded', severity: 'error' });
      return errors;
    }

    if (!state.lesson.title.trim()) {
      errors.push({ path: 'lesson.title', message: 'Lesson title is required', severity: 'error' });
    }

    if (state.lesson.sections.length === 0) {
      errors.push({
        path: 'lesson.sections',
        message: 'Lesson must have at least one section',
        severity: 'warning',
      });
    }

    state.lesson.sections.forEach((section, sIndex) => {
      if (!section.title.trim()) {
        errors.push({
          path: `lesson.sections[${sIndex}].title`,
          message: `Section ${sIndex + 1} title is required`,
          severity: 'error',
        });
      }

      if (section.activities.length === 0) {
        errors.push({
          path: `lesson.sections[${sIndex}].activities`,
          message: `Section "${section.title}" has no activities`,
          severity: 'warning',
        });
      }

      section.activities.forEach((activity, aIndex) => {
        if (!activity.title.trim()) {
          errors.push({
            path: `lesson.sections[${sIndex}].activities[${aIndex}].title`,
            message: `Activity ${aIndex + 1} in "${section.title}" needs a title`,
            severity: 'error',
          });
        }
      });
    });

    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
    return errors;
  }, [state.lesson]);

  const getSelectedSection = useCallback((): LessonSection | null => {
    if (!state.lesson || !state.selectedSectionId) return null;
    return state.lesson.sections.find((s) => s.id === state.selectedSectionId) ?? null;
  }, [state.lesson, state.selectedSectionId]);

  const getSelectedActivity = useCallback((): LessonActivity | null => {
    if (!state.lesson || !state.selectedActivityId) return null;
    for (const section of state.lesson.sections) {
      const activity = section.activities.find((a) => a.id === state.selectedActivityId);
      if (activity) return activity;
    }
    return null;
  }, [state.lesson, state.selectedActivityId]);

  const value: LessonBuilderContextValue = {
    state,
    dispatch,
    createNewLesson,
    addSection,
    addActivity,
    validateLesson,
    getSelectedSection,
    getSelectedActivity,
  };

  return (
    <LessonBuilderContext.Provider value={value}>{children}</LessonBuilderContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useLessonBuilder() {
  const context = useContext(LessonBuilderContext);
  if (!context) {
    throw new Error('useLessonBuilder must be used within a LessonBuilderProvider');
  }
  return context;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getDefaultActivityContent(type: LessonActivity['type']): LessonActivity['content'] {
  switch (type) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        question: '',
        options: [
          { id: uuidv4(), text: 'Option A', isCorrect: true },
          { id: uuidv4(), text: 'Option B', isCorrect: false },
          { id: uuidv4(), text: 'Option C', isCorrect: false },
          { id: uuidv4(), text: 'Option D', isCorrect: false },
        ],
        multiSelect: false,
        shuffleOptions: true,
      };
    case 'drag_and_drop':
      return {
        type: 'drag_and_drop',
        prompt: '',
        draggables: [],
        dropZones: [],
        allowMultipleInZone: false,
      };
    case 'matching':
      return {
        type: 'matching',
        prompt: '',
        pairs: [],
        shuffleBothSides: true,
      };
    case 'fill_in_blank':
      return {
        type: 'fill_in_blank',
        text: '',
        blanks: [],
        caseSensitive: false,
        allowPartialCredit: true,
      };
    case 'ordering':
      return {
        type: 'ordering',
        prompt: '',
        items: [],
        direction: 'vertical',
      };
    case 'free_response':
      return {
        type: 'free_response',
        prompt: '',
      };
    default:
      return { type: type } as LessonActivity['content'];
  }
}
