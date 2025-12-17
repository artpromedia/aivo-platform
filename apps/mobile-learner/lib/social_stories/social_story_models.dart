/// Social Story Data Models - ND-1.2
///
/// Dart models for social stories, matching the backend Prisma schema.

import 'package:flutter/foundation.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Categories for social stories
enum SocialStoryCategory {
  startingLesson,
  endingLesson,
  changingActivity,
  unexpectedChange,
  takingQuiz,
  testTaking,
  receivingFeedback,
  askingForHelp,
  askingForBreak,
  raisingHand,
  talkingToTeacher,
  feelingFrustrated,
  feelingOverwhelmed,
  feelingAnxious,
  calmingDown,
  celebratingSuccess,
  stayingOnTask,
  ignoringDistractions,
  waitingTurn,
  usingDevice,
  technicalProblem,
  workingWithPeers,
  sharingMaterials,
  respectfulDisagreement,
  sensoryBreak,
  movementBreak,
  quietSpace,
  fireDrill,
  lockdown,
  feelingUnsafe,
  custom,
}

/// Reading levels for social stories
enum SocialStoryReadingLevel {
  preReader,
  earlyReader,
  developing,
  intermediate,
}

/// Visual styles for social stories
enum SocialStoryVisualStyle {
  photographs,
  realisticArt,
  cartoon,
  simpleIcons,
  abstract,
}

/// Sentence types following Carol Gray's framework
enum SentenceType {
  descriptive,
  perspective,
  directive,
  affirmative,
  cooperative,
  control,
  partial,
}

/// Trigger types for story views
enum StoryTriggerType {
  manual,
  auto,
  scheduled,
  recommended,
  transition,
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORY MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// A single sentence within a story page
@immutable
class StorySentence {
  const StorySentence({
    required this.id,
    required this.text,
    required this.type,
    this.audioUrl,
    this.emphasisWords = const [],
    this.personalizationTokens = const [],
  });

  final String id;
  final String text;
  final SentenceType type;
  final String? audioUrl;
  final List<String> emphasisWords;
  final List<String> personalizationTokens;

