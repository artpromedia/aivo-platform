/// Consent Management Screen
///
/// Screen for parents to view and manage consents for their children.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../consent/consent_service.dart';

class ConsentScreen extends ConsumerStatefulWidget {
  const ConsentScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends ConsumerState<ConsentScreen> {
  final _processingConsents = <ConsentType>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(consentNotifierProvider.notifier).loadConsents(widget.learnerId);
    });
  }

  Future<void> _toggleConsent(ConsentType type, bool grant) async {
    if (_processingConsents.contains(type)) return;

    setState(() => _processingConsents.add(type));

    try {
      final notifier = ref.read(consentNotifierProvider.notifier);
      final success = grant
          ? await notifier.grantConsent(widget.learnerId, type)
          : await notifier.revokeConsent(widget.learnerId, type);

      if (!success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to ${grant ? 'grant' : 'revoke'} consent'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _processingConsents.remove(type));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final consentState = ref.watch(consentNotifierProvider);
    // ignore: unused_local_variable
    final consentsForLearner = consentState.getConsentsForLearner(widget.learnerId);

    return Scaffold(
      appBar: AppBar(
        title: Text('Consent for ${widget.learnerName}'),
      ),
      body: consentState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref
                  .read(consentNotifierProvider.notifier)
                  .loadConsents(widget.learnerId),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Header
                  Card(
                    color: colorScheme.primaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(
                            Icons.privacy_tip_outlined,
                            color: colorScheme.onPrimaryContainer,
                            size: 32,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Privacy & Consent',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: colorScheme.onPrimaryContainer,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Manage how your child\'s data is used. You can change these settings at any time.',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: colorScheme.onPrimaryContainer,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Consent items
                  Text(
                    'Required Consents',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _ConsentTile(
                    type: ConsentType.baselineAssessment,
                    isActive: consentState.hasActiveConsent(
                      widget.learnerId,
                      ConsentType.baselineAssessment,
                    ),
                    isProcessing: _processingConsents.contains(
                      ConsentType.baselineAssessment,
                    ),
                    onToggle: (grant) => _toggleConsent(
                      ConsentType.baselineAssessment,
                      grant,
                    ),
                    isRequired: true,
                  ),

                  const SizedBox(height: 24),
                  Text(
                    'Optional Consents',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _ConsentTile(
                    type: ConsentType.aiTutor,
                    isActive: consentState.hasActiveConsent(
                      widget.learnerId,
                      ConsentType.aiTutor,
                    ),
                    isProcessing: _processingConsents.contains(
                      ConsentType.aiTutor,
                    ),
                    onToggle: (grant) => _toggleConsent(
                      ConsentType.aiTutor,
                      grant,
                    ),
                    isRequired: false,
                  ),

                  _ConsentTile(
                    type: ConsentType.researchAnalytics,
                    isActive: consentState.hasActiveConsent(
                      widget.learnerId,
                      ConsentType.researchAnalytics,
                    ),
                    isProcessing: _processingConsents.contains(
                      ConsentType.researchAnalytics,
                    ),
                    onToggle: (grant) => _toggleConsent(
                      ConsentType.researchAnalytics,
                      grant,
                    ),
                    isRequired: false,
                  ),

                  const SizedBox(height: 24),

                  // Info about data usage
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                color: colorScheme.primary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'About Your Data',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '• Your child\'s learning data is securely stored and encrypted.\n'
                            '• Data is only used to personalize their learning experience.\n'
                            '• You can request data deletion at any time.\n'
                            '• We never sell personal information.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: () {
                              // Navigate to privacy policy
                            },
                            child: const Text('Read Full Privacy Policy'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _ConsentTile extends StatelessWidget {
  const _ConsentTile({
    required this.type,
    required this.isActive,
    required this.isProcessing,
    required this.onToggle,
    required this.isRequired,
  });

  final ConsentType type;
  final bool isActive;
  final bool isProcessing;
  final void Function(bool grant) onToggle;
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            type.displayName,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (isRequired) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: colorScheme.errorContainer,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Required',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: colorScheme.onErrorContainer,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        type.description,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isProcessing)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else
                  Switch(
                    value: isActive,
                    onChanged: (value) => onToggle(value),
                  ),
              ],
            ),
            if (isActive) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    size: 16,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Consent granted',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
