/// Tutor Add-on Card Widget
///
/// Card displaying a tutor persona add-on with purchase affordance.
library;

import 'package:flutter/material.dart';

import '../models/tutor_models.dart';

/// A card widget for displaying a tutor add-on in the marketplace.
///
/// Shows the persona name, subject, price, and description. The trailing
/// action reflects the current [TutorAddonStatus]:
///
/// * **available** -- a "Buy" button that calls [onPurchase].
/// * **active** -- a green "Enabled" chip.
/// * **expired** -- a muted "Renew" button that calls [onPurchase].
class TutorAddonCard extends StatelessWidget {
  const TutorAddonCard({
    super.key,
    required this.addon,
    this.onPurchase,
    this.onTap,
    this.isPurchasing = false,
  });

  /// The tutor add-on data to display.
  final TutorAddon addon;

  /// Called when the user taps the purchase/renew button.
  final VoidCallback? onPurchase;

  /// Called when the user taps the card body (for detail navigation).
  final VoidCallback? onTap;

  /// Whether a purchase is currently in flight for this add-on.
  final bool isPurchasing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header: avatar / name / subject / status ──────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _PersonaAvatar(
                    avatarUrl: addon.avatarUrl,
                    subject: addon.subject,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          addon.personaName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(
                              _subjectIcon(addon.subject),
                              size: 14,
                              color: colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                _subjectLabel(addon.subject),
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: addon.status),
                ],
              ),

              const SizedBox(height: 12),

              // ── Description ──────────────────────────────────────
              Text(
                addon.description,
                style: theme.textTheme.bodyMedium,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),

              // ── Highlights ───────────────────────────────────────
              if (addon.highlights != null && addon.highlights!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: addon.highlights!
                      .take(4)
                      .map((highlight) => _HighlightChip(label: highlight))
                      .toList(),
                ),
              ],

              const SizedBox(height: 16),

              // ── Footer: price + action ───────────────────────────
              Row(
                children: [
                  // Price
                  Text(
                    addon.priceDisplay,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
                  ),
                  if (addon.trialDaysRemaining != null) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${addon.trialDaysRemaining}d trial left',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.green,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  _ActionButton(
                    status: addon.status,
                    isPurchasing: isPurchasing,
                    onPressed: onPurchase,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────

  static IconData _subjectIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return Icons.calculate;
      case 'reading':
        return Icons.menu_book;
      case 'science':
        return Icons.science;
      case 'writing':
        return Icons.edit_note;
      case 'socialstudies':
      case 'social studies':
        return Icons.public;
      case 'sel':
        return Icons.favorite;
      case 'coding':
        return Icons.code;
      case 'language':
        return Icons.translate;
      default:
        return Icons.school;
    }
  }

  static String _subjectLabel(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return 'Mathematics';
      case 'reading':
        return 'Reading & Literacy';
      case 'science':
        return 'Science';
      case 'writing':
        return 'Writing';
      case 'socialstudies':
      case 'social studies':
        return 'Social Studies';
      case 'sel':
        return 'Social-Emotional Learning';
      case 'coding':
        return 'Coding';
      case 'language':
        return 'Language Arts';
      default:
        return subject;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

/// Circular avatar for the tutor persona.
class _PersonaAvatar extends StatelessWidget {
  const _PersonaAvatar({
    required this.avatarUrl,
    required this.subject,
  });

  final String? avatarUrl;
  final String subject;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: avatarUrl != null && avatarUrl!.isNotEmpty
          ? ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                avatarUrl!,
                width: 48,
                height: 48,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Icon(
                  TutorAddonCard._subjectIcon(subject),
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
            )
          : Icon(
              TutorAddonCard._subjectIcon(subject),
              color: colorScheme.onPrimaryContainer,
            ),
    );
  }
}

/// Small badge indicating the add-on's current status.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final TutorAddonStatus status;

  @override
  Widget build(BuildContext context) {
    final (Color color, String label) = switch (status) {
      TutorAddonStatus.active => (Colors.green, 'Active'),
      TutorAddonStatus.expired => (Colors.grey, 'Expired'),
      TutorAddonStatus.available => (
          Theme.of(context).colorScheme.primary,
          'New',
        ),
    };

    // Active and expired show a chip; available shows nothing extra
    // (the buy button is the affordance).
    if (status == TutorAddonStatus.available) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            status == TutorAddonStatus.active
                ? Icons.check_circle
                : Icons.timer_off,
            size: 12,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Highlight chip for persona features.
class _HighlightChip extends StatelessWidget {
  const _HighlightChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// Action button whose appearance depends on the add-on status.
class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.status,
    required this.isPurchasing,
    this.onPressed,
  });

  final TutorAddonStatus status;
  final bool isPurchasing;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    if (isPurchasing) {
      return const SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }

    switch (status) {
      case TutorAddonStatus.available:
        return FilledButton(
          onPressed: onPressed,
          child: const Text('Buy'),
        );
      case TutorAddonStatus.active:
        return FilledButton.tonal(
          onPressed: null,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(Icons.check, size: 16),
              SizedBox(width: 4),
              Text('Enabled'),
            ],
          ),
        );
      case TutorAddonStatus.expired:
        return OutlinedButton(
          onPressed: onPressed,
          child: const Text('Renew'),
        );
    }
  }
}
