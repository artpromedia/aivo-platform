import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/environment.dart';

/// Writing types supported by the assistant.
enum WritingType {
  narrative('NARRATIVE', 'Narrative'),
  expository('EXPOSITORY', 'Expository'),
  persuasive('PERSUASIVE', 'Persuasive'),
  descriptive('DESCRIPTIVE', 'Descriptive'),
  creative('CREATIVE', 'Creative'),
  journal('JOURNAL', 'Journal'),
  freeWrite('FREE_WRITE', 'Free Write');

  const WritingType(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Writing levels corresponding to grade bands.
enum WritingLevel {
  emerging('EMERGING', 'K-1'),
  developing('DEVELOPING', '2-3'),
  expanding('EXPANDING', '4-5'),
  bridging('BRIDGING', '6-8'),
  advanced('ADVANCED', '9-12');

  const WritingLevel(this.code, this.gradeRange);
  final String code;
  final String gradeRange;
}

/// A writing suggestion from the assistant.
class WritingSuggestion {
  const WritingSuggestion({
    required this.type,
    required this.original,
    required this.suggestion,
    required this.explanation,
    this.position,
  });

  final String type;
  final String original;
  final String suggestion;
  final String explanation;
  final TextPosition? position;

  factory WritingSuggestion.fromJson(Map<String, dynamic> json) {
    final posJson = json['position'] as Map<String, dynamic>?;
    return WritingSuggestion(
      type: json['type']?.toString() ?? 'clarity',
      original: json['original']?.toString() ?? '',
      suggestion: json['suggestion']?.toString() ?? '',
      explanation: json['explanation']?.toString() ?? '',
      position: posJson != null ? TextPosition.fromJson(posJson) : null,
    );
  }
}

/// Position in text for a suggestion.
class TextPosition {
  const TextPosition({required this.start, required this.end});
  final int start;
  final int end;

  factory TextPosition.fromJson(Map<String, dynamic> json) {
    return TextPosition(
      start: (json['start'] as num?)?.toInt() ?? 0,
      end: (json['end'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Feedback on student writing.
class WritingFeedback {
  const WritingFeedback({
    required this.overallFeedback,
    required this.strengths,
    required this.areasForImprovement,
    required this.suggestions,
    required this.encouragement,
  });

  final String overallFeedback;
  final List<String> strengths;
  final List<String> areasForImprovement;
  final List<WritingSuggestion> suggestions;
  final String encouragement;

  factory WritingFeedback.fromJson(Map<String, dynamic> json) {
    final suggestionsJson = json['suggestions'] as List<dynamic>? ?? [];
    return WritingFeedback(
      overallFeedback: json['overallFeedback']?.toString() ?? '',
      strengths: (json['strengths'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      areasForImprovement:
          (json['areasForImprovement'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      suggestions: suggestionsJson.map((s) => WritingSuggestion.fromJson(s as Map<String, dynamic>)).toList(),
      encouragement: json['encouragement']?.toString() ?? 'Keep writing!',
    );
  }
}

/// Sentence completion options.
class SentenceCompletion {
  const SentenceCompletion({
    required this.completions,
    required this.confidences,
  });

  final List<String> completions;
  final List<double> confidences;

  factory SentenceCompletion.fromJson(Map<String, dynamic> json) {
    return SentenceCompletion(
      completions: (json['completions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      confidences:
          (json['confidence'] as List<dynamic>?)?.map((e) => (e as num).toDouble()).toList() ?? [],
    );
  }
}

/// Writing prompt with starter suggestions.
class WritingPromptResponse {
  const WritingPromptResponse({
    required this.prompt,
    required this.starterSentences,
    required this.vocabularyHints,
    this.structureSuggestion,
  });

  final String prompt;
  final List<String> starterSentences;
  final List<String> vocabularyHints;
  final String? structureSuggestion;

  factory WritingPromptResponse.fromJson(Map<String, dynamic> json) {
    return WritingPromptResponse(
      prompt: json['prompt']?.toString() ?? '',
      starterSentences:
          (json['starterSentences'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      vocabularyHints:
          (json['vocabularyHints'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      structureSuggestion: json['structureSuggestion']?.toString(),
    );
  }
}

/// Exception thrown by writing assistant API operations.
class WritingAssistantException implements Exception {
  const WritingAssistantException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for Writing Assistant API calls.
class WritingAssistantService {
  WritingAssistantService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: EnvironmentConfig.aiOrchestratorBaseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Get feedback on student writing.
  Future<WritingFeedback> getFeedback({
    required String text,
    required WritingType writingType,
    required WritingLevel writingLevel,
    String? assignmentPrompt,
  }) async {
    if (EnvironmentConfig.useWritingMock) {
      await Future.delayed(const Duration(milliseconds: 800));
      return _mockFeedback();
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/agents/writing/feedback',
        data: {
          'text': text,
          'writingType': writingType.code,
          'writingLevel': writingLevel.code,
          if (assignmentPrompt != null) 'assignmentPrompt': assignmentPrompt,
        },
      );

      final feedbackJson = response.data?['feedback'] as Map<String, dynamic>?;
      if (feedbackJson == null) {
        throw const WritingAssistantException('No feedback returned');
      }

      return WritingFeedback.fromJson(feedbackJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get sentence completion suggestions.
  Future<SentenceCompletion> completeSentence({
    required String partialSentence,
    required WritingType writingType,
    required WritingLevel writingLevel,
  }) async {
    if (EnvironmentConfig.useWritingMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockCompletion(partialSentence);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/agents/writing/complete',
        data: {
          'partialSentence': partialSentence,
          'writingType': writingType.code,
          'writingLevel': writingLevel.code,
        },
      );

      return SentenceCompletion.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Generate a writing prompt.
  Future<WritingPromptResponse> generatePrompt({
    required WritingType writingType,
    required WritingLevel writingLevel,
    String? topic,
  }) async {
    if (EnvironmentConfig.useWritingMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockPrompt(writingType);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/agents/writing/prompt',
        data: {
          'writingType': writingType.code,
          'writingLevel': writingLevel.code,
          if (topic != null) 'topic': topic,
        },
      );

      return WritingPromptResponse.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get vocabulary suggestions for text.
  Future<List<WritingSuggestion>> suggestVocabulary({
    required String text,
    required WritingLevel writingLevel,
  }) async {
    if (EnvironmentConfig.useWritingMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockVocabSuggestions();
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/agents/writing/vocabulary',
        data: {
          'text': text,
          'writingLevel': writingLevel.code,
        },
      );

      final suggestionsJson = response.data?['suggestions'] as List<dynamic>? ?? [];
      return suggestionsJson.map((s) => WritingSuggestion.fromJson(s as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Check grammar and get suggestions.
  Future<List<WritingSuggestion>> checkGrammar({
    required String text,
    required WritingLevel writingLevel,
  }) async {
    if (EnvironmentConfig.useWritingMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockGrammarSuggestions();
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/agents/writing/grammar',
        data: {
          'text': text,
          'writingLevel': writingLevel.code,
        },
      );

      final suggestionsJson = response.data?['suggestions'] as List<dynamic>? ?? [];
      return suggestionsJson.map((s) => WritingSuggestion.fromJson(s as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get encouragement for writer's block.
  Future<String> getWritersBlockHelp({
    required WritingLevel writingLevel,
    String? assignmentPrompt,
    String? currentDraft,
  }) async {
    if (EnvironmentConfig.useWritingMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return "Every writer gets stuck sometimes! Try starting with just one sentence about what you're thinking. "
          "You don't have to write perfectly - just get your ideas down and we can work on them together.";
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/agents/writing/help',
        data: {
          'writingLevel': writingLevel.code,
          if (assignmentPrompt != null) 'assignmentPrompt': assignmentPrompt,
          if (currentDraft != null) 'currentDraft': currentDraft,
        },
      );

      return response.data?['encouragement']?.toString() ?? 'Keep trying!';
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  WritingAssistantException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return WritingAssistantException(message ?? 'Unknown error', code: statusCode);
  }

  WritingFeedback _mockFeedback() {
    return const WritingFeedback(
      overallFeedback: "You're developing your ideas well! I can see you're thinking carefully about your story.",
      strengths: ['Great use of descriptive words', 'Clear beginning to your story'],
      areasForImprovement: ['Try adding more details about how the character feels'],
      suggestions: [
        WritingSuggestion(
          type: 'vocabulary',
          original: 'good',
          suggestion: 'wonderful',
          explanation: "'Wonderful' gives more detail about how special something is",
        ),
      ],
      encouragement: "You're making great progress! Keep writing!",
    );
  }

  SentenceCompletion _mockCompletion(String partial) {
    return SentenceCompletion(
      completions: [
        'to the park to play with my friends.',
        'because it was such a beautiful day.',
        'and found a surprise waiting for me.',
      ],
      confidences: [0.9, 0.85, 0.8],
    );
  }

  WritingPromptResponse _mockPrompt(WritingType type) {
    switch (type) {
      case WritingType.narrative:
        return const WritingPromptResponse(
          prompt: 'Write about a time when you discovered something unexpected.',
          starterSentences: [
            'One sunny afternoon, I found...',
            'I never expected to see...',
            'The surprise was hiding right under...',
          ],
          vocabularyHints: ['discover', 'surprise', 'curious', 'adventure'],
          structureSuggestion: 'Start with what happened, then tell how you felt about it.',
        );
      case WritingType.persuasive:
        return const WritingPromptResponse(
          prompt: 'Should students have longer recess? Write your opinion.',
          starterSentences: [
            'I believe that students should...',
            'Recess is important because...',
            'Many people might think..., but I believe...',
          ],
          vocabularyHints: ['believe', 'because', 'important', 'reason'],
          structureSuggestion: 'State your opinion, give reasons, then summarize.',
        );
      default:
        return const WritingPromptResponse(
          prompt: 'What is your favorite thing to do and why?',
          starterSentences: [
            'My favorite thing to do is...',
            'I love doing this because...',
            'When I do this, I feel...',
          ],
          vocabularyHints: ['enjoy', 'favorite', 'special', 'because'],
        );
    }
  }

  List<WritingSuggestion> _mockVocabSuggestions() {
    return const [
      WritingSuggestion(
        type: 'vocabulary',
        original: 'said',
        suggestion: 'exclaimed',
        explanation: "'Exclaimed' shows more excitement than 'said'",
      ),
    ];
  }

  List<WritingSuggestion> _mockGrammarSuggestions() {
    return const [
      WritingSuggestion(
        type: 'grammar',
        original: 'me and my friend',
        suggestion: 'my friend and I',
        explanation: "Put yourself last when listing people",
      ),
    ];
  }
}

/// Provider for the writing assistant service.
final writingAssistantServiceProvider = Provider<WritingAssistantService>((ref) => WritingAssistantService());
