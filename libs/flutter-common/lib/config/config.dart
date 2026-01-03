/// Environment configuration for Aivo mobile apps
///
/// Supports three environments: dev, staging, prod
/// Configure via:
/// - Flutter run: `flutter run --dart-define=FLAVOR=dev`
/// - Build: `flutter build apk --dart-define=FLAVOR=prod`
library;

export 'env_config.dart';
export 'flavor.dart';
