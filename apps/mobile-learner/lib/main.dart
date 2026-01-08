import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:flutter_notifications/flutter_notifications.dart';

import 'baseline/baseline_controller.dart';
import 'firebase_options.dart';
import 'focus/focus_service.dart';
import 'offline/offline.dart';
import 'pin/pin_controller.dart';
import 'pin/pin_state.dart';
import 'screens/baseline_break_screen.dart';
import 'screens/baseline_complete_screen.dart';
import 'screens/baseline_intro_screen.dart';
import 'screens/baseline_question_screen.dart';
import 'screens/focus_break_screen.dart';
import 'screens/homework_helper_intro_screen.dart';
import 'screens/homework_steps_screen.dart';
import 'screens/homework_text_input_screen.dart';
import 'screens/pin_entry_screen.dart';
import 'screens/today_plan_screen.dart';
import 'screens/session_complete_screen.dart';
import 'screens/design_system_gallery_screen.dart';
import 'screens/activity_screen.dart';
import 'screens/session_feedback_screen.dart';
import 'screens/adaptive_games_screen.dart';
import 'screens/focus_games_screen.dart';
import 'screens/teams_screen.dart';
import 'screens/social_stories_screen.dart';
import 'social_stories/social_stories.dart';
import 'learner/theme_loader.dart';
import 'services/learner_notification_service.dart';

const bool _enableDesignSystemGallery = bool.fromEnvironment('AIVO_DESIGN_GALLERY', defaultValue: false);

final _routerProvider = Provider<GoRouter>((ref) {
  final pinState = ref.watch(pinControllerProvider);
  final baselineState = ref.watch(learnerBaselineControllerProvider);

  return GoRouter(
    initialLocation: '/pin',
    routes: [
      GoRoute(path: '/pin', builder: (context, state) => const PinEntryScreen()),
      GoRoute(
        path: '/plan',
        builder: (context, state) {
          // Get learnerId from pinState - fallback to empty string which will show error
          final learnerId = pinState.learnerId ?? '';
          return TodayPlanScreen(learnerId: learnerId);
        },
      ),
      GoRoute(path: '/complete', builder: (context, state) => const SessionCompleteScreen()),
      // Baseline flow routes
      GoRoute(path: '/baseline/intro', builder: (context, state) => const BaselineIntroScreen()),
      GoRoute(path: '/baseline/question', builder: (context, state) => const BaselineQuestionScreen()),
      GoRoute(path: '/baseline/break', builder: (context, state) => const BaselineBreakScreen()),
      GoRoute(path: '/baseline/complete', builder: (context, state) => const BaselineCompleteScreen()),
      // Homework Helper flow routes
      GoRoute(
        path: '/homework/intro',
        builder: (context, state) {
          final learnerId = state.extra as String? ?? pinState.learnerId ?? '';
          return HomeworkHelperIntroScreen(learnerId: learnerId);
        },
      ),
      GoRoute(
        path: '/homework/input',
        builder: (context, state) {
          final learnerId = state.extra as String? ?? pinState.learnerId ?? '';
          return HomeworkTextInputScreen(learnerId: learnerId);
        },
      ),
      GoRoute(
        path: '/homework/steps',
        builder: (context, state) {
          final learnerId = state.extra as String? ?? pinState.learnerId ?? '';
          return HomeworkStepsScreen(learnerId: learnerId);
        },
      ),
      // Focus/Regulation break route
      GoRoute(
        path: '/focus/break',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          final learnerId = extra?['learnerId'] as String? ?? pinState.learnerId ?? '';
          final activity = extra?['activity'] as RegulationActivity? ??
              const RegulationActivity(
                type: BreakActivityType.breathing,
                title: 'Take a Breath',
                instructions: 'Let\'s take a few deep breaths together.',
                durationSeconds: 60,
              );
          return FocusBreakScreen(learnerId: learnerId, activity: activity);
        },
      ),
      // Activity flow route
      GoRoute(
        path: '/activity/:sessionId',
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId']!;
          // Subject is extracted from query params but not used by ActivityScreen
          // as it loads subject from the session itself
          return ActivityScreen(sessionId: sessionId);
        },
      ),
      // Session feedback route
      GoRoute(
        path: '/feedback/:sessionId',
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId']!;
          return SessionFeedbackScreen(sessionId: sessionId);
        },
      ),
      // Adaptive Games route
      GoRoute(
        path: '/games',
        builder: (context, state) {
          final learnerId = state.extra as String? ?? pinState.learnerId ?? '';
          return AdaptiveGamesScreen(learnerId: learnerId);
        },
      ),
      // Focus Games/Activities route
      GoRoute(
        path: '/focus',
        builder: (context, state) {
          final learnerId = state.extra as String? ?? pinState.learnerId ?? '';
          return FocusGamesScreen(learnerId: learnerId);
        },
      ),
      // Teams route
      GoRoute(
        path: '/teams',
        builder: (context, state) {
          final learnerId = state.extra as String? ?? pinState.learnerId ?? '';
          return TeamsScreen(learnerId: learnerId);
        },
      ),
      // Social Stories route
      GoRoute(
        path: '/stories',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          final learnerId = extra?['learnerId'] as String? ?? pinState.learnerId ?? '';
          final emotionalState = extra?['emotionalState'] as String?;
          final activityType = extra?['activityType'] as String?;
          final category = extra?['category'] as StoryCategory?;
          return SocialStoriesScreen(
            learnerId: learnerId,
            initialCategory: category,
            emotionalState: emotionalState,
            activityType: activityType,
          );
        },
      ),
      if (_enableDesignSystemGallery)
        GoRoute(path: '/design-system', builder: (context, state) => const DesignSystemGalleryScreen()),
    ],
    redirect: (context, state) {
      if (_enableDesignSystemGallery && state.matchedLocation == '/design-system') return null;
      if (pinState.status == PinStatus.loading) return null;

      final authed = pinState.isAuthenticated;
      final atPin = state.matchedLocation == '/pin';

      // Not authenticated -> go to PIN
      if (!authed && !atPin) return '/pin';

      // Authenticated at PIN -> check baseline status and route appropriately
      if (authed && atPin) {
        // Check baseline status
        final profile = baselineState.profile;

        if (profile == null && !baselineState.isLoading) {
          // No profile loaded yet - go to plan (baseline check happens there)
          return '/plan';
        }

        // Route based on baseline status
        switch (profile?.status) {
          case BaselineProfileStatus.notStarted:
            return '/baseline/intro';
          case BaselineProfileStatus.inProgress:
            return '/baseline/question';
          case BaselineProfileStatus.completed:
          case BaselineProfileStatus.finalAccepted:
          case BaselineProfileStatus.retestAllowed:
          case null:
            return '/plan';
        }
      }

      return null;
    },
  );
});

