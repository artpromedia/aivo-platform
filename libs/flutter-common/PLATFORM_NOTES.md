# Aivo Flutter Design System - Platform-Specific Notes

**Version:** 1.0  
**Last Updated:** February 1, 2026

---

## Overview

This document outlines platform-specific considerations, differences, and best practices when using the Aivo Flutter Design System across iOS and Android platforms.

---

## Platform Detection

### Checking Platform

```dart
import 'dart:io' show Platform;

// Check platform
if (Platform.isIOS) {
  // iOS-specific code
} else if (Platform.isAndroid) {
  // Android-specific code
}

// Or use Theme
final platform = Theme.of(context).platform;
if (platform == TargetPlatform.iOS) {
  // iOS
}
```

### Adaptive Widgets

The design system provides adaptive behavior automatically:

```dart
// Automatically uses platform-appropriate styling
AivoButton(
  label: 'Continue',
  onPressed: () {},
)
```

---

## Visual Differences

### Typography

| Property       | iOS            | Android     |
| -------------- | -------------- | ----------- |
| System Font    | SF Pro Display | Roboto      |
| Mono Font      | SF Mono        | Roboto Mono |
| Font Rendering | Core Text      | Skia        |
| Anti-aliasing  | Subpixel       | Grayscale   |

**Note:** While fonts differ, the design system maintains visual consistency through:

- Matching font weights
- Consistent line heights
- Equivalent letter spacing

### Icons

| Property | iOS              | Android        |
| -------- | ---------------- | -------------- |
| Style    | SF Symbols style | Material style |
| Weight   | Regular          | Outlined       |

The design system uses custom icons that work consistently across platforms.

### Shadows

| Property  | iOS            | Android      |
| --------- | -------------- | ------------ |
| Rendering | Core Animation | RenderObject |
| Blur      | Gaussian       | Box blur     |
| Spread    | Natural        | Defined      |

**Mitigation:** Shadows are tuned per-platform to appear visually equivalent.

---

## Safe Areas

### iOS Safe Areas

```dart
// Respects notch, Dynamic Island, home indicator
SafeArea(
  child: YourContent(),
)

// Get safe area insets
final insets = MediaQuery.of(context).padding;
// insets.top = status bar + notch/Dynamic Island
// insets.bottom = home indicator
```

### Android Safe Areas

```dart
// Respects status bar, navigation bar
SafeArea(
  child: YourContent(),
)

// For gesture navigation
final insets = MediaQuery.of(context).viewPadding;
```

### Design System Handling

All Aivo components automatically respect safe areas:

```dart
// Navigation bars account for safe areas
AivoBottomNavigationBar(
  items: [...],
  // Automatically adds bottom padding for home indicator
)

// Dialogs respect safe areas
AivoDialog(
  // Content never obscured by notch or home indicator
)
```

---

## Navigation Patterns

### iOS Navigation

| Pattern      | Implementation       |
| ------------ | -------------------- |
| Back gesture | Swipe from left edge |
| Back button  | Chevron left         |
| Transitions  | Slide right-to-left  |
| Modal        | Slide up from bottom |

### Android Navigation

| Pattern      | Implementation                |
| ------------ | ----------------------------- |
| Back gesture | Swipe from edge (gesture nav) |
| Back button  | Arrow left / system back      |
| Transitions  | Fade + scale                  |
| Modal        | Slide up or fade              |

### Cross-Platform Handling

```dart
// Use Navigator 2.0 or go_router for consistent navigation
GoRouter(
  routes: [...],
  // Automatically handles platform back gestures
)
```

---

## Haptic Feedback

### iOS Haptics

```dart
import 'package:flutter/services.dart';

// Light impact
HapticFeedback.lightImpact();

// Medium impact
HapticFeedback.mediumImpact();

// Heavy impact
HapticFeedback.heavyImpact();

// Selection changed
HapticFeedback.selectionClick();
```

### Android Haptics

```dart
// Same API, maps to Android vibration patterns
HapticFeedback.lightImpact(); // Short vibration
HapticFeedback.mediumImpact(); // Medium vibration
HapticFeedback.heavyImpact(); // Strong vibration
```

### Design System Usage

Haptics are built into interactive components:

```dart
// AivoButton triggers haptic on press
AivoButton(
  label: 'Save',
  onPressed: () {}, // Haptic feedback automatic
)

// Gamification widgets use haptics for rewards
AivoAchievementUnlock(
  // Heavy haptic on achievement unlock
)
```

---

## Status Bar

### iOS Status Bar

```dart
// Light content (white icons)
SystemChrome.setSystemUIOverlayStyle(
  SystemUiOverlayStyle.light,
);

// Dark content (black icons)
SystemChrome.setSystemUIOverlayStyle(
  SystemUiOverlayStyle.dark,
);
```

### Android Status Bar

```dart
SystemChrome.setSystemUIOverlayStyle(
  SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark, // Dark icons
    statusBarBrightness: Brightness.light, // iOS fallback
  ),
);
```

### Design System Handling

`AivoTheme` automatically configures status bar:

```dart
// Light theme = dark status bar icons
// Dark theme = light status bar icons
MaterialApp(
  theme: AivoTheme.light(),
  darkTheme: AivoTheme.dark(),
)
```

---

## Keyboard Handling

### iOS Keyboard

| Feature     | Behavior             |
| ----------- | -------------------- |
| Appearance  | Matches system theme |
| Done button | Via inputAction      |
| Autocorrect | System default       |
| Toolbar     | Built-in paste/undo  |

### Android Keyboard

| Feature     | Behavior               |
| ----------- | ---------------------- |
| Appearance  | Varies by keyboard app |
| Done button | Via inputAction        |
| Autocorrect | Varies by keyboard     |
| Toolbar     | Gboard toolbar         |

