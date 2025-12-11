/// Explainability copy strings for Flutter apps.
///
/// These strings follow neurodiversity-aware, strength-based guidelines.
/// See docs/explainability/copy_guidelines.md for principles.
library;

/// Copy strings for explainability features.
///
/// Usage:
/// ```dart
/// Text(ExplainabilityCopy.whyThis.titleActivity);
/// Text(ExplainabilityCopy.disclaimer.aiLimits);
/// ```
class ExplainabilityCopy {
  const ExplainabilityCopy._();

  static const whyThis = _WhyThisCopy._();
  static const disclaimer = _DisclaimerCopy._();
  static const emptyState = _EmptyStateCopy._();
  static const error = _ErrorCopy._();
  static const encouragement = _EncouragementCopy._();
  static const difficulty = _DifficultyCopy._();
  static const actionType = _ActionTypeCopy._();
  static const common = _CommonCopy._();
}

/// "Why This" explanation copy.
class _WhyThisCopy {
  const _WhyThisCopy._();

  // Titles
  String get titleActivity => 'Why Aivo chose this activity';
  String get titleRecommendation => 'Why we suggest this';
  String get titleDifficultyChange => 'About this adjustment';
  String get titlePlanChange => "About today's learning plan";

  // Fallbacks
  String get fallbackNoDetails =>
      "Aivo used your child's recent work and learning goals to choose this activity. Detailed explanations aren't available for this one yet.";
  String get fallbackNoExplanation =>
      "We don't have a detailed explanation for this yet. Aivo used recent activity and goals to make this choice.";
  String get fallbackStillLearning =>
      "We're still getting to know your learner. After a few sessions, we'll show more detailed insights here.";

  // Intro phrases
  String get introContentSelection => 'We chose this activity because';
  String get introDifficultyAdjustment => 'We adjusted the difficulty because';
  String get introPlanUpdate => "We updated today's plan because";
  String get introFocusBreak => 'We suggested a break because';
}

/// Disclaimer copy.
class _DisclaimerCopy {
  const _DisclaimerCopy._();

  String get aiLimits =>
      'Aivo uses AI to support learning. It can make mistakes and is not a medical or diagnostic tool.';
  String get suggestions =>
      "Aivo's suggestions are based on patterns in your child's recent work. They may not always be perfect.";
  String get partnership =>
      'You know your child best. These suggestions work best when combined with your own observations.';
  String get notDiagnostic =>
      'Aivo is an educational tool, not a diagnostic system. It cannot identify or diagnose learning differences.';
}

/// Empty state copy.
class _EmptyStateCopy {
  const _EmptyStateCopy._();

  String get noActivity =>
      "We're still getting to know your learner. After a few sessions, we'll show more detailed insights here.";
  String get noProgress =>
      'Progress data will appear here after your child completes some activities. Every bit of practice helps build skills!';
  String get noInsights =>
      "We're gathering information to provide helpful insights. Check back soon!";
}

/// Error state copy.
class _ErrorCopy {
  const _ErrorCopy._();

  String get loadFailed =>
      "We couldn't load the explanation right now. The activity will still work normally. Please try again later.";
  String get generic =>
      'Something went wrong on our end. Please try again in a moment.';
  String get offline =>
      "It looks like you're offline. Please check your connection and try again.";
}

/// Encouragement copy.
class _EncouragementCopy {
  const _EncouragementCopy._();

  String get progress => 'Keep up the great work!';
  String get practice => 'Every bit of practice helps build skills.';
  String get patience => "Learning takes time, and that's okay.";
  String get journey =>
      "Progress isn't always a straight line, and that's perfectly normal.";
  String get effort => 'Effort and practice are what matter most.';
}

/// Difficulty change copy.
class _DifficultyCopy {
  const _DifficultyCopy._();

  String get increased =>
      "Building on recent success, we're introducing more challenging content.";
  String get decreased =>
      'Taking time to strengthen foundational skills before moving forward.';
  String get maintained =>
      'Continuing practice at the current level to build confidence.';

  /// Get appropriate copy for a difficulty change direction.
  String forChange(DifficultyDirection direction) {
    switch (direction) {
      case DifficultyDirection.increased:
        return increased;
      case DifficultyDirection.decreased:
        return decreased;
      case DifficultyDirection.maintained:
        return maintained;
    }
  }
}

/// Action type display names.
class _ActionTypeCopy {
  const _ActionTypeCopy._();

  String get contentSelection => 'Activity Selection';
  String get difficultyChange => 'Difficulty Adjustment';
  String get focusBreak => 'Break Suggestion';
  String get planUpdate => 'Plan Update';
  String get moduleRecommendation => 'Module Recommendation';
  String get scaffolding => 'Support Adjustment';
}

