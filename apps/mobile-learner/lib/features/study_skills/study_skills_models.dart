/// Study Skills Models
///
/// Data models for Note-Taking Templates, Study Guides, Memory Techniques, and Test Prep.

// Note-Taking Template Types
enum NoteTemplateType { cornell, outline, mindMap, twoColumn, custom }

enum NoteSectionType {
  heading,
  paragraph,
  bulletList,
  numberedList,
  table,
  image
}

class NoteSection {
  final String id;
  final String title;
  final NoteSectionType type;
  final String content;
  final int order;
  final SectionFormatting? formatting;

  NoteSection({
    required this.id,
    required this.title,
    required this.type,
    required this.content,
    required this.order,
    this.formatting,
  });

  factory NoteSection.fromJson(Map<String, dynamic> json) => NoteSection(
        id: json['id'] as String,
        title: json['title'] as String,
        type: NoteSectionType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => NoteSectionType.paragraph,
        ),
        content: json['content'] as String,
        order: json['order'] as int,
        formatting: json['formatting'] != null
            ? SectionFormatting.fromJson(json['formatting'])
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type.name,
        'content': content,
        'order': order,
        if (formatting != null) 'formatting': formatting!.toJson(),
      };

  NoteSection copyWith({
    String? id,
    String? title,
    NoteSectionType? type,
    String? content,
    int? order,
    SectionFormatting? formatting,
  }) =>
      NoteSection(
        id: id ?? this.id,
        title: title ?? this.title,
        type: type ?? this.type,
        content: content ?? this.content,
        order: order ?? this.order,
        formatting: formatting ?? this.formatting,
      );
}

class SectionFormatting {
  final bool bold;
  final bool italic;
  final bool underline;
  final String? color;
  final String? backgroundColor;

  SectionFormatting({
    this.bold = false,
    this.italic = false,
    this.underline = false,
    this.color,
    this.backgroundColor,
  });

  factory SectionFormatting.fromJson(Map<String, dynamic> json) =>
      SectionFormatting(
        bold: json['bold'] as bool? ?? false,
        italic: json['italic'] as bool? ?? false,
        underline: json['underline'] as bool? ?? false,
        color: json['color'] as String?,
        backgroundColor: json['backgroundColor'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'bold': bold,
        'italic': italic,
        'underline': underline,
        if (color != null) 'color': color,
        if (backgroundColor != null) 'backgroundColor': backgroundColor,
      };
}

class NoteTemplate {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final NoteTemplateType type;
  final List<NoteSection> sections;
  final String? backgroundColor;
  final int? fontSize;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String> tags;

  NoteTemplate({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.type,
    required this.sections,
    this.backgroundColor,
    this.fontSize,
    required this.createdAt,
    required this.updatedAt,
    required this.tags,
  });

  factory NoteTemplate.fromJson(Map<String, dynamic> json) => NoteTemplate(
        id: json['id'] as String,
        userId: json['userId'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        type: NoteTemplateType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => NoteTemplateType.custom,
        ),
        sections: (json['sections'] as List<dynamic>?)
                ?.map((e) => NoteSection.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        backgroundColor: json['backgroundColor'] as String?,
        fontSize: json['fontSize'] as int?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'name': name,
        if (description != null) 'description': description,
        'type': type.name,
        'sections': sections.map((s) => s.toJson()).toList(),
        if (backgroundColor != null) 'backgroundColor': backgroundColor,
        if (fontSize != null) 'fontSize': fontSize,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'tags': tags,
      };
}

class Note {
  final String id;
  final String userId;
  final String? templateId;
  final String subject;
  final String title;
  final List<NoteSection> sections;
  final DateTime lastEdited;
  final int wordCount;
  final List<String> tags;

  Note({
    required this.id,
    required this.userId,
    this.templateId,
    required this.subject,
    required this.title,
    required this.sections,
    required this.lastEdited,
    required this.wordCount,
    required this.tags,
  });

  factory Note.fromJson(Map<String, dynamic> json) => Note(
        id: json['id'] as String,
        userId: json['userId'] as String,
        templateId: json['templateId'] as String?,
        subject: json['subject'] as String,
        title: json['title'] as String,
        sections: (json['sections'] as List<dynamic>?)
                ?.map((e) => NoteSection.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        lastEdited: DateTime.parse(json['lastEdited'] as String),
        wordCount: json['wordCount'] as int? ?? 0,
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        if (templateId != null) 'templateId': templateId,
        'subject': subject,
        'title': title,
        'sections': sections.map((s) => s.toJson()).toList(),
        'lastEdited': lastEdited.toIso8601String(),
        'wordCount': wordCount,
        'tags': tags,
      };
}

// Study Guide Types
enum StudyGuideSectionType {
  overview,
  keyTerms,
  practice,
  summary,
  quiz,
  resources
}

class StudyGuideSection {
  final String id;
  final String title;
  final StudyGuideSectionType type;
  final String content;
  final int order;

