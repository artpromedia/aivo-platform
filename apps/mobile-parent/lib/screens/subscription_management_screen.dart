import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../subscription/subscription_controller.dart';
import '../subscription/subscription_models.dart';

/// Screen for managing subscription settings.
class SubscriptionManagementScreen extends ConsumerStatefulWidget {
  const SubscriptionManagementScreen({super.key});

  @override
  ConsumerState<SubscriptionManagementScreen> createState() =>
      _SubscriptionManagementScreenState();
}

class _SubscriptionManagementScreenState
    extends ConsumerState<SubscriptionManagementScreen> {
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final subscriptionState = ref.watch(subscriptionControllerProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription & Modules'),
        actions: [
          IconButton(
            tooltip: 'Accessibility Settings',
            icon: const Icon(Icons.accessibility_new),
            onPressed: () => context.push('/accessibility'),
          ),
        ],
      ),
      body: subscriptionState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                await ref
                    .read(subscriptionControllerProvider.notifier)
                    .loadSubscriptionData();
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Current Plan Section
                    _CurrentPlanCard(
                      subscriptionState: subscriptionState,
                      theme: theme,
                      colorScheme: colorScheme,
                    ),
                    const SizedBox(height: 24),

                    // Trial/Subscription Status
                    if (subscriptionState.hasActiveSubscription)
                      _SubscriptionStatusCard(
                        subscriptionState: subscriptionState,
                        theme: theme,
                        colorScheme: colorScheme,
                      ),
                    const SizedBox(height: 24),

                    // Module Toggles Section
                    Text(
                      'Learning Modules',
                      style: theme.textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Manage which modules are active for your children.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Basic modules (always on)
                    _ModuleToggleCard(
                      title: 'ELA (English Language Arts)',
                      description: 'Core reading and language skills',
                      icon: Icons.menu_book,
                      isEnabled: true,
                      isBasic: true,
                      onToggle: null, // Can't toggle basic
                      theme: theme,
                      colorScheme: colorScheme,
                    ),
                    _ModuleToggleCard(
                      title: 'Math',
                      description: 'Core mathematics skills',
                      icon: Icons.calculate,
                      isEnabled: true,
                      isBasic: true,
                      onToggle: null, // Can't toggle basic
                      theme: theme,
                      colorScheme: colorScheme,
                    ),

                    const SizedBox(height: 8),
                    const Divider(),
                    const SizedBox(height: 8),

                    // Premium modules
                    Text(
                      'Premium Modules',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),

                    ...PremiumModule.values.map((module) {
                      final isEnabled =
                          subscriptionState.isModuleEnabled(module.code);
                      final canToggle = subscriptionState.hasActiveSubscription;

                      return _ModuleToggleCard(
                        title: module.displayName,
                        description: module.description,
                        icon: _getModuleIcon(module),
                        isEnabled: isEnabled,
                        isBasic: false,
                        onToggle: canToggle
                            ? () => _handleModuleToggle(module, isEnabled)
                            : null,
                        theme: theme,
                        colorScheme: colorScheme,
                      );
                    }),

                    const SizedBox(height: 24),

                    // Payment Method Section
                    _PaymentMethodCard(
                      subscriptionState: subscriptionState,
                      theme: theme,
                      colorScheme: colorScheme,
                      onUpdatePayment: _updatePaymentMethod,
                    ),
                    const SizedBox(height: 24),

                    // Cancel Section
                    if (subscriptionState.hasActiveSubscription &&
                        !subscriptionState.willCancelAtPeriodEnd)
                      _CancelSubscriptionSection(
                        subscriptionState: subscriptionState,
                        isProcessing: _isProcessing,
                        onCancel: _cancelSubscription,
                        theme: theme,
                        colorScheme: colorScheme,
                      ),

                    // Already canceling message
                    if (subscriptionState.willCancelAtPeriodEnd)
                      _CancellationPendingCard(
                        subscriptionState: subscriptionState,
                        theme: theme,
                        colorScheme: colorScheme,
                      ),

                    // Upgrade prompt for basic-only users
                    if (!subscriptionState.hasActiveSubscription)
                      _UpgradePromptCard(
                        onUpgrade: () => context.push('/module-selection'),
                        theme: theme,
                        colorScheme: colorScheme,
                      ),

                    // Error display
                    if (subscriptionState.error != null)
                      Container(
                        margin: const EdgeInsets.only(top: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.errorContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline,
                                color: colorScheme.onErrorContainer),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                subscriptionState.error!,
                                style: TextStyle(
                                    color: colorScheme.onErrorContainer),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => ref
                                  .read(subscriptionControllerProvider.notifier)
                                  .clearError(),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  IconData _getModuleIcon(PremiumModule module) {
    switch (module) {
      case PremiumModule.sel:
        return Icons.favorite;
      case PremiumModule.speech:
        return Icons.record_voice_over;
      case PremiumModule.science:
        return Icons.science;
      case PremiumModule.coding:
        return Icons.code;
      case PremiumModule.writing:
        return Icons.edit_note;
    }
  }

  Future<void> _handleModuleToggle(PremiumModule module, bool currentlyEnabled) async {
    if (currentlyEnabled) {
      // Turning OFF - show confirmation
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Disable ${module.displayName}?'),
          content: Text(
            'This module will be disabled at the end of your current billing period. '
            'Your children will still have access until then.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep Module'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Disable'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        // TODO: Call backend API to schedule module removal
        // await ref.read(subscriptionControllerProvider.notifier)
        //     .scheduleModuleRemoval(module.code);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '${module.displayName} will be disabled at the end of your billing period.',
              ),
            ),
          );
        }
      }
    } else {
      // Turning ON - for users already on paid plan
      // TODO: Call backend API to add module to subscription
      // This would typically update the subscription with add-ons
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Enable ${module.displayName}?'),
          content: Text(
            'Adding ${module.displayName} may adjust your subscription cost. '
            'The change will take effect immediately.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Enable'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        // TODO: Call backend API to add module
        // await ref.read(subscriptionControllerProvider.notifier)
        //     .addModuleToSubscription(module.code);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${module.displayName} has been enabled!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    }
  }

  Future<void> _updatePaymentMethod() async {
    // Navigate to payment update flow
    // In production, this would open Stripe's payment sheet or a card update screen
    context.push('/update-payment');
  }

  Future<void> _cancelSubscription() async {
    final subscriptionState = ref.read(subscriptionControllerProvider);
    final isInTrial =
        subscriptionState.trialStatus == SubscriptionStatus.inTrial;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: Icon(
          Icons.warning_amber_rounded,
          color: Theme.of(context).colorScheme.error,
          size: 48,
        ),
        title: Text(isInTrial ? 'Cancel Trial?' : 'Cancel Premium?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isInTrial
                  ? 'Your trial will end immediately and you\'ll lose access to premium modules.'
                  : 'Your premium subscription will end at the end of your current billing period.',
            ),
            const SizedBox(height: 12),
            Text(
              'Your children will still have access to Basic (ELA + Math).',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep Premium'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: Text(isInTrial ? 'Cancel Trial' : 'Cancel Premium'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isProcessing = true);

      final success = await ref
          .read(subscriptionControllerProvider.notifier)
          .cancelSubscription(immediately: isInTrial);

      setState(() => _isProcessing = false);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isInTrial
                  ? 'Your trial has been cancelled.'
                  : 'Your premium subscription will end at the end of your billing period.',
            ),
          ),
        );
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

