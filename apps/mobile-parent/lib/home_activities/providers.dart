import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'home_activities_api.dart';
import 'models.dart';

// API Provider
final homeActivitiesApiProvider = Provider<HomeActivitiesApi>((ref) {
  return HomeActivitiesApi();
});

// ============================================================================
// Learning Games Providers
// ============================================================================

final learningGamesProvider = FutureProvider.family<List<LearningGame>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getGames(childId: childId);
  },
);

final gameDetailProvider = FutureProvider.family<LearningGame, String>(
  (ref, gameId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getGameDetails(gameId);
  },
);

final gameProgressProvider = FutureProvider.family<List<GameProgress>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getGameProgress(childId);
  },
);

// ============================================================================
// Practice Exercises Providers
// ============================================================================

final practiceExercisesProvider = FutureProvider.family<List<PracticeExercise>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getExercises(childId: childId);
  },
);

final exerciseProgressProvider = FutureProvider.family<List<ExerciseProgress>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getExerciseProgress(childId);
  },
);

// ============================================================================
// Skill Builders Providers
// ============================================================================

final skillBuildersProvider = FutureProvider.family<List<SkillBuilder>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getSkillBuilders(childId: childId);
  },
);

final skillBuilderDetailProvider = FutureProvider.family<SkillBuilder, String>(
  (ref, builderId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getSkillBuilderDetails(builderId);
  },
);

final skillBuilderProgressProvider = FutureProvider.family<List<SkillBuilderProgress>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getSkillBuilderProgress(childId);
  },
);

// ============================================================================
// Family Activities Providers
// ============================================================================

final familyActivitiesProvider = FutureProvider.family<List<FamilyActivity>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getFamilyActivities(childId: childId);
  },
);

final recommendedActivitiesProvider = FutureProvider.family<List<FamilyActivity>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getRecommendedActivities(childId);
  },
);

final familyActivityDetailProvider = FutureProvider.family<FamilyActivity, String>(
  (ref, activityId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getActivityDetails(activityId);
  },
);

final completedFamilyActivitiesProvider = FutureProvider.family<List<FamilyActivitySession>, String>(
  (ref, childId) async {
    final api = ref.watch(homeActivitiesApiProvider);
    return api.getCompletedActivities(childId);
  },
);

// ============================================================================
// Session Management Providers
// ============================================================================

class GameSessionNotifier extends StateNotifier<AsyncValue<GameSession?>> {
  final HomeActivitiesApi api;

  GameSessionNotifier(this.api) : super(const AsyncValue.data(null));

  Future<void> startSession(String gameId, String childId) async {
    state = const AsyncValue.loading();
    try {
      final session = await api.startGameSession(
        gameId: gameId,
        childId: childId,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> completeSession({
    required String sessionId,
    required int score,
    required int timeSpent,
    Map<String, dynamic>? sessionData,
  }) async {
    try {
      final session = await api.completeGameSession(
        sessionId: sessionId,
        score: score,
        timeSpent: timeSpent,
        sessionData: sessionData,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final gameSessionProvider = StateNotifierProvider<GameSessionNotifier, AsyncValue<GameSession?>>(
  (ref) {
    final api = ref.watch(homeActivitiesApiProvider);
    return GameSessionNotifier(api);
  },
);

class ExerciseSessionNotifier extends StateNotifier<AsyncValue<ExerciseSession?>> {
  final HomeActivitiesApi api;

  ExerciseSessionNotifier(this.api) : super(const AsyncValue.data(null));

  Future<void> startSession(String exerciseId, String childId) async {
    state = const AsyncValue.loading();
    try {
      final session = await api.startExerciseSession(
        exerciseId: exerciseId,
        childId: childId,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<ExerciseResult> submitAnswer({
    required String sessionId,
    required String questionId,
    required dynamic answer,
  }) async {
    return await api.submitAnswer(
      sessionId: sessionId,
      questionId: questionId,
      answer: answer,
    );
  }

  Future<void> completeSession(String sessionId) async {
    try {
      final session = await api.completeExerciseSession(sessionId);
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final exerciseSessionProvider = StateNotifierProvider<ExerciseSessionNotifier, AsyncValue<ExerciseSession?>>(
  (ref) {
    final api = ref.watch(homeActivitiesApiProvider);
    return ExerciseSessionNotifier(api);
  },
);

class SkillBuilderSessionNotifier extends StateNotifier<AsyncValue<SkillBuilderSession?>> {
  final HomeActivitiesApi api;

  SkillBuilderSessionNotifier(this.api) : super(const AsyncValue.data(null));

  Future<void> startActivity({
    required String builderId,
    required String activityId,
    required String childId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final session = await api.startSkillBuilderActivity(
        builderId: builderId,
        activityId: activityId,
        childId: childId,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> completeActivity({
    required String sessionId,
    required bool completed,
    int? score,
    String? notes,
  }) async {
    try {
      final session = await api.completeSkillBuilderActivity(
        sessionId: sessionId,
        completed: completed,
        score: score,
        notes: notes,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final skillBuilderSessionProvider = StateNotifierProvider<SkillBuilderSessionNotifier, AsyncValue<SkillBuilderSession?>>(
  (ref) {
    final api = ref.watch(homeActivitiesApiProvider);
    return SkillBuilderSessionNotifier(api);
  },
);

class FamilyActivitySessionNotifier extends StateNotifier<AsyncValue<FamilyActivitySession?>> {
  final HomeActivitiesApi api;

  FamilyActivitySessionNotifier(this.api) : super(const AsyncValue.data(null));

  Future<void> startActivity({
    required String activityId,
    required String childId,
    List<String>? participants,
  }) async {
    state = const AsyncValue.loading();
    try {
      final session = await api.startFamilyActivity(
        activityId: activityId,
        childId: childId,
        participants: participants,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> completeActivity({
    required String sessionId,
    required int rating,
    String? feedback,
    List<String>? photos,
  }) async {
    try {
      final session = await api.completeFamilyActivity(
        sessionId: sessionId,
        rating: rating,
        feedback: feedback,
        photos: photos,
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final familyActivitySessionProvider = StateNotifierProvider<FamilyActivitySessionNotifier, AsyncValue<FamilyActivitySession?>>(
  (ref) {
    final api = ref.watch(homeActivitiesApiProvider);
    return FamilyActivitySessionNotifier(api);
  },
);
