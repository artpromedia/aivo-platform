# Aivo Flutter Design System - Component Guidelines

**Version:** 1.0  
**Last Updated:** February 1, 2026

---

## Overview

This guide provides usage guidelines for the Aivo Flutter Design System components. All components are designed to work seamlessly across grade bands (K-5, G6-8, G9-12) and automatically adapt their styling based on the active theme.

---

## Getting Started

### Import the Design System

```dart
import 'package:flutter_common/flutter_common.dart';
```

### Apply the Theme

Wrap your app with `AivoTheme`:

```dart
MaterialApp(
  theme: AivoTheme.light(gradeBand: AivoGradeBand.g6_8),
  darkTheme: AivoTheme.dark(gradeBand: AivoGradeBand.g6_8),
  themeMode: ThemeMode.system,
  home: MyApp(),
)
```

### Access Theme Values

```dart
// Get current grade band
final gradeBand = AivoTheme.gradeBandOf(context);

// Get colors
final colors = Theme.of(context).colorScheme;

// Get text styles
final textTheme = Theme.of(context).textTheme;

// Get spacing
final spacing = context.aivoSpacing;

// Get motion config
final motion = context.aivoMotion;
```

---

## Core Components

### AivoButton

Primary interactive element for user actions.

#### Usage

```dart
// Primary button
AivoButton(
  label: 'Continue',
  onPressed: () => handleContinue(),
)

// With icon
AivoButton(
  label: 'Add Item',
  leadingIcon: Icons.add,
  onPressed: () => handleAdd(),
)

// Loading state
AivoButton(
  label: 'Saving...',
  isLoading: true,
  onPressed: null,
)

// Secondary variant
AivoButton.secondary(
  label: 'Cancel',
  onPressed: () => handleCancel(),
)

// Outline variant
AivoButton.outline(
  label: 'Learn More',
  onPressed: () => handleLearnMore(),
)

// Destructive action
AivoButton.destructive(
  label: 'Delete',
  onPressed: () => handleDelete(),
)
```

#### Properties

| Property       | Type                | Default  | Description                   |
| -------------- | ------------------- | -------- | ----------------------------- |
| `label`        | `String`            | required | Button text                   |
| `onPressed`    | `VoidCallback?`     | null     | Tap handler (null = disabled) |
| `variant`      | `AivoButtonVariant` | primary  | Visual variant                |
| `size`         | `AivoButtonSize`    | medium   | Size preset                   |
| `leadingIcon`  | `IconData?`         | null     | Icon before label             |
| `trailingIcon` | `IconData?`         | null     | Icon after label              |
| `isLoading`    | `bool`              | false    | Show loading spinner          |
| `isFullWidth`  | `bool`              | false    | Expand to full width          |

#### Best Practices

- Use **primary** for main actions (one per screen)
- Use **secondary** for supporting actions
- Use **outline** for less prominent actions
- Use **destructive** only for delete/remove actions
- Always provide loading feedback for async operations

---

### AivoTextField

Text input for forms and search.

#### Usage

```dart
// Basic text field
AivoTextField(
  label: 'Email',
  hint: 'Enter your email address',
  controller: emailController,
)

// With validation error
AivoTextField(
  label: 'Password',
  obscureText: true,
  controller: passwordController,
  errorText: 'Password must be at least 8 characters',
)

// With prefix icon
AivoTextField(
  label: 'Search',
  hint: 'Search lessons...',
  prefixIcon: Icons.search,
  controller: searchController,
)

// Multiline
AivoTextField(
  label: 'Notes',
  maxLines: 4,
  controller: notesController,
)
```

#### Properties

