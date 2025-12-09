import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'auth/auth_controller.dart';
import 'auth/auth_state.dart';
import 'screens/accessibility_settings_screen.dart';
import 'screens/add_child_screen.dart';
import 'screens/baseline_result_screen.dart';
import 'screens/homework_focus_detail_screen.dart';
import 'screens/login_screen.dart';
import 'screens/module_selection_screen.dart';
import 'screens/parent_dashboard_screen.dart';
import 'screens/payment_setup_screen.dart';
import 'screens/progress_report_screen.dart';
import 'screens/subscription_management_screen.dart';
import 'theme/parent_theme.dart';

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
      GoRoute(
        path: '/baseline-results/:profileId',
        builder: (context, state) {
          final profileId = state.pathParameters['profileId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return BaselineResultScreen(
            profileId: profileId,
            learnerId: extra['learnerId']?.toString() ?? '',
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      GoRoute(
        path: '/homework-focus-detail/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return HomeworkFocusDetailScreen(
            learnerId: learnerId,
            learnerName: extra['learnerName']?.toString() ?? 'Child',
            parentId: extra['parentId']?.toString() ?? '',
          );
        },
      ),
      GoRoute(
        path: '/progress-report/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ProgressReportScreen(
            learnerId: learnerId,
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      // Subscription routes
      GoRoute(
        path: '/subscription',
        builder: (context, state) => const SubscriptionManagementScreen(),
      ),
      GoRoute(
        path: '/module-selection',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ModuleSelectionScreen(
            learnerId: extra['learnerId']?.toString() ?? '',
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      GoRoute(
        path: '/payment-setup',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return PaymentSetupScreen(
            learnerId: extra['learnerId']?.toString() ?? '',
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      GoRoute(
        path: '/accessibility',
        builder: (context, state) => const AccessibilitySettingsScreen(),
      ),
    ],
    redirect: (context, state) {
      if (authState.status == AuthStatus.loading) return null;
      final isAuth = authState.isAuthenticated;
      final loggingIn = state.matchedLocation == '/login';
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
    final theme = ref.watch(parentThemeProvider);
    final a11yState = ref.watch(accessibilityControllerProvider);
    
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
    return MediaQuery(
      // Apply text scale factor from accessibility settings
      data: MediaQuery.of(context).copyWith(
        textScaler: TextScaler.linear(a11yState.textScaleFactor),
      ),
      child: MaterialApp.router(
        title: 'Aivo Parent',
        theme: theme,
        routerConfig: router,
        locale: const Locale('en'),
        supportedLocales: const [Locale('en')],
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
