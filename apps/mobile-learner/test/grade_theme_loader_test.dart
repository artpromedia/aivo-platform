import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/flutter_common.dart';

import '../lib/learner/learner_service.dart';
import '../lib/learner/theme_loader.dart';

class _MockLearnerService extends LearnerService {
  @override
  Future<Learner> fetchLearner(String learnerId) async {
    return const Learner(id: 'learner-123', tenantId: 'tenant-1', name: 'Mock Learner', grade: 3);
  }
}

void main() {
  testWidgets('applies K-5 theme when learner grade is 3', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [learnerServiceProvider.overrideWithValue(_MockLearnerService())],
        child: Consumer(
          builder: (context, ref, _) {
            return FutureBuilder<AivoGradeBand>(
              future: loadAndApplyLearnerTheme(ref, 'learner-123'),
              builder: (context, snapshot) {
                final band = ref.watch(gradeThemeControllerProvider);
                return MaterialApp(home: Text('band:${band.name}'));
              },
            );
          },
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('band:k5'), findsOneWidget);
  });
}
