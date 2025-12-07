import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import 'pin/pin_controller.dart';
import 'pin/pin_state.dart';
import 'screens/pin_entry_screen.dart';
import 'screens/today_plan_screen.dart';
import 'screens/session_complete_screen.dart';

final _routerProvider = Provider<GoRouter>((ref) {
  final pinState = ref.watch(pinControllerProvider);
  return GoRouter(
    initialLocation: '/pin',
    routes: [
      GoRoute(path: '/pin', builder: (context, state) => const PinEntryScreen()),
      GoRoute(path: '/plan', builder: (context, state) => const TodayPlanScreen()),
      GoRoute(path: '/complete', builder: (context, state) => const SessionCompleteScreen()),
    ],
    redirect: (context, state) {
      if (pinState.status == PinStatus.loading) return null;
      final authed = pinState.isAuthenticated;
      final atPin = state.subloc == '/pin';
      if (!authed && !atPin) return '/pin';
      if (authed && atPin) return '/plan';
      return null;
    },
  );
});

void main() {
  runApp(const ProviderScope(child: LearnerApp()));
}

class LearnerApp extends ConsumerWidget {
  const LearnerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pinState = ref.watch(pinControllerProvider);
    final router = ref.watch(_routerProvider);
    if (pinState.status == PinStatus.loading) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                CircularProgressIndicator(),
                SizedBox(height: 12),
                Text('Loading session...'),
              ],
            ),
          ),
        ),
      );
    }
    return MaterialApp.router(
      title: 'Aivo Learner',
      theme: buildAppTheme(),
      routerConfig: router,
      locale: const Locale('en'),
      supportedLocales: const [Locale('en')],
      debugShowCheckedModeBanner: false,
    );
  }
}
