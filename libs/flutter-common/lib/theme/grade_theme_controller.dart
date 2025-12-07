import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'aivo_theme.dart';

class GradeThemeController extends StateNotifier<AivoGradeBand> {
  GradeThemeController() : super(AivoGradeBand.g6_8);

  void setGradeBand(AivoGradeBand band) => state = band;

  void fromGrade(int? grade) => state = bandFromGrade(grade);
}

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
