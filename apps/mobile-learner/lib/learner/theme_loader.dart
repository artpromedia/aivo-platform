import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'learner_service.dart';

Future<AivoGradeBand> loadAndApplyLearnerTheme(WidgetRef ref, String learnerId) async {
  final controller = ref.read(gradeThemeControllerProvider.notifier);
  final service = ref.read(learnerServiceProvider);

  try {
    final learner = await service.fetchLearner(learnerId);
    final band = bandFromGrade(learner.grade);
    controller.setGradeBand(band);
    return band;
  } catch (err) {
    debugPrint('Theme fallback applied: ${err.toString()}');
    controller.setGradeBand(AivoGradeBand.g6_8);
    return AivoGradeBand.g6_8;
  }
}
