/// Progress tracking models
library;

/// Weekly stat for a single day
class DailyStat {
  final String day;
  final int minutes;
  final int xp;

  const DailyStat({
    required this.day,
    required this.minutes,
    required this.xp,
  });

  factory DailyStat.fromJson(Map<String, dynamic> json) {
    return DailyStat(
      day: json['day'] as String,
      minutes: json['minutes'] as int,
      xp: json['xp'] as int,
    );
  }
}

/// Subject progress
class SubjectProgress {
  final String subject;
  final int progress;
  final String colorHex;
  final int lessonsCompleted;
  final int totalLessons;
  final int mastery;

  const SubjectProgress({
    required this.subject,
    required this.progress,
    required this.colorHex,
    required this.lessonsCompleted,
    required this.totalLessons,
    required this.mastery,
  });

  factory SubjectProgress.fromJson(Map<String, dynamic> json) {
    return SubjectProgress(
      subject: json['subject'] as String,
      progress: json['progress'] as int,
      colorHex: json['colorHex'] as String? ?? '#3B82F6',
      lessonsCompleted: json['lessonsCompleted'] as int,
      totalLessons: json['totalLessons'] as int,
      mastery: json['mastery'] as int,
    );
  }
}

/// Skill progress
class SkillProgress {
  final String skill;
  final int level;
  final int maxLevel;
  final String emoji;

  const SkillProgress({
    required this.skill,
    required this.level,
    required this.maxLevel,
    required this.emoji,
  });

  factory SkillProgress.fromJson(Map<String, dynamic> json) {
    return SkillProgress(
      skill: json['skill'] as String,
      level: json['level'] as int,
      maxLevel: json['maxLevel'] as int? ?? 5,
      emoji: json['emoji'] as String? ?? '📚',
    );
  }
}

/// Recent activity item
class RecentActivity {
  final String id;
  final String type;
  final String title;
  final int xp;
  final String time;
  final String emoji;

  const RecentActivity({
    required this.id,
    required this.type,
    required this.title,
    required this.xp,
    required this.time,
    required this.emoji,
  });

  factory RecentActivity.fromJson(Map<String, dynamic> json) {
    return RecentActivity(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      xp: json['xp'] as int,
      time: json['time'] as String,
      emoji: json['emoji'] as String? ?? '📖',
    );
  }
}

/// Overall progress summary
class ProgressSummary {
  final int totalMinutesThisWeek;
  final int totalXpThisWeek;
  final int currentStreak;
  final int lessonsCompleted;
  final List<DailyStat> weeklyStats;
  final List<SubjectProgress> subjectProgress;
  final List<SkillProgress> skills;
  final List<RecentActivity> recentActivity;

  const ProgressSummary({
    required this.totalMinutesThisWeek,
    required this.totalXpThisWeek,
    required this.currentStreak,
    required this.lessonsCompleted,
    required this.weeklyStats,
    required this.subjectProgress,
    required this.skills,
    required this.recentActivity,
  });

  factory ProgressSummary.fromJson(Map<String, dynamic> json) {
    return ProgressSummary(
      totalMinutesThisWeek: json['totalMinutesThisWeek'] as int,
      totalXpThisWeek: json['totalXpThisWeek'] as int,
      currentStreak: json['currentStreak'] as int,
      lessonsCompleted: json['lessonsCompleted'] as int,
      weeklyStats: (json['weeklyStats'] as List)
          .map((e) => DailyStat.fromJson(e as Map<String, dynamic>))
          .toList(),
      subjectProgress: (json['subjectProgress'] as List)
          .map((e) => SubjectProgress.fromJson(e as Map<String, dynamic>))
          .toList(),
      skills: (json['skills'] as List)
          .map((e) => SkillProgress.fromJson(e as Map<String, dynamic>))
          .toList(),
      recentActivity: (json['recentActivity'] as List)
          .map((e) => RecentActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Learning goal
class LearningGoal {
  final String id;
  final String title;
  final String description;
  final GoalType type;
  final int targetValue;
  final int currentValue;
  final DateTime? deadline;
  final GoalStatus status;
  final List<GoalObjective> objectives;

  const LearningGoal({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.targetValue,
    required this.currentValue,
    this.deadline,
    required this.status,
    this.objectives = const [],
  });

  double get progress => targetValue > 0 ? currentValue / targetValue : 0;
  bool get isComplete => currentValue >= targetValue;

  factory LearningGoal.fromJson(Map<String, dynamic> json) {
    return LearningGoal(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      type: GoalType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => GoalType.custom,
      ),
      targetValue: json['targetValue'] as int,
      currentValue: json['currentValue'] as int,
      deadline: json['deadline'] != null
          ? DateTime.parse(json['deadline'] as String)
          : null,
      status: GoalStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => GoalStatus.active,
      ),
      objectives: (json['objectives'] as List?)
              ?.map((e) => GoalObjective.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Goal type
enum GoalType {
  lessons('Lessons', GoalIcons.bookOutlined),
  minutes('Minutes', GoalIcons.timerOutlined),
  xp('XP', GoalIcons.starOutlined),
  streak('Streak', GoalIcons.localFireDepartmentOutlined),
  subject('Subject', GoalIcons.schoolOutlined),
  custom('Custom', GoalIcons.flagOutlined);

  const GoalType(this.label, this.iconName);
  final String label;
  final String iconName;
}

/// Goal status
enum GoalStatus {
  active,
  completed,
  paused,
  expired,
}

/// Goal objective (sub-goal)
class GoalObjective {
  final String id;
  final String title;
  final bool isComplete;

  const GoalObjective({
    required this.id,
    required this.title,
    required this.isComplete,
  });

  factory GoalObjective.fromJson(Map<String, dynamic> json) {
    return GoalObjective(
      id: json['id'] as String,
      title: json['title'] as String,
      isComplete: json['isComplete'] as bool? ?? false,
    );
  }
}

// Helper for icon lookup (renamed from Icons to avoid Flutter conflict)
class GoalIcons {
  static const bookOutlined = 'book_outlined';
  static const timerOutlined = 'timer_outlined';
  static const starOutlined = 'star_outlined';
  static const localFireDepartmentOutlined = 'local_fire_department_outlined';
  static const schoolOutlined = 'school_outlined';
  static const flagOutlined = 'flag_outlined';
}
