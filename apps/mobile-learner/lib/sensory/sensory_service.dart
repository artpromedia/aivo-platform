/// Sensory Service - ND-2.1
///
/// Client service for sensory profile management and content matching.

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import 'sensory_models.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for the sensory service
final sensoryServiceProvider = Provider<SensoryService>((ref) {
  return SensoryService(
    baseUrl: const String.fromEnvironment(
      'CONTENT_SERVICE_URL',
      defaultValue: 'http://localhost:4020',
    ),
  );
});

/// Provider for learner sensory profile
final sensoryProfileProvider =
    FutureProvider.family<SensoryProfile?, String>((ref, learnerId) async {
  final service = ref.watch(sensoryServiceProvider);
  return service.getLearnerProfile(learnerId);
});

/// Provider for content sensory settings (derived from profile)
final sensorySettingsProvider =
    Provider.family<ContentSensorySettings, SensoryProfile>((ref, profile) {
  return ContentSensorySettings.fromProfile(profile);
});

/// Provider for content match result
final contentMatchProvider = FutureProvider.family<SensoryMatchResult?,
    ContentMatchQuery>((ref, query) async {
  final service = ref.watch(sensoryServiceProvider);
  return service.getContentMatch(query.profile, query.contentVersionId);
});

/// Query for content matching
class ContentMatchQuery {
  const ContentMatchQuery({
    required this.profile,
    required this.contentVersionId,
  });

  final SensoryProfile profile;
  final String contentVersionId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContentMatchQuery &&
          profile.learnerId == other.profile.learnerId &&
          contentVersionId == other.contentVersionId;

  @override
  int get hashCode => Object.hash(profile.learnerId, contentVersionId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for sensory profile management and content matching
class SensoryService {
  SensoryService({
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
  // PROFILE OPERATIONS
  // ────────────────────────────────────────────────────────────────────────────

  /// Get learner's sensory profile
  Future<SensoryProfile?> getLearnerProfile(String learnerId) async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/api/sensory-profiles/$learnerId'),
        headers: _headers,
      );

      if (response.statusCode == 404) {
        return null;
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to get sensory profile: ${response.statusCode}');
      }

      return SensoryProfile.fromJson(jsonDecode(response.body));
    } catch (e) {
      print('Error fetching sensory profile: $e');
      return null;
    }
  }

  /// Update learner's sensory profile
  Future<SensoryProfile> updateProfile(SensoryProfile profile) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/api/sensory-profiles/${profile.learnerId}'),
      headers: _headers,
      body: jsonEncode(profile.toJson()),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to update sensory profile: ${response.statusCode}');
    }

    return SensoryProfile.fromJson(jsonDecode(response.body));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CONTENT MATCHING
  // ────────────────────────────────────────────────────────────────────────────

