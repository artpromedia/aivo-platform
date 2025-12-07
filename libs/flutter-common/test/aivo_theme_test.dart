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
    expect(scheme.primary, const Color(0xFF2D6BFF));
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
    expect(scheme.primary, const Color(0xFF2F6AE6));

    await tester.tap(find.text('switch'));
    await tester.pump();

    scheme = Theme.of(tester.element(find.text('primary'))).colorScheme;
    expect(scheme.primary, const Color(0xFF2648A6));
  });
}