| Property      | Type                     | Default | Description          |
| ------------- | ------------------------ | ------- | -------------------- |
| `label`       | `String?`                | null    | Field label          |
| `hint`        | `String?`                | null    | Placeholder text     |
| `controller`  | `TextEditingController?` | null    | Text controller      |
| `errorText`   | `String?`                | null    | Error message        |
| `helperText`  | `String?`                | null    | Helper text          |
| `prefixIcon`  | `IconData?`              | null    | Leading icon         |
| `suffixIcon`  | `Widget?`                | null    | Trailing widget      |
| `obscureText` | `bool`                   | false   | Hide text (password) |
| `maxLines`    | `int`                    | 1       | Maximum lines        |
| `maxLength`   | `int?`                   | null    | Character limit      |
| `enabled`     | `bool`                   | true    | Enable/disable input |

#### Best Practices

- Always provide a label for accessibility
- Show errors inline, not in dialogs
- Use appropriate keyboard types
- Provide clear placeholder examples

---

### AivoCard

Container for grouping related content.

#### Usage

```dart
// Basic card
AivoCard(
  child: Padding(
    padding: EdgeInsets.all(16),
    child: Text('Card content'),
  ),
)

// Tappable card
AivoCard(
  onTap: () => handleTap(),
  child: ListTile(
    title: Text('Tap me'),
    trailing: Icon(Icons.chevron_right),
  ),
)

// Outlined variant
AivoCard.outlined(
  child: content,
)

// Filled variant
AivoCard.filled(
  child: content,
)
```

#### Properties

| Property     | Type              | Default  | Description     |
| ------------ | ----------------- | -------- | --------------- |
| `child`      | `Widget`          | required | Card content    |
| `variant`    | `AivoCardVariant` | elevated | Visual variant  |
| `onTap`      | `VoidCallback?`   | null     | Tap handler     |
| `padding`    | `EdgeInsets?`     | null     | Content padding |
| `isSelected` | `bool`            | false    | Selected state  |

---

### AivoDialog

Modal dialogs for important interactions.

#### Usage

```dart
// Show dialog
showDialog(
  context: context,
  builder: (context) => AivoDialog(
    title: 'Confirm Action',
    content: Text('Are you sure you want to proceed?'),
    actions: [
      AivoButton.outline(
        label: 'Cancel',
        onPressed: () => Navigator.pop(context),
      ),
      AivoButton(
        label: 'Confirm',
        onPressed: () {
          handleConfirm();
          Navigator.pop(context);
        },
      ),
    ],
  ),
);

// Alert dialog helper
AivoDialog.alert(
  context: context,
  title: 'Error',
  message: 'Something went wrong. Please try again.',
);

// Confirmation dialog helper
AivoDialog.confirm(
  context: context,
  title: 'Delete Item',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
  isDestructive: true,
  onConfirm: () => handleDelete(),
);
```

---

### AivoSnackbar

Temporary feedback messages.

#### Usage

```dart
// Show snackbar
ScaffoldMessenger.of(context).showSnackBar(
  AivoSnackbar.success(
    message: 'Item saved successfully!',
  ),
);

// With action
ScaffoldMessenger.of(context).showSnackBar(
  AivoSnackbar.info(
    message: 'Item deleted',
    action: SnackBarAction(
      label: 'Undo',
      onPressed: () => handleUndo(),
    ),
  ),
);

// Error snackbar
ScaffoldMessenger.of(context).showSnackBar(
  AivoSnackbar.error(
    message: 'Failed to save. Please try again.',
  ),
);
```

---

## Gamification Components

### Progress Widgets

```dart
// XP progress bar
AivoXpProgressBar(
  currentXp: 750,
  maxXp: 1000,
)

// Level ring
AivoLevelRing(
  level: 5,
  progress: 0.75,
)

// Combined level progress
AivoLevelProgress(
  level: 5,
  currentXp: 750,
  xpForNextLevel: 1000,
)
```

### Streak Widgets

```dart
// Streak counter
AivoStreakCounter(
  streakDays: 7,
)

// Streak card
AivoStreakCard(
  currentStreak: 7,
  longestStreak: 14,
  nextMilestone: 10,
)
```

### Achievement Widgets

