export { createGradeThemePlugin } from './tailwind/gradeThemePlugin';
export { GradeThemeProvider, useGradeTheme } from './theme/grade-theme';
export { AccessibilityProvider, useAccessibility } from './theme/accessibility';
export type { GradeBand } from './theme/tokens';

export { Button } from './components/button';
export { Card } from './components/card';
export { Badge } from './components/badge';
export { Heading } from './components/heading';
export { GradeThemeToggle } from './components/grade-theme-toggle';

// AI Components
export { LessonGenerator, AITutorChat, AIFeedback } from './components/ai';
export type { LessonGeneratorProps, AITutorChatProps, AIFeedbackProps } from './components/ai';

// Scratch Pad Components
export {
  ScratchPadCanvas,
  useScratchPad,
  ScratchPadProvider,
  useScratchPadContext,
  ScratchPadModal,
  ScratchPadDrawer,
  ScratchPadFAB,
  InlineScratchPad,
  useScratchPadPopup,
  MathQuestionWithScratchPad,
  MathActivityWithScratchPad,
} from './components/scratch-pad';
export type {
  ScratchPadCanvasProps,
  ScratchPadCanvasRef,
  UseScratchPadOptions,
  ScratchPadState,
  ScratchPadActions,
  ScratchPadProviderProps,
  ScratchPadModalProps,
  ScratchPadDrawerProps,
  ScratchPadFABProps,
  InlineScratchPadProps,
  UseScratchPadPopupReturn,
  MathQuestion,
  MathQuestionWithScratchPadProps,
  MathActivityWithScratchPadProps,
} from './components/scratch-pad';

// Focus Games Components
export {
  FocusGamePlayer,
  GameSelector,
  useGameSelection,
} from './components/focus-games';
export type {
  FocusGamePlayerProps,
  GameType,
  GameConfig,
  GameSelectorProps,
  MiniGame,
  GameCategory,
} from './components/focus-games';
