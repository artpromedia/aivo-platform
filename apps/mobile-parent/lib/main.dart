import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_notifications/flutter_notifications.dart';

import 'auth/auth_controller.dart';
import 'firebase_options.dart';
import 'services/parent_notification_service.dart';
import 'auth/auth_state.dart';
import 'screens/accessibility_settings_screen.dart';
import 'screens/add_child_screen.dart';
import 'screens/baseline_result_screen.dart';
import 'screens/child_notification_settings_screen.dart';
import 'screens/consent_screen.dart';
import 'screens/homework_focus_detail_screen.dart';
import 'screens/login_screen.dart';
import 'screens/messages_screen.dart';
import 'screens/module_selection_screen.dart';
import 'screens/notification_settings_screen.dart';
import 'screens/parent_dashboard_screen.dart';
import 'screens/payment_setup_screen.dart';
import 'screens/progress_report_screen.dart';
import 'screens/subscription_management_screen.dart';
import 'screens/virtual_brain_screen.dart';
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
      // Consent management
      GoRoute(
        path: '/consent/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ConsentScreen(
            learnerId: learnerId,
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      // Virtual Brain dashboard
      GoRoute(
        path: '/virtual-brain/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return VirtualBrainScreen(
            learnerId: learnerId,
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      // Messages
      GoRoute(
        path: '/messages',
        builder: (context, state) => const MessagesScreen(),
      ),
      // Notification settings
      GoRoute(
        path: '/notification-settings/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return NotificationSettingsScreen(
            learnerId: learnerId,
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
      ),
      // Child notification settings (COPPA compliant)
      GoRoute(
        path: '/child-notification-settings/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ChildNotificationSettingsScreen(
            learnerId: learnerId,
            learnerName: extra['learnerName']?.toString() ?? 'Child',
          );
        },
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

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await firebaseMessagingBackgroundHandler(message);
}

Future<void> main() async {
  // Run with Crashlytics error handling
  await CrashlyticsService.runWithCrashlytics(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Initialize environment configuration
    EnvConfig.initialize();

    // Initialize Firebase
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Initialize Crashlytics based on flavor config
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(
      EnvConfig.flavor.crashReportingEnabled,
    );

    // Set custom keys for crash context
    await FirebaseCrashlytics.instance.setCustomKey('app_type', 'parent');
    await FirebaseCrashlytics.instance.setCustomKey('environment', EnvConfig.flavor.displayName);

    // Set up background message handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    runApp(const ProviderScope(child: ParentApp()));
  });
}

class ParentApp extends ConsumerStatefulWidget {
  const ParentApp({super.key});

  @override
  ConsumerState<ParentApp> createState() => _ParentAppState();
}

class _ParentAppState extends ConsumerState<ParentApp> {
  bool _notificationsInitialized = false;

  @override
  void initState() {
    super.initState();
    // Listen for auth state changes to initialize notifications
    ref.listenManual(authControllerProvider, (previous, next) {
      if (next.isAuthenticated && !_notificationsInitialized) {
        _initializeNotifications();
      } else if (!next.isAuthenticated) {
        _notificationsInitialized = false;
      }
    });
  }

  Future<void> _initializeNotifications() async {
    if (_notificationsInitialized) return;
    
    try {
      final notificationService = ref.read(parentNotificationServiceProvider);
      await notificationService.initialize();
      _notificationsInitialized = true;
    } catch (e) {
      debugPrint('Failed to initialize notifications: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
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
