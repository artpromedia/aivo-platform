import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../subscription/subscription_controller.dart';

/// A banner widget that displays when the subscription payment has failed.
/// Shows at the top of the dashboard to alert the parent about payment issues.
class PastDuePaymentBanner extends ConsumerWidget {
  const PastDuePaymentBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptionState = ref.watch(subscriptionControllerProvider);
    
    // Only show if subscription is past due
    if (!subscriptionState.isPastDue) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.error.withOpacity(0.5),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: colorScheme.onErrorContainer,
                size: 24,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Payment Issue',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: colorScheme.onErrorContainer,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                icon: Icon(
                  Icons.close,
                  color: colorScheme.onErrorContainer,
                  size: 20,
                ),
                onPressed: () {
                  // Dismiss temporarily (would need state management for persistence)
                  // For now, just clear the error
                  ref.read(subscriptionControllerProvider.notifier).clearError();
                },
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'We couldn\'t process your payment for premium modules. '
            'We\'ll keep Basic running while we sort it out.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onErrorContainer,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/subscription'),
                  icon: const Icon(Icons.credit_card, size: 18),
                  label: const Text('Update Payment'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: colorScheme.onErrorContainer,
                    side: BorderSide(color: colorScheme.onErrorContainer),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A smaller, dismissible version of the banner for less intrusive display.
class PastDuePaymentChip extends ConsumerWidget {
  const PastDuePaymentChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptionState = ref.watch(subscriptionControllerProvider);
    
    if (!subscriptionState.isPastDue) {
      return const SizedBox.shrink();
    }

    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: () => context.push('/subscription'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: colorScheme.onErrorContainer,
              size: 16,
            ),
            const SizedBox(width: 4),
            Text(
              'Payment issue',
              style: TextStyle(
                color: colorScheme.onErrorContainer,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Trial ending soon banner - shows when trial is about to expire.
class TrialEndingBanner extends ConsumerWidget {
  const TrialEndingBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptionState = ref.watch(subscriptionControllerProvider);
    final daysLeft = subscriptionState.daysLeftInTrial;
    
    // Only show if in trial with 7 or fewer days remaining
    if (daysLeft == null || daysLeft > 7) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isUrgent = daysLeft <= 3;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isUrgent 
            ? colorScheme.errorContainer.withOpacity(0.5)
            : colorScheme.tertiaryContainer.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUrgent
              ? colorScheme.error.withOpacity(0.5)
              : colorScheme.tertiary.withOpacity(0.5),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.hourglass_empty,
            color: isUrgent
                ? colorScheme.onErrorContainer
                : colorScheme.onTertiaryContainer,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  daysLeft == 0
                      ? 'Trial ends today!'
                      : daysLeft == 1
                          ? 'Trial ends tomorrow'
                          : '$daysLeft days left in trial',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isUrgent
                        ? colorScheme.onErrorContainer
                        : colorScheme.onTertiaryContainer,
                  ),
                ),
                Text(
                  'Your card will be charged after the trial ends.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: isUrgent
                        ? colorScheme.onErrorContainer.withOpacity(0.8)
                        : colorScheme.onTertiaryContainer.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => context.push('/subscription'),
            child: const Text('Manage'),
          ),
        ],
      ),
    );
  }
}
