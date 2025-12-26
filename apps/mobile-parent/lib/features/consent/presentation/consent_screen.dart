import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../providers/consent_provider.dart';

class ConsentManagementScreen extends ConsumerWidget {
  const ConsentManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final consents = ref.watch(consentRecordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.consentTitle),
      ),
      body: consents.when(
        data: (records) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // COPPA / FERPA notice
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.security,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.privacyNotice,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l10n.coppaFerpaCompliance,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onPrimaryContainer,
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

            // Data Collection section
            _buildSection(
              context: context,
              title: l10n.dataCollection,
              subtitle: l10n.dataCollectionDesc,
              children: [
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'learning_analytics',
                    orElse: () => ConsentRecord(
                      id: 'learning_analytics',
                      type: 'learning_analytics',
                      title: l10n.learningAnalytics,
                      description: l10n.learningAnalyticsDesc,
                      granted: false,
                      required: true,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'learning_analytics', value),
                ),
                const Divider(height: 1),
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'progress_sharing',
                    orElse: () => ConsentRecord(
                      id: 'progress_sharing',
                      type: 'progress_sharing',
                      title: l10n.progressSharing,
                      description: l10n.progressSharingDesc,
                      granted: false,
                      required: false,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'progress_sharing', value),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Communications section
            _buildSection(
              context: context,
              title: l10n.communications,
              subtitle: l10n.communicationsDesc,
              children: [
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'email_notifications',
                    orElse: () => ConsentRecord(
                      id: 'email_notifications',
                      type: 'email_notifications',
                      title: l10n.emailNotifications,
                      description: l10n.emailNotificationsDesc,
                      granted: true,
                      required: false,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'email_notifications', value),
                ),
                const Divider(height: 1),
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'push_notifications',
                    orElse: () => ConsentRecord(
                      id: 'push_notifications',
                      type: 'push_notifications',
                      title: l10n.pushNotifications,
                      description: l10n.pushNotificationsDesc,
                      granted: true,
                      required: false,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'push_notifications', value),
                ),
                const Divider(height: 1),
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'weekly_digest',
                    orElse: () => ConsentRecord(
                      id: 'weekly_digest',
                      type: 'weekly_digest',
                      title: l10n.weeklyDigest,
                      description: l10n.weeklyDigestDesc,
                      granted: true,
                      required: false,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'weekly_digest', value),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // AI Features section
            _buildSection(
              context: context,
              title: l10n.aiFeatures,
              subtitle: l10n.aiFeaturesDesc,
              children: [
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'ai_personalization',
                    orElse: () => ConsentRecord(
                      id: 'ai_personalization',
                      type: 'ai_personalization',
                      title: l10n.aiPersonalization,
                      description: l10n.aiPersonalizationDesc,
                      granted: false,
                      required: false,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'ai_personalization', value),
                ),
                const Divider(height: 1),
                _ConsentToggle(
                  consent: records.firstWhere(
                    (c) => c.type == 'voice_input',
                    orElse: () => ConsentRecord(
                      id: 'voice_input',
                      type: 'voice_input',
                      title: l10n.voiceInput,
                      description: l10n.voiceInputDesc,
                      granted: false,
                      required: false,
                    ),
                  ),
                  onChanged: (value) => _updateConsent(ref, 'voice_input', value),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Data request buttons
            OutlinedButton.icon(
              onPressed: () => _showDataExportDialog(context),
              icon: const Icon(Icons.download),
              label: Text(l10n.requestDataExport),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => _showDataDeletionDialog(context, ref, l10n),
              style: OutlinedButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
              ),
              icon: const Icon(Icons.delete_outline),
              label: Text(l10n.requestDataDeletion),
            ),

            const SizedBox(height: 32),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildSection({
    required BuildContext context,
    required String title,
    required String subtitle,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 12),
        Card(
          margin: EdgeInsets.zero,
          child: Column(children: children),
        ),
      ],
    );
  }

  Future<void> _updateConsent(WidgetRef ref, String type, bool value) async {
    await ref.read(updateConsentProvider(type: type, granted: value).future);
    ref.invalidate(consentRecordsProvider);
  }

  void _showDataExportDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request Data Export'),
        content: const Text(
          'We will prepare an export of your data and send it to your registered email address within 30 days.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Data export request submitted')),
              );
            },
            child: const Text('Request Export'),
          ),
        ],
      ),
    );
  }

  void _showDataDeletionDialog(BuildContext context, WidgetRef ref, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.requestDataDeletion),
        content: Text(l10n.dataDeletionWarning),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(l10n.dataDeletionRequested)),
              );
            },
            child: Text(l10n.requestDeletion),
          ),
        ],
      ),
    );
  }
}

class _ConsentToggle extends StatelessWidget {
  final ConsentRecord consent;
  final void Function(bool) onChanged;

  const _ConsentToggle({
    required this.consent,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      consent.title,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (consent.required) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.tertiaryContainer,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Required',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onTertiaryContainer,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  consent.description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Switch(
            value: consent.granted,
            onChanged: consent.required ? null : onChanged,
          ),
        ],
      ),
    );
  }
}