  factory StorySentence.fromJson(Map<String, dynamic> json) {
    return StorySentence(
      id: json['id'] as String,
      text: json['text'] as String,
      type: _parseSentenceType(json['type'] as String),
      audioUrl: json['audioUrl'] as String?,
      emphasisWords: (json['emphasisWords'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      personalizationTokens: (json['personalizationTokens'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'text': text,
        'type': type.name.toUpperCase(),
        if (audioUrl != null) 'audioUrl': audioUrl,
        if (emphasisWords.isNotEmpty) 'emphasisWords': emphasisWords,
        if (personalizationTokens.isNotEmpty)
          'personalizationTokens': personalizationTokens,
      };

  static SentenceType _parseSentenceType(String value) {
    switch (value.toUpperCase()) {
      case 'DESCRIPTIVE':
        return SentenceType.descriptive;
      case 'PERSPECTIVE':
        return SentenceType.perspective;
      case 'DIRECTIVE':
        return SentenceType.directive;
      case 'AFFIRMATIVE':
        return SentenceType.affirmative;
      case 'COOPERATIVE':
        return SentenceType.cooperative;
      case 'CONTROL':
        return SentenceType.control;
      case 'PARTIAL':
        return SentenceType.partial;
      default:
        return SentenceType.descriptive;
    }
  }
}

/// Visual media for a story page
@immutable
class StoryVisual {
  const StoryVisual({
    required this.id,
    required this.type,
    required this.url,
    required this.altText,
    required this.style,
    required this.position,
    this.aspectRatio,
    this.variants = const {},
  });

  final String id;
  final String type;
  final String url;
  final String altText;
  final SocialStoryVisualStyle style;
  final String position;
  final String? aspectRatio;
  final Map<String, String> variants;

  factory StoryVisual.fromJson(Map<String, dynamic> json) {
    return StoryVisual(
      id: json['id'] as String,
      type: json['type'] as String,
      url: json['url'] as String,
      altText: json['altText'] as String,
      style: _parseVisualStyle(json['style'] as String),
      position: json['position'] as String,
      aspectRatio: json['aspectRatio'] as String?,
      variants: (json['variants'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, v as String)) ??
          const {},
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'url': url,
        'altText': altText,
        'style': style.name.toUpperCase(),
        'position': position,
        if (aspectRatio != null) 'aspectRatio': aspectRatio,
        if (variants.isNotEmpty) 'variants': variants,
      };

  static SocialStoryVisualStyle _parseVisualStyle(String value) {
    switch (value.toUpperCase()) {
      case 'PHOTOGRAPHS':
        return SocialStoryVisualStyle.photographs;
      case 'REALISTIC_ART':
        return SocialStoryVisualStyle.realisticArt;
      case 'CARTOON':
        return SocialStoryVisualStyle.cartoon;
      case 'SIMPLE_ICONS':
        return SocialStoryVisualStyle.simpleIcons;
      case 'ABSTRACT':
        return SocialStoryVisualStyle.abstract;
      default:
        return SocialStoryVisualStyle.cartoon;
    }
  }
}

/// Interactive element on a page
@immutable
class StoryInteraction {
  const StoryInteraction({
    required this.id,
    required this.type,
    required this.config,
    required this.required,
  });

  final String id;
  final String type;
  final Map<String, dynamic> config;
  final bool required;

  factory StoryInteraction.fromJson(Map<String, dynamic> json) {
    return StoryInteraction(
      id: json['id'] as String,
      type: json['type'] as String,
      config: json['config'] as Map<String, dynamic>? ?? const {},
      required: json['required'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'config': config,
        'required': required,
      };
}

/// A single page in a social story
@immutable
class StoryPage {
  const StoryPage({
    required this.id,
    required this.pageNumber,
    required this.sentences,
    this.visual,
    this.interactions = const [],
    this.backgroundColor,
    this.transitionEffect,
    this.audioNarration,
    this.displayDuration,
  });

  final String id;
  final int pageNumber;
  final List<StorySentence> sentences;
  final StoryVisual? visual;
  final List<StoryInteraction> interactions;
  final String? backgroundColor;
  final String? transitionEffect;
  final String? audioNarration;
  final int? displayDuration;

  factory StoryPage.fromJson(Map<String, dynamic> json) {
    return StoryPage(
      id: json['id'] as String,
      pageNumber: json['pageNumber'] as int,
      sentences: (json['sentences'] as List<dynamic>)
          .map((e) => StorySentence.fromJson(e as Map<String, dynamic>))
          .toList(),
      visual: json['visual'] != null
          ? StoryVisual.fromJson(json['visual'] as Map<String, dynamic>)
          : null,
      interactions: (json['interactions'] as List<dynamic>?)
              ?.map((e) => StoryInteraction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      backgroundColor: json['backgroundColor'] as String?,
      transitionEffect: json['transitionEffect'] as String?,
      audioNarration: json['audioNarration'] as String?,
      displayDuration: json['displayDuration'] as int?,
    );
  }

  /// Get the combined text of all sentences
  String get fullText => sentences.map((s) => s.text).join(' ');

  Map<String, dynamic> toJson() => {
        'id': id,
        'pageNumber': pageNumber,
        'sentences': sentences.map((s) => s.toJson()).toList(),
        if (visual != null) 'visual': visual!.toJson(),
        if (interactions.isNotEmpty)
          'interactions': interactions.map((i) => i.toJson()).toList(),
        if (backgroundColor != null) 'backgroundColor': backgroundColor,
        if (transitionEffect != null) 'transitionEffect': transitionEffect,
        if (audioNarration != null) 'audioNarration': audioNarration,
        if (displayDuration != null) 'displayDuration': displayDuration,
      };
}

/// Complete social story model
@immutable
class SocialStory {
  const SocialStory({
    required this.id,
    required this.slug,
    required this.title,
    required this.category,
    required this.pages,
    required this.readingLevel,
    required this.estimatedDuration,
    required this.defaultVisualStyle,
    required this.supportsPersonalization,
    required this.isBuiltIn,
    required this.isApproved,
    required this.createdAt,
    required this.updatedAt,
    this.tenantId,
    this.description,
    this.minAge,
    this.maxAge,
    this.gradeBands = const [],
    this.personalizationTokens = const [],
    this.hasAudio = false,
    this.hasVideo = false,
    this.version = 1,
  });

  final String id;
  final String? tenantId;
  final String slug;
  final String title;
  final String? description;
  final SocialStoryCategory category;
  final List<StoryPage> pages;
  final SocialStoryReadingLevel readingLevel;
  final int estimatedDuration;
  final int? minAge;
  final int? maxAge;
  final List<String> gradeBands;
  final bool supportsPersonalization;
  final List<String> personalizationTokens;
  final SocialStoryVisualStyle defaultVisualStyle;
  final bool hasAudio;
  final bool hasVideo;
  final bool isBuiltIn;
  final bool isApproved;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  int get pageCount => pages.length;

  factory SocialStory.fromJson(Map<String, dynamic> json) {
    return SocialStory(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String?,
      slug: json['slug'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      category: _parseCategory(json['category'] as String),
      pages: (json['pages'] as List<dynamic>)
          .map((e) => StoryPage.fromJson(e as Map<String, dynamic>))
          .toList(),
      readingLevel: _parseReadingLevel(json['readingLevel'] as String),
      estimatedDuration: json['estimatedDuration'] as int,
      minAge: json['minAge'] as int?,
      maxAge: json['maxAge'] as int?,
      gradeBands: (json['gradeBands'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      supportsPersonalization: json['supportsPersonalization'] as bool? ?? true,
      personalizationTokens: (json['personalizationTokens'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      defaultVisualStyle:
          StoryVisual._parseVisualStyle(json['defaultVisualStyle'] as String),
      hasAudio: json['hasAudio'] as bool? ?? false,
      hasVideo: json['hasVideo'] as bool? ?? false,
      isBuiltIn: json['isBuiltIn'] as bool? ?? false,
      isApproved: json['isApproved'] as bool? ?? false,
      version: json['version'] as int? ?? 1,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static SocialStoryCategory _parseCategory(String value) {
    final normalized = value
        .toLowerCase()
        .replaceAll('_', '')
        .replaceAll('-', '');
    
    for (final cat in SocialStoryCategory.values) {
      if (cat.name.toLowerCase() == normalized) {
        return cat;
      }
    }
    return SocialStoryCategory.custom;
  }

  static SocialStoryReadingLevel _parseReadingLevel(String value) {
    switch (value.toUpperCase()) {
      case 'PRE_READER':
        return SocialStoryReadingLevel.preReader;
      case 'EARLY_READER':
        return SocialStoryReadingLevel.earlyReader;
      case 'DEVELOPING':
        return SocialStoryReadingLevel.developing;
      case 'INTERMEDIATE':
        return SocialStoryReadingLevel.intermediate;
      default:
        return SocialStoryReadingLevel.developing;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEARNER PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

/// Learner preferences for social story presentation
@immutable
class LearnerStoryPreferences {
  const LearnerStoryPreferences({
    required this.learnerId,
    this.preferredVisualStyle = SocialStoryVisualStyle.cartoon,
    this.preferredReadingLevel = SocialStoryReadingLevel.developing,
    this.enableAudio = true,
    this.enableTts = true,
    this.ttsVoice,
    this.ttsSpeed = 1.0,
    this.autoAdvance = false,
    this.pageDisplayTime = 10,
    this.characterName,
    this.favoriteColor,
    this.interests = const [],
    this.highContrast = false,
    this.largeText = false,
    this.reducedMotion = false,
  });

  final String learnerId;
  final SocialStoryVisualStyle preferredVisualStyle;
  final SocialStoryReadingLevel preferredReadingLevel;
  final bool enableAudio;
  final bool enableTts;
  final String? ttsVoice;
  final double ttsSpeed;
  final bool autoAdvance;
  final int pageDisplayTime;
  final String? characterName;
  final String? favoriteColor;
  final List<String> interests;
  final bool highContrast;
  final bool largeText;
  final bool reducedMotion;

  factory LearnerStoryPreferences.fromJson(Map<String, dynamic> json) {
    return LearnerStoryPreferences(
      learnerId: json['learnerId'] as String,
      preferredVisualStyle: json['preferredVisualStyle'] != null
          ? StoryVisual._parseVisualStyle(json['preferredVisualStyle'] as String)
          : SocialStoryVisualStyle.cartoon,
      preferredReadingLevel: json['preferredReadingLevel'] != null
          ? SocialStory._parseReadingLevel(json['preferredReadingLevel'] as String)
          : SocialStoryReadingLevel.developing,
      enableAudio: json['enableAudio'] as bool? ?? true,
      enableTts: json['enableTts'] as bool? ?? true,
      ttsVoice: json['ttsVoice'] as String?,
      ttsSpeed: (json['ttsSpeed'] as num?)?.toDouble() ?? 1.0,
      autoAdvance: json['autoAdvance'] as bool? ?? false,
      pageDisplayTime: json['pageDisplayTime'] as int? ?? 10,
      characterName: json['characterName'] as String?,
      favoriteColor: json['favoriteColor'] as String?,
      interests: (json['interests'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      highContrast: json['highContrast'] as bool? ?? false,
      largeText: json['largeText'] as bool? ?? false,
      reducedMotion: json['reducedMotion'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'learnerId': learnerId,
        'preferredVisualStyle': preferredVisualStyle.name.toUpperCase(),
        'preferredReadingLevel': preferredReadingLevel.name.toUpperCase(),
        'enableAudio': enableAudio,
        'enableTts': enableTts,
        if (ttsVoice != null) 'ttsVoice': ttsVoice,
        'ttsSpeed': ttsSpeed,
        'autoAdvance': autoAdvance,
        'pageDisplayTime': pageDisplayTime,
        if (characterName != null) 'characterName': characterName,
        if (favoriteColor != null) 'favoriteColor': favoriteColor,
        if (interests.isNotEmpty) 'interests': interests,
        'highContrast': highContrast,
        'largeText': largeText,
        'reducedMotion': reducedMotion,
      };

  LearnerStoryPreferences copyWith({
    SocialStoryVisualStyle? preferredVisualStyle,
    SocialStoryReadingLevel? preferredReadingLevel,
    bool? enableAudio,
    bool? enableTts,
    String? ttsVoice,
    double? ttsSpeed,
    bool? autoAdvance,
    int? pageDisplayTime,
    String? characterName,
    String? favoriteColor,
    List<String>? interests,
    bool? highContrast,
    bool? largeText,
    bool? reducedMotion,
  }) {
    return LearnerStoryPreferences(
      learnerId: learnerId,
      preferredVisualStyle: preferredVisualStyle ?? this.preferredVisualStyle,
      preferredReadingLevel: preferredReadingLevel ?? this.preferredReadingLevel,
      enableAudio: enableAudio ?? this.enableAudio,
      enableTts: enableTts ?? this.enableTts,
      ttsVoice: ttsVoice ?? this.ttsVoice,
      ttsSpeed: ttsSpeed ?? this.ttsSpeed,
      autoAdvance: autoAdvance ?? this.autoAdvance,
      pageDisplayTime: pageDisplayTime ?? this.pageDisplayTime,
      characterName: characterName ?? this.characterName,
      favoriteColor: favoriteColor ?? this.favoriteColor,
      interests: interests ?? this.interests,
      highContrast: highContrast ?? this.highContrast,
      largeText: largeText ?? this.largeText,
      reducedMotion: reducedMotion ?? this.reducedMotion,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Reason for recommending a story
enum RecommendationReason {
  transitionSupport,
  emotionalSupport,
  scheduled,
  teacherAssigned,
  frequentlyHelpful,
  similarSituation,
  newScenario,
}

/// Story recommendation with context
@immutable
class StoryRecommendation {
  const StoryRecommendation({
    required this.storyId,
    required this.story,
    required this.score,
    required this.reason,
    this.context = const {},
  });

  final String storyId;
  final SocialStory story;
  final double score;
  final RecommendationReason reason;
  final Map<String, dynamic> context;

  factory StoryRecommendation.fromJson(Map<String, dynamic> json) {
    return StoryRecommendation(
      storyId: json['storyId'] as String,
      story: SocialStory.fromJson(json['story'] as Map<String, dynamic>),
      score: (json['score'] as num).toDouble(),
      reason: _parseReason(json['reason'] as String),
      context: json['context'] as Map<String, dynamic>? ?? const {},
    );
  }

  static RecommendationReason _parseReason(String value) {
    switch (value.toUpperCase()) {
      case 'TRANSITION_SUPPORT':
        return RecommendationReason.transitionSupport;
      case 'EMOTIONAL_SUPPORT':
        return RecommendationReason.emotionalSupport;
      case 'SCHEDULED':
        return RecommendationReason.scheduled;
      case 'TEACHER_ASSIGNED':
        return RecommendationReason.teacherAssigned;
      case 'FREQUENTLY_HELPFUL':
        return RecommendationReason.frequentlyHelpful;
      case 'SIMILAR_SITUATION':
        return RecommendationReason.similarSituation;
      case 'NEW_SCENARIO':
        return RecommendationReason.newScenario;
      default:
        return RecommendationReason.transitionSupport;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/// Data for recording a story view
@immutable
class RecordStoryViewData {
  const RecordStoryViewData({
    required this.storyId,
    required this.learnerId,
    required this.triggerType,
    required this.pagesViewed,
    required this.totalPages,
    this.sessionId,
    this.triggerContext = const {},
    this.completedAt,
    this.durationSeconds,
    this.replayCount = 0,
    this.audioPlayed = false,
    this.interactions = const [],
    this.preEmotionalState,
    this.postEmotionalState,
    this.helpfulnessRating,
  });

  final String storyId;
  final String learnerId;
  final String? sessionId;
  final StoryTriggerType triggerType;
  final Map<String, dynamic> triggerContext;
  final int pagesViewed;
  final int totalPages;
  final DateTime? completedAt;
  final int? durationSeconds;
  final int replayCount;
  final bool audioPlayed;
  final List<Map<String, dynamic>> interactions;
  final String? preEmotionalState;
  final String? postEmotionalState;
  final int? helpfulnessRating;

  Map<String, dynamic> toJson() => {
        'storyId': storyId,
        'learnerId': learnerId,
        if (sessionId != null) 'sessionId': sessionId,
        'triggerType': triggerType.name.toUpperCase(),
        if (triggerContext.isNotEmpty) 'triggerContext': triggerContext,
        'pagesViewed': pagesViewed,
        'totalPages': totalPages,
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        if (durationSeconds != null) 'durationSeconds': durationSeconds,
        'replayCount': replayCount,
        'audioPlayed': audioPlayed,
        if (interactions.isNotEmpty) 'interactions': interactions,
        if (preEmotionalState != null) 'preEmotionalState': preEmotionalState,
        if (postEmotionalState != null) 'postEmotionalState': postEmotionalState,
        if (helpfulnessRating != null) 'helpfulnessRating': helpfulnessRating,
      };
}

/// Personalization context for rendering stories
@immutable
class PersonalizationContext {
  const PersonalizationContext({
    this.learnerName,
    this.teacherName,
    this.helperName,
    this.schoolName,
    this.classroomName,
    this.favoriteActivity,
    this.calmPlace,
    this.comfortItem,
    this.characterName,
    this.breakSignal,
    this.helpSignal,
    this.customTokens = const {},
  });

  final String? learnerName;
  final String? teacherName;
  final String? helperName;
  final String? schoolName;
  final String? classroomName;
  final String? favoriteActivity;
  final String? calmPlace;
  final String? comfortItem;
  final String? characterName;
  final String? breakSignal;
  final String? helpSignal;
  final Map<String, String> customTokens;

  Map<String, dynamic> toJson() => {
        if (learnerName != null) 'learnerName': learnerName,
        if (teacherName != null) 'teacherName': teacherName,
        if (helperName != null) 'helperName': helperName,
        if (schoolName != null) 'schoolName': schoolName,
        if (classroomName != null) 'classroomName': classroomName,
        if (favoriteActivity != null) 'favoriteActivity': favoriteActivity,
        if (calmPlace != null) 'calmPlace': calmPlace,
        if (comfortItem != null) 'comfortItem': comfortItem,
        if (characterName != null) 'characterName': characterName,
        if (breakSignal != null) 'breakSignal': breakSignal,
        if (helpSignal != null) 'helpSignal': helpSignal,
        if (customTokens.isNotEmpty) 'customTokens': customTokens,
      };
}
