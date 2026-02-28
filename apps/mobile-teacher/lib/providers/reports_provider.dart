/// Reports & Skill Matrix Providers
///
/// State management for reports generation and skill matrix data.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/analytics.dart';
import 'core_providers.dart';

// ============================================================================
// Skill Matrix Providers
// ============================================================================

/// Fetch skill matrix data for a class.
final skillMatrixProvider =
    FutureProvider.family<SkillMatrix, String>((ref, classId) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response =
        await api.dio.get('/teacher-analytics/$classId/skill-matrix');
    if (response.data != null) {
      return SkillMatrix.fromJson(response.data as Map<String, dynamic>);
    }
  } catch (_) {
    // Return mock data for now until backend is ready
  }
  // Fallback empty matrix
  return SkillMatrix(
    classId: classId,
    skills: const [],
    students: const [],
    cells: const [],
  );
});

// ============================================================================
// Report Generation State
// ============================================================================

/// State for the report generation flow.
class ReportGenerationState {
  const ReportGenerationState({
    this.selectedType,
    this.selectedClassId,
    this.selectedClassName,
    this.selectedStudentId,
    this.selectedStudentName,
    this.startDate,
    this.endDate,
    this.isGenerating = false,
    this.generatedReport,
    this.error,
  });

  final ReportType? selectedType;
  final String? selectedClassId;
  final String? selectedClassName;
  final String? selectedStudentId;
  final String? selectedStudentName;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isGenerating;
  final GeneratedReport? generatedReport;
  final String? error;

  ReportGenerationState copyWith({
    ReportType? selectedType,
    String? selectedClassId,
    String? selectedClassName,
    String? selectedStudentId,
    String? selectedStudentName,
    DateTime? startDate,
    DateTime? endDate,
    bool? isGenerating,
    GeneratedReport? generatedReport,
    String? error,
    bool clearReport = false,
    bool clearError = false,
    bool clearStudent = false,
  }) {
    return ReportGenerationState(
      selectedType: selectedType ?? this.selectedType,
      selectedClassId: selectedClassId ?? this.selectedClassId,
      selectedClassName: selectedClassName ?? this.selectedClassName,
      selectedStudentId:
          clearStudent ? null : (selectedStudentId ?? this.selectedStudentId),
      selectedStudentName:
          clearStudent ? null : (selectedStudentName ?? this.selectedStudentName),
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isGenerating: isGenerating ?? this.isGenerating,
      generatedReport:
          clearReport ? null : (generatedReport ?? this.generatedReport),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Notifier for report generation flow.
class ReportGenerationNotifier extends StateNotifier<ReportGenerationState> {
  ReportGenerationNotifier(this._api)
      : super(const ReportGenerationState(
          startDate: null,
          endDate: null,
        ));

  final dynamic _api;

  /// Set the report type.
  void setReportType(ReportType type) {
    state = state.copyWith(selectedType: type, clearReport: true, clearError: true);
  }

  /// Set the selected class.
  void setClass(String classId, String className) {
    state = state.copyWith(
      selectedClassId: classId,
      selectedClassName: className,
      clearReport: true,
      clearError: true,
    );
  }

  /// Set the selected student (for individual reports).
  void setStudent(String studentId, String studentName) {
    state = state.copyWith(
      selectedStudentId: studentId,
      selectedStudentName: studentName,
      clearReport: true,
      clearError: true,
    );
  }

  /// Clear student selection.
  void clearStudent() {
    state = state.copyWith(clearStudent: true);
  }

  /// Set date range.
  void setDateRange(DateTime start, DateTime end) {
    state = state.copyWith(
      startDate: start,
      endDate: end,
      clearReport: true,
      clearError: true,
    );
  }

  /// Generate the report.
  Future<void> generateReport() async {
    if (state.selectedType == null || state.selectedClassId == null) return;

    state = state.copyWith(isGenerating: true, clearError: true, clearReport: true);

    try {
      await Future.delayed(const Duration(seconds: 2)); // Simulate API call

      final report = GeneratedReport(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: '${state.selectedType!.label} — ${state.selectedClassName ?? "Class"}',
        reportType: state.selectedType!,
        generatedAt: DateTime.now(),
        classId: state.selectedClassId,
        className: state.selectedClassName,
        studentId: state.selectedStudentId,
        studentName: state.selectedStudentName,
        downloadUrl: 'https://api.aivo.com/reports/${state.selectedClassId}/${state.selectedType!.name}.pdf',
        status: ReportStatus.completed,
      );

      state = state.copyWith(
        isGenerating: false,
        generatedReport: report,
      );
    } catch (e) {
      state = state.copyWith(
        isGenerating: false,
        error: e.toString(),
      );
    }
  }

  /// Reset the state.
  void reset() {
    state = const ReportGenerationState();
  }
}

/// Report generation provider.
final reportGenerationProvider =
    StateNotifierProvider<ReportGenerationNotifier, ReportGenerationState>(
        (ref) {
  final api = ref.watch(apiClientProvider);
  return ReportGenerationNotifier(api);
});

/// Recent reports provider — fetches list of previously generated reports.
final recentReportsProvider =
    FutureProvider.family<List<GeneratedReport>, String>((ref, classId) async {
  // Will call API when backend is ready
  // For now return empty list
  return const [];
});
