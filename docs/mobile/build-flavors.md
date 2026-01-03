# Mobile App Build Flavors

This document describes how to configure and build the mobile apps with different flavors (dev, staging, prod).

## Overview

Each mobile app supports three build flavors:

- **dev**: Local development with debug features
- **staging**: Staging environment for testing
- **prod**: Production release

## Dart-Side Configuration

The apps use `EnvConfig` from `flutter_common` which reads the `FLAVOR` dart-define:

```dart
// In main.dart
EnvConfig.initialize(); // Reads FLAVOR from dart-define
```

### Running with Flavors

```bash
# Development (default)
flutter run

# Staging
flutter run --dart-define=FLAVOR=staging

# Production
flutter run --dart-define=FLAVOR=prod
```

### Building with Flavors

```bash
# Android APK
flutter build apk --dart-define=FLAVOR=prod

# Android App Bundle
flutter build appbundle --dart-define=FLAVOR=prod

# iOS
flutter build ios --dart-define=FLAVOR=prod
```

## Android Configuration

After running `flutter create` to generate Android files, add the following to `android/app/build.gradle`:

```groovy
android {
    // ... existing config ...

    flavorDimensions "environment"

    productFlavors {
        dev {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
            resValue "string", "app_name", "Aivo Learner Dev"
        }
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            resValue "string", "app_name", "Aivo Learner Staging"
        }
        prod {
            dimension "environment"
            resValue "string", "app_name", "Aivo Learner"
        }
    }
}
```

### Firebase Configuration per Flavor

Create separate Firebase projects or apps for each flavor:

```
android/app/src/
├── dev/
│   └── google-services.json
├── staging/
│   └── google-services.json
└── prod/
    └── google-services.json
```

## iOS Configuration

After running `flutter create`, configure Xcode schemes:

1. Open `ios/Runner.xcworkspace` in Xcode
2. Create new schemes: `Runner-Dev`, `Runner-Staging`, `Runner-Prod`
3. Create xcconfig files:

```
ios/Flutter/
├── Dev.xcconfig
├── Staging.xcconfig
└── Prod.xcconfig
```

Example `Dev.xcconfig`:

```
#include "Debug.xcconfig"
PRODUCT_BUNDLE_IDENTIFIER=com.aivo.learner.dev
PRODUCT_NAME=Aivo Learner Dev
FLUTTER_DART_DEFINES=FLAVOR=dev
```

### Firebase Configuration per Flavor

```
ios/config/
├── dev/
│   └── GoogleService-Info.plist
├── staging/
│   └── GoogleService-Info.plist
└── prod/
    └── GoogleService-Info.plist
```

Add a Run Script build phase to copy the correct plist:

```bash
PLIST_SOURCE="${PROJECT_DIR}/config/${CONFIGURATION}/GoogleService-Info.plist"
cp "${PLIST_SOURCE}" "${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/GoogleService-Info.plist"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
jobs:
  build-android:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        flavor: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter build apk --dart-define=FLAVOR=${{ matrix.flavor }}
```

### Environment Variables

The apps can also receive additional configuration via dart-define:

```bash
flutter build apk \
  --dart-define=FLAVOR=prod \
  --dart-define=API_URL=https://api.aivo.com \
  --dart-define=SENTRY_DSN=https://xxx@sentry.io/xxx
```

## App-Specific Notes

### mobile-learner

- COPPA compliant - crashlytics logs `is_child_device: true`
- Child-appropriate content only

### mobile-parent

- Full Firebase analytics enabled
- Payment/subscription features

### mobile-teacher

- Classroom session management
- Real-time student monitoring

## Signing Configuration

See [app-signing.md](./app-signing.md) for production signing setup.
