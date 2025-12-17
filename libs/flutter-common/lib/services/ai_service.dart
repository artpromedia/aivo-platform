/// AI Service
///
/// Manages AI tutor interactions, hints, explanations, and homework help.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// AI MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// AI explanation response.
class AiExplanation {
  const AiExplanation({
    required this.explanation,
    this.simplifiedVersion,
    this.examples = const [],
    this.relatedConcepts = const [],
    this.visualAidUrl,
    this.audioUrl,
  });

  final String explanation;
  final String? simplifiedVersion;
  final List<String> examples;
  final List<String> relatedConcepts;
  final String? visualAidUrl;
  final String? audioUrl;

  factory AiExplanation.fromJson(Map<String, dynamic> json) {
    return AiExplanation(
      explanation: json['explanation'] as String,
      simplifiedVersion: json['simplifiedVersion'] as String?,
      examples: (json['examples'] as List<dynamic>?)?.cast<String>() ?? [],
      relatedConcepts:
          (json['relatedConcepts'] as List<dynamic>?)?.cast<String>() ?? [],
      visualAidUrl: json['visualAidUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
    );
  }
}

/// AI hint response.
class AiHint {
  const AiHint({
    required this.hint,
    required this.level,
    required this.totalHints,
    this.nextHintAvailable = false,
  });

  final String hint;
  final int level; // 1 = subtle, 2 = moderate, 3 = direct
  final int totalHints;
  final bool nextHintAvailable;

  factory AiHint.fromJson(Map<String, dynamic> json) {
    return AiHint(
      hint: json['hint'] as String,
      level: json['level'] as int? ?? 1,
      totalHints: json['totalHints'] as int? ?? 3,
      nextHintAvailable: json['nextHintAvailable'] as bool? ?? false,
    );
  }
}

/// Homework help step.
class HomeworkStep {
  const HomeworkStep({
    required this.stepNumber,
    required this.instruction,
    this.example,
    this.tip,
    this.visualAidUrl,
    this.isCompleted = false,
  });

  final int stepNumber;
  final String instruction;
  final String? example;
  final String? tip;
  final String? visualAidUrl;
  final bool isCompleted;

  factory HomeworkStep.fromJson(Map<String, dynamic> json) {
    return HomeworkStep(
      stepNumber: json['stepNumber'] as int? ?? 1,
      instruction: json['instruction'] as String,
      example: json['example'] as String?,
      tip: json['tip'] as String?,
      visualAidUrl: json['visualAidUrl'] as String?,
      isCompleted: json['isCompleted'] as bool? ?? false,
    );
  }

