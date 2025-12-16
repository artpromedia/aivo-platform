import 'package:dio/dio.dart';
import 'models.dart';

/// Service for parent engagement API calls
class ParentEngagementService {
  ParentEngagementService({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// Get engagement summary for a child
  Future<ChildEngagementSummary> getChildEngagement(String learnerId) async {
    final response = await _dio.get('/engagement/learners/$learnerId/summary');
    return ChildEngagementSummary.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get badges earned by a child
  Future<List<ChildBadge>> getChildBadges(String learnerId) async {
    final response = await _dio.get('/engagement/learners/$learnerId/badges');
    final list = response.data as List<dynamic>;
    return list.map((e) => ChildBadge.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get kudos sent by the parent
  Future<List<SentKudos>> getSentKudos(String parentId) async {
    final response = await _dio.get('/engagement/parents/$parentId/kudos');
    final list = response.data as List<dynamic>;
    return list.map((e) => SentKudos.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Send kudos to a child
  Future<void> sendKudos({
    required String learnerId,
    required String parentId,
    required String message,
  }) async {
    await _dio.post(
      '/engagement/learners/$learnerId/kudos',
      data: {
        'senderId': parentId,
        'senderRole': 'parent',
        'message': message,
      },
    );
  }

  /// Grant a badge to a child (for special achievements)
  Future<void> grantBadge({
    required String learnerId,
    required String badgeCode,
    required String parentId,
    String? reason,
  }) async {
    await _dio.post(
      '/engagement/learners/$learnerId/badges/$badgeCode/grant',
      data: {
        'grantedBy': parentId,
        'reason': reason,
      },
    );
  }

  /// Get engagement timeline for a child
  Future<List<EngagementTimelineItem>> getTimeline(
    String learnerId, {
    int limit = 20,
  }) async {
    final response = await _dio.get(
      '/engagement/learners/$learnerId/timeline',
      queryParameters: {'limit': limit},
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => EngagementTimelineItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
