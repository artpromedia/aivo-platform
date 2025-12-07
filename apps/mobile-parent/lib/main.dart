import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import 'auth/auth_controller.dart';
import 'auth/auth_state.dart';
import 'screens/add_child_screen.dart';
import 'screens/login_screen.dart';
import 'screens/parent_dashboard_screen.dart';

final _routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
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
      if (authState.status == AuthStatus.loading) return null;
      final isAuth = authState.isAuthenticated;
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
    final authState = ref.watch(authControllerProvider);
    final router = ref.watch(_routerProvider);
    final theme = ref.watch(gradeThemeProvider);
    if (authState.status == AuthStatus.loading) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                CircularProgressIndicator(),
                SizedBox(height: 12),
                Text('Checking session...'),
              ],
            ),
          ),
        ),
      );
    }
    return MaterialApp.router(
      title: 'Aivo Parent',
      theme: theme,
      routerConfig: router,
      locale: const Locale('en'),
      supportedLocales: const [Locale('en')],
      debugShowCheckedModeBanner: false,
    );
  }
}
