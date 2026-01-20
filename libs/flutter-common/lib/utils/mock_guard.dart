import 'package:flutter/foundation.dart';

/// Safe mock mode guard for mobile services.
///
/// This utility ensures that mock data is NEVER used in release builds,
/// even if environment variables are accidentally set.
///
/// CRITICAL: Addresses P1 Issue - Mobile mock data functions lack kDebugMode guards
///
/// Usage:
/// ```dart
/// // Instead of:
/// if (_useMock) {
///   return mockData();
/// }
///
/// // Use:
/// if (shouldUseMock(_useMock)) {
///   return mockData();
/// }
/// ```
///
/// Or use the convenience function:
/// ```dart
/// if (useMockWhen(_useMock, 'MyService')) {
///   return mockData();
/// }
/// ```

/// Check if mock mode should be enabled.
/// Returns true ONLY if:
/// 1. The mock environment variable is set to true, AND
/// 2. The app is running in debug mode (kDebugMode)
///
/// This prevents mock data from ever being used in release builds.
bool shouldUseMock(bool mockEnvVariable) {
  // SECURITY: Never allow mocking in release builds
  if (!kDebugMode) {
    return false;
  }
  return mockEnvVariable;
}

/// Check if mock mode should be enabled, with logging.
/// Same as [shouldUseMock] but logs a warning when mock mode is active.
///
/// Parameters:
/// - [mockEnvVariable]: The value from `bool.fromEnvironment('USE_*_MOCK')`
/// - [serviceName]: Name of the service for logging purposes
bool useMockWhen(bool mockEnvVariable, String serviceName) {
  if (!shouldUseMock(mockEnvVariable)) {
    return false;
  }

  // Log warning in debug mode when using mock data
  assert(() {
    debugPrint(
      '⚠️ WARNING: $serviceName is using mock data. '
      'This should only happen in development.',
    );
    return true;
  }());

  return true;
}

/// Asserts that mock mode is disabled in production.
/// Call this during app initialization to catch configuration errors early.
///
/// Usage in main.dart:
/// ```dart
/// void main() {
///   assertNoMocksInProduction(
///     'AppName',
///     mockFlags: {
///       'USE_LEARNER_MOCK': bool.fromEnvironment('USE_LEARNER_MOCK'),
///       'USE_FOCUS_MOCK': bool.fromEnvironment('USE_FOCUS_MOCK'),
///       // ...
///     },
///   );
///   runApp(MyApp());
/// }
/// ```
void assertNoMocksInProduction(
  String appName, {
  required Map<String, bool> mockFlags,
}) {
  // Only check in release mode - in debug mode, mocks are allowed
  if (kDebugMode) {
    return;
  }

  // Check if any mock flags are enabled
  final enabledMocks = mockFlags.entries
      .where((entry) => entry.value)
      .map((entry) => entry.key)
      .toList();

  if (enabledMocks.isNotEmpty) {
    // This is a critical error - mocks should never be enabled in production
    // We throw to prevent the app from starting with mock data
    throw StateError(
      '[$appName] CRITICAL: Mock mode flags are enabled in production build! '
      'Enabled flags: ${enabledMocks.join(', ')}. '
      'This is a build configuration error.',
    );
  }
}

/// Extension to add mock-safe methods to services.
extension MockGuardExtension on bool {
  /// Returns true only if this flag is true AND app is in debug mode.
  bool get inDebugOnly => shouldUseMock(this);
}
