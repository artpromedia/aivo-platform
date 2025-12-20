import 'package:flutter/material.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('K5 theme exposes expected primary color', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: themeForBand(AivoGradeBand.k5),
          home: Builder(
            builder: (context) => Scaffold(
              body: Text('hi', style: Theme.of(context).textTheme.bodyLarge),
            ),
          ),
        ),
      ),
    );

    final scheme = Theme.of(tester.element(find.text('hi'))).colorScheme;
    // Violet-500 (brand primary for K-5)
    expect(scheme.primary, const Color(0xFF8B5CF6));
  });

  testWidgets('Switching band updates provider theme', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: Consumer(
          builder: (context, ref, _) {
            final theme = ref.watch(gradeThemeProvider);
            return MaterialApp(
              theme: theme,
              home: Scaffold(
                body: Column(
                  children: [
                    Text('primary', style: Theme.of(context).textTheme.bodyLarge),
                    ElevatedButton(
                      onPressed: () => ref
                          .read(gradeThemeControllerProvider.notifier)
                          .setGradeBand(AivoGradeBand.g9_12),
                      child: const Text('switch'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );

    var scheme = Theme.of(tester.element(find.text('primary'))).colorScheme;
    // G6-8 uses same Violet-500 as default
    expect(scheme.primary, const Color(0xFF8B5CF6));

    await tester.tap(find.text('switch'));
    await tester.pump();

    scheme = Theme.of(tester.element(find.text('primary'))).colorScheme;
    // G9-12 uses deeper Violet-600
    expect(scheme.primary, const Color(0xFF7C3AED));
  });
}