class _CurrentPlanCard extends StatelessWidget {
  const _CurrentPlanCard({
    required this.subscriptionState,
    required this.theme,
    required this.colorScheme,
  });

  final SubscriptionState subscriptionState;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    final isPremium = subscriptionState.isPremium;
    final planName = isPremium ? 'Premium Plan' : 'Basic Plan';
    final planDescription = isPremium
        ? 'Full access to all learning modules'
        : 'ELA + Math core modules';

    return Card(
      elevation: 0,
      color: isPremium
          ? colorScheme.primaryContainer.withOpacity(0.3)
          : colorScheme.surfaceContainerHighest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isPremium ? colorScheme.primary : colorScheme.outline,
          width: isPremium ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isPremium
                    ? colorScheme.primary
                    : colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isPremium ? Icons.workspace_premium : Icons.school,
                color: isPremium
                    ? colorScheme.onPrimary
                    : colorScheme.onSurfaceVariant,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    planName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    planDescription,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (isPremium)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'ACTIVE',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionStatusCard extends StatelessWidget {
  const _SubscriptionStatusCard({
    required this.subscriptionState,
    required this.theme,
    required this.colorScheme,
  });

  final SubscriptionState subscriptionState;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    final isInTrial =
        subscriptionState.trialStatus == SubscriptionStatus.inTrial;
    final daysLeft = subscriptionState.daysLeftInTrial;
    final trialEndDate = subscriptionState.trialEndDate;
    final subscription = subscriptionState.subscription;

    return Card(
      elevation: 0,
      color: colorScheme.secondaryContainer.withOpacity(0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isInTrial ? Icons.hourglass_empty : Icons.event_repeat,
                  color: colorScheme.secondary,
                ),
                const SizedBox(width: 8),
                Text(
                  isInTrial ? 'Trial Period' : 'Billing Cycle',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (isInTrial && daysLeft != null) ...[
              Text(
                '$daysLeft days remaining',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: colorScheme.secondary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (trialEndDate != null)
                Text(
                  'Trial ends ${_formatDate(trialEndDate)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
            ] else if (subscription != null) ...[
              Text(
                'Next billing: ${_formatDate(subscription.currentPeriodEnd)}',
                style: theme.textTheme.bodyMedium,
              ),
              Text(
                subscriptionState.premiumPlan?.priceDisplay ?? '\$14.99/month',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

class _ModuleToggleCard extends StatelessWidget {
  const _ModuleToggleCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.isEnabled,
    required this.isBasic,
    required this.onToggle,
    required this.theme,
    required this.colorScheme,
  });

  final String title;
  final String description;
  final IconData icon;
  final bool isEnabled;
  final bool isBasic;
  final VoidCallback? onToggle;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isEnabled
              ? colorScheme.primary.withOpacity(0.5)
              : colorScheme.outline.withOpacity(0.3),
        ),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isEnabled
                ? colorScheme.primaryContainer
                : colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: isEnabled ? colorScheme.primary : colorScheme.onSurfaceVariant,
          ),
        ),
        title: Text(title),
        subtitle: Text(
          description,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: isBasic
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'INCLUDED',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              )
            : Switch(
                value: isEnabled,
                onChanged: onToggle != null ? (_) => onToggle!() : null,
              ),
      ),
    );
  }
}

class _PaymentMethodCard extends StatelessWidget {
  const _PaymentMethodCard({
    required this.subscriptionState,
    required this.theme,
    required this.colorScheme,
    required this.onUpdatePayment,
  });

