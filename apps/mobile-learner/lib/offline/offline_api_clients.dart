/// Offline API Clients for the Learner App
///
/// These implementations wrap the existing app services and implement
/// the interfaces required by SyncManager for offline support.
library;

import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const _learnerModelBaseUrl = String.fromEnvironment(
  'LEARNER_MODEL_BASE_URL',
  defaultValue: 'http://localhost:4015',
);

const _sessionBaseUrl = String.fromEnvironment(
  'SESSION_BASE_URL',
  defaultValue: 'http://localhost:4020',
);

const _contentBaseUrl = String.fromEnvironment(
  'CONTENT_BASE_URL',
  defaultValue: 'http://localhost:4030',
);

const _analyticsBaseUrl = String.fromEnvironment(
  'ANALYTICS_BASE_URL',
  defaultValue: 'http://localhost:4010',
);

// ══════════════════════════════════════════════════════════════════════════════
// PLAN API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Implementation of PlanApiClient for the learner app.
class LearnerPlanApiClient implements PlanApiClient {
  LearnerPlanApiClient({
    required this.getAccessToken,
    Dio? dio,
  }) : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: _learnerModelBaseUrl,
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
            ));

  final Future<String?> Function() getAccessToken;
  final Dio _dio;

  @override
  Future<Map<String, dynamic>> generateTodaysPlan(String learnerId) async {
    final token = await getAccessToken();

    final response = await _dio.post<Map<String, dynamic>>(
      '/virtual-brains/$learnerId/todays-plan',
      options: Options(
        headers: token != null ? {'Authorization': 'Bearer $token'} : null,
      ),
      data: {
        'useAiPlanner': true,
      },
    );

    if (response.data == null) {
      throw Exception('No plan data returned');
    }

    return response.data!;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Implementation of ContentApiClient for the learner app.
class LearnerContentApiClient implements ContentApiClient {
  LearnerContentApiClient({
    required this.getAccessToken,
    Dio? dio,
  }) : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: _contentBaseUrl,
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 60), // Longer for content
            ));

  final Future<String?> Function() getAccessToken;
  final Dio _dio;

  @override
  Future<List<Map<String, dynamic>>> batchFetchContent(
    List<String> contentIds,
  ) async {
    if (contentIds.isEmpty) return [];

    final token = await getAccessToken();

    final response = await _dio.post<Map<String, dynamic>>(
      '/content/batch',
      options: Options(
        headers: token != null ? {'Authorization': 'Bearer $token'} : null,
      ),
      data: {
        'contentIds': contentIds,
      },
    );

    if (response.data == null) {
      throw Exception('No content data returned');
    }

    final items = response.data!['items'] as List<dynamic>?;
    if (items == null) {
      throw Exception('Invalid content response format');
    }

    return items.cast<Map<String, dynamic>>();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Implementation of SessionApiClient for the learner app.
class LearnerSessionApiClient implements SessionApiClient {
  LearnerSessionApiClient({
    required this.getAccessToken,
    Dio? dio,
  }) : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: _sessionBaseUrl,
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
            ));

  final Future<String?> Function() getAccessToken;
  final Dio _dio;

  @override
  Future<Map<String, dynamic>> createSession({
    required String learnerId,
    required String subject,
    required String sessionType,
    required DateTime startedAt,
    required bool offlineOrigin,
    String? localSessionId,
  }) async {
    final token = await getAccessToken();

    final response = await _dio.post<Map<String, dynamic>>(
      '/sessions',
      options: Options(
        headers: token != null ? {'Authorization': 'Bearer $token'} : null,
      ),
      data: {
        'learnerId': learnerId,
        'subject': subject,
        'sessionType': sessionType,
        'startedAt': startedAt.toIso8601String(),
        'offlineOrigin': offlineOrigin,
        if (localSessionId != null) 'localSessionId': localSessionId,
      },
    );

    if (response.data == null) {
      throw Exception('No session data returned');
    }

    return response.data!;
  }

  @override
  Future<void> endSession(String sessionId) async {
    final token = await getAccessToken();

    await _dio.post<void>(
      '/sessions/$sessionId/end',
      options: Options(
        headers: token != null ? {'Authorization': 'Bearer $token'} : null,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Implementation of EventApiClient for the learner app.
class LearnerEventApiClient implements EventApiClient {
  LearnerEventApiClient({
    required this.getAccessToken,
    Dio? dio,
  }) : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: _analyticsBaseUrl,
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
            ));

  final Future<String?> Function() getAccessToken;
  final Dio _dio;

  @override
  Future<void> batchUploadEvents({
    required String sessionId,
    required List<Map<String, dynamic>> events,
  }) async {
    if (events.isEmpty) return;

    final token = await getAccessToken();

    await _dio.post<void>(
      '/sessions/$sessionId/events/batch',
      options: Options(
        headers: token != null ? {'Authorization': 'Bearer $token'} : null,
      ),
      data: {
        'events': events,
      },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the access token getter function.
/// This should be overridden with the actual auth token provider.
final accessTokenProvider = Provider<Future<String?> Function()>((ref) {
  // Default implementation returns null - override in app initialization
  return () async => null;
});

/// Provider for the plan API client.
final planApiClientProvider = Provider<PlanApiClient>((ref) {
  final getToken = ref.watch(accessTokenProvider);
  return LearnerPlanApiClient(getAccessToken: getToken);
});

/// Provider for the content API client.
final contentApiClientProvider = Provider<ContentApiClient>((ref) {
  final getToken = ref.watch(accessTokenProvider);
  return LearnerContentApiClient(getAccessToken: getToken);
});

/// Provider for the session API client.
final sessionApiClientProvider = Provider<SessionApiClient>((ref) {
  final getToken = ref.watch(accessTokenProvider);
  return LearnerSessionApiClient(getAccessToken: getToken);
});

/// Provider for the event API client.
final eventApiClientProvider = Provider<EventApiClient>((ref) {
  final getToken = ref.watch(accessTokenProvider);
  return LearnerEventApiClient(getAccessToken: getToken);
});

/// Provider for the fully configured SyncManager.
final learnerSyncManagerProvider = Provider<SyncManager>((ref) {
  final db = ref.watch(offlineDatabaseProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final planApi = ref.watch(planApiClientProvider);
  final contentApi = ref.watch(contentApiClientProvider);
  final sessionApi = ref.watch(sessionApiClientProvider);
  final eventApi = ref.watch(eventApiClientProvider);

  return SyncManager(
    database: db,
    connectivityService: connectivity,
    planApi: planApi,
    contentApi: contentApi,
    sessionApi: sessionApi,
    eventApi: eventApi,
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// OFFLINE-AWARE PLAN SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// An offline-aware wrapper around plan fetching.
///
/// Uses cached plan when offline, fetches fresh plan when online.
class OfflineAwarePlanService {
  OfflineAwarePlanService({
    required this.syncManager,
    required this.database,
    required this.connectivity,
  });

  final SyncManager syncManager;
  final OfflineDatabase database;
  final ConnectivityService connectivity;

  /// Get today's plan, using cache when offline.
  Future<TodaysPlan> getTodaysPlan(String learnerId) async {
    if (connectivity.isOnline) {
      try {
        // Try to preload fresh data
        await syncManager.preloadForToday(learnerId);
      } catch (e) {
        // Fall through to use cached data
      }
    }

    // Get from local cache
    final session = await database.getActiveSession(learnerId);
    if (session?.planJson != null) {
      final planJson = jsonDecode(session!.planJson!) as Map<String, dynamic>;
      return TodaysPlan.fromJson(planJson);
    }

    throw Exception('No plan available. Please connect to the internet.');
  }

  /// Get cached content for an activity.
  Future<Map<String, dynamic>?> getCachedContent(String contentKey) async {
    final content = await database.getContent(contentKey);
    if (content != null) {
      return jsonDecode(content.jsonPayload) as Map<String, dynamic>;
    }
    return null;
  }
}

/// Provider for the offline-aware plan service.
final offlineAwarePlanServiceProvider = Provider<OfflineAwarePlanService>((ref) {
  return OfflineAwarePlanService(
    syncManager: ref.watch(learnerSyncManagerProvider),
    database: ref.watch(offlineDatabaseProvider),
    connectivity: ref.watch(connectivityServiceProvider),
  );
});
