/// Content Service
///
/// Manages educational content fetching, caching, and offline access.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Content type enumeration.
enum ContentType {
  lesson,
  quiz,
  video,
  interactive,
  reading,
  practice,
  assessment,
  game;

  String get displayName => switch (this) {
        lesson => 'Lesson',
        quiz => 'Quiz',
        video => 'Video',
        interactive => 'Interactive',
        reading => 'Reading',
        practice => 'Practice',
        assessment => 'Assessment',
        game => 'Game',
      };
}

/// Subject model.
class Subject {
  const Subject({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.iconUrl,
    this.color,
    this.gradeLevel,
    this.topicCount = 0,
  });

  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? iconUrl;
  final String? color;
  final String? gradeLevel;
  final int topicCount;

  factory Subject.fromJson(Map<String, dynamic> json) {
    return Subject(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      iconUrl: json['iconUrl'] as String?,
      color: json['color'] as String?,
      gradeLevel: json['gradeLevel'] as String?,
      topicCount: json['topicCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        'description': description,
        'iconUrl': iconUrl,
        'color': color,
        'gradeLevel': gradeLevel,
        'topicCount': topicCount,
      };
}

/// Topic within a subject.
class Topic {
  const Topic({
    required this.id,
    required this.name,
    required this.subjectId,
    this.description,
    this.order = 0,
    this.contentCount = 0,
    this.estimatedMinutes,
    this.prerequisites = const [],
    this.learningObjectives = const [],
    this.progressPercent,
    this.masteryLevel,
  });

  final String id;
  final String name;
  final String subjectId;
  final String? description;
  final int order;
  final int contentCount;
  final int? estimatedMinutes;
  final List<String> prerequisites;
  final List<String> learningObjectives;
  final double? progressPercent;
  final String? masteryLevel;

  factory Topic.fromJson(Map<String, dynamic> json) {
    return Topic(
      id: json['id'] as String,
      name: json['name'] as String,
      subjectId: json['subjectId'] as String,
      description: json['description'] as String?,
      order: json['order'] as int? ?? 0,
      contentCount: json['contentCount'] as int? ?? 0,
      estimatedMinutes: json['estimatedMinutes'] as int?,
      prerequisites:
          (json['prerequisites'] as List<dynamic>?)?.cast<String>() ?? [],
      learningObjectives:
          (json['learningObjectives'] as List<dynamic>?)?.cast<String>() ?? [],
      progressPercent: (json['progressPercent'] as num?)?.toDouble(),
      masteryLevel: json['masteryLevel'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'subjectId': subjectId,
        'description': description,
        'order': order,
        'contentCount': contentCount,
        'estimatedMinutes': estimatedMinutes,
        'prerequisites': prerequisites,
        'learningObjectives': learningObjectives,
        'progressPercent': progressPercent,
        'masteryLevel': masteryLevel,
      };
}

/// Content item.
class ContentItem {
  const ContentItem({
    required this.id,
    required this.type,
    required this.title,
    this.description,
    required this.topicId,
    this.subjectId,
    this.order = 0,
    this.estimatedMinutes,
    this.difficulty,
    this.content,
    this.mediaUrl,
    this.thumbnailUrl,
    this.questions = const [],
    this.metadata = const {},
    this.completed = false,
    this.progressPercent,
    this.lastAccessedAt,
  });

  final String id;
  final ContentType type;
  final String title;
  final String? description;
  final String topicId;
  final String? subjectId;
  final int order;
  final int? estimatedMinutes;
  final String? difficulty;
  final dynamic content;
  final String? mediaUrl;
  final String? thumbnailUrl;
  final List<Question> questions;
  final Map<String, dynamic> metadata;
  final bool completed;
  final double? progressPercent;
  final DateTime? lastAccessedAt;

  factory ContentItem.fromJson(Map<String, dynamic> json) {
    return ContentItem(
      id: json['id'] as String,
      type: ContentType.values.firstWhere(
        (t) => t.name == (json['type'] as String?)?.toLowerCase(),
        orElse: () => ContentType.lesson,
      ),
      title: json['title'] as String,
      description: json['description'] as String?,
      topicId: json['topicId'] as String,
      subjectId: json['subjectId'] as String?,
      order: json['order'] as int? ?? 0,
      estimatedMinutes: json['estimatedMinutes'] as int?,
      difficulty: json['difficulty'] as String?,
      content: json['content'],
      mediaUrl: json['mediaUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      questions: (json['questions'] as List<dynamic>?)
              ?.map((q) => Question.fromJson(q as Map<String, dynamic>))
              .toList() ??
          [],
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
      completed: json['completed'] as bool? ?? false,
      progressPercent: (json['progressPercent'] as num?)?.toDouble(),
      lastAccessedAt: json['lastAccessedAt'] != null
          ? DateTime.parse(json['lastAccessedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'title': title,
        'description': description,
        'topicId': topicId,
        'subjectId': subjectId,
        'order': order,
        'estimatedMinutes': estimatedMinutes,
        'difficulty': difficulty,
        'content': content,
        'mediaUrl': mediaUrl,
        'thumbnailUrl': thumbnailUrl,
        'questions': questions.map((q) => q.toJson()).toList(),
        'metadata': metadata,
        'completed': completed,
        'progressPercent': progressPercent,
        'lastAccessedAt': lastAccessedAt?.toIso8601String(),
      };
}

/// Question within content.
class Question {
  const Question({
    required this.id,
    required this.type,
    required this.prompt,
    this.stimulus,
    this.options = const [],
    this.correctAnswer,
    this.hints = const [],
    this.explanation,
    this.mediaUrl,
    this.points = 1,
    this.metadata = const {},
  });

  final String id;
  final String type;
  final String prompt;
  final String? stimulus;
  final List<QuestionOption> options;
  final dynamic correctAnswer;
  final List<String> hints;
  final String? explanation;
  final String? mediaUrl;
  final int points;
  final Map<String, dynamic> metadata;

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'multipleChoice',
      prompt: json['prompt'] as String,
      stimulus: json['stimulus'] as String?,
      options: (json['options'] as List<dynamic>?)
              ?.map((o) => o is String
                  ? QuestionOption(id: o, text: o)
                  : QuestionOption.fromJson(o as Map<String, dynamic>))
              .toList() ??
          [],
      correctAnswer: json['correctAnswer'],
      hints: (json['hints'] as List<dynamic>?)?.cast<String>() ?? [],
      explanation: json['explanation'] as String?,
      mediaUrl: json['mediaUrl'] as String?,
      points: json['points'] as int? ?? 1,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'prompt': prompt,
        'stimulus': stimulus,
        'options': options.map((o) => o.toJson()).toList(),
        'correctAnswer': correctAnswer,
        'hints': hints,
        'explanation': explanation,
        'mediaUrl': mediaUrl,
        'points': points,
        'metadata': metadata,
      };
}

/// Question option.
class QuestionOption {
  const QuestionOption({
    required this.id,
    required this.text,
    this.imageUrl,
    this.isCorrect,
  });

  final String id;
  final String text;
  final String? imageUrl;
  final bool? isCorrect;

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: json['id'] as String,
      text: json['text'] as String,
      imageUrl: json['imageUrl'] as String?,
      isCorrect: json['isCorrect'] as bool?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'text': text,
        'imageUrl': imageUrl,
        'isCorrect': isCorrect,
      };
}

/// Content progress for a learner.
class ContentProgress {
  const ContentProgress({
    required this.contentId,
    required this.learnerId,
    required this.progressPercent,
    required this.completed,
    this.score,
    this.timeSpentSeconds = 0,
    this.attempts = 0,
    this.lastAccessedAt,
    this.completedAt,
  });

  final String contentId;
  final String learnerId;
  final double progressPercent;
  final bool completed;
  final double? score;
  final int timeSpentSeconds;
  final int attempts;
  final DateTime? lastAccessedAt;
  final DateTime? completedAt;

  factory ContentProgress.fromJson(Map<String, dynamic> json) {
    return ContentProgress(
      contentId: json['contentId'] as String,
      learnerId: json['learnerId'] as String,
      progressPercent: (json['progressPercent'] as num? ?? 0).toDouble(),
      completed: json['completed'] as bool? ?? false,
      score: (json['score'] as num?)?.toDouble(),
      timeSpentSeconds: json['timeSpentSeconds'] as int? ?? 0,
      attempts: json['attempts'] as int? ?? 0,
      lastAccessedAt: json['lastAccessedAt'] != null
          ? DateTime.parse(json['lastAccessedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for fetching and managing educational content.
class ContentService {
  ContentService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;
  static const _baseUrl = '/content';

  // Local cache for subjects
  List<Subject>? _cachedSubjects;
  final Map<String, List<Topic>> _topicCache = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBJECT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all subjects.
  Future<List<Subject>> getSubjects({
    String? gradeLevel,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _cachedSubjects != null) {
      return _cachedSubjects!;
    }

    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/subjects',
      queryParameters: {
        if (gradeLevel != null) 'gradeLevel': gradeLevel,
      },
    );

    final subjects = (response.data ?? [])
        .map((s) => Subject.fromJson(s as Map<String, dynamic>))
        .toList();

    _cachedSubjects = subjects;
    return subjects;
  }

  /// Get a specific subject.
  Future<Subject> getSubject(String subjectId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/subjects/$subjectId',
    );

    return Subject.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get topics for a subject.
  Future<List<Topic>> getTopics({
    required String subjectId,
    String? learnerId,
    bool forceRefresh = false,
  }) async {
    final cacheKey = '$subjectId-$learnerId';
    if (!forceRefresh && _topicCache.containsKey(cacheKey)) {
      return _topicCache[cacheKey]!;
    }

    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/subjects/$subjectId/topics',
      queryParameters: {
        if (learnerId != null) 'learnerId': learnerId,
      },
    );

    final topics = (response.data ?? [])
        .map((t) => Topic.fromJson(t as Map<String, dynamic>))
        .toList();

    _topicCache[cacheKey] = topics;
    return topics;
  }

  /// Get a specific topic.
  Future<Topic> getTopic(String topicId, {String? learnerId}) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/topics/$topicId',
      queryParameters: {
        if (learnerId != null) 'learnerId': learnerId,
      },
    );

    return Topic.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get content items for a topic.
  Future<List<ContentItem>> getContent({
    required String topicId,
    String? learnerId,
    ContentType? type,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/topics/$topicId/content',
      queryParameters: {
        if (learnerId != null) 'learnerId': learnerId,
        if (type != null) 'type': type.name,
      },
    );

    final items = (response.data ?? [])
        .map((c) => ContentItem.fromJson(c as Map<String, dynamic>))
        .toList();

    return items;
  }

  /// Get a specific content item.
  Future<ContentItem> getContentItem(
    String contentId, {
    String? learnerId,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/items/$contentId',
      queryParameters: {
        if (learnerId != null) 'learnerId': learnerId,
      },
    );

    final item = ContentItem.fromJson(response.data!);

    return item;
  }

  /// Batch fetch content items.
  Future<List<ContentItem>> batchGetContent(List<String> contentIds) async {
    if (contentIds.isEmpty) return [];

    final response = await _apiClient.post<List<dynamic>>(
      '$_baseUrl/items/batch',
      data: {'contentIds': contentIds},
    );

    return (response.data ?? [])
        .map((c) => ContentItem.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get content progress for a learner.
  Future<List<ContentProgress>> getProgress({
    required String learnerId,
    String? topicId,
    String? subjectId,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/progress',
      queryParameters: {
        'learnerId': learnerId,
        if (topicId != null) 'topicId': topicId,
        if (subjectId != null) 'subjectId': subjectId,
      },
    );

    return (response.data ?? [])
        .map((p) => ContentProgress.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  /// Update content progress.
  Future<void> updateProgress({
    required String learnerId,
    required String contentId,
    required double progressPercent,
    bool? completed,
    double? score,
    int? timeSpentSeconds,
  }) async {
    await _apiClient.post(
      '$_baseUrl/progress',
      data: {
        'learnerId': learnerId,
        'contentId': contentId,
        'progressPercent': progressPercent,
        'completed': completed,
        'score': score,
        'timeSpentSeconds': timeSpentSeconds,
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Search content.
  Future<List<ContentItem>> searchContent({
    required String query,
    String? subjectId,
    ContentType? type,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/search',
      queryParameters: {
        'q': query,
        if (subjectId != null) 'subjectId': subjectId,
        if (type != null) 'type': type.name,
        'limit': limit.toString(),
      },
    );

    return (response.data ?? [])
        .map((c) => ContentItem.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  /// Get recommended content for a learner.
  Future<List<ContentItem>> getRecommendations({
    required String learnerId,
    int limit = 10,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/recommendations',
      queryParameters: {
        'learnerId': learnerId,
        'limit': limit.toString(),
      },
    );

    return (response.data ?? [])
        .map((c) => ContentItem.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  /// Clear local cache.
  void clearCache() {
    _cachedSubjects = null;
    _topicCache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for ContentService.
final contentServiceProvider = Provider<ContentService>((ref) {
  return ContentService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for subjects.
final subjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final service = ref.watch(contentServiceProvider);
  return service.getSubjects();
});

/// Provider for topics by subject.
final topicsProvider =
    FutureProvider.family<List<Topic>, String>((ref, subjectId) async {
  final service = ref.watch(contentServiceProvider);
  return service.getTopics(subjectId: subjectId);
});

/// Provider for content by topic.
final contentByTopicProvider =
    FutureProvider.family<List<ContentItem>, String>((ref, topicId) async {
  final service = ref.watch(contentServiceProvider);
  return service.getContent(topicId: topicId);
});