/// Common UI copy.
class _CommonCopy {
  const _CommonCopy._();

  String get viewExplanation => 'View Explanation';
  String get learnMore => 'Learn More';
  String get viewDetails => 'View Details';
  String get tryAgain => 'Try Again';
  String get close => 'Close';
  String get dismiss => 'Dismiss';
  String get loading => 'Loading...';
}

/// Direction of difficulty change.
enum DifficultyDirection {
  increased,
  decreased,
  maintained,
}

/// Teacher-specific copy strings.
class TeacherCopy {
  const TeacherCopy._();

  static const whyThis = _TeacherWhyThisCopy._();
  static const disclaimer = _TeacherDisclaimerCopy._();
  static const emptyState = _TeacherEmptyStateCopy._();
  static const dataQuality = _DataQualityCopy._();
}

class _TeacherWhyThisCopy {
  const _TeacherWhyThisCopy._();

  String get titleRecommendation => 'How this recommendation was decided';
  String get titleDifficultyChange => 'Difficulty adjustment details';
  String get titlePlanChange => 'Plan modification details';
  String get titleIntervention => 'Suggested intervention rationale';

  String get fallbackNoDetails =>
      'This recommendation is based on recent learner activity and assessment data. Detailed reasoning is not available for this suggestion.';
  String get fallbackNoExplanation =>
      "Detailed explanation data isn't available. The suggestion is based on patterns in the learner's recent work.";
}

class _TeacherDisclaimerCopy {
  const _TeacherDisclaimerCopy._();

  String get professionalJudgment =>
      "Use your professional judgment. Aivo's suggestions are one input among many.";
  String get dataLimits =>
      'These insights are based on available data and may not capture the full picture of student learning.';
  String get notPrescriptive =>
      'These are suggestions, not prescriptions. You know your students best.';
  String get supplementary =>
      'AI-generated insights should supplement, not replace, your professional expertise and direct observations.';
}

class _TeacherEmptyStateCopy {
  const _TeacherEmptyStateCopy._();

  String get noData =>
      "We don't have enough data yet to provide insights. After students complete a few activities, recommendations will appear here.";
  String get noRecommendations =>
      'No specific recommendations at this time. Continue with your planned instruction.';
  String get newStudent =>
      "We're still gathering data for this student. Insights will become available as they complete more activities.";
}

class _DataQualityCopy {
  const _DataQualityCopy._();

  String get highConfidence => 'Based on substantial recent activity data';
  String get mediumConfidence => 'Based on limited recent data';
  String get lowConfidence => 'Based on minimal data—interpret with caution';
  String get staleData => 'Based on data that may be outdated';
}

/// Banned phrases that should never appear in user-facing copy.
///
/// Used for lint testing to catch violations of copy guidelines.
class BannedPhrases {
  const BannedPhrases._();

  /// Negative labels
  static const negativeLabels = [
    'lazy',
    'bad student',
    'stupid',
    'dumb',
    'slow learner',
    'not smart',
    'incapable',
    'hopeless',
    'worthless',
  ];

  /// Comparative judgments
  static const comparativeJudgments = [
    'behind others',
    'behind grade level',
    'below average',
    'worse than',
    'failing compared',
    'not keeping up',
    'falling behind',
    'lagging',
  ];

  /// Diagnostic language
  static const diagnosticLanguage = [
    'has adhd',
    'has add',
    'is autistic',
    'is dyslexic',
    'learning disabled',
    'mentally',
    'disorder',
    'deficit',
    'syndrome',
    'diagnosis',
    'diagnosed with',
    'suffers from',
  ];

  /// Fear-inducing language
  static const fearInducing = [
    'urgent action required',
    'critical failure',
    'emergency',
    'danger',
    'crisis',
    'severe',
    'alarming',
  ];

  /// Absolutist negative language
  static const absolutistNegative = [
    "can't learn",
    "won't ever",
    'impossible for',
    'never able',
    'always fails',
    'always struggles',
  ];

  /// All banned phrases combined.
  static List<String> get all => [
        ...negativeLabels,
        ...comparativeJudgments,
        ...diagnosticLanguage,
        ...fearInducing,
        ...absolutistNegative,
      ];

  /// Check if a string contains any banned phrases.
  static bool containsBannedPhrase(String text) {
    final lowerText = text.toLowerCase();
    return all.any((phrase) => lowerText.contains(phrase.toLowerCase()));
  }

  /// Find all banned phrases in a string.
  static List<String> findBannedPhrases(String text) {
    final lowerText = text.toLowerCase();
    return all
        .where((phrase) => lowerText.contains(phrase.toLowerCase()))
        .toList();
  }
}
