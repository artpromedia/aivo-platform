/// Child-Friendly Error Widgets for Mobile Learner App
///
/// Age-appropriate error handling that:
/// - Uses encouraging language
/// - Never blames the child
/// - Provides simple retry mechanisms
/// - Offers parent contact option for persistent errors
library;

import 'package:flutter/material.dart';

/// Child-friendly loading animation widget.
class LearnerLoadingWidget extends StatelessWidget {
  const LearnerLoadingWidget({
    super.key,
    this.message,
    this.size = 80,
  });

  final String? message;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: const CircularProgressIndicator(
              strokeWidth: 6,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: theme.textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}

/// Child-friendly error widget with encouraging messaging.
///
/// Uses age-appropriate language and never blames the child.
class LearnerErrorWidget extends StatelessWidget {
  const LearnerErrorWidget({
    super.key,
    required this.onRetry,
    this.title,
    this.message,
    this.showParentHelp = false,
    this.onParentHelp,
  });

  final VoidCallback onRetry;
  final String? title;
  final String? message;
  final bool showParentHelp;
  final VoidCallback? onParentHelp;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Friendly emoji/icon
            const Text(
              '🤔',
              style: TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            // Encouraging title
            Text(
              title ?? "Oops! Let's try again",
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            // Helpful message
            Text(
              message ?? "Something didn't work right. That's okay! Let's give it another try.",
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            // Big, friendly retry button
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                textStyle: theme.textTheme.titleMedium,
              ),
            ),
            if (showParentHelp && onParentHelp != null) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: onParentHelp,
                icon: const Icon(Icons.family_restroom),
                label: const Text('Ask a grown-up for help'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Connection error widget for network issues.
class ConnectionErrorWidget extends StatelessWidget {
  const ConnectionErrorWidget({
    super.key,
    required this.onRetry,
  });

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return LearnerErrorWidget(
      onRetry: onRetry,
      title: "Can't Connect Right Now",
      message: "The internet might be taking a break. "
          "Check if you're connected and try again!",
      showParentHelp: true,
    );
  }
}

/// Timeout error widget.
class TimeoutErrorWidget extends StatelessWidget {
  const TimeoutErrorWidget({
    super.key,
    required this.onRetry,
  });

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return LearnerErrorWidget(
      onRetry: onRetry,
      title: 'Taking Too Long',
      message: "Things are moving slowly. Let's try again!",
    );
  }
}

/// Empty state widget when no data is available.
class EmptyStateWidget extends StatelessWidget {
  const EmptyStateWidget({
    super.key,
    this.emoji = '📭',
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String emoji;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              emoji,
              style: const TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              FilledButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// PIN error widget for authentication failures.
class PinErrorWidget extends StatelessWidget {
  const PinErrorWidget({
    super.key,
    required this.onRetry,
    required this.attemptsRemaining,
    this.onParentHelp,
  });

  final VoidCallback onRetry;
  final int attemptsRemaining;
  final VoidCallback? onParentHelp;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLocked = attemptsRemaining <= 0;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              isLocked ? '🔒' : '🔐',
              style: const TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              isLocked ? 'Too Many Tries' : "Hmm, That Wasn't Right",
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              isLocked
                  ? 'Ask a parent or teacher to help you log in.'
                  : attemptsRemaining == 1
                      ? 'You have 1 more try. Take your time!'
                      : 'You have $attemptsRemaining more tries. Try again!',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (!isLocked)
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.dialpad_rounded),
                label: const Text('Try My PIN Again'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              )
            else
              FilledButton.icon(
                onPressed: onParentHelp,
                icon: const Icon(Icons.family_restroom),
                label: const Text('Get Help'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Activity loading widget with encouraging message.
class ActivityLoadingWidget extends StatelessWidget {
  const ActivityLoadingWidget({super.key});

  static const _loadingMessages = [
    'Getting your activities ready... 🎯',
    'Loading something fun... ✨',
    'Almost there... 🚀',
    'Preparing your learning adventure... 🌟',
  ];

  @override
  Widget build(BuildContext context) {
    // Pick a random message (deterministic based on current second)
    final messageIndex = DateTime.now().second % _loadingMessages.length;
    return LearnerLoadingWidget(
      message: _loadingMessages[messageIndex],
    );
  }
}

/// Progress loading widget.
class ProgressLoadingWidget extends StatelessWidget {
  const ProgressLoadingWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const LearnerLoadingWidget(
      message: 'Loading your progress... 📊',
    );
  }
}

/// Goals loading widget.
class GoalsLoadingWidget extends StatelessWidget {
  const GoalsLoadingWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const LearnerLoadingWidget(
      message: 'Loading your goals... 🎯',
    );
  }
}
