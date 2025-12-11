import 'package:flutter/material.dart';

import '../theme/aivo_theme.dart';
import '../shared_device/shared_device.dart';

/// Button bar for ending a shared device session.
///
/// Shows the current learner and provides an "End Session" button
/// that returns to the roster selection screen.
class SharedSessionBar extends StatelessWidget {
  final SharedDeviceSession session;
  final VoidCallback onEndSession;
  final bool showLearnerName;

  const SharedSessionBar({
    super.key,
    required this.session,
    required this.onEndSession,
    this.showLearnerName = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: colors.surfaceVariant,
        border: Border(
          top: BorderSide(color: colors.outline, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Learner info
            if (showLearnerName) ...[
              Icon(
                Icons.person_outline,
                size: 20,
                color: colors.textSecondary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      session.learnerDisplayName,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      session.classroomName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ] else
              const Spacer(),

            // End session button
            FilledButton.tonalIcon(
              onPressed: onEndSession,
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('End Session'),
              style: FilledButton.styleFrom(
                backgroundColor: colors.errorContainer,
                foregroundColor: colors.onErrorContainer,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Dialog to confirm ending a shared device session.
class EndSessionConfirmDialog extends StatelessWidget {
  final SharedDeviceSession session;

  const EndSessionConfirmDialog({
    super.key,
    required this.session,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;

    return AlertDialog(
      title: const Text('End Session?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Are you finished, ${session.learnerDisplayName.split(' ').first}?',
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.surfaceVariant,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.save_outlined, color: colors.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Your work has been saved!',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Keep Learning'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('End Session'),
        ),
      ],
    );
  }
}

/// Show confirmation dialog for ending a session.
///
/// Returns true if user confirms, false otherwise.
Future<bool> showEndSessionConfirmDialog({
  required BuildContext context,
  required SharedDeviceSession session,
}) async {
  return await showDialog<bool>(
        context: context,
        builder: (context) => EndSessionConfirmDialog(session: session),
      ) ??
      false;
}
