/// IEP Repository
///
/// Offline-first data access for IEP goals and progress.
library;

import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for IEP goal data access.
class IepRepository {
  IepRepository({
    required this.api,
    required this.db,
    required this.sync,
    required this.connectivity,
  });

  final AivoApiClient api;
  final TeacherLocalDatabase db;
  final SyncService sync;
  final ConnectivityMonitor connectivity;

  /// Get IEP goals for a student.
  Future<List<IepGoal>> getGoals(String studentId) async {
    final cached = await db.getIepGoals(studentId);
    
    if (await connectivity.isOnline) {
      _refreshGoalsInBackground(studentId);
    }
    
    return cached;
  }

  /// Get all goals for teacher's students.
  Future<List<IepGoal>> getAllGoals() async {
    final students = await db.getStudents();
    final goals = <IepGoal>[];
    
    for (final student in students) {
      goals.addAll(await getGoals(student.id));
    }
    
    return goals;
  }

  /// Get goals at risk.
  Future<List<IepGoal>> getGoalsAtRisk() async {
    final goals = await getAllGoals();
    return goals.where((g) => g.status == GoalStatus.atRisk || !g.isOnTrack).toList();
  }

  /// Record progress on a goal.
  Future<IepProgress> recordProgress(RecordProgressDto dto) async {
    final progressId = 'progress_${DateTime.now().millisecondsSinceEpoch}';
    final progress = IepProgress(
      id: progressId,
      goalId: dto.goalId,
      value: dto.value,
      recordedAt: DateTime.now(),
      notes: dto.notes,
      sessionId: dto.sessionId,
    );

    // Queue for sync
    await sync.queueCreate(
      entityType: 'iep_progress',
      entityId: progressId,
      data: {...dto.toJson(), 'recordedAt': progress.recordedAt.toIso8601String()},
    );

    // Update goal's current value locally
    final goals = await db.getIepGoals(''); // Get all goals
    final goal = goals.where((g) => g.id == dto.goalId).firstOrNull;
    if (goal != null) {
      final updatedGoal = goal.copyWith(
        currentValue: dto.value,
        progressHistory: [...goal.progressHistory, progress],
        updatedAt: DateTime.now(),
      );
      await db.cacheIepGoals([updatedGoal]);
    }

    return progress;
  }

  /// Generate IEP progress report.
  Future<IepReport?> generateReport(String studentId, DateRange range) async {
    if (!await connectivity.isOnline) {
      return null; // Reports require server processing
    }

    try {
      final response = await api.post('/iep/reports', data: {
        'studentId': studentId,
        'startDate': range.start.toIso8601String(),
        'endDate': range.end.toIso8601String(),
      });
      return IepReport.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Get goal recommendations for a student.
  Future<List<GoalRecommendation>> getRecommendations(String studentId) async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get('/iep/students/$studentId/recommendations');
      final data = response.data as List;
      return data
          .map((json) => GoalRecommendation.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Force refresh from server.
  Future<List<IepGoal>> refreshGoals(String studentId) async {
    if (!await connectivity.isOnline) {
      return db.getIepGoals(studentId);
    }

    try {
      final response = await api.get('/iep/students/$studentId/goals');
      final data = response.data as List;
      final goals = data
          .map((json) => IepGoal.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheIepGoals(goals);
      return goals;
    } catch (_) {
      return db.getIepGoals(studentId);
    }
  }

  void _refreshGoalsInBackground(String studentId) async {
    try {
      final response = await api.get('/iep/students/$studentId/goals');
      final data = response.data as List;
      final goals = data
          .map((json) => IepGoal.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheIepGoals(goals);
    } catch (_) {}
  }
}