  HomeworkStep copyWith({bool? isCompleted}) {
    return HomeworkStep(
      stepNumber: stepNumber,
      instruction: instruction,
      example: example,
      tip: tip,
      visualAidUrl: visualAidUrl,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}

/// Homework help session.
class HomeworkHelpSession {
  const HomeworkHelpSession({
    required this.id,
    required this.problem,
    required this.subject,
    required this.steps,
    this.currentStepIndex = 0,
    this.status = 'active',
    this.createdAt,
    this.metadata = const {},
  });

  final String id;
  final String problem;
  final String subject;
  final List<HomeworkStep> steps;
  final int currentStepIndex;
  final String status;
  final DateTime? createdAt;
  final Map<String, dynamic> metadata;

  HomeworkStep? get currentStep =>
      currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  bool get isComplete => currentStepIndex >= steps.length;
  double get progress =>
      steps.isEmpty ? 0 : currentStepIndex / steps.length;

  factory HomeworkHelpSession.fromJson(Map<String, dynamic> json) {
    return HomeworkHelpSession(
      id: json['id'] as String,
      problem: json['problem'] as String,
      subject: json['subject'] as String? ?? 'general',
      steps: (json['steps'] as List<dynamic>?)
              ?.map((s) => HomeworkStep.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      currentStepIndex: json['currentStepIndex'] as int? ?? 0,
      status: json['status'] as String? ?? 'active',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  HomeworkHelpSession copyWith({
    List<HomeworkStep>? steps,
    int? currentStepIndex,
    String? status,
  }) {
    return HomeworkHelpSession(
      id: id,
      problem: problem,
      subject: subject,
      steps: steps ?? this.steps,
      currentStepIndex: currentStepIndex ?? this.currentStepIndex,
      status: status ?? this.status,
      createdAt: createdAt,
      metadata: metadata,
    );
  }
}

/// Chat message for AI tutor.
class AiMessage {
  const AiMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.metadata = const {},
  });

  final String id;
  final String role; // 'user', 'assistant', 'system'
  final String content;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';

  factory AiMessage.fromJson(Map<String, dynamic> json) {
    return AiMessage(
      id: json['id'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        'metadata': metadata,
      };
}

/// AI tutor conversation.
class AiConversation {
  const AiConversation({
    required this.id,
    required this.learnerId,
    required this.messages,
    this.context,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String learnerId;
  final List<AiMessage> messages;
  final Map<String, dynamic>? context;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory AiConversation.fromJson(Map<String, dynamic> json) {
    return AiConversation(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      messages: (json['messages'] as List<dynamic>?)
              ?.map((m) => AiMessage.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      context: json['context'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }
}

/// AI encouragement message.
class AiEncouragement {
  const AiEncouragement({
    required this.message,
    this.emoji,
    this.type = 'general',
  });

  final String message;
  final String? emoji;
  final String type; // 'correct', 'incorrect', 'progress', 'streak', 'general'

  factory AiEncouragement.fromJson(Map<String, dynamic> json) {
    return AiEncouragement(
      message: json['message'] as String,
      emoji: json['emoji'] as String?,
      type: json['type'] as String? ?? 'general',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for AI tutor interactions.
class AiService {
  AiService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;

  /// Get explanation for a concept or question.
  Future<AiExplanation> getExplanation({
    required String learnerId,
    required String content,
    String? contentType,
    String? subject,
    String? gradeLevel,
    bool simplified = false,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.aiExplain,
      data: {
        'learnerId': learnerId,
        'content': content,
        'contentType': contentType,
        'subject': subject,
        'gradeLevel': gradeLevel,
        'simplified': simplified,
      },
    );

    return AiExplanation.fromJson(response.data!);
  }

  /// Get hint for a question.
  Future<AiHint> getHint({
    required String learnerId,
    required String questionId,
    required String questionContent,
    int hintLevel = 1,
    String? previousAnswer,
    List<String>? previousHints,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.aiHint,
      data: {
        'learnerId': learnerId,
        'questionId': questionId,
        'questionContent': questionContent,
        'hintLevel': hintLevel,
        'previousAnswer': previousAnswer,
        'previousHints': previousHints,
      },
    );

    return AiHint.fromJson(response.data!);
  }

  /// Start homework help session.
  Future<HomeworkHelpSession> startHomeworkHelp({
    required String learnerId,
    required String problem,
    String? subject,
    String? imageUrl,
    Map<String, dynamic>? context,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.aiHomeworkHelp,
      data: {
        'learnerId': learnerId,
        'problem': problem,
        'subject': subject,
        'imageUrl': imageUrl,
        'context': context,
      },
    );

    return HomeworkHelpSession.fromJson(response.data!);
  }

  /// Get next step in homework help.
  Future<HomeworkStep> getNextHomeworkStep({
    required String sessionId,
    bool userCompletedCurrentStep = true,
    String? userResponse,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '${ApiEndpoints.aiHomeworkHelp}/$sessionId/next',
      data: {
        'completedCurrentStep': userCompletedCurrentStep,
        'userResponse': userResponse,
      },
    );

    return HomeworkStep.fromJson(response.data!);
  }

  /// Get additional help for current homework step.
  Future<String> getStepHelp({
    required String sessionId,
    required int stepNumber,
    String? question,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '${ApiEndpoints.aiHomeworkHelp}/$sessionId/help',
      data: {
        'stepNumber': stepNumber,
        'question': question,
      },
    );

    return response.data?['help'] as String? ?? '';
  }

  /// Complete homework help session.
  Future<void> completeHomeworkHelp(String sessionId) async {
    await _apiClient.post('${ApiEndpoints.aiHomeworkHelp}/$sessionId/complete');
  }

  /// Start a conversation with AI tutor.
  Future<AiConversation> startConversation({
    required String learnerId,
    String? initialMessage,
    Map<String, dynamic>? context,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/ai/conversations',
      data: {
        'learnerId': learnerId,
        'initialMessage': initialMessage,
        'context': context,
      },
    );

    return AiConversation.fromJson(response.data!);
  }

  /// Send message in conversation.
  Future<AiMessage> sendMessage({
    required String conversationId,
    required String message,
    Map<String, dynamic>? context,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/ai/conversations/$conversationId/messages',
      data: {
        'content': message,
        'context': context,
      },
    );

    return AiMessage.fromJson(response.data!);
  }

  /// Get conversation history.
  Future<AiConversation> getConversation(String conversationId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/ai/conversations/$conversationId',
    );

    return AiConversation.fromJson(response.data!);
  }

  /// Get recent conversations.
  Future<List<AiConversation>> getRecentConversations({
    required String learnerId,
    int limit = 10,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '/ai/conversations',
      queryParameters: {
        'learnerId': learnerId,
        'limit': limit.toString(),
      },
    );

    return (response.data ?? [])
        .map((c) => AiConversation.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  /// Get encouragement message.
  Future<AiEncouragement> getEncouragement({
    required String learnerId,
    required String type,
    Map<String, dynamic>? context,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/ai/encouragement',
      data: {
        'learnerId': learnerId,
        'type': type,
        'context': context,
      },
    );

    return AiEncouragement.fromJson(response.data!);
  }

  /// Analyze problem from image.
  Future<Map<String, dynamic>> analyzeImage({
    required String learnerId,
    required String imageUrl,
    String? subject,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/ai/analyze-image',
      data: {
        'learnerId': learnerId,
        'imageUrl': imageUrl,
        'subject': subject,
      },
    );

    return response.data ?? {};
  }

  /// Text-to-speech for content.
  Future<String> textToSpeech({
    required String text,
    String? voice,
    double speed = 1.0,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/ai/tts',
      data: {
        'text': text,
        'voice': voice,
        'speed': speed,
      },
    );

    return response.data?['audioUrl'] as String? ?? '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for AiService.
final aiServiceProvider = Provider<AiService>((ref) {
  return AiService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for current homework help session.
final homeworkHelpSessionProvider =
    StateProvider<HomeworkHelpSession?>((ref) => null);

/// Provider for current AI conversation.
final aiConversationProvider =
    StateProvider<AiConversation?>((ref) => null);
