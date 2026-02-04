/// AI Brain Providers
///
/// Riverpod providers for AI brain state management.
library;

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/api_client.dart';
import '../api/ai_brain_api.dart';
import '../models/ai_brain_state.dart';

part 'ai_brain_provider.g.dart';

/// Provider for AI Brain API client.
@riverpod
AIBrainApi aiBrainApi(AiBrainApiRef ref) {
  final dio = ref.watch(dioProvider);
  return AIBrainApi(dio: dio);
}

/// Fetch AI brain state for a child.
@riverpod
Future<AIBrainState> aiBrainState(
  AiBrainStateRef ref,
  String childId,
) async {
  final api = ref.watch(aiBrainApiProvider);
  return api.fetchAIBrainState(childId);
}

/// Fetch recent AI adaptations for a child.
@riverpod
Future<List<LearningAdaptation>> aiAdaptations(
  AiAdaptationsRef ref,
  String childId, {
  int limit = 20,
}) async {
  final api = ref.watch(aiBrainApiProvider);
  return api.fetchRecentAdaptations(childId, limit: limit);
}

/// Fetch learning path for a child and subject.
@riverpod
Future<LearningPath> learningPath(
  LearningPathRef ref, {
  required String childId,
  required String subject,
}) async {
  final api = ref.watch(aiBrainApiProvider);
  return api.fetchLearningPath(childId, subject);
}

/// Fetch AI decision log for a child.
@riverpod
Future<List<AIDecision>> aiDecisionLog(
  AiDecisionLogRef ref,
  String childId, {
  DateTime? startDate,
  DateTime? endDate,
}) async {
  final api = ref.watch(aiBrainApiProvider);
  return api.fetchAIDecisionLog(
    childId,
    startDate: startDate,
    endDate: endDate,
  );
}

/// Fetch available subjects for a child.
@riverpod
Future<List<SubjectInfo>> aiSubjects(
  AiSubjectsRef ref,
  String childId,
) async {
  final api = ref.watch(aiBrainApiProvider);
  return api.fetchSubjects(childId);
}

/// Fetch AI personality for a child.
@riverpod
Future<AIPersonality> aiPersonality(
  AiPersonalityRef ref,
  String childId,
) async {
  final api = ref.watch(aiBrainApiProvider);
  return api.fetchAIPersonality(childId);
}

/// Selected subject for learning path view.
@riverpod
class SelectedSubject extends _$SelectedSubject {
  @override
  String? build() => null;

  void select(String subject) => state = subject;
  void clear() => state = null;
}
