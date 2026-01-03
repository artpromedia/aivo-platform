/// App flavor/environment enum
enum Flavor {
  /// Development environment - local backend, debug features enabled
  dev,

  /// Staging environment - staging backend, some debug features
  staging,

  /// Production environment - production backend, all debug features disabled
  prod,
}

/// Extension methods for Flavor
extension FlavorExtension on Flavor {
  /// Get the flavor from string (used with --dart-define)
  static Flavor fromString(String value) {
    switch (value.toLowerCase()) {
      case 'dev':
      case 'development':
        return Flavor.dev;
      case 'staging':
      case 'stage':
        return Flavor.staging;
      case 'prod':
      case 'production':
        return Flavor.prod;
      default:
        // Default to dev for safety
        return Flavor.dev;
    }
  }

  /// Display name for the flavor
  String get displayName {
    switch (this) {
      case Flavor.dev:
        return 'Development';
      case Flavor.staging:
        return 'Staging';
      case Flavor.prod:
        return 'Production';
    }
  }

  /// Short suffix for app name (e.g., "Aivo Learner Dev")
  String get suffix {
    switch (this) {
      case Flavor.dev:
        return ' Dev';
      case Flavor.staging:
        return ' Staging';
      case Flavor.prod:
        return '';
    }
  }

  /// Whether debug features should be enabled
  bool get isDebug => this != Flavor.prod;

  /// Whether analytics should be enabled
  bool get analyticsEnabled => this != Flavor.dev;

  /// Whether crash reporting should be enabled
  bool get crashReportingEnabled => this != Flavor.dev;
}
