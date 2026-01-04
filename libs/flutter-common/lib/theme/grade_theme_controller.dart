import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'aivo_theme.dart';

/// Controller for managing the active grade-based theme.
/// 
/// AIVO uses three age-based themes:
/// - Explorer (k5): Pre-K through 5th grade
/// - Navigator (g6_8): 6th through 8th grade  
/// - Scholar (g9_12): 9th through 12th grade
class GradeThemeController extends StateNotifier<AivoGradeBand> {
  GradeThemeController() : super(AivoGradeBand.g6_8);

  void setGradeBand(AivoGradeBand band) => state = band;

  void fromGrade(int? grade) => state = bandFromGrade(grade);
  
  /// Get the theme label for the current grade band
  String get themeLabel {
    switch (state) {
      case AivoGradeBand.k5:
        return 'Explorer';
      case AivoGradeBand.g6_8:
        return 'Navigator';
      case AivoGradeBand.g9_12:
        return 'Scholar';
    }
  }
}

/// Maps a grade number to the appropriate theme band.
/// 
/// - Grades 0-5: Explorer (k5)
/// - Grades 6-8: Navigator (g6_8)
/// - Grades 9+: Scholar (g9_12)
AivoGradeBand bandFromGrade(int? grade, {AivoGradeBand fallback = AivoGradeBand.g6_8}) {
  if (grade == null || grade <= 0) return fallback;
  if (grade <= 5) return AivoGradeBand.k5;
  if (grade <= 8) return AivoGradeBand.g6_8;
  return AivoGradeBand.g9_12;
}

final gradeThemeControllerProvider =
    StateNotifierProvider<GradeThemeController, AivoGradeBand>((ref) => GradeThemeController());

final gradeThemeProvider = Provider<ThemeData>((ref) {
  final band = ref.watch(gradeThemeControllerProvider);
  return themeForBand(band);
});

/// Get the theme label for a grade band
String themeLabelForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return 'Explorer';
    case AivoGradeBand.g6_8:
      return 'Navigator';
    case AivoGradeBand.g9_12:
      return 'Scholar';
  }
}