### Handling Keyboard Insets

```dart
// Automatically adjust for keyboard
Scaffold(
  resizeToAvoidBottomInset: true, // Default
  body: SingleChildScrollView(
    child: Column(
      children: [
        // Content scrolls when keyboard appears
        AivoTextField(label: 'Email'),
        AivoTextField(label: 'Password'),
      ],
    ),
  ),
)

// Get keyboard height
final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
```

---

## Scrolling Behavior

### iOS Scrolling

| Feature     | Behavior             |
| ----------- | -------------------- |
| Physics     | Bouncy overscroll    |
| Indicators  | Thin, fades          |
| Momentum    | Natural deceleration |
| Edge effect | Bounce               |

### Android Scrolling

| Feature     | Behavior                                 |
| ----------- | ---------------------------------------- |
| Physics     | Clamping (default)                       |
| Indicators  | Thicker, material                        |
| Momentum    | Fixed deceleration                       |
| Edge effect | Glow (Material 2) / Stretch (Material 3) |

### Cross-Platform Consistency

```dart
// Use iOS-style physics everywhere for consistency
ScrollConfiguration(
  behavior: const ScrollBehavior().copyWith(
    physics: const BouncingScrollPhysics(),
  ),
  child: ListView(...),
)

// Or in theme
MaterialApp(
  scrollBehavior: const MaterialScrollBehavior().copyWith(
    physics: const BouncingScrollPhysics(),
  ),
)
```

---

## Form Handling

### iOS Forms

- Native date/time pickers (wheel style)
- Native action sheets
- Keyboard toolbar with Done button

### Android Forms

- Material date/time pickers
- Material bottom sheets
- IME action buttons

### Design System Approach

```dart
// Use Aivo components for consistency
AivoTextField(
  label: 'Date',
  readOnly: true,
  onTap: () => showAivoDatePicker(context),
)

// Platform-adaptive date picker
Future<DateTime?> showAivoDatePicker(BuildContext context) {
  if (Platform.isIOS) {
    return showCupertinoDatePicker(context);
  } else {
    return showMaterialDatePicker(context);
  }
}
```

---

## Accessibility

### iOS Accessibility

| Feature       | API                          |
| ------------- | ---------------------------- |
| VoiceOver     | Semantics widget             |
| Dynamic Type  | MediaQuery.textScaleFactor   |
| Reduce Motion | MediaQuery.disableAnimations |
| Bold Text     | MediaQuery.boldText          |

### Android Accessibility

| Feature       | API                          |
| ------------- | ---------------------------- |
| TalkBack      | Semantics widget             |
| Font Size     | MediaQuery.textScaleFactor   |
| Reduce Motion | MediaQuery.disableAnimations |
| Bold Text     | Limited support              |

### Design System Support

```dart
// All components include semantics
AivoButton(
  label: 'Save', // Used as semantic label
  onPressed: () {},
)

// Custom semantics
Semantics(
  label: 'Profile picture',
  child: AivoAvatar(imageUrl: url),
)

// Reduced motion
if (MediaQuery.of(context).disableAnimations) {
  // Use instant transitions
}
```

---

## Performance Considerations

### iOS Performance

| Factor   | Note                     |
| -------- | ------------------------ |
| Metal    | GPU rendering            |
| 120Hz    | ProMotion on Pro devices |
| Impeller | New rendering engine     |

### Android Performance

| Factor        | Note                  |
| ------------- | --------------------- |
| Vulkan/OpenGL | GPU varies by device  |
| 60-120Hz      | Varies by device      |
| Impeller      | Gradually rolling out |

### Optimization Tips

```dart
// Use const constructors
const AivoButton(
  label: 'Static Button',
  onPressed: null,
)

// Avoid unnecessary rebuilds
class MyWidget extends StatelessWidget {
  const MyWidget({super.key}); // const constructor
}

// Use RepaintBoundary for complex animations
RepaintBoundary(
  child: AivoStreakFlame(), // Animated widget
)
```

---

## Testing on Both Platforms

### Recommended Test Matrix

| Device Type    | iOS               | Android     |
| -------------- | ----------------- | ----------- |
| Small phone    | iPhone SE         | Pixel 4a    |
| Standard phone | iPhone 14         | Pixel 7     |
| Large phone    | iPhone 14 Pro Max | Pixel 7 Pro |
| Tablet         | iPad              | Galaxy Tab  |

### Simulator/Emulator Notes

- iOS Simulator: Good for UI, no haptics
- Android Emulator: Good for UI, some haptic simulation
- Always test on physical devices for:
  - Performance
  - Haptics
  - Gestures
  - Camera/sensors

---

## Platform-Specific Overrides

### When to Override

Override platform behavior only when:

1. Brand consistency requires it
2. User testing shows preference
3. Platform default is problematic

### Example Override

```dart
// Force iOS-style date picker on all platforms
class AivoDatePicker extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Always use wheel picker for brand consistency
    return CupertinoDatePicker(...);
  }
}
```

---

## Summary

| Feature    | iOS          | Android     | Design System      |
| ---------- | ------------ | ----------- | ------------------ |
| Font       | SF Pro       | Roboto      | Consistent weights |
| Navigation | Swipe back   | System back | Both supported     |
| Haptics    | Taptic       | Vibration   | Unified API        |
| Scroll     | Bounce       | Clamp       | iOS-style          |
| Safe areas | Notch/Island | Gesture nav | Auto-handled       |
| Status bar | Auto         | Manual      | Auto in theme      |

---

**Document Version:** 1.0  
**Maintained by:** Aivo Engineering Team
