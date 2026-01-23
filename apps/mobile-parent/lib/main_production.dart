/// Production entry point for Mobile Parent App
///
/// This entry point enforces production-only configurations and performs
/// additional safety checks before starting the app.
///
/// Usage in build:
/// ```bash
/// flutter build apk --release --target=lib/main_production.dart \
///   --dart-define=APP_ENV=production
/// ```
library;

import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_common/flutter_common.dart' hide AuthStatus;
import 'package:flutter_notifications/flutter_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/environment.dart';
import 'config/startup_checks.dart';
import 'firebase_options.dart';
import 'main.dart' show ParentApp;

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await firebaseMessagingBackgroundHandler(message);
}

Future<void> main() async {
  // Production safety assertions
  _enforceProductionConfiguration();

  // Run with Crashlytics error handling
  await CrashlyticsService.runWithCrashlytics(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Run startup checks to validate environment configuration
    StartupChecks.run();

    // Verify we're in production mode
    if (!EnvironmentConfig.isProduction) {
      throw StateError(
        'main_production.dart must only be used with APP_ENV=production. '
        'Current environment: ${EnvironmentConfig.current.name}',
      );
    }

    // Verify mock services are disabled
    if (EnvironmentConfig.useMockServices) {
      throw StateError(
        'Mock services cannot be enabled in production entry point.',
      );
    }

    // Initialize environment configuration
    EnvConfig.initialize();

    // Initialize Firebase
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Enable Crashlytics in production
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);

    // Set custom keys for crash context
    await FirebaseCrashlytics.instance.setCustomKey('app_type', 'parent');
    await FirebaseCrashlytics.instance
        .setCustomKey('environment', 'production');
    await FirebaseCrashlytics.instance
        .setCustomKey('entry_point', 'main_production');

    // Set up background message handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Log production startup
    debugPrint('═══════════════════════════════════════════════════════════');
    debugPrint('🚀 AIVO Parent App - PRODUCTION BUILD');
    debugPrint('═══════════════════════════════════════════════════════════');

    runApp(const ProviderScope(child: ParentApp()));
  });
}

/// Enforces production-only configuration.
///
/// This function performs compile-time and runtime checks to ensure
/// the app is properly configured for production.
void _enforceProductionConfiguration() {
  // Check that we're in release mode
  if (!kReleaseMode) {
    debugPrint(
      '⚠️ WARNING: main_production.dart is running in non-release mode. '
      'This is acceptable for testing but should not happen in production.',
    );
  }

  // Verify environment configuration won't allow mocks
  // This is a defense-in-depth check
  assert(() {
    if (EnvironmentConfig.useMockServices) {
      debugPrint(
          '❌ ERROR: Mock services should never be enabled in production builds.');
      return false;
    }
    return true;
  }());
}
