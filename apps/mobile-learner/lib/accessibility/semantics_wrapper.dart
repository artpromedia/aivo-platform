/// Semantics wrapper widgets for accessibility
///
/// Provides convenient wrappers for common semantic patterns.
library;

import 'package:flutter/material.dart';
import 'accessibility_labels.dart';

/// A wrapper that makes an image accessible with a description.
class AccessibleImage extends StatelessWidget {
  final Widget child;
  final String description;
  final bool excludeFromSemantics;

  const AccessibleImage({
    super.key,
    required this.child,
    required this.description,
    this.excludeFromSemantics = false,
  });

  @override
  Widget build(BuildContext context) {
    if (excludeFromSemantics) {
      return ExcludeSemantics(child: child);
    }
    return Semantics(
      label: description,
      image: true,
      child: ExcludeSemantics(child: child),
    );
  }
}

/// A wrapper that groups related content with a label.
class SemanticGroup extends StatelessWidget {
  final Widget child;
  final String label;
  final bool? header;
  final bool? button;
  final String? hint;
  final VoidCallback? onTap;

  const SemanticGroup({
    super.key,
    required this.child,
    required this.label,
    this.header,
    this.button,
    this.hint,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      header: header ?? false,
      button: button ?? false,
      hint: hint,
      onTap: onTap,
      child: child,
    );
  }
}

/// A wrapper for progress indicators.
class AccessibleProgressRing extends StatelessWidget {
  final Widget child;
  final double progress;
  final String description;

  const AccessibleProgressRing({
    super.key,
    required this.child,
    required this.progress,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final percentage = (progress * 100).round();
    return Semantics(
      label: description,
      value: '$percentage%',
      child: ExcludeSemantics(child: child),
    );
  }
}

/// A wrapper for streak displays.
class AccessibleStreak extends StatelessWidget {
  final Widget child;
  final int streakDays;
  final bool completedToday;
  final int freezesAvailable;

  const AccessibleStreak({
    super.key,
    required this.child,
    required this.streakDays,
    required this.completedToday,
    required this.freezesAvailable,
  });

  @override
  Widget build(BuildContext context) {
    final streakLabel = A11yLabels.streakCount(streakDays);
    final statusLabel = A11yLabels.streakStatus(completedToday);
    final freezeLabel = A11yLabels.freezesAvailable(freezesAvailable);

    return Semantics(
      label: '$streakLabel. $statusLabel. $freezeLabel.',
      child: child,
    );
  }
}

/// A wrapper for level displays.
class AccessibleLevel extends StatelessWidget {
  final Widget child;
  final int level;
  final String levelTitle;
  final int currentXP;
  final int xpToNextLevel;

  const AccessibleLevel({
    super.key,
    required this.child,
    required this.level,
    required this.levelTitle,
    required this.currentXP,
    required this.xpToNextLevel,
  });

  @override
  Widget build(BuildContext context) {
    final totalXP = currentXP + xpToNextLevel;
    final label = A11yLabels.levelProgress(level, currentXP, totalXP);
    final percentage = totalXP > 0 ? ((currentXP / totalXP) * 100).round() : 0;

    return Semantics(
      label: '$levelTitle. $label',
      value: '$percentage% to next level',
      child: child,
    );
  }
}

/// A wrapper for difficulty indicators.
class AccessibleDifficulty extends StatelessWidget {
  final Widget child;
  final int level;

  const AccessibleDifficulty({
    super.key,
    required this.child,
    required this.level,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: A11yLabels.difficultyLevel(level),
      child: ExcludeSemantics(child: child),
    );
  }
}

/// A wrapper for activity cards.
class AccessibleActivityCard extends StatelessWidget {
  final Widget child;
  final String title;
  final String type;
  final int estimatedMinutes;
  final int? position;
  final int? total;
  final VoidCallback? onTap;

  const AccessibleActivityCard({
    super.key,
    required this.child,
    required this.title,
    required this.type,
    required this.estimatedMinutes,
    this.position,
    this.total,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activityLabel = A11yLabels.activityCard(title, type, estimatedMinutes);
    final positionLabel = position != null && total != null
        ? A11yLabels.activityProgress(position!, total!)
        : null;

    return Semantics(
      label: positionLabel != null ? '$positionLabel. $activityLabel' : activityLabel,
      button: onTap != null,
      onTap: onTap,
      child: child,
    );
  }
}

/// A wrapper for answer options.
class AccessibleAnswerOption extends StatelessWidget {
  final Widget child;
  final String text;
  final int index;
  final bool selected;
  final VoidCallback? onTap;

  const AccessibleAnswerOption({
    super.key,
    required this.child,
    required this.text,
    required this.index,
    required this.selected,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: A11yLabels.answerOption(text, index, selected),
      selected: selected,
      button: true,
      onTap: onTap,
      child: child,
    );
  }
}

/// A wrapper for achievement/badge displays.
class AccessibleAchievement extends StatelessWidget {
  final Widget child;
  final String name;
  final String description;
  final bool earned;
  final int? progressCurrent;
  final int? progressTotal;

  const AccessibleAchievement({
    super.key,
    required this.child,
    required this.name,
    required this.description,
    required this.earned,
    this.progressCurrent,
    this.progressTotal,
  });

  @override
  Widget build(BuildContext context) {
    final achievementLabel = A11yLabels.achievementCard(name, description, earned);
    final progressLabel = progressCurrent != null && progressTotal != null
        ? A11yLabels.achievementProgress(progressCurrent!, progressTotal!)
        : null;

    return Semantics(
      label: progressLabel != null ? '$achievementLabel $progressLabel' : achievementLabel,
      child: child,
    );
  }
}

/// A wrapper for loading states.
class AccessibleLoading extends StatelessWidget {
  final Widget child;
  final String? label;

  const AccessibleLoading({
    super.key,
    required this.child,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label ?? A11yLabels.loading,
      child: ExcludeSemantics(child: child),
    );
  }
}

/// Extension methods for adding semantics to existing widgets.
extension SemanticsExtension on Widget {
  Widget withSemantics({
    String? label,
    String? hint,
    String? value,
    bool? button,
    bool? header,
    bool? selected,
    bool? enabled,
    VoidCallback? onTap,
  }) {
    return Semantics(
      label: label,
      hint: hint,
      value: value,
      button: button,
      header: header,
      selected: selected,
      enabled: enabled,
      onTap: onTap,
      child: this,
    );
  }

  Widget excludeSemantics() {
    return ExcludeSemantics(child: this);
  }
}
