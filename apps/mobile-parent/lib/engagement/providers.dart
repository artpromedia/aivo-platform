import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import 'models.dart';
import 'service.dart';

/// Provider for the engagement service.
///
/// Uses the centralized [dioProvider] from core/api_client.dart which includes:
/// - Proper base URL configuration from environment
/// - AuthInterceptor for automatic token management
/// - Token refresh on 401 responses
/// - Request/response logging
final parentEngagementServiceProvider = Provider<ParentEngagementService>((ref) {
  final dio = ref.watch(dioProvider);
  return ParentEngagementService(dio: dio);
});

/// Provider for child engagement summary
final childEngagementProvider = FutureProvider.family<ChildEngagementSummary, String>(
  (ref, learnerId) async {
    final service = ref.watch(parentEngagementServiceProvider);
    return service.getChildEngagement(learnerId);
  },
);

/// Provider for child badges
final childBadgesProvider = FutureProvider.family<List<ChildBadge>, String>(
  (ref, learnerId) async {
    final service = ref.watch(parentEngagementServiceProvider);
    return service.getChildBadges(learnerId);
  },
);

/// Provider for kudos sent by parent
final sentKudosProvider = FutureProvider.family<List<SentKudos>, String>(
  (ref, parentId) async {
    final service = ref.watch(parentEngagementServiceProvider);
    return service.getSentKudos(parentId);
  },
);

/// Provider for child engagement timeline
final childTimelineProvider = FutureProvider.family<List<EngagementTimelineItem>, String>(
  (ref, learnerId) async {
    final service = ref.watch(parentEngagementServiceProvider);
    return service.getTimeline(learnerId);
  },
);