  /// Get sensory match result for content
  Future<SensoryMatchResult?> getContentMatch(
    SensoryProfile profile,
    String contentVersionId,
  ) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/api/sensory-match'),
        headers: _headers,
        body: jsonEncode({
          'profile': profile.toJson(),
          'contentVersionId': contentVersionId,
          'options': {
            'includeExplanations': true,
            'generateAdaptations': true,
          },
        }),
      );

      if (response.statusCode == 404) {
        return null;
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to get content match: ${response.statusCode}');
      }

      final data = jsonDecode(response.body);
      return SensoryMatchResult.fromJson(data['matchResult']);
    } catch (e) {
      print('Error getting content match: $e');
      return null;
    }
  }

  /// Batch match multiple content items
  Future<Map<String, SensoryMatchResult>> batchMatchContent(
    SensoryProfile profile,
    List<String> contentVersionIds,
  ) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/sensory-match/batch'),
      headers: _headers,
      body: jsonEncode({
        'profile': profile.toJson(),
        'contentVersionIds': contentVersionIds,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to batch match content: ${response.statusCode}');
    }

    final data = jsonDecode(response.body);
    final results = <String, SensoryMatchResult>{};

    for (final result in data['results'] as List) {
      results[result['contentId'] as String] =
          SensoryMatchResult.fromJson(result['matchResult']);
    }

    return results;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INCIDENT REPORTING
  // ────────────────────────────────────────────────────────────────────────────

  /// Report a sensory incident
  Future<SensoryIncident> reportIncident({
    required String learnerId,
    required String tenantId,
    required String incidentType,
    required TriggerCategory triggerCategory,
    String? contentId,
    String? contentType,
    String? contentTitle,
    String? sessionId,
    String? activityId,
    IncidentSeverity? severity,
    String? triggerDescription,
    String? reportedByUserId,
    String? reportedByRole,
    String? userDescription,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/sensory-incidents'),
      headers: _headers,
      body: jsonEncode({
        'learnerId': learnerId,
        'tenantId': tenantId,
        'incidentType': incidentType,
        'triggerCategory': triggerCategory.name,
        if (contentId != null) 'contentId': contentId,
        if (contentType != null) 'contentType': contentType,
        if (contentTitle != null) 'contentTitle': contentTitle,
        if (sessionId != null) 'sessionId': sessionId,
        if (activityId != null) 'activityId': activityId,
        if (severity != null) 'severity': severity.name,
        if (triggerDescription != null) 'triggerDescription': triggerDescription,
        if (reportedByUserId != null) 'reportedByUserId': reportedByUserId,
        if (reportedByRole != null) 'reportedByRole': reportedByRole,
        if (userDescription != null) 'userDescription': userDescription,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to report incident: ${response.statusCode}');
    }

    return SensoryIncident.fromJson(jsonDecode(response.body));
  }

  /// Get recent incidents for learner
  Future<List<SensoryIncident>> getRecentIncidents(
    String learnerId, {
    int limit = 10,
  }) async {
    final response = await _client.get(
      Uri.parse(
          '$baseUrl/api/sensory-incidents?learnerId=$learnerId&pageSize=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to get incidents: ${response.statusCode}');
    }

    final data = jsonDecode(response.body);
    return (data['items'] as List)
        .map((i) => SensoryIncident.fromJson(i))
        .toList();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADAPTIVE SETTINGS
  // ────────────────────────────────────────────────────────────────────────────

  /// Get content settings based on match result
  ContentSensorySettings getSettingsFromMatch(SensoryMatchResult matchResult) {
    return ContentSensorySettings.fromAdaptations(matchResult.adaptations);
  }

  /// Get default settings for a profile
  ContentSensorySettings getDefaultSettings(SensoryProfile profile) {
    return ContentSensorySettings.fromProfile(profile);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE NOTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

/// State for current sensory settings
class SensorySettingsState {
  const SensorySettingsState({
    required this.settings,
    this.profile,
    this.matchResult,
    this.isLoading = false,
    this.error,
  });

  final ContentSensorySettings settings;
  final SensoryProfile? profile;
  final SensoryMatchResult? matchResult;
  final bool isLoading;
  final String? error;

  SensorySettingsState copyWith({
    ContentSensorySettings? settings,
    SensoryProfile? profile,
    SensoryMatchResult? matchResult,
    bool? isLoading,
    String? error,
  }) {
    return SensorySettingsState(
      settings: settings ?? this.settings,
      profile: profile ?? this.profile,
      matchResult: matchResult ?? this.matchResult,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// State notifier for managing sensory settings
class SensorySettingsNotifier extends StateNotifier<SensorySettingsState> {
  SensorySettingsNotifier(this._service)
      : super(const SensorySettingsState(
          settings: ContentSensorySettings(),
        ));

  final SensoryService _service;

  /// Load sensory profile for a learner
  Future<void> loadProfile(String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final profile = await _service.getLearnerProfile(learnerId);
      if (profile != null) {
        final settings = _service.getDefaultSettings(profile);
        state = state.copyWith(
          profile: profile,
          settings: settings,
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Get settings for specific content
  Future<void> loadContentSettings(String contentVersionId) async {
    if (state.profile == null) return;

    state = state.copyWith(isLoading: true);

    try {
      final matchResult = await _service.getContentMatch(
        state.profile!,
        contentVersionId,
      );

      if (matchResult != null) {
        final settings = _service.getSettingsFromMatch(matchResult);
        state = state.copyWith(
          matchResult: matchResult,
          settings: settings,
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Update a specific setting
  void updateSetting(ContentSensorySettings settings) {
    state = state.copyWith(settings: settings);
  }

  /// Reset to profile defaults
  void resetToDefaults() {
    if (state.profile != null) {
      state = state.copyWith(
        settings: _service.getDefaultSettings(state.profile!),
        matchResult: null,
      );
    }
  }
}

/// Provider for sensory settings state notifier
final sensorySettingsNotifierProvider =
    StateNotifierProvider<SensorySettingsNotifier, SensorySettingsState>((ref) {
  final service = ref.watch(sensoryServiceProvider);
  return SensorySettingsNotifier(service);
});
