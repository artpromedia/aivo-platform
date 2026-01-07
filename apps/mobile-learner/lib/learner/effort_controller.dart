import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('ANALYTICS_BASE_URL', defaultValue: 'http://localhost:4030');
const _useAnalyticsMock = bool.fromEnvironment('USE_ANALYTICS_MOCK', defaultValue: false);

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Milestone types for learner achievements.
enum MilestoneType {
  streak,
  skills,
  sessions;

  static MilestoneType fromString(String value) {
    return MilestoneType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => MilestoneType.streak,
    );
  }
}

/// A milestone/badge that can be earned.
@immutable
class Milestone {
  const Milestone({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.achieved,
    this.achievedAt,
    this.progress,
    this.target,
  });

  final String id;
  final MilestoneType type;
  final String title;
  final String description;
  final bool achieved;
  final DateTime? achievedAt;
  final int? progress;
  final int? target;

  factory Milestone.fromJson(Map<String, dynamic> json) {
    return Milestone(
      id: json['id']?.toString() ?? '',
      type: MilestoneType.fromString(json['type']?.toString() ?? 'streak'),
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      achieved: json['achieved'] == true,
      achievedAt: json['achievedAt'] != null 
          ? DateTime.tryParse(json['achievedAt'].toString()) 
          : null,
      progress: (json['progress'] as num?)?.toInt(),
      target: (json['target'] as num?)?.toInt(),
    );
  }

  /// Progress as a percentage (0.0 to 1.0).
  double get progressPercent {
    if (target == null || target == 0) return achieved ? 1.0 : 0.0;
    if (progress == null) return achieved ? 1.0 : 0.0;
    return (progress! / target!).clamp(0.0, 1.0);
  }

  /// Icon for this milestone type.
  String get emoji {
    switch (type) {
      case MilestoneType.streak:
        return '🔥';
      case MilestoneType.skills:
        return '⭐';
      case MilestoneType.sessions:
        return '📚';
    }
  }
}

/// Effort summary response from API.
@immutable
class EffortSummary {
  const EffortSummary({
    required this.learnerId,
    required this.currentStreakDays,
    required this.longestStreakDays,
    required this.skillsMasteredThisMonth,
    required this.sessionsCountThisWeek,
    required this.milestones,
    required this.encouragementMessage,
  });

  final String learnerId;
  final int currentStreakDays;
  final int longestStreakDays;
  final int skillsMasteredThisMonth;
  final int sessionsCountThisWeek;
  final List<Milestone> milestones;
  final String encouragementMessage;

  factory EffortSummary.fromJson(Map<String, dynamic> json) {
    final milestonesJson = json['milestones'] as List<dynamic>? ?? [];
    return EffortSummary(
      learnerId: json['learnerId']?.toString() ?? '',
      currentStreakDays: (json['currentStreakDays'] as num?)?.toInt() ?? 0,
      longestStreakDays: (json['longestStreakDays'] as num?)?.toInt() ?? 0,
      skillsMasteredThisMonth: (json['skillsMasteredThisMonth'] as num?)?.toInt() ?? 0,
      sessionsCountThisWeek: (json['sessionsCountThisWeek'] as num?)?.toInt() ?? 0,
      milestones: milestonesJson
          .whereType<Map<String, dynamic>>()
          .map(Milestone.fromJson)
          .toList(),
      encouragementMessage: json['encouragementMessage']?.toString() ?? '',
    );
  }

  /// Get achieved milestones.
  List<Milestone> get achievedMilestones => 
      milestones.where((m) => m.achieved).toList();

  /// Get in-progress milestones.
  List<Milestone> get inProgressMilestones => 
      milestones.where((m) => !m.achieved).toList();
}

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

@immutable
class EffortState {
  const EffortState({
    this.isLoading = true,
    this.error,
    this.summary,
  });

  final bool isLoading;
  final String? error;
  final EffortSummary? summary;

  EffortState copyWith({
    bool? isLoading,
    String? error,
    EffortSummary? summary,
  }) {
    return EffortState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      summary: summary ?? this.summary,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

class EffortController extends StateNotifier<EffortState> {
  EffortController({
    required this.learnerId,
    String? accessToken,
  })  : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        )),
        super(const EffortState());

  final String learnerId;
  final Dio _dio;

