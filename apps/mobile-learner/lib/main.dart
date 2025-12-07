import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import 'screens/pin_entry_screen.dart';
import 'screens/today_plan_screen.dart';
import 'screens/session_complete_screen.dart';

final _routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/pin',
    routes: [
      GoRoute(path: '/pin', builder: (context, state) => const PinEntryScreen()),
      GoRoute(path: '/plan', builder: (context, state) => const TodayPlanScreen()),
      GoRoute(path: '/complete', builder: (context, state) => const SessionCompleteScreen()),
    ],
  );
});

void main() {
  runApp(const ProviderScope(child: LearnerApp()));
}

class LearnerApp extends ConsumerWidget {
  const LearnerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
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
