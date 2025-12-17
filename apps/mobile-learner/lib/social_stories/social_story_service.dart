/// Social Story Service - ND-1.2
///
/// Client service for fetching and managing social stories.

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import 'social_story_models.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for the social story service
final socialStoryServiceProvider = Provider<SocialStoryService>((ref) {
  return SocialStoryService(
    baseUrl: const String.fromEnvironment(
      'CONTENT_SERVICE_URL',
      defaultValue: 'http://localhost:4020',
    ),
  );
});

/// Provider for learner preferences
final learnerStoryPreferencesProvider = FutureProvider.family<
    LearnerStoryPreferences, String>((ref, learnerId) async {
  final service = ref.watch(socialStoryServiceProvider);
  return service.getLearnerPreferences(learnerId);
});

/// Provider for story recommendations
final storyRecommendationsProvider = FutureProvider.family<
    List<StoryRecommendation>, StoryRecommendationQuery>((ref, query) async {
  final service = ref.watch(socialStoryServiceProvider);
  return service.getRecommendations(query);
});

/// Query parameters for story recommendations
class StoryRecommendationQuery {
  const StoryRecommendationQuery({
    required this.learnerId,
    this.currentActivityType,
    this.nextActivityType,
    this.detectedEmotionalState,
    this.maxResults = 5,
  });

  final String learnerId;
  final String? currentActivityType;
  final String? nextActivityType;
  final String? detectedEmotionalState;
  final int maxResults;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StoryRecommendationQuery &&
          learnerId == other.learnerId &&
          currentActivityType == other.currentActivityType &&
          nextActivityType == other.nextActivityType &&
          detectedEmotionalState == other.detectedEmotionalState;

  @override
  int get hashCode => Object.hash(
        learnerId,
        currentActivityType,
        nextActivityType,
        detectedEmotionalState,
      );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for interacting with the social stories API
class SocialStoryService {
  SocialStoryService({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  String? _authToken;

  /// Set the authentication token for API requests
  void setAuthToken(String token) {
    _authToken = token;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  // ────────────────────────────────────────────────────────────────────────────
  // STORY CRUD
  // ────────────────────────────────────────────────────────────────────────────

  /// List social stories with optional filtering
  Future<List<SocialStory>> listStories({
    SocialStoryCategory? category,
    SocialStoryReadingLevel? readingLevel,
    String? search,
    int page = 1,
    int pageSize = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'pageSize': pageSize.toString(),
      if (category != null) 'category': category.name.toUpperCase(),
      if (readingLevel != null) 'readingLevel': readingLevel.name.toUpperCase(),
      if (search != null) 'search': search,
    };

    final uri = Uri.parse('$baseUrl/api/social-stories')
        .replace(queryParameters: queryParams);

    final response = await _client.get(uri, headers: _headers);
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final items = data['items'] as List<dynamic>;

    return items
        .map((e) => SocialStory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get a single story by ID
  Future<SocialStory> getStory(String storyId) async {
    final uri = Uri.parse('$baseUrl/api/social-stories/$storyId');
    final response = await _client.get(uri, headers: _headers);
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return SocialStory.fromJson(data);
  }

  /// Get a story by slug
  Future<SocialStory> getStoryBySlug(String slug) async {
    final uri = Uri.parse('$baseUrl/api/social-stories/slug/$slug');
    final response = await _client.get(uri, headers: _headers);
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return SocialStory.fromJson(data);
  }

  /// Get a personalized version of a story
  Future<SocialStory> getPersonalizedStory(
    String storyId,
    PersonalizationContext context,
  ) async {
    final uri = Uri.parse('$baseUrl/api/social-stories/$storyId/personalize');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode(context.toJson()),
    );
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return SocialStory.fromJson(data);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LEARNER PREFERENCES
  // ────────────────────────────────────────────────────────────────────────────

  /// Get learner story preferences
  Future<LearnerStoryPreferences> getLearnerPreferences(
    String learnerId,
  ) async {
    final uri = Uri.parse('$baseUrl/api/learners/$learnerId/story-preferences');
    final response = await _client.get(uri, headers: _headers);
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return LearnerStoryPreferences.fromJson(data);
  }

  /// Update learner story preferences
  Future<LearnerStoryPreferences> updateLearnerPreferences(
    String learnerId,
    LearnerStoryPreferences preferences,
  ) async {
    final uri = Uri.parse('$baseUrl/api/learners/$learnerId/story-preferences');
    final response = await _client.put(
      uri,
      headers: _headers,
      body: jsonEncode(preferences.toJson()),
    );
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return LearnerStoryPreferences.fromJson(data);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STORY VIEWS
  // ────────────────────────────────────────────────────────────────────────────

  /// Record a story view
  Future<void> recordStoryView(RecordStoryViewData viewData) async {
    final uri = Uri.parse(
      '$baseUrl/api/social-stories/${viewData.storyId}/views',
    );
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode(viewData.toJson()),
    );
    _checkResponse(response);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ────────────────────────────────────────────────────────────────────────────

  /// Get story recommendations for a learner
  Future<List<StoryRecommendation>> getRecommendations(
    StoryRecommendationQuery query,
  ) async {
    final queryParams = <String, String>{
      'maxResults': query.maxResults.toString(),
      if (query.currentActivityType != null)
        'currentActivityType': query.currentActivityType!,
      if (query.nextActivityType != null)
        'nextActivityType': query.nextActivityType!,
      if (query.detectedEmotionalState != null)
        'detectedEmotionalState': query.detectedEmotionalState!,
    };

    final uri = Uri.parse(
      '$baseUrl/api/learners/${query.learnerId}/story-recommendations',
    ).replace(queryParameters: queryParams);

    final response = await _client.get(uri, headers: _headers);
    _checkResponse(response);

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final items = data['items'] as List<dynamic>;

    return items
        .map((e) => StoryRecommendation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  void _checkResponse(http.Response response) {
    if (response.statusCode >= 400) {
      final body = jsonDecode(response.body) as Map<String, dynamic>?;
      final error = body?['error'] as String? ?? 'Unknown error';
      throw SocialStoryServiceException(
        error,
        statusCode: response.statusCode,
      );
    }
  }
}

/// Exception thrown by the social story service
class SocialStoryServiceException implements Exception {
  const SocialStoryServiceException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'SocialStoryServiceException: $message';
}
