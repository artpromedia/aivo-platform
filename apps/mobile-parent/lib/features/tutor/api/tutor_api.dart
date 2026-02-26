/// Tutor API
///
/// API client for tutor add-ons, session history, and purchases.
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/api_client.dart';
import '../models/tutor_models.dart';

part 'tutor_api.g.dart';

/// Provider for the tutor API client.
@riverpod
TutorApi tutorApi(Ref ref) {
  final dio = ref.watch(dioProvider);
  return TutorApi(dio);
}

/// API client for tutor features in the parent app.
class TutorApi {
  TutorApi(this._dio);

  final Dio _dio;

  // ============================================================
  // Marketplace / Add-on APIs
  // ============================================================

  /// Fetch all available tutor add-ons (includes status per account).
  Future<List<TutorAddon>> fetchAddons() async {
    final response = await _dio.get('/api/v1/tutor/addons');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => TutorAddon.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Purchase a tutor add-on. Returns the updated add-on with active status.
  Future<TutorAddon> purchaseAddon(String addonId) async {
    final response = await _dio.post('/api/v1/tutor/addons/$addonId/purchase');
    return TutorAddon.fromJson(response.data as Map<String, dynamic>);
  }

  // ============================================================
  // Session History APIs
  // ============================================================

  /// Fetch tutor session history for a child.
  Future<List<TutorSession>> fetchSessions(
    String childId, {
    int limit = 30,
    int offset = 0,
  }) async {
    final response = await _dio.get(
      '/api/v1/children/$childId/tutor/sessions',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => TutorSession.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch the detailed report for a single session.
  Future<TutorSessionReport> fetchSessionReport(
    String childId,
    String sessionId,
  ) async {
    final response = await _dio.get(
      '/api/v1/children/$childId/tutor/sessions/$sessionId/report',
    );
    return TutorSessionReport.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  // ============================================================
  // Analytics APIs (Sprint 9)
  // ============================================================

  /// Fetch aggregated analytics summary.
  Future<TutorAnalyticsSummary> fetchAnalyticsSummary({
    String? learnerId,
    int days = 30,
  }) async {
    final params = <String, dynamic>{'days': days};
    if (learnerId != null) params['learnerId'] = learnerId;

    final response = await _dio.get(
      '/api/v1/tutor/analytics/summary',
      queryParameters: params,
    );
    return TutorAnalyticsSummary.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// Fetch paginated session list for analytics.
  Future<AnalyticsSessionsResponse> fetchAnalyticsSessions({
    required String learnerId,
    String? subject,
    int page = 1,
    int pageSize = 20,
  }) async {
    final params = <String, dynamic>{
      'learnerId': learnerId,
      'page': page,
      'pageSize': pageSize,
    };
    if (subject != null) params['subject'] = subject;

    final response = await _dio.get(
      '/api/v1/tutor/analytics/sessions',
      queryParameters: params,
    );
    return AnalyticsSessionsResponse.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// Fetch full transcript for a session.
  Future<TranscriptResponse> fetchTranscript(String sessionId) async {
    final response = await _dio.get(
      '/api/v1/tutor/analytics/sessions/$sessionId/transcript',
    );
    return TranscriptResponse.fromJson(
      response.data as Map<String, dynamic>,
    );
  }
}
