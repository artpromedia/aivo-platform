// Utility functions
export { cn } from './lib/utils';

// Legacy theme exports (for backward compatibility)
export { createGradeThemePlugin } from './tailwind/gradeThemePlugin';
export { GradeThemeProvider as LegacyGradeThemeProvider, useGradeTheme as useLegacyGradeTheme } from './theme/grade-theme';
export { AccessibilityProvider, useAccessibility } from './theme/accessibility';
export { AriaLiveProvider, AriaLiveRegion, useAriaLive } from './components/accessibility/AriaLiveRegion';
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

// Localization System
export {
  LocaleProvider,
  useLocale,
  useTranslations,
} from './providers/LocaleProvider';
export type {
  LocaleProviderProps,
  LocaleContextValue,
  TranslationMessages,
} from './providers/LocaleProvider';

export { LocaleSwitcher } from './components/locale-switcher';
export type { LocaleSwitcherProps, LocaleSwitcherVariant } from './components/locale-switcher';

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

// Formatted Components (Localized display)
export {
  FormattedCurrency,
  FormattedPercent,
  FormattedCompactNumber,
  FormattedDateTime,
  FormattedTimeAgo,
  FormattedOrdinal,
  FormattedUnit,
  FormattedRange,
  FormattedLanguageName,
  FormattedListItems,
  FormattedPluralText,
  FormattedScore,
  FormattedDuration,
  FormattedXP,
} from './components/formatted';
export type {
  FormattedCurrencyProps,
  FormattedPercentProps,
  FormattedCompactNumberProps,
  FormattedDateTimeProps,
  FormattedTimeAgoProps,
  FormattedOrdinalProps,
  FormattedUnitProps,
  FormattedRangeProps,
  FormattedLanguageNameProps,
  FormattedListItemsProps,
  FormattedPluralTextProps,
  FormattedScoreProps,
  FormattedDurationProps,
  FormattedXPProps,
} from './components/formatted';

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

// Toast Notification System
export {
  ToastProvider,
  Toaster,
  useToast,
} from './components/ui/toast';
export type {
  Toast,
  ToastVariant,
  ToastContextValue,
} from './components/ui/toast';

// Confirmation Dialog System
export {
  ConfirmDialog,
  ConfirmProvider,
  useConfirm,
} from './components/ui/confirm-dialog';
export type { ConfirmDialogProps } from './components/ui/confirm-dialog';

// Empty State Component
export { EmptyState } from './components/ui/empty-state';
export type { EmptyStateProps } from './components/ui/empty-state';

// ── Phase 1 — Mastery Shared Component Library ─────────────────────

// Course Components
export { CourseCard } from './components/course-card';
export type { CourseCardProps } from './components/course-card';
export { CourseGrid } from './components/course-grid';
export type { CourseGridProps } from './components/course-grid';

// Sidebar Navigation
export { Sidebar, useSidebar } from './components/sidebar';
export type { SidebarProps, SidebarItem as SidebarNavItem } from './components/sidebar';
export { SidebarLayout } from './components/sidebar-layout';
export type { SidebarLayoutProps } from './components/sidebar-layout';

// Dashboard Components
export { StatsCard } from './components/stats-card';
export type { StatsCardProps, TrendDirection } from './components/stats-card';
export { ProgressRing } from './components/progress-ring';
export type { ProgressRingProps } from './components/progress-ring';

// Filter & Search
export { CategoryFilter } from './components/category-filter';
export type { CategoryFilterProps, CategoryItem } from './components/category-filter';
export { SearchBar } from './components/search-bar';
export type { SearchBarProps } from './components/search-bar';

// Avatar Group
export { AvatarGroup } from './components/avatar-group';
export type { AvatarGroupProps, AvatarGroupItem } from './components/avatar-group';

// Video & Lesson
export { VideoPlayer } from './components/video-player';
export type { VideoPlayerProps, VideoChapter } from './components/video-player';
export { LessonNav } from './components/lesson-nav';
export type { LessonNavProps, LessonChapter, LessonItem } from './components/lesson-nav';

// Data Display
export { DataTable } from './components/data-table';
export type { DataTableProps, DataTableColumn, SortDirection } from './components/data-table';
export { Pagination } from './components/pagination';
export type { PaginationProps } from './components/pagination';

// Dropdown & Tooltip
export { Dropdown } from './components/dropdown';
export type { DropdownProps, DropdownItem, DropdownSection } from './components/dropdown';
export { Tooltip } from './components/tooltip';
export type { TooltipProps } from './components/tooltip';

// Loading & Navigation
export { Skeleton } from './components/skeleton';
export type { SkeletonProps, SkeletonVariant } from './components/skeleton';
export { BreadcrumbNav } from './components/breadcrumb-nav';
export type { BreadcrumbNavProps, BreadcrumbItem } from './components/breadcrumb-nav';
export { RatingStars } from './components/rating-stars';
export type { RatingStarsProps } from './components/rating-stars';

// Consent Management Components (GDPR/CCPA/LGPD)
export {
  ConsentProvider,
  ConsentBanner,
  ConsentPreferenceCenter,
  ConsentManagerButton,
  useConsent,
  type ConsentState,
  type ConsentActions,
  type ConsentContextValue,
  type ConsentPreferences,
  type ConsentBannerProps,
  type ConsentPreferenceCenterProps,
  type ConsentManagerButtonProps,
} from './components/consent-banner';