/// Background message handler - must be top-level function
/// 
/// COPPA COMPLIANCE: This handler runs for child devices
/// All notifications are validated for child-appropriateness
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  
  // Mark as child device before handling - COPPA compliance
  await BackgroundHandlerConfig.setChildDevice(true);
  
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

    // Set custom keys for crash context (COPPA compliant - no personal data)
    await FirebaseCrashlytics.instance.setCustomKey('is_child_device', true);
    await FirebaseCrashlytics.instance.setCustomKey('app_type', 'learner');
    await FirebaseCrashlytics.instance.setCustomKey('environment', EnvConfig.flavor.displayName);

    // Mark as child device for COPPA compliance
    await BackgroundHandlerConfig.setChildDevice(true);

    // Set up background message handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Initialize offline services (database, connectivity monitoring)
    await initializeOfflineServices();

    runApp(const ProviderScope(child: LearnerApp()));
  });
}

class LearnerApp extends ConsumerStatefulWidget {
  const LearnerApp({super.key});

  @override
  ConsumerState<LearnerApp> createState() => _LearnerAppState();
}

class _LearnerAppState extends ConsumerState<LearnerApp> {
  bool _themeLoaded = false;
  bool _baselineChecked = false;
  bool _offlinePreloaded = false;
  bool _notificationsInitialized = false;

  @override
  void initState() {
    super.initState();
    ref.listen<PinAuthState>(pinControllerProvider, (previous, next) {
      // Reset on logout
      if (!next.isAuthenticated) {
        _themeLoaded = false;
        _baselineChecked = false;
        _offlinePreloaded = false;
        _notificationsInitialized = false;
        return;
      }

      // On authentication, load theme, check baseline, and preload offline data
      if (next.isAuthenticated && next.learnerId != null) {
        if (!_themeLoaded) {
          _themeLoaded = true;
          loadAndApplyLearnerTheme(ref, next.learnerId!);
        }

        if (!_baselineChecked) {
          _baselineChecked = true;
          ref.read(learnerBaselineControllerProvider.notifier)
              .checkBaselineStatus(next.learnerId!);
        }

        // Preload offline data for today's plan
        if (!_offlinePreloaded) {
          _offlinePreloaded = true;
          _preloadOfflineData(next.learnerId!);
        }

        // Initialize notifications (COPPA compliant)
        if (!_notificationsInitialized) {
          _notificationsInitialized = true;
          _initializeNotifications();
        }
      }
    });
  }

  Future<void> _preloadOfflineData(String learnerId) async {
    final syncManager = ref.read(syncManagerProvider);
    
    // Preload today's plan and related content in background
    // This is fire-and-forget - errors are logged but don't block the app
    syncManager.preloadForToday(learnerId).catchError((error) {
      debugPrint('Offline preload failed: $error');
      return PreloadResult.failure(error.toString());
    });
  }

  /// Initialize notifications with COPPA compliance
  /// This uses parent-controlled settings for what notifications children receive
  Future<void> _initializeNotifications() async {
    try {
      final notificationService = ref.read(learnerNotificationServiceProvider);
      await notificationService.initialize();
    } catch (e) {
      // COPPA: Don't show notification errors to child, just log
      debugPrint('Failed to initialize notifications: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final pinState = ref.watch(pinControllerProvider);
    final router = ref.watch(_routerProvider);
    final theme = ref.watch(gradeThemeProvider);
    final connectivityState = ref.watch(connectivityStateProvider);

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
      theme: theme,
      routerConfig: router,
      locale: const Locale('en'),
      supportedLocales: const [Locale('en')],
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return Column(
          children: [
            // Show offline banner when not connected
            OfflineStatusBanner(connectivityState: connectivityState),
            Expanded(child: child ?? const SizedBox.shrink()),
          ],
        );
      },
    );
  }
}