  StudyGuideSection({
    required this.id,
    required this.title,
    required this.type,
    required this.content,
    required this.order,
  });

  factory StudyGuideSection.fromJson(Map<String, dynamic> json) =>
      StudyGuideSection(
        id: json['id'] as String,
        title: json['title'] as String,
        type: StudyGuideSectionType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => StudyGuideSectionType.overview,
        ),
        content: json['content'] as String,
        order: json['order'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type.name,
        'content': content,
        'order': order,
      };
}

class KeyTerm {
  final String id;
  final String term;
  final String definition;
  final List<String>? examples;
  final String? category;

  KeyTerm({
    required this.id,
    required this.term,
    required this.definition,
    this.examples,
    this.category,
  });

  factory KeyTerm.fromJson(Map<String, dynamic> json) => KeyTerm(
        id: json['id'] as String,
        term: json['term'] as String,
        definition: json['definition'] as String,
        examples: (json['examples'] as List<dynamic>?)?.cast<String>(),
        category: json['category'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'term': term,
        'definition': definition,
        if (examples != null) 'examples': examples,
        if (category != null) 'category': category,
      };
}

enum QuestionType { multipleChoice, trueFalse, shortAnswer, essay }

enum QuestionDifficulty { easy, medium, hard }

class PracticeQuestion {
  final String id;
  final String question;
  final QuestionType type;
  final List<String>? options;
  final dynamic correctAnswer; // String or List<String>
  final String? explanation;
  final QuestionDifficulty difficulty;

  PracticeQuestion({
    required this.id,
    required this.question,
    required this.type,
    this.options,
    this.correctAnswer,
    this.explanation,
    required this.difficulty,
  });

  factory PracticeQuestion.fromJson(Map<String, dynamic> json) =>
      PracticeQuestion(
        id: json['id'] as String,
        question: json['question'] as String,
        type: QuestionType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => QuestionType.multipleChoice,
        ),
        options: (json['options'] as List<dynamic>?)?.cast<String>(),
        correctAnswer: json['correctAnswer'],
        explanation: json['explanation'] as String?,
        difficulty: QuestionDifficulty.values.firstWhere(
          (e) => e.name == json['difficulty'],
          orElse: () => QuestionDifficulty.medium,
        ),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'type': type.name,
        if (options != null) 'options': options,
        if (correctAnswer != null) 'correctAnswer': correctAnswer,
        if (explanation != null) 'explanation': explanation,
        'difficulty': difficulty.name,
      };
}

class StudyGuide {
  final String id;
  final String userId;
  final String subject;
  final String topic;
  final String? description;
  final List<StudyGuideSection> sections;
  final List<KeyTerm> keyTerms;
  final List<PracticeQuestion> practiceQuestions;
  final int estimatedStudyTime; // minutes
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String> tags;

  StudyGuide({
    required this.id,
    required this.userId,
    required this.subject,
    required this.topic,
    this.description,
    required this.sections,
    required this.keyTerms,
    required this.practiceQuestions,
    required this.estimatedStudyTime,
    required this.createdAt,
    required this.updatedAt,
    required this.tags,
  });

