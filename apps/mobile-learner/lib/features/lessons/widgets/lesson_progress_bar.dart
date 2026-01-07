import 'package:flutter/material.dart';

/// Progress bar showing lesson completion status.
class LessonProgressBar extends StatelessWidget {
  const LessonProgressBar({
    super.key,
    required this.currentBlock,
    required this.totalBlocks,
  });

  final int currentBlock;
  final int totalBlocks;

  @override
  Widget build(BuildContext context) {
    final progress = totalBlocks > 0 ? (currentBlock + 1) / totalBlocks : 0.0;
    final theme = Theme.of(context);

    return Semantics(
      label: 'Progress: ${currentBlock + 1} of $totalBlocks blocks',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(
                theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${currentBlock + 1} / $totalBlocks',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
