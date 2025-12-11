/// Offline API Clients for Parent App
///
/// Implements the API client interfaces required by SyncManager
/// for parent-specific functionality.
library;

import 'package:dio/dio.dart';
import 'package:flutter_common/flutter_common.dart';

// ══════════════════════════════════════════════════════════════════════════════
// PARENT PLAN API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Parent plan API client implementation.
///
/// Parents view their children's plans (read-only).
class ParentPlanApiClient implements PlanApiClient {
  ParentPlanApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<Map<String, dynamic>> generateTodaysPlan(String learnerId) async {
    // Parents fetch existing plans, not generate new ones
    final response = await dio.get(
      '$_baseUrl/plan/learners/$learnerId/today',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch weekly summary for a learner.
  Future<Map<String, dynamic>> fetchWeeklySummary(String learnerId) async {
    final response = await dio.get(
      '$_baseUrl/reports/learners/$learnerId/weekly-summary',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch progress report for a learner.
  Future<Map<String, dynamic>> fetchProgressReport(String learnerId) async {
    final response = await dio.get(
      '$_baseUrl/reports/learners/$learnerId/progress',
    );
    return response.data as Map<String, dynamic>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PARENT SESSION API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Parent session API client (mostly read-only).
class ParentSessionApiClient implements SessionApiClient {
  ParentSessionApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<Map<String, dynamic>> createSession({
    required String learnerId,
    required String subject,
    required String sessionType,
    required DateTime startedAt,
    required bool offlineOrigin,
    String? localSessionId,
  }) async {
    // Parents don't typically create sessions, but if homework helper
    // is available through parent app, they might
    final response = await dio.post(
      '$_baseUrl/session/parent-sessions',
      data: {
        'learnerId': learnerId,
        'subject': subject,
        'sessionType': sessionType,
        'startedAt': startedAt.millisecondsSinceEpoch,
        'offlineOrigin': offlineOrigin,
        'localSessionId': localSessionId,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<void> endSession(String sessionId) async {
    await dio.patch(
      '$_baseUrl/session/parent-sessions/$sessionId/end',
      data: {'endedAt': DateTime.now().millisecondsSinceEpoch},
    );
  }

  /// Fetch recent sessions for a learner (parent view).
  Future<List<Map<String, dynamic>>> fetchRecentSessions(
    String learnerId, {
    int limit = 10,
  }) async {
    final response = await dio.get(
      '$_baseUrl/session/learners/$learnerId/recent',
      queryParameters: {'limit': limit},
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PARENT EVENT API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Parent event API client.
class ParentEventApiClient implements EventApiClient {
  ParentEventApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<void> batchUploadEvents({
    required String sessionId,
    required List<Map<String, dynamic>> events,
  }) async {
    await dio.post(
      '$_baseUrl/session/parent-sessions/$sessionId/events/batch',
      data: {'events': events},
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PARENT CONTENT API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Parent content API client.
///
/// Parents may view educational content and explanations.
class ParentContentApiClient implements ContentApiClient {
  ParentContentApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<List<Map<String, dynamic>>> batchFetchContent(
    List<String> contentKeys,
  ) async {
    final response = await dio.post(
      '$_baseUrl/content/batch',
      data: {'keys': contentKeys},
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }

  /// Fetch parent-friendly explanation for a topic.
  Future<Map<String, dynamic>> fetchParentGuide(String topicId) async {
    final response = await dio.get(
      '$_baseUrl/content/topics/$topicId/parent-guide',
    );
    return response.data as Map<String, dynamic>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PARENT-SPECIFIC API CLIENTS
// ══════════════════════════════════════════════════════════════════════════════

/// API client for parent's linked learners.
class ParentLearnersApiClient {
  ParentLearnersApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  /// Fetch all learners linked to this parent.
  Future<List<Map<String, dynamic>>> fetchLinkedLearners(
    String parentId,
  ) async {
    final response = await dio.get(
      '$_baseUrl/parents/$parentId/learners',
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }

  /// Fetch learner profile with recent activity.
  Future<Map<String, dynamic>> fetchLearnerProfile(String learnerId) async {
    final response = await dio.get(
      '$_baseUrl/learners/$learnerId/profile',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch baseline results for a learner.
  Future<Map<String, dynamic>> fetchBaselineResults(String learnerId) async {
    final response = await dio.get(
      '$_baseUrl/baseline/learners/$learnerId/results',
    );
    return response.data as Map<String, dynamic>;
  }
}

/// API client for homework focus settings.
class HomeworkFocusApiClient {
  HomeworkFocusApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  /// Fetch homework focus settings for a learner.
  Future<Map<String, dynamic>> fetchFocusSettings(String learnerId) async {
    final response = await dio.get(
      '$_baseUrl/focus/learners/$learnerId/settings',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Update homework focus settings.
  Future<void> updateFocusSettings({
    required String learnerId,
    required Map<String, dynamic> settings,
  }) async {
    await dio.put(
      '$_baseUrl/focus/learners/$learnerId/settings',
      data: settings,
    );
  }
}

/// API client for subscription/billing.
class SubscriptionApiClient {
  SubscriptionApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  /// Fetch current subscription status.
  Future<Map<String, dynamic>> fetchSubscription(String parentId) async {
    final response = await dio.get(
      '$_baseUrl/billing/parents/$parentId/subscription',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch available modules/add-ons.
  Future<List<Map<String, dynamic>>> fetchAvailableModules() async {
    final response = await dio.get(
      '$_baseUrl/billing/modules',
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }
}
