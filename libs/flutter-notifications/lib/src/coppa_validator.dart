/// COPPA Compliance Validator for Learner Notifications
///
/// Ensures all notifications sent to children comply with
/// Children's Online Privacy Protection Act (COPPA) requirements.
library;

/// COPPA-compliant notification types for learners
/// Only educational and encouraging content
enum LearnerNotificationType {
  /// Achievement unlocked - celebrates learning milestones
  achievementUnlocked,

  /// Streak milestone - encourages consistent learning
  streakMilestone,

  /// Session reminder - parent-controlled gentle reminder
  sessionReminder,

  /// Encouragement - positive reinforcement during learning
  encouragement,

  /// Level up - celebrates skill progression
  levelUp,
}

/// Validates notification content for COPPA compliance
class CoppaNotificationValidator {
  /// Terms that are not allowed in child-directed notifications
  static const _blockedTerms = [
    // Commercial/Marketing
    'buy',
    'purchase',
    'subscribe',
    'upgrade',
    'premium',
    'pay',
    'cost',
    'price',
    'money',
    'dollar',
    'credit',
    'debit',
    'sale',
    'deal',
    'offer',
    'discount',
    'free trial',
    'unlock for',

    // Urgency/Manipulation
    'limited time',
    'act now',
    'don\'t miss',
    'hurry',
    'last chance',
    'expires',
    'running out',
    'before it\'s gone',
    'only today',
    'urgent',
    'immediately',

    // Social pressure
    'everyone is',
    'your friends',
    'be the first',
    'don\'t be left',
    'join now',
    'missing out',
    'fomo',

    // Personal data requests
    'share your',
    'tell us',
    'give us',
    'enter your',
    'provide your',
    'personal information',
    'phone number',
    'address',
    'email',
    'location',
  ];

  /// Allowed positive terms for child-appropriate messaging
  static const _encouragedTerms = [
    'great job',
    'well done',
    'amazing',
    'fantastic',
    'wonderful',
    'excellent',
    'keep it up',
    'you did it',
    'proud',
    'awesome',
    'learning',
    'growing',
    'improving',
    'progress',
    'achievement',
    'milestone',
    'star',
    'champion',
  ];

  /// Validate notification content is COPPA compliant
  ///
  /// Returns true if content is safe for children
  static bool isCompliant(String title, String body) {
    final combined = '$title $body'.toLowerCase();

    // Check for blocked terms
    for (final term in _blockedTerms) {
      if (combined.contains(term.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /// Get detailed compliance check result
  static CoppaComplianceResult checkCompliance(String title, String body) {
    final combined = '$title $body'.toLowerCase();
    final violations = <String>[];

    for (final term in _blockedTerms) {
      if (combined.contains(term.toLowerCase())) {
        violations.add(term);
      }
    }

    return CoppaComplianceResult(
      isCompliant: violations.isEmpty,
      violations: violations,
      title: title,
      body: body,
    );
  }

  /// Sanitize content by removing non-compliant terms
  ///
  /// Note: This is a fallback - content should be compliant from the start
  static String sanitize(String content) {
    var sanitized = content;

    for (final term in _blockedTerms) {
      sanitized = sanitized.replaceAll(
        RegExp(term, caseSensitive: false),
        '',
      );
    }

    // Clean up extra whitespace
    sanitized = sanitized.replaceAll(RegExp(r'\s+'), ' ').trim();

    return sanitized;
  }

  /// Check if notification type is allowed for learners
  static bool isAllowedType(String type) {
    const allowedTypes = {
      'achievement_unlocked',
      'streak_milestone',
      'session_reminder',
      'encouragement',
      'level_up',
      'progress_milestone',
    };

    return allowedTypes.contains(type);
  }

  /// Get COPPA-compliant encouragement messages
  static List<String> get encouragementMessages => const [
        'You\'re doing amazing! Keep learning! 🌟',
        'Every step forward is progress! 📚',
        'Your brain is growing stronger! 🧠',
        'Learning is your superpower! ⚡',
        'You\'re becoming smarter every day! 🎓',
        'Great effort today! You should be proud! 🏆',
        'Keep up the fantastic work! 🎉',
        'You\'re a learning champion! 👑',
      ];
}

/// Result of COPPA compliance check
class CoppaComplianceResult {
  final bool isCompliant;
  final List<String> violations;
  final String title;
  final String body;

  const CoppaComplianceResult({
    required this.isCompliant,
    required this.violations,
    required this.title,
    required this.body,
  });

  @override
  String toString() {
    if (isCompliant) {
      return 'CoppaComplianceResult: COMPLIANT';
    }
    return 'CoppaComplianceResult: NON-COMPLIANT - Violations: ${violations.join(", ")}';
  }
}

/// Age-appropriate content guidelines
class AgeAppropriateContent {
  /// Get appropriate greeting for age group
  static String getGreeting(int age) {
    if (age < 8) {
      return 'Hi there! 👋';
    } else if (age < 13) {
      return 'Hey! 🙌';
    } else {
      return 'Hello! 👋';
    }
  }

  /// Get appropriate celebration for age group
  static String getCelebration(int age) {
    if (age < 8) {
      return '🎉 Yay! You did it! 🌟';
    } else if (age < 13) {
      return '🎉 Awesome job! 💪';
    } else {
      return '🎉 Great work! 👏';
    }
  }

  /// Get appropriate reminder message for age group
  static String getReminderMessage(int age, String activity) {
    if (age < 8) {
      return 'Ready for some fun learning? 📚';
    } else if (age < 13) {
      return 'Time to continue your $activity adventure! 🚀';
    } else {
      return 'Don\'t forget your $activity session today! 📖';
    }
  }
}