  factory StudyGuide.fromJson(Map<String, dynamic> json) => StudyGuide(
        id: json['id'] as String,
        userId: json['userId'] as String,
        subject: json['subject'] as String,
        topic: json['topic'] as String,
        description: json['description'] as String?,
        sections: (json['sections'] as List<dynamic>?)
                ?.map(
                    (e) => StudyGuideSection.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        keyTerms: (json['keyTerms'] as List<dynamic>?)
                ?.map((e) => KeyTerm.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        practiceQuestions: (json['practiceQuestions'] as List<dynamic>?)
                ?.map(
                    (e) => PracticeQuestion.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        estimatedStudyTime: json['estimatedStudyTime'] as int? ?? 30,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'subject': subject,
        'topic': topic,
        if (description != null) 'description': description,
        'sections': sections.map((s) => s.toJson()).toList(),
        'keyTerms': keyTerms.map((k) => k.toJson()).toList(),
        'practiceQuestions': practiceQuestions.map((q) => q.toJson()).toList(),
        'estimatedStudyTime': estimatedStudyTime,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'tags': tags,
      };
}

// Memory Technique Types
enum MemoryTechniqueType {
  mnemonic,
  visualization,
  chunking,
  association,
  storyMethod,
  custom
}

class MemoryTechnique {
  final String id;
  final String userId;
  final String name;
  final MemoryTechniqueType type;
  final String description;
  final List<String> steps;
  final List<String>? examples;
  final String? subject;
  final int effectiveness; // 1-5 rating
  final int timesUsed;
  final DateTime createdAt;
  final DateTime updatedAt;

  MemoryTechnique({
    required this.id,
    required this.userId,
    required this.name,
    required this.type,
    required this.description,
    required this.steps,
    this.examples,
    this.subject,
    required this.effectiveness,
    required this.timesUsed,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MemoryTechnique.fromJson(Map<String, dynamic> json) =>
      MemoryTechnique(
        id: json['id'] as String,
        userId: json['userId'] as String,
        name: json['name'] as String,
        type: MemoryTechniqueType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => MemoryTechniqueType.custom,
        ),
        description: json['description'] as String,
        steps: (json['steps'] as List<dynamic>?)?.cast<String>() ?? [],
        examples: (json['examples'] as List<dynamic>?)?.cast<String>(),
        subject: json['subject'] as String?,
        effectiveness: json['effectiveness'] as int? ?? 3,
        timesUsed: json['timesUsed'] as int? ?? 0,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'name': name,
        'type': type.name,
        'description': description,
        'steps': steps,
        if (examples != null) 'examples': examples,
        if (subject != null) 'subject': subject,
        'effectiveness': effectiveness,
        'timesUsed': timesUsed,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

enum MemoryCardDifficulty { easy, medium, hard }

class MemoryCard {
  final String id;
  final String userId;
  final String? techniqueId;
  final String front;
  final String back;
  final String subject;
  final String deck;
  final DateTime? lastReviewed;
  final DateTime? nextReview;
  final int correctCount;
  final int incorrectCount;
  final MemoryCardDifficulty difficulty;

  MemoryCard({
    required this.id,
    required this.userId,
    this.techniqueId,
    required this.front,
    required this.back,
    required this.subject,
    required this.deck,
    this.lastReviewed,
    this.nextReview,
    required this.correctCount,
    required this.incorrectCount,
    required this.difficulty,
  });

  factory MemoryCard.fromJson(Map<String, dynamic> json) => MemoryCard(
        id: json['id'] as String,
        userId: json['userId'] as String,
        techniqueId: json['techniqueId'] as String?,
        front: json['front'] as String,
        back: json['back'] as String,
        subject: json['subject'] as String,
        deck: json['deck'] as String,
        lastReviewed: json['lastReviewed'] != null
            ? DateTime.parse(json['lastReviewed'] as String)
            : null,
        nextReview: json['nextReview'] != null
            ? DateTime.parse(json['nextReview'] as String)
            : null,
        correctCount: json['correctCount'] as int? ?? 0,
        incorrectCount: json['incorrectCount'] as int? ?? 0,
        difficulty: MemoryCardDifficulty.values.firstWhere(
          (e) => e.name == json['difficulty'],
          orElse: () => MemoryCardDifficulty.medium,
        ),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        if (techniqueId != null) 'techniqueId': techniqueId,
        'front': front,
        'back': back,
        'subject': subject,
        'deck': deck,
        if (lastReviewed != null) 'lastReviewed': lastReviewed!.toIso8601String(),
        if (nextReview != null) 'nextReview': nextReview!.toIso8601String(),
        'correctCount': correctCount,
        'incorrectCount': incorrectCount,
        'difficulty': difficulty.name,
      };

  double get accuracy {
    final total = correctCount + incorrectCount;
    if (total == 0) return 0;
    return correctCount / total;
  }
}

// Test Prep Types
class StudySession {
  final String id;
  final DateTime date;
  final String time;
  final int duration; // minutes
  final List<String> topics;
  final List<String> activities;
  final bool isCompleted;
  final DateTime? completedAt;
  final String? notes;

  StudySession({
    required this.id,
    required this.date,
    required this.time,
    required this.duration,
    required this.topics,
    required this.activities,
    required this.isCompleted,
    this.completedAt,
    this.notes,
  });

  factory StudySession.fromJson(Map<String, dynamic> json) => StudySession(
        id: json['id'] as String,
        date: DateTime.parse(json['date'] as String),
        time: json['time'] as String,
        duration: json['duration'] as int,
        topics: (json['topics'] as List<dynamic>?)?.cast<String>() ?? [],
        activities:
            (json['activities'] as List<dynamic>?)?.cast<String>() ?? [],
        isCompleted: json['isCompleted'] as bool? ?? false,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String)
            : null,
        notes: json['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date.toIso8601String().split('T')[0],
        'time': time,
        'duration': duration,
        'topics': topics,
        'activities': activities,
        'isCompleted': isCompleted,
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        if (notes != null) 'notes': notes,
      };
}

class TestPrepPlan {
  final String id;
  final String userId;
  final String testName;
  final DateTime testDate;
  final String subject;
  final String? description;
  final List<StudySession> studySessions;
  final List<String> topics;
  final int progress; // 0-100
  final DateTime createdAt;
  final DateTime updatedAt;

  TestPrepPlan({
    required this.id,
    required this.userId,
    required this.testName,
    required this.testDate,
    required this.subject,
    this.description,
    required this.studySessions,
    required this.topics,
    required this.progress,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TestPrepPlan.fromJson(Map<String, dynamic> json) => TestPrepPlan(
        id: json['id'] as String,
        userId: json['userId'] as String,
        testName: json['testName'] as String,
        testDate: DateTime.parse(json['testDate'] as String),
        subject: json['subject'] as String,
        description: json['description'] as String?,
        studySessions: (json['studySessions'] as List<dynamic>?)
                ?.map((e) => StudySession.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        topics: (json['topics'] as List<dynamic>?)?.cast<String>() ?? [],
        progress: json['progress'] as int? ?? 0,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'testName': testName,
        'testDate': testDate.toIso8601String().split('T')[0],
        'subject': subject,
        if (description != null) 'description': description,
        'studySessions': studySessions.map((s) => s.toJson()).toList(),
        'topics': topics,
        'progress': progress,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  int get daysUntilTest => testDate.difference(DateTime.now()).inDays;

  int get completedSessions =>
      studySessions.where((s) => s.isCompleted).length;
}

class PracticeTest {
  final String id;
  final String userId;
  final String? testPrepPlanId;
  final String name;
  final String subject;
  final List<PracticeQuestion> questions;
  final int duration; // minutes
  final int? score;
  final DateTime? completedAt;
  final DateTime createdAt;

  PracticeTest({
    required this.id,
    required this.userId,
    this.testPrepPlanId,
    required this.name,
    required this.subject,
    required this.questions,
    required this.duration,
    this.score,
    this.completedAt,
    required this.createdAt,
  });

  factory PracticeTest.fromJson(Map<String, dynamic> json) => PracticeTest(
        id: json['id'] as String,
        userId: json['userId'] as String,
        testPrepPlanId: json['testPrepPlanId'] as String?,
        name: json['name'] as String,
        subject: json['subject'] as String,
        questions: (json['questions'] as List<dynamic>?)
                ?.map(
                    (e) => PracticeQuestion.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        duration: json['duration'] as int,
        score: json['score'] as int?,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String)
            : null,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        if (testPrepPlanId != null) 'testPrepPlanId': testPrepPlanId,
        'name': name,
        'subject': subject,
        'questions': questions.map((q) => q.toJson()).toList(),
        'duration': duration,
        if (score != null) 'score': score,
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        'createdAt': createdAt.toIso8601String(),
      };

  bool get isCompleted => completedAt != null;
}

class TestAnalytics {
  final int totalQuestions;
  final int correctAnswers;
  final int incorrectAnswers;
  final double averageTimePerQuestion; // seconds
  final List<String> strongTopics;
  final List<String> weakTopics;
  final List<String> recommendedFocus;

  TestAnalytics({
    required this.totalQuestions,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.averageTimePerQuestion,
    required this.strongTopics,
    required this.weakTopics,
    required this.recommendedFocus,
  });

  factory TestAnalytics.fromJson(Map<String, dynamic> json) => TestAnalytics(
        totalQuestions: json['totalQuestions'] as int,
        correctAnswers: json['correctAnswers'] as int,
        incorrectAnswers: json['incorrectAnswers'] as int,
        averageTimePerQuestion:
            (json['averageTimePerQuestion'] as num).toDouble(),
        strongTopics:
            (json['strongTopics'] as List<dynamic>?)?.cast<String>() ?? [],
        weakTopics:
            (json['weakTopics'] as List<dynamic>?)?.cast<String>() ?? [],
        recommendedFocus:
            (json['recommendedFocus'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  double get accuracy {
    if (totalQuestions == 0) return 0;
    return correctAnswers / totalQuestions;
  }
}
