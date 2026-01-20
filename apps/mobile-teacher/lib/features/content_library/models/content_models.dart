/// Content Library Models
library;

/// Content type
enum ContentType {
  lesson('Lesson', 'lesson'),
  activity('Activity', 'activity'),
  assessment('Assessment', 'assessment'),
  video('Video', 'video'),
  reading('Reading', 'reading'),
  game('Game', 'game');

  const ContentType(this.label, this.value);
  final String label;
  final String value;
}

/// Subject area
enum SubjectArea {
  math('Math', 'math'),
  ela('ELA', 'ela'),
  science('Science', 'science'),
  socialStudies('Social Studies', 'social_studies'),
  sel('SEL', 'sel');

  const SubjectArea(this.label, this.value);
  final String label;
  final String value;
}

/// Grade level
enum GradeLevel {
  k('K', 'k'),
  g1('1st', '1'),
  g2('2nd', '2'),
  g3('3rd', '3'),
  g4('4th', '4'),
  g5('5th', '5'),
  g6('6th', '6'),
  g7('7th', '7'),
  g8('8th', '8');

  const GradeLevel(this.label, this.value);
  final String label;
  final String value;
}

/// Content item
class ContentItem {
  final String id;
  final String title;
  final String description;
  final ContentType type;
  final SubjectArea subject;
  final List<GradeLevel> gradeLevels;
  final int durationMinutes;
  final String? thumbnailUrl;
  final List<String> standards;
  final List<String> tags;
  final bool isFavorite;
  final bool isAssigned;
  final double rating;
  final int usageCount;

  const ContentItem({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.subject,
    required this.gradeLevels,
    this.durationMinutes = 0,
    this.thumbnailUrl,
    this.standards = const [],
    this.tags = const [],
    this.isFavorite = false,
    this.isAssigned = false,
    this.rating = 0,
    this.usageCount = 0,
  });

  factory ContentItem.fromJson(Map<String, dynamic> json) {
    return ContentItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: ContentType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => ContentType.lesson,
      ),
      subject: SubjectArea.values.firstWhere(
        (s) => s.value == json['subject'],
        orElse: () => SubjectArea.math,
      ),
      gradeLevels: (json['gradeLevels'] as List?)
              ?.map((g) => GradeLevel.values.firstWhere(
                    (gl) => gl.value == g,
                    orElse: () => GradeLevel.g3,
                  ))
              .toList() ??
          [],
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      standards: (json['standards'] as List?)?.cast<String>() ?? [],
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      isFavorite: json['isFavorite'] as bool? ?? false,
      isAssigned: json['isAssigned'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      usageCount: json['usageCount'] as int? ?? 0,
    );
  }
}

/// Lesson plan
class LessonPlan {
  final String id;
  final String title;
  final String objective;
  final SubjectArea subject;
  final List<GradeLevel> gradeLevels;
  final int durationMinutes;
  final List<LessonActivity> activities;
  final List<String> materials;
  final List<String> standards;
  final String? notes;
  final DateTime createdAt;
  final DateTime? scheduledFor;
  final LessonPlanStatus status;

  const LessonPlan({
    required this.id,
    required this.title,
    required this.objective,
    required this.subject,
    required this.gradeLevels,
    required this.durationMinutes,
    this.activities = const [],
    this.materials = const [],
    this.standards = const [],
    this.notes,
    required this.createdAt,
    this.scheduledFor,
    this.status = LessonPlanStatus.draft,
  });
}

/// Lesson plan status
enum LessonPlanStatus {
  draft('Draft', 'draft'),
  scheduled('Scheduled', 'scheduled'),
  completed('Completed', 'completed'),
  archived('Archived', 'archived');

  const LessonPlanStatus(this.label, this.value);
  final String label;
  final String value;
}

/// Lesson activity
class LessonActivity {
  final String id;
  final String title;
  final String description;
  final int durationMinutes;
  final ActivityPhase phase;
  final ContentItem? linkedContent;

  const LessonActivity({
    required this.id,
    required this.title,
    required this.description,
    required this.durationMinutes,
    required this.phase,
    this.linkedContent,
  });
}

/// Activity phase
enum ActivityPhase {
  warmup('Warm-up'),
  instruction('Direct Instruction'),
  guided('Guided Practice'),
  independent('Independent Practice'),
  assessment('Assessment'),
  closure('Closure');

  const ActivityPhase(this.label);
  final String label;
}

/// Classroom analytics
class ClassroomAnalytics {
  final String classId;
  final String className;
  final int totalStudents;
  final int activeStudents;
  final double averageEngagement;
  final double averageMastery;
  final int lessonsCompleted;
  final int assignmentsGraded;
  final List<SubjectMetric> subjectMetrics;
  final List<WeeklyProgress> weeklyProgress;

  const ClassroomAnalytics({
    required this.classId,
    required this.className,
    required this.totalStudents,
    required this.activeStudents,
    required this.averageEngagement,
    required this.averageMastery,
    required this.lessonsCompleted,
    required this.assignmentsGraded,
    this.subjectMetrics = const [],
    this.weeklyProgress = const [],
  });
}

/// Subject metric
class SubjectMetric {
  final SubjectArea subject;
  final double averageScore;
  final double completionRate;
  final int strugglingCount;
  final int exceedingCount;

  const SubjectMetric({
    required this.subject,
    required this.averageScore,
    required this.completionRate,
    required this.strugglingCount,
    required this.exceedingCount,
  });
}

/// Weekly progress
class WeeklyProgress {
  final DateTime weekStart;
  final double engagement;
  final double mastery;
  final int activitiesCompleted;

  const WeeklyProgress({
    required this.weekStart,
    required this.engagement,
    required this.mastery,
    required this.activitiesCompleted,
  });
}

/// Professional development course
class PDCourse {
  final String id;
  final String title;
  final String description;
  final String? thumbnailUrl;
  final int durationHours;
  final double progressPercent;
  final bool isRequired;
  final DateTime? dueDate;
  final List<String> topics;
  final PDCourseStatus status;
  final String? certificateUrl;

  const PDCourse({
    required this.id,
    required this.title,
    required this.description,
    this.thumbnailUrl,
    required this.durationHours,
    this.progressPercent = 0,
    this.isRequired = false,
    this.dueDate,
    this.topics = const [],
    this.status = PDCourseStatus.notStarted,
    this.certificateUrl,
  });
}

/// PD Course status
enum PDCourseStatus {
  notStarted('Not Started'),
  inProgress('In Progress'),
  completed('Completed'),
  overdue('Overdue');

  const PDCourseStatus(this.label);
  final String label;
}

/// Certification
class Certification {
  final String id;
  final String name;
  final String issuedBy;
  final DateTime earnedAt;
  final DateTime? expiresAt;
  final String? certificateUrl;

  const Certification({
    required this.id,
    required this.name,
    required this.issuedBy,
    required this.earnedAt,
    this.expiresAt,
    this.certificateUrl,
  });
}
