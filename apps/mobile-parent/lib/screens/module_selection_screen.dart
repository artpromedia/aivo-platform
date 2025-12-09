import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../subscription/subscription_controller.dart';
import '../subscription/subscription_models.dart';

/// Screen for selecting learning modules after baseline assessment.
class ModuleSelectionScreen extends ConsumerStatefulWidget {
  const ModuleSelectionScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<ModuleSelectionScreen> createState() => _ModuleSelectionScreenState();
}

class _ModuleSelectionScreenState extends ConsumerState<ModuleSelectionScreen> {
  bool _selectAllPremium = false;

  @override
  Widget build(BuildContext context) {
    final subscriptionState = ref.watch(subscriptionControllerProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose Learning Modules'),
      ),
      body: subscriptionState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Text(
                    'Personalize ${widget.learnerName}\'s Learning',
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Select the modules you\'d like to include in their learning journey.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Basic Plan Card (always included)
                  _BasicPlanCard(theme: theme, colorScheme: colorScheme),
                  const SizedBox(height: 24),

                  // Premium Modules Section
                  Row(
                    children: [
                      Text(
                        'Premium Modules',
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '30-day free trial',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Trial info note
                  if (!subscriptionState.hasPaymentMethod)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.secondaryContainer.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: colorScheme.outline.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 20,
                            color: colorScheme.onSecondaryContainer,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Premium modules include a 30-day trial. We\'ll only charge if you keep them after the trial.',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSecondaryContainer,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),

                  // Select all toggle
                  CheckboxListTile(
                    title: const Text('Select all premium modules'),
                    value: _selectAllPremium,
                    onChanged: (value) {
                      setState(() => _selectAllPremium = value ?? false);
                      ref.read(subscriptionControllerProvider.notifier)
                          .setAllPremiumModules(value ?? false);
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 8),

                  // Premium module cards
                  ...PremiumModule.values.map((module) => _ModuleCard(
                        module: module,
                        isSelected: subscriptionState.selectedPremiumModules.contains(module),
                        onToggle: () {
                          ref.read(subscriptionControllerProvider.notifier)
                              .togglePremiumModule(module);
                          // Update select all state
                          setState(() {
                            _selectAllPremium = ref
                                .read(subscriptionControllerProvider)
                                .selectedPremiumModules
                                .length == PremiumModule.values.length;
                          });
                        },
                      )),

                  const SizedBox(height: 32),

                  // Price summary
                  if (subscriptionState.selectedPremiumModules.isNotEmpty) ...[
                    _PriceSummaryCard(
                      plan: subscriptionState.premiumPlan,
                      theme: theme,
                      colorScheme: colorScheme,
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Error message
                  if (subscriptionState.error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: colorScheme.onErrorContainer),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              subscriptionState.error!,
                              style: TextStyle(color: colorScheme.onErrorContainer),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // CTA Button
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: subscriptionState.isLoading
                          ? null
                          : () => _onContinue(context, subscriptionState),
                      child: Text(
                        subscriptionState.selectedPremiumModules.isEmpty
                            ? 'Continue with Basic'
                            : 'Continue to Payment',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Skip option
                  if (subscriptionState.selectedPremiumModules.isNotEmpty)
                    Center(
                      child: TextButton(
                        onPressed: () {
                          ref.read(subscriptionControllerProvider.notifier)
                              .clearModuleSelection();
                          _navigateToDashboard(context);
                        },
                        child: const Text('Skip premium, use Basic only'),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  void _onContinue(BuildContext context, SubscriptionState state) {
    if (state.selectedPremiumModules.isEmpty) {
      // No premium modules selected, go to dashboard
      _navigateToDashboard(context);
    } else {
      // Premium modules selected, go to payment
      context.push(
        '/payment-setup',
        extra: {
          'learnerId': widget.learnerId,
          'learnerName': widget.learnerName,
        },
      );
    }
  }

  void _navigateToDashboard(BuildContext context) {
    context.go('/dashboard');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

class _BasicPlanCard extends StatelessWidget {
  const _BasicPlanCard({
    required this.theme,
    required this.colorScheme,
  });

  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: colorScheme.primaryContainer.withOpacity(0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.primary, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.check_circle, color: colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Basic Plan',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
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
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Core learning modules always included:',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _ModuleChip(label: 'ELA', icon: Icons.menu_book),
                const SizedBox(width: 8),
                _ModuleChip(label: 'Math', icon: Icons.calculate),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ModuleChip extends StatelessWidget {
  const _ModuleChip({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: colorScheme.primary),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  const _ModuleCard({
    required this.module,
    required this.isSelected,
    required this.onToggle,
  });

  final PremiumModule module;
  final bool isSelected;
  final VoidCallback onToggle;

  IconData get _icon {
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      elevation: isSelected ? 2 : 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? colorScheme.primary : colorScheme.outline.withOpacity(0.3),
          width: isSelected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? colorScheme.primaryContainer
                      : colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _icon,
                  color: isSelected ? colorScheme.primary : colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      module.displayName,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      module.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Checkbox(
                value: isSelected,
                onChanged: (_) => onToggle(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PriceSummaryCard extends StatelessWidget {
  const _PriceSummaryCard({
    required this.plan,
    required this.theme,
    required this.colorScheme,
  });

  final Plan? plan;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: colorScheme.tertiaryContainer.withOpacity(0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Summary',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Basic (ELA + Math)'),
                Text(
                  'Included',
                  style: TextStyle(color: colorScheme.primary),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Premium modules'),
                Text(
                  plan?.priceDisplay ?? '\$14.99/month',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Today\'s charge',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '\$0.00',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'First charge after 30-day trial',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
