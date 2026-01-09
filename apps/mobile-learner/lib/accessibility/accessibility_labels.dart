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

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH-010: Additional comprehensive accessibility labels
  // ═══════════════════════════════════════════════════════════════════════════

  // === Regulation Activities ===

  static String regulationActivity(String name, String category, int durationSeconds) {
    final minutes = (durationSeconds / 60).ceil();
    return '$name. $category activity. About $minutes ${minutes == 1 ? "minute" : "minutes"}.';
  }

  static String regulationCategory(String category) {
    switch (category.toLowerCase()) {
      case 'breathing':
        return 'Breathing exercises to help calm down';
      case 'grounding':
        return 'Grounding exercises to feel present';
      case 'movement':
        return 'Movement activities to release energy';
      case 'sensory':
        return 'Sensory activities for body awareness';
      case 'counting':
        return 'Counting exercises for focus';
      default:
        return '$category activities';
    }
  }

  static String breathingStep(String instruction, int durationSeconds) =>
      '$instruction for $durationSeconds seconds';

  static String regulationProgress(int currentStep, int totalSteps) =>
      'Step $currentStep of $totalSteps';

  static const String startRegulationActivity = 'Start activity';
  static const String pauseRegulationActivity = 'Pause activity';
  static const String resumeRegulationActivity = 'Resume activity';
  static const String stopRegulationActivity = 'Stop activity';
  static const String regulationActivityComplete = 'Activity complete. Great job!';

  // === Homework Helper ===

  static String homeworkTask(String title, String subject, bool completed) =>
      '$title. $subject homework. ${completed ? "Completed" : "Not completed"}.';

  static String homeworkSteps(int current, int total) =>
      'Step $current of $total';

  static String homeworkDueDate(String dueDate) =>
      'Due: $dueDate';

  static const String homeworkNextStep = 'Go to next step';
  static const String homeworkPreviousStep = 'Go to previous step';
  static const String homeworkSubmit = 'Submit homework';
  static const String homeworkSaveProgress = 'Save progress';
  static const String homeworkNeedHelp = 'I need help';

  // === Visual Schedule ===

  static String scheduleItem(String title, String time, bool isCurrent, bool isComplete) {
    var label = '$title at $time';
    if (isCurrent) label += '. Currently active';
    if (isComplete) label += '. Completed';
    return label;
  }

  static String scheduleTimeRemaining(int minutes) =>
      minutes == 1 ? '1 minute remaining' : '$minutes minutes remaining';

  static const String scheduleHeader = 'Your schedule for today';
  static const String scheduleEmpty = 'No activities scheduled';
  static const String scheduleNextActivity = 'Next activity';
  static const String schedulePreviousActivity = 'Previous activity';

  // === Motor Accommodation Controls ===

  static const String voiceInputButton = 'Use voice input';
  static const String voiceInputListening = 'Listening for voice input';
  static const String voiceInputStopped = 'Voice input stopped';

  static String largeTouchTarget(String action) =>
      'Enlarged button: $action';

  static const String dwellSelectionEnabled = 'Hold to select enabled';
  static String dwellProgress(int percentage) =>
      'Selection progress: $percentage percent';

  static const String switchAccessNext = 'Move to next item';
  static const String switchAccessSelect = 'Select current item';
  static const String switchAccessBack = 'Go back';

  static const String dragAssistActive = 'Drag assistance active';
  static const String tremorFilterActive = 'Touch smoothing active';

  // === Sensory Accommodations ===

  static const String reducedMotionEnabled = 'Reduced motion enabled';
  static const String highContrastEnabled = 'High contrast enabled';
  static const String audioDescriptionEnabled = 'Audio descriptions enabled';

  static String soundLevel(String label, int percentage) =>
      '$label sound level: $percentage percent';

  static const String muteAllSounds = 'Mute all sounds';
  static const String unmuteAllSounds = 'Unmute all sounds';

  static String visualComplexity(String level) =>
      'Visual complexity: $level';

  // === Emotional Check-In ===

  static String emotionOption(String emotion, bool selected) =>
      '$emotion. ${selected ? "Selected" : "Tap to select"}.';

  static String emotionIntensity(int level) {
    switch (level) {
      case 1:
        return 'A little bit';
      case 2:
        return 'Somewhat';
      case 3:
        return 'Moderately';
      case 4:
        return 'Quite a bit';
      case 5:
        return 'Very much';
      default:
        return 'Intensity level $level';
    }
  }

  static const String submitEmotionCheckIn = 'Submit how you feel';
  static const String skipEmotionCheckIn = 'Skip for now';

  // === Session States ===

  static const String sessionStarting = 'Session starting';
  static const String sessionInProgress = 'Session in progress';
  static const String sessionPaused = 'Session paused';
  static const String sessionResuming = 'Session resuming';
  static const String sessionEnding = 'Session ending';

  static String sessionTimeElapsed(int minutes, int seconds) =>
      'Time elapsed: $minutes minutes and $seconds seconds';

  static String questionNumber(int current, int total) =>
      'Question $current of $total';

  // === Offline Status ===

  static const String offlineMode = 'You are offline. Some features may be limited.';
  static const String onlineMode = 'Connected to the internet';
  static const String syncingData = 'Syncing your progress';
  static const String syncComplete = 'Sync complete';
  static String pendingSync(int count) =>
      count == 1 ? '1 item waiting to sync' : '$count items waiting to sync';

  // === Predictability Support ===

  static String activityCountdown(int seconds) =>
      seconds == 1 ? 'Starting in 1 second' : 'Starting in $seconds seconds';

  static String transitionWarning(String nextActivity, int seconds) =>
      'Moving to $nextActivity in $seconds seconds';

  static const String activityWillChange = 'Activity will change soon';
  static const String activityChanged = 'Activity changed';

  // === Teams/Collaboration ===

  static String teamMember(String name, bool isOnline) =>
      '$name. ${isOnline ? "Online" : "Offline"}.';

  static String teamProgress(int completedMembers, int totalMembers) =>
      '$completedMembers of $totalMembers team members completed';

  // === Focus Games ===

  static String focusGameScore(int score, int target) =>
      'Score: $score. Target: $target.';

  static String focusGameRound(int current, int total) =>
      'Round $current of $total';

  static const String focusGameStart = 'Start game';
  static const String focusGamePause = 'Pause game';
  static const String focusGameResume = 'Resume game';
  static const String focusGameEnd = 'End game';

  // === Calming Interventions ===

  static const String calmingBreakAvailable = 'Would you like to take a calming break?';
  static const String calmingBreakAccept = 'Yes, take a break';
  static const String calmingBreakDecline = 'No, continue';

  static String calmingActivitySuggestion(String activityName) =>
      'Suggested activity: $activityName. Tap to start.';

  // === Parent/Teacher Messages ===

  static String messageFrom(String sender) =>
      'Message from $sender';

  static String unreadMessages(int count) =>
      count == 1 ? '1 unread message' : '$count unread messages';

  // === Error Messages ===

  static const String errorOccurred = 'An error occurred';
  static const String errorLoadingContent = 'Could not load content';
  static const String errorSubmitting = 'Could not submit your response';
  static const String errorConnecting = 'Could not connect to the server';

  // === Confirmation Messages ===

  static const String confirmSaved = 'Your progress has been saved';
  static const String confirmSubmitted = 'Your response has been submitted';
  static const String confirmCompleted = 'Activity completed successfully';
}
