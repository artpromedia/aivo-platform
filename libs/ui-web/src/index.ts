// Utility functions
export { cn } from './lib/utils';

// Legacy theme exports (for backward compatibility)
export { createGradeThemePlugin } from './tailwind/gradeThemePlugin';
export { GradeThemeProvider as LegacyGradeThemeProvider, useGradeTheme as useLegacyGradeTheme } from './theme/grade-theme';
export { AccessibilityProvider, useAccessibility } from './theme/accessibility';
export type { GradeBand } from './theme/tokens';

// New Grade Theme System
export {
  GradeThemeProvider,
  useGradeTheme,
  useTheme,
  useSensoryProfile,
} from './providers/GradeThemeProvider';
export type {
  GradeThemeProviderProps,
  GradeThemeContextValue,
} from './providers/GradeThemeProvider';

// Theme Configuration
export {
  K5Theme,
  MSTheme,
  HSTheme,
  HSDarkTheme,
  gradeThemes,
  defaultTheme,
} from './themes/grade-themes';
export type {
  GradeTheme,
  SensoryProfile,
  GradeLevel,
} from './themes/grade-themes';

// CSS Variables System
export {
  generateCSSVariables,
  generateCSSVariablesObject,
  generateThemeStylesheet,
  applyCSSVariables,
  clearCSSVariables,
  getSSRStyleTag,
  injectThemeStyles,
} from './themes/css-variables';

// Theme Utilities
export {
  getThemeForGrade,
  getThemeIdForGrade,
  getThemeById,
  mergeThemeWithSensoryProfile,
  mergeThemeOverrides,
  getContrastColor,
  getContrastRatio,
  meetsContrastRequirements,
  verifyThemeAccessibility,
  getAvailableThemes,
  getThemeLabels,
  getSystemDarkModePreference,
  getSystemReducedMotionPreference,
  createTheme,
  loadPersistedTheme,
  persistTheme,
  THEME_STORAGE_KEY,
  SENSORY_PROFILE_STORAGE_KEY,
} from './themes/utils';
export type { ThemeOverrides } from './themes/utils';

export { Button } from './components/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button';
export { Card } from './components/card';
export type { CardProps, CardVariant } from './components/card';
export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/ui/card';
export { Badge } from './components/badge';
export { Heading } from './components/heading';
export { GradeThemeToggle } from './components/grade-theme-toggle';
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog';

// Additional UI primitives
export { Alert, AlertTitle, AlertDescription } from './components/ui/alert';
export { Input } from './components/ui/input';
export type { InputProps, InputVariant, InputSize } from './components/ui/input';
export { Label } from './components/ui/label';
export { Textarea } from './components/ui/textarea';
export { Switch } from './components/ui/switch';
export { ScrollArea } from './components/ui/scroll-area';
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
export { Progress } from './components/ui/progress';
export type { ProgressProps, ProgressVariant, ProgressSize, ProgressColor } from './components/ui/progress';
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/ui/accordion';
export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';

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

// Games Components - Adaptive Games and Focus Games
export {
  AdaptiveGameCard,
  AdaptiveGameGrid,
  FocusGameCard,
  FocusGamePlayer,
  GameProgressTracker,
  GameDifficultySelector,
} from './components/games';
export type {
  AdaptiveGameCardProps,
  AdaptiveGameGridProps,
  FocusGameCardProps,
  FocusGamePlayerProps,
  GameProgressTrackerProps,
  GameDifficultySelectorProps,
  GameType,
  GameDifficulty,
  GameSession,
  FocusMetrics,
} from './components/games';

// Gamification Components - Teams, Competitions, and Achievements
export {
  TeamCard,
  TeamGrid,
  TeamLeaderboard,
  CompetitionCard,
  CompetitionBracket,
  TeamChallengeCreator,
  TeamProgressWidget,
  AchievementBadge,
  AchievementGrid,
} from './components/gamification';
export type {
  TeamCardProps,
  TeamGridProps,
  TeamLeaderboardProps,
  CompetitionCardProps,
  CompetitionBracketProps,
  TeamChallengeCreatorProps,
  TeamProgressWidgetProps,
  Team,
  TeamMember,
  Competition,
  CompetitionStatus,
  AchievementBadgeProps,
  AchievementGridProps,
  AchievementRarity,
  AchievementSize,
  AchievementStyle,
} from './components/gamification';

// Notification Components
export {
  NotificationCenter,
  NotificationItem,
  NotificationFilters,
  NotificationBadge,
  NotificationPreferences,
  WebPushProvider,
  WebPushManager,
  NotificationApiClient,
} from './components/notifications';
