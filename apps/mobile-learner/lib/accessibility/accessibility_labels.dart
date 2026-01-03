/// Accessibility labels for screen readers
///
/// Provides semantic labels for UI elements that aren't self-describing.
library;

/// Labels for common UI patterns
abstract class A11yLabels {
  // Navigation
  static const String backButton = 'Go back';
  static const String closeButton = 'Close';
  static const String menuButton = 'Open menu';
  static const String refreshButton = 'Refresh content';
  static const String settingsButton = 'Open settings';

  // Loading states
  static const String loading = 'Loading';
  static const String loadingActivities = 'Loading activities';
  static const String loadingProgress = 'Loading your progress';

  // Error states
  static const String errorIcon = 'Error';
  static const String retryButton = 'Try again';

  // Activity types
  static String activityCard(String title, String type, int minutes) =>
      '$title. $type activity. About $minutes minutes.';

  static String activityProgress(int current, int total) =>
      'Activity $current of $total';

  // Progress indicators
  static String levelProgress(int level, int currentXP, int totalXP) =>
      'Level $level. $currentXP of $totalXP experience points.';

  static String streakCount(int days) =>
      days == 1 ? '1 day streak' : '$days day streak';

  static String streakStatus(bool completed) => completed
      ? 'Streak completed for today'
      : 'Complete an activity to maintain your streak';

  static String freezesAvailable(int count) =>
      count == 1 ? '1 freeze available' : '$count freezes available';

  // Daily goals
  static String dailyGoalProgress(int completed, int total) =>
      '$completed of $total daily goals completed';

  static String goalItem(String title, bool completed) =>
      '$title. ${completed ? "Completed" : "Not completed"}';

  // Difficulty levels
  static String difficultyLevel(int level) {
    switch (level) {
      case 1:
        return 'Very easy difficulty';
      case 2:
        return 'Easy difficulty';
      case 3:
        return 'Medium difficulty';
      case 4:
        return 'Hard difficulty';
      case 5:
        return 'Very hard difficulty';
      default:
        return 'Difficulty level $level of 5';
    }
  }

  // Achievements
  static String achievementCard(String name, String description, bool earned) =>
      '$name. $description. ${earned ? "Earned" : "Not yet earned"}.';

  static String achievementProgress(int current, int total) =>
      '$current of $total progress toward this achievement';

  // Badges
  static String badge(String name, bool earned) =>
      '$name badge. ${earned ? "Earned" : "Locked"}.';

  // Leaderboard
  static String leaderboardPosition(int position, String name, int points) =>
      'Position $position: $name with $points points';

  // Challenges
  static String challengeCard(String title, int current, int total, String timeLeft) =>
      '$title. Progress: $current of $total. Time remaining: $timeLeft.';

  // Emotional support
  static String feelingSelector(String feeling, bool selected) =>
      '$feeling. ${selected ? "Selected" : "Tap to select"}.';

  static const String calmingBreakButton = 'Take a calming break';
  static const String skipBreakButton = 'Skip break';

  // Answers
  static String answerOption(String text, int index, bool selected) =>
      'Option ${index + 1}: $text. ${selected ? "Selected" : ""}';

  static const String submitAnswer = 'Submit answer';
  static const String nextQuestion = 'Next question';

  // Timer
  static String timeRemaining(int minutes, int seconds) =>
      '$minutes minutes and $seconds seconds remaining';

  // Session completion
  static String sessionComplete(int score, int total) =>
      'Session complete. You scored $score out of $total.';

  static String starsEarned(int stars) =>
      stars == 1 ? '1 star earned' : '$stars stars earned';
}
