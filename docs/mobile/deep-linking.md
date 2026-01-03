# Mobile Deep Linking Configuration

This document describes how to configure deep linking for the Aivo mobile apps.

## Overview

Deep links allow users to open specific screens in the app from:

- Push notification taps
- Email links
- QR codes
- Other apps
- Web browser

## URL Schemes

### Custom URL Schemes

| App     | Scheme            | Example                            |
| ------- | ----------------- | ---------------------------------- |
| Learner | `aivo-learner://` | `aivo-learner://activity/123`      |
| Parent  | `aivo-parent://`  | `aivo-parent://child/456/progress` |
| Teacher | `aivo-teacher://` | `aivo-teacher://class/789/session` |

### Universal Links (HTTPS)

| App     | Domain         | Path Prefix  |
| ------- | -------------- | ------------ |
| Learner | `app.aivo.com` | `/learner/*` |
| Parent  | `app.aivo.com` | `/parent/*`  |
| Teacher | `app.aivo.com` | `/teacher/*` |

## Route Definitions

### Learner App Routes

```dart
// In router configuration
final routes = [
  // Deep link: aivo-learner://activity/:sessionId
  GoRoute(
    path: '/activity/:sessionId',
    builder: (context, state) => ActivityScreen(
      sessionId: state.pathParameters['sessionId']!,
    ),
  ),

  // Deep link: aivo-learner://baseline/intro
  GoRoute(path: '/baseline/intro', ...),

  // Deep link: aivo-learner://achievements
  GoRoute(path: '/achievements', ...),
];
```

### Parent App Routes

```dart
// Deep link: aivo-parent://child/:childId
// Deep link: aivo-parent://child/:childId/progress
// Deep link: aivo-parent://messages/:conversationId
// Deep link: aivo-parent://settings/notifications
```

### Teacher App Routes

```dart
// Deep link: aivo-teacher://class/:classId
// Deep link: aivo-teacher://class/:classId/session
// Deep link: aivo-teacher://student/:studentId
// Deep link: aivo-teacher://messages/:conversationId
```

## Android Configuration

### AndroidManifest.xml

Add intent filters to `android/app/src/main/AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity" ...>
    <!-- Existing intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
    </intent-filter>

    <!-- Custom URL scheme -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="aivo-learner"/>
    </intent-filter>

    <!-- Universal Links (App Links) -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data
            android:scheme="https"
            android:host="app.aivo.com"
            android:pathPrefix="/learner"/>
    </intent-filter>
</activity>
```

### Digital Asset Links

Host at `https://app.aivo.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.aivo.learner",
      "sha256_cert_fingerprints": ["YOUR_RELEASE_SIGNING_CERT_FINGERPRINT"]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.aivo.parent",
      "sha256_cert_fingerprints": ["YOUR_RELEASE_SIGNING_CERT_FINGERPRINT"]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.aivo.teacher",
      "sha256_cert_fingerprints": ["YOUR_RELEASE_SIGNING_CERT_FINGERPRINT"]
    }
  }
]
```

Get fingerprint:

```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

## iOS Configuration

### Info.plist

Add URL scheme to `ios/Runner/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>aivo-learner</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.aivo.learner</string>
    </dict>
</array>
```

### Associated Domains

Add to `ios/Runner/Runner.entitlements`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:app.aivo.com</string>
</array>
```

### Apple App Site Association

Host at `https://app.aivo.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.aivo.learner",
        "paths": ["/learner/*"]
      },
      {
        "appID": "TEAM_ID.com.aivo.parent",
        "paths": ["/parent/*"]
      },
      {
        "appID": "TEAM_ID.com.aivo.teacher",
        "paths": ["/teacher/*"]
      }
    ]
  }
}
```

## Flutter Implementation

### Using go_router

```dart
import 'package:go_router/go_router.dart';

final router = GoRouter(
  routes: [...],

  // Handle deep links
  redirect: (context, state) {
    // Check authentication before deep link navigation
    if (!isAuthenticated && requiresAuth(state.matchedLocation)) {
      // Save intended destination
      saveDeepLinkDestination(state.matchedLocation);
      return '/login';
    }
    return null;
  },
);
```

### Handling Deep Links

```dart
// In main.dart or app widget
class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _handleInitialLink();
    _setupLinkStream();
  }

  Future<void> _handleInitialLink() async {
    final initialLink = await getInitialLink();
    if (initialLink != null) {
      _handleDeepLink(initialLink);
    }
  }

  void _setupLinkStream() {
    linkStream.listen((String? link) {
      if (link != null) {
        _handleDeepLink(link);
      }
    });
  }

  void _handleDeepLink(String link) {
    final uri = Uri.parse(link);
    context.go(uri.path);
  }
}
```

### Using app_links Package

Add to `pubspec.yaml`:

```yaml
dependencies:
  app_links: ^4.0.0
```

```dart
import 'package:app_links/app_links.dart';

final appLinks = AppLinks();

// Get initial link (app opened via deep link)
final initialLink = await appLinks.getInitialAppLink();

// Listen for links while app is running
appLinks.uriLinkStream.listen((Uri uri) {
  // Handle the deep link
  handleDeepLink(uri);
});
```

## Notification Deep Links

When sending push notifications, include deep link data:

```json
{
  "notification": {
    "title": "New Achievement!",
    "body": "You earned a badge!"
  },
  "data": {
    "deep_link": "aivo-learner://achievements",
    "type": "achievement_unlocked"
  }
}
```

Handle in notification tap:

```dart
void _handleNotificationTap(AivoNotification notification) {
  final deepLink = notification.data['deep_link'];
  if (deepLink != null) {
    context.go(Uri.parse(deepLink).path);
  }
}
```

## COPPA Compliance (Learner App)

For the learner app:

- Deep links should not bypass parental controls
- No marketing/promotional deep links
- All deep link destinations must be age-appropriate
- Log deep link usage for parental review

```dart
void handleLearnerDeepLink(Uri uri) {
  // Validate path is allowed for children
  if (!CoppaValidator.isAllowedDeepLink(uri.path)) {
    return; // Ignore non-compliant deep links
  }

  // Proceed with navigation
  context.go(uri.path);
}
```

## Testing Deep Links

### Android

```bash
# Custom scheme
adb shell am start -a android.intent.action.VIEW \
  -d "aivo-learner://activity/123"

# Universal link
adb shell am start -a android.intent.action.VIEW \
  -d "https://app.aivo.com/learner/activity/123"
```

### iOS

```bash
# Custom scheme
xcrun simctl openurl booted "aivo-learner://activity/123"

# Universal link
xcrun simctl openurl booted "https://app.aivo.com/learner/activity/123"
```

## Debugging

Enable deep link debugging:

```dart
if (kDebugMode) {
  GoRouter.optionURLReflectsImperativeAPIs = true;
}
```

Check universal link association:

- Android: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.aivo.com
- iOS: https://app.aivo.com/.well-known/apple-app-site-association