  /// Fetch effort summary from API.
  Future<void> fetchEffortSummary() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      if (_useAnalyticsMock) {
        await Future.delayed(const Duration(milliseconds: 500));
        state = state.copyWith(
          isLoading: false,
          summary: _mockEffortSummary(learnerId),
        );
        return;
      }

      final response = await _dio.get<Map<String, dynamic>>(
        '/analytics/learners/$learnerId/effort-summary',
      );

      if (response.data == null) {
        throw Exception('No data returned');
      }

      state = state.copyWith(
        isLoading: false,
        summary: EffortSummary.fromJson(response.data!),
      );
    } on DioException catch (err) {
      final message = err.response?.data is Map
          ? (err.response?.data as Map)['error']?.toString() ?? 'Network error'
          : 'Network error';
      state = state.copyWith(isLoading: false, error: message);
    } catch (err) {
      state = state.copyWith(isLoading: false, error: err.toString());
    }
  }

  /// Refresh data.
  Future<void> refresh() => fetchEffortSummary();

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ════════════════════════════════════════════════════════════════════════════

  EffortSummary _mockEffortSummary(String learnerId) {
    final hash = learnerId.hashCode.abs();
    final currentStreak = 1 + (hash % 8);
    final longestStreak = currentStreak + (hash % 10);
    final skillsThisMonth = 3 + (hash % 8);
    final sessionsThisWeek = 2 + (hash % 5);

    String encouragement;
    if (currentStreak >= 7) {
      encouragement = 'Amazing! You\'re on a $currentStreak-day streak. Keep it up! 🌟';
    } else if (currentStreak >= 3) {
      encouragement = 'Great work! $currentStreak days in a row. You\'re building a habit! 💪';
    } else if (currentStreak >= 1) {
      encouragement = 'Nice start! Every day counts. Keep going! 🎯';
    } else if (sessionsThisWeek > 0) {
      encouragement = 'You practiced $sessionsThisWeek time${sessionsThisWeek > 1 ? 's' : ''} this week. Ready for more?';
    } else {
      encouragement = 'Ready to start your learning adventure today? 🚀';
    }

    return EffortSummary(
      learnerId: learnerId,
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      skillsMasteredThisMonth: skillsThisMonth,
      sessionsCountThisWeek: sessionsThisWeek,
      milestones: [
        Milestone(
          id: 'streak-3',
          type: MilestoneType.streak,
          title: '3-Day Streak',
          description: 'Practice 3 days in a row',
          achieved: currentStreak >= 3,
          progress: currentStreak.clamp(0, 3),
          target: 3,
        ),
        Milestone(
          id: 'streak-7',
          type: MilestoneType.streak,
          title: 'Week Warrior',
          description: 'Practice 7 days in a row',
          achieved: longestStreak >= 7,
          progress: currentStreak.clamp(0, 7),
          target: 7,
        ),
        Milestone(
          id: 'streak-14',
          type: MilestoneType.streak,
          title: 'Two-Week Champion',
          description: 'Practice 14 days in a row',
          achieved: longestStreak >= 14,
          progress: currentStreak.clamp(0, 14),
          target: 14,
        ),
        Milestone(
          id: 'skills-5',
          type: MilestoneType.skills,
          title: 'Skill Builder',
          description: 'Master 5 skills this month',
          achieved: skillsThisMonth >= 5,
          progress: skillsThisMonth.clamp(0, 5),
          target: 5,
        ),
        Milestone(
          id: 'skills-10',
          type: MilestoneType.skills,
          title: 'Knowledge Seeker',
          description: 'Master 10 skills this month',
          achieved: skillsThisMonth >= 10,
          progress: skillsThisMonth.clamp(0, 10),
          target: 10,
        ),
        Milestone(
          id: 'sessions-5',
          type: MilestoneType.sessions,
          title: 'Consistent Learner',
          description: 'Complete 5 sessions this week',
          achieved: sessionsThisWeek >= 5,
          progress: sessionsThisWeek.clamp(0, 5),
          target: 5,
        ),
      ],
      encouragementMessage: encouragement,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for effort controller.
final effortControllerProvider = StateNotifierProvider.autoDispose
    .family<EffortController, EffortState, String>(
  (ref, learnerId) {
    final controller = EffortController(learnerId: learnerId);
    controller.fetchEffortSummary();
    return controller;
  },
);
