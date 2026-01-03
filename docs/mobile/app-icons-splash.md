# Mobile App Icons and Splash Screens

This document describes how to configure app icons and splash screens for the Aivo mobile apps.

## App Icon Requirements

### Design Guidelines

Each app should have a distinct icon that is:

- Recognizable at small sizes
- Consistent with the Aivo brand
- Distinct between learner/parent/teacher apps

Suggested icon themes:

- **Learner**: Star/badge with friendly character
- **Parent**: Family/shield motif
- **Teacher**: Book/classroom motif

### Icon Sizes Required

#### Android

| Type                | Size    | Purpose                        |
| ------------------- | ------- | ------------------------------ |
| mipmap-mdpi         | 48x48   | Standard density               |
| mipmap-hdpi         | 72x72   | High density                   |
| mipmap-xhdpi        | 96x96   | Extra high density             |
| mipmap-xxhdpi       | 144x144 | Extra extra high density       |
| mipmap-xxxhdpi      | 192x192 | Extra extra extra high density |
| Adaptive foreground | 432x432 | Android 8+ adaptive icons      |
| Play Store          | 512x512 | Google Play listing            |

#### iOS

| Type      | Size           | Purpose           |
| --------- | -------------- | ----------------- |
| @1x       | 60x60          | iPhone            |
| @2x       | 120x120        | iPhone Retina     |
| @3x       | 180x180        | iPhone Pro Max    |
| iPad      | 76x76, 152x152 | iPad              |
| App Store | 1024x1024      | App Store listing |

## Using flutter_launcher_icons

Add to `pubspec.yaml`:

```yaml
dev_dependencies:
  flutter_launcher_icons: ^0.13.1

flutter_launcher_icons:
  android: true
  ios: true
  image_path: 'assets/icons/app_icon.png'
  adaptive_icon_background: '#FFFFFF'
  adaptive_icon_foreground: 'assets/icons/app_icon_foreground.png'
  min_sdk_android: 21
```

Run:

```bash
flutter pub run flutter_launcher_icons
```

## Splash Screen Configuration

### Using flutter_native_splash

Add to `pubspec.yaml`:

```yaml
dev_dependencies:
  flutter_native_splash: ^2.3.8

flutter_native_splash:
  color: '#FFFFFF'
  image: assets/splash/splash_logo.png

  # Android 12+ configuration
  android_12:
    color: '#FFFFFF'
    icon_background_color: '#FFFFFF'
    image: assets/splash/splash_logo.png

  # iOS configuration
  ios: true

  # Learner app: child-friendly colors
  # color: "#6366F1"  # Indigo

  # Web splash (if needed)
  web: false
```

Run:

```bash
flutter pub run flutter_native_splash:create
```

### App-Specific Colors

| App     | Primary Color     | Background              |
| ------- | ----------------- | ----------------------- |
| Learner | #6366F1 (Indigo)  | #FFFFFF or grade-themed |
| Parent  | #059669 (Emerald) | #FFFFFF                 |
| Teacher | #0284C7 (Sky)     | #FFFFFF                 |

## Asset Structure

Create the following asset structure:

```
assets/
├── icons/
│   ├── app_icon.png           # 1024x1024 source icon
│   ├── app_icon_foreground.png # For adaptive icons
│   └── app_icon_round.png      # For round icon variants
└── splash/
    ├── splash_logo.png         # Main splash logo
    ├── splash_logo@2x.png      # 2x for iOS
    └── splash_logo@3x.png      # 3x for iOS
```

## Per-Flavor Icons

For different icons per flavor (dev has debug badge, etc.):

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path_android: 'assets/icons/android/ic_launcher.png'
  image_path_ios: 'assets/icons/ios/app_icon.png'

# Flavor-specific overrides
flutter_launcher_icons-dev:
  image_path: 'assets/icons/app_icon_dev.png'

flutter_launcher_icons-staging:
  image_path: 'assets/icons/app_icon_staging.png'

flutter_launcher_icons-prod:
  image_path: 'assets/icons/app_icon.png'
```

Run for specific flavor:

```bash
flutter pub run flutter_launcher_icons -f flutter_launcher_icons-dev.yaml
```

## Dark Mode Splash

For apps that support dark mode:

```yaml
flutter_native_splash:
  color: '#FFFFFF'
  color_dark: '#1F2937'
  image: assets/splash/splash_logo.png
  image_dark: assets/splash/splash_logo_dark.png
```

## COPPA Compliance (Learner App)

The learner app icon and splash should:

- Be age-appropriate and friendly
- Not include any advertising or marketing
- Not collect any data during splash
- Load quickly to minimize child wait time

## Testing Icons

After generating icons, verify on:

- [ ] Android emulator (various densities)
- [ ] iOS simulator (various sizes)
- [ ] Physical devices
- [ ] App switcher/recent apps
- [ ] Home screen
- [ ] Notification tray

## Resources

- [Material Design Icon Guidelines](https://material.io/design/iconography/product-icons.html)
- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [flutter_launcher_icons package](https://pub.dev/packages/flutter_launcher_icons)
- [flutter_native_splash package](https://pub.dev/packages/flutter_native_splash)
