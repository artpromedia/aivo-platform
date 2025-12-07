import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import 'screens/add_child_screen.dart';
import 'screens/login_screen.dart';
import 'screens/parent_dashboard_screen.dart';

final authProvider = StateProvider<bool>((ref) => false);

final _routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);
  return GoRouter(
    initialLocation: auth ? '/dashboard' : '/login',
    refreshListenable: GoRouterRefreshStream(ref.watch(authProvider.notifier).stream),
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => LoginScreen(
          onLoggedIn: () => ref.read(authProvider.notifier).state = true,
        ),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const ParentDashboardScreen(),
      ),
      GoRoute(
        path: '/add-child',
        builder: (context, state) => const AddChildScreen(),
      ),
    ],
    redirect: (context, state) {
      final isAuth = ref.read(authProvider);
      final loggingIn = state.subloc == '/login';
      if (!isAuth && !loggingIn) return '/login';
      if (isAuth && loggingIn) return '/dashboard';
      return null;
    },
  );
});

void main() {
  runApp(const ProviderScope(child: ParentApp()));
}

class ParentApp extends ConsumerWidget {
  const ParentApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
    return MaterialApp.router(
      title: 'Aivo Parent',
      theme: buildAppTheme(),
      routerConfig: router,
      locale: const Locale('en'),
      supportedLocales: const [Locale('en')],
      debugShowCheckedModeBanner: false,
    );
  }
}
