/// Test Configuration
///
/// Configuration settings for E2E tests.
library;

/// Test environment configuration.
class TestConfig {
  TestConfig._();

  /// Base URL for the mock API server.
  static String get apiBaseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    return envUrl.isNotEmpty ? envUrl : 'http://localhost:3001';
  }

  /// Whether to use mock data instead of real API calls.
  static bool get useMocks {
    const useMocks = String.fromEnvironment('USE_MOCKS', defaultValue: 'true');
    return useMocks == 'true';
  }

  /// Test timeout duration in seconds.
  static int get timeoutSeconds {
    const timeout = String.fromEnvironment('TEST_TIMEOUT', defaultValue: '30');
    return int.tryParse(timeout) ?? 30;
  }

  /// Whether to capture screenshots on failure.
  static bool get captureScreenshots {
    const capture = String.fromEnvironment('CAPTURE_SCREENSHOTS', defaultValue: 'true');
    return capture == 'true';
  }

  /// Directory for test artifacts (screenshots, logs, etc.).
  static String get artifactsDir {
    const dir = String.fromEnvironment('ARTIFACTS_DIR');
    return dir.isNotEmpty ? dir : 'test-results';
  }

  /// Whether verbose logging is enabled.
  static bool get verbose {
    const verbose = String.fromEnvironment('VERBOSE', defaultValue: 'false');
    return verbose == 'true';
  }
}
