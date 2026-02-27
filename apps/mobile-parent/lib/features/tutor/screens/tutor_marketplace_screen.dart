/// Tutor Marketplace Screen
///
/// Browse and purchase tutor persona add-ons.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_provider.dart';
import '../widgets/tutor_addon_card.dart';

/// Screen for browsing available tutor persona add-ons.
///
/// Parents can see all available tutor personas with pricing, feature
/// highlights, and current status. Tapping "Buy" begins the purchase
/// flow which links to billing.
class TutorMarketplaceScreen extends ConsumerWidget {
  const TutorMarketplaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addonsAsync = ref.watch(tutorAddonsProvider);
    final purchaseState = ref.watch(tutorPurchaseNotifierProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor Add-ons'),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'About Tutor Add-ons',
            onPressed: () => _showInfoSheet(context),
          ),
        ],
      ),
      body: addonsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _ErrorState(
          message: error.toString(),
          onRetry: () => ref.invalidate(tutorAddonsProvider),
        ),
        data: (addons) {
          if (addons.isEmpty) {
            return _EmptyState();
          }

          // Separate active from available/expired so active show first.
          final active =
              addons.where((a) => a.status == TutorAddonStatus.active).toList();
          final purchasable = addons
              .where((a) => a.status != TutorAddonStatus.active)
              .toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(tutorAddonsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Active add-ons ─────────────────────────────────
                if (active.isNotEmpty) ...[
                  Text(
                    'Your Tutors',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'These tutor personas are active on your account.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...active.map(
                    (addon) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: TutorAddonCard(addon: addon),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Available / expired add-ons ────────────────────
                if (purchasable.isNotEmpty) ...[
                  Text(
                    active.isNotEmpty
                        ? 'Explore More Tutors'
                        : 'Available Tutors',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Enhance your child\'s learning with specialised AI tutor personas.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...purchasable.map(
                    (addon) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: TutorAddonCard(
                        addon: addon,
                        isPurchasing: purchaseState.isLoading,
                        onPurchase: () =>
                            _handlePurchase(context, ref, addon),
                      ),
                    ),
                  ),
                ],

                // ── Billing link ───────────────────────────────────
                const SizedBox(height: 8),
                Center(
                  child: TextButton.icon(
                    onPressed: () => _openBillingPortal(context),
                    icon: const Icon(Icons.receipt_long, size: 18),
                    label: const Text('Manage Billing'),
                  ),
                ),

                const SizedBox(height: 80),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────

  Future<void> _handlePurchase(
    BuildContext context,
    WidgetRef ref,
    TutorAddon addon,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => _PurchaseConfirmDialog(addon: addon),
    );

    if (confirmed != true) return;
    if (!context.mounted) return;

    final success = await ref
        .read(tutorPurchaseNotifierProvider.notifier)
        .purchase(addon.id);

    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success
              ? '${addon.personaName} is now active!'
              : 'Purchase failed. Please try again.',
        ),
        backgroundColor: success ? Colors.green : Colors.red,
        action: success
            ? null
            : SnackBarAction(
                label: 'Retry',
                textColor: Colors.white,
                onPressed: () => _handlePurchase(context, ref, addon),
              ),
      ),
    );
  }

  Future<void> _openBillingPortal(BuildContext context) async {
    final uri = Uri.parse('https://billing.aivo.app/portal');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open billing portal.')),
      );
    }
  }

  void _showInfoSheet(BuildContext context) {
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        maxChildSize: 0.7,
        minChildSize: 0.3,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'About Tutor Add-ons',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _InfoRow(
                        icon: Icons.school,
                        title: 'Specialised Tutors',
                        description:
                            'Each tutor persona is trained in a specific subject '
                            'area and adapts to your child\'s learning style.',
                      ),
                      const SizedBox(height: 16),
                      _InfoRow(
                        icon: Icons.payment,
                        title: 'Simple Billing',
                        description:
                            'Add-ons are billed monthly. You can cancel any '
                            'time from the billing portal.',
                      ),
                      const SizedBox(height: 16),
                      _InfoRow(
                        icon: Icons.family_restroom,
                        title: 'Shared Across Children',
                        description:
                            'Purchased add-ons are available to all children '
                            'on your account.',
                      ),
                      const SizedBox(height: 16),
                      _InfoRow(
                        icon: Icons.shield,
                        title: 'Safe & Private',
                        description:
                            'All tutor sessions follow your AI Controls '
                            'settings and privacy preferences.',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

/// Purchase confirmation dialog.
class _PurchaseConfirmDialog extends StatelessWidget {
  const _PurchaseConfirmDialog({required this.addon});

  final TutorAddon addon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Confirm Purchase'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Add ${addon.personaName} to your account?',
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.payment,
                  color: theme.colorScheme.onSurfaceVariant,
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
                      Text(
                        addon.priceDisplay,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'You will be charged via your payment method on file. '
            'You can cancel at any time.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Purchase'),
        ),
      ],
    );
  }
}

/// Empty state when no add-ons are available.
class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.school,
                size: 40,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No Add-ons Available',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'New tutor personas are coming soon.\nCheck back later!',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Error state with retry affordance.
class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Failed to load tutor add-ons',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Informational row used in the info bottom sheet.
class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: theme.colorScheme.primary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