```dart
// Achievement badge
AivoAchievementBadge(
  tier: BadgeTier.gold,
  icon: Icons.star,
)

// Achievement card
AivoAchievementCard(
  title: 'Math Master',
  description: 'Complete 100 math lessons',
  tier: BadgeTier.gold,
  xpReward: 500,
  progress: 75,
  progressTotal: 100,
)
```

### Hearts & Coins

```dart
// Hearts display
AivoHeartsDisplay(
  currentHearts: 3,
  maxHearts: 5,
  nextRefillTime: Duration(minutes: 14),
)

// Coin counter
AivoCoinCounter(
  count: 1250,
)

// Price tag
AivoCoinPriceTag(
  price: 100,
  canAfford: true,
)
```

### Challenge Cards

```dart
AivoChallengeCard(
  title: 'Daily Math Master',
  description: 'Complete 5 math exercises today',
  difficulty: Difficulty.medium,
  type: ChallengeType.daily,
  progress: 3,
  progressTotal: 5,
  xpReward: 50,
  coinReward: 25,
  timeRemaining: Duration(hours: 5),
)
```

---

## Icons

### Using Icons

```dart
// Basic icon
AivoIcon(
  icon: AivoIcons.home,
)

// With custom size
AivoIcon(
  icon: AivoIcons.settings,
  size: AivoIconSize.large,
)

// Subject icon
AivoSubjectIcon(
  subject: Subject.math,
)
```

### Icon Button

```dart
AivoIconButton(
  icon: Icons.favorite,
  onPressed: () => handleFavorite(),
  tooltip: 'Add to favorites',
)
```

---

## Loading States

```dart
// Skeleton loader
AivoSkeleton(
  child: Container(
    width: 200,
    height: 100,
  ),
)

// Shimmer effect
AivoShimmer(
  child: ListTile(
    leading: CircleAvatar(),
    title: Container(height: 16, color: Colors.white),
    subtitle: Container(height: 12, color: Colors.white),
  ),
)

// Loading spinner
AivoLoadingSpinner()

// Full screen loading
AivoLoadingOverlay(
  message: 'Loading...',
)
```

---

## Error States

```dart
// Error state
AivoErrorState(
  title: 'Something went wrong',
  message: 'Please try again later.',
  onRetry: () => handleRetry(),
)

// Empty state
AivoEmptyState(
  title: 'No lessons yet',
  message: 'Start learning to see your progress here.',
  action: AivoButton(
    label: 'Browse Lessons',
    onPressed: () => navigateToLessons(),
  ),
)

// Offline state
AivoOfflineState(
  onRetry: () => checkConnection(),
)
```

---

## Theming Best Practices

### Grade Band Considerations

1. **K-5 (Explorer)**: Larger touch targets, more animation, playful feel
2. **G6-8 (Navigator)**: Balanced sizing, moderate animation
3. **G9-12 (Scholar)**: Compact sizing, minimal animation, professional feel

### Color Usage

- Use semantic colors (`primary`, `error`, `success`) not raw hex values
- Subject colors are predefined—don't create custom ones
- Ensure sufficient contrast for accessibility

### Motion Guidelines

- Respect `reduceMotion` setting
- Use grade-band appropriate durations
- Avoid excessive animation that could distract

### Accessibility

- Always provide semantic labels
- Ensure touch targets meet minimums
- Support screen readers
- Test with increased text size

---

## Migration Guide

### From Material Components

```dart
// Before (Material)
ElevatedButton(
  onPressed: () {},
  child: Text('Click me'),
)

// After (Aivo)
AivoButton(
  label: 'Click me',
  onPressed: () {},
)
```

```dart
// Before (Material)
TextField(
  decoration: InputDecoration(
    labelText: 'Email',
    errorText: error,
  ),
)

// After (Aivo)
AivoTextField(
  label: 'Email',
  errorText: error,
)
```

---

## Support

For questions or issues with the design system:

1. Check the Visual QA Report for component status
2. Review the Sign-Off Checklist for verification status
3. Contact the design system team

---

**Document Version:** 1.0  
**Maintained by:** Aivo Engineering Team