  final SubscriptionState subscriptionState;
  final ThemeData theme;
  final ColorScheme colorScheme;
  final VoidCallback onUpdatePayment;

  @override
  Widget build(BuildContext context) {
    final paymentMethod = subscriptionState.defaultPaymentMethod;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.credit_card, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Text(
                  'Payment Method',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (paymentMethod != null) ...[
              Row(
                children: [
                  Icon(
                    _getCardBrandIcon(paymentMethod.brand),
                    size: 32,
                    color: colorScheme.onSurface,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(paymentMethod.displayText),
                        if (paymentMethod.expiryText != null)
                          Text(
                            'Expires ${paymentMethod.expiryText}',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: onUpdatePayment,
                    child: const Text('Update'),
                  ),
                ],
              ),
            ] else ...[
              Text(
                'No payment method on file',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: onUpdatePayment,
                icon: const Icon(Icons.add),
                label: const Text('Add Payment Method'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getCardBrandIcon(String? brand) {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return Icons.credit_card;
      case 'mastercard':
        return Icons.credit_card;
      case 'amex':
        return Icons.credit_card;
      default:
        return Icons.credit_card;
    }
  }
}

class _CancelSubscriptionSection extends StatelessWidget {
  const _CancelSubscriptionSection({
    required this.subscriptionState,
    required this.isProcessing,
    required this.onCancel,
    required this.theme,
    required this.colorScheme,
  });

  final SubscriptionState subscriptionState;
  final bool isProcessing;
  final VoidCallback onCancel;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    final isInTrial =
        subscriptionState.trialStatus == SubscriptionStatus.inTrial;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(),
        const SizedBox(height: 16),
        Text(
          'Cancel Subscription',
          style: theme.textTheme.titleSmall?.copyWith(
            color: colorScheme.error,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isInTrial
              ? 'Cancel your trial and switch to the free Basic plan.'
              : 'Cancel premium at the end of your current billing period.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: isProcessing ? null : onCancel,
          style: OutlinedButton.styleFrom(
            foregroundColor: colorScheme.error,
            side: BorderSide(color: colorScheme.error),
          ),
          child: isProcessing
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(isInTrial
                  ? 'Cancel Trial'
                  : 'Cancel Premium at End of Period'),
        ),
      ],
    );
  }
}

class _CancellationPendingCard extends StatelessWidget {
  const _CancellationPendingCard({
    required this.subscriptionState,
    required this.theme,
    required this.colorScheme,
  });

  final SubscriptionState subscriptionState;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    final endDate = subscriptionState.subscription?.currentPeriodEnd;
    final formattedDate = endDate != null
        ? '${endDate.month}/${endDate.day}/${endDate.year}'
        : 'the end of your billing period';

    return Card(
      elevation: 0,
      color: colorScheme.errorContainer.withOpacity(0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.error.withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: colorScheme.error),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cancellation Pending',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.error,
                    ),
                  ),
                  Text(
                    'Your premium access will end on $formattedDate.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpgradePromptCard extends StatelessWidget {
  const _UpgradePromptCard({
    required this.onUpgrade,
    required this.theme,
    required this.colorScheme,
  });

  final VoidCallback onUpgrade;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: colorScheme.primaryContainer.withOpacity(0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.primary.withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.workspace_premium, color: colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Upgrade to Premium',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Unlock SEL, Speech, Science, Coding, and more with a 30-day free trial.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onUpgrade,
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Start Free Trial'),
            ),
          ],
        ),
      ),
    );
  }
}
