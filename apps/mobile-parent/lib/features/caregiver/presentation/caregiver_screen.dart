/// Caregiver Management Screen
///
/// Displays active caregivers, pending invites, and slot indicators.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/caregiver_models.dart';
import '../providers/caregiver_provider.dart';
import 'caregiver_detail_sheet.dart';
import 'invite_bottom_sheet.dart';

/// Main screen for managing caregivers for a specific student.
class CaregiverScreen extends ConsumerStatefulWidget {
  const CaregiverScreen({
    required this.studentId,
    this.studentName = 'your child',
    super.key,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<CaregiverScreen> createState() => _CaregiverScreenState();
}

class _CaregiverScreenState extends ConsumerState<CaregiverScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final summaryAsync =
        ref.watch(studentCaregiversProvider(widget.studentId));

    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          header: true,
          child: const Text('Caregiver Access'),
        ),
      ),
      floatingActionButton: summaryAsync.whenOrNull(
        data: (summary) => summary.remainingSlots > 0
            ? Semantics(
                button: true,
                label: 'Invite a new caregiver',
                child: FloatingActionButton.extended(
                  onPressed: () => _showInviteSheet(summary),
                  icon: const Icon(Icons.person_add),
                  label: const Text('Invite Caregiver'),
                ),
              )
            : null,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(studentCaregiversProvider(widget.studentId));
        },
        child: summaryAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.error_outline, size: 48, color: colorScheme.error),
                  const SizedBox(height: 16),
                  Text(
                    'Could not load caregivers',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    error.toString(),
                    style: theme.textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => ref.invalidate(
                        studentCaregiversProvider(widget.studentId)),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
          data: (summary) => _buildContent(summary, theme, colorScheme),
        ),
      ),
    );
  }

  Widget _buildContent(
    StudentCaregiverSummary summary,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Info banner
          Semantics(
            container: true,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer.withAlpha(80),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Invite up to ${summary.maxCaregivers} additional '
                      'caregivers to view ${widget.studentName}\'s learning '
                      'progress.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Slot indicator
          _SlotsIndicator(
            current: summary.currentCount,
            max: summary.maxCaregivers,
          ),
          const SizedBox(height: 24),

          // Active caregivers section
          if (summary.caregivers.isNotEmpty) ...[
            Semantics(
              header: true,
              child: Text(
                'Active Caregivers',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...summary.caregivers.map(
              (c) => _CaregiverCard(
                caregiver: c,
                onTap: () => _showDetailSheet(c),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Pending invitations section
          if (summary.pendingInvites.isNotEmpty) ...[
            Semantics(
              header: true,
              child: Text(
                'Pending Invites',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...summary.pendingInvites.map(
              (inv) => _InviteCard(
                invite: inv,
                studentId: widget.studentId,
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Empty state
          if (summary.caregivers.isEmpty &&
              summary.pendingInvites.isEmpty) ...[
            const SizedBox(height: 32),
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.people_outline,
                    size: 64,
                    color: colorScheme.onSurfaceVariant.withAlpha(128),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No caregivers yet',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Invite a family member or trusted person to view '
                    '${widget.studentName}\'s progress.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () => _showInviteSheet(summary),
                    icon: const Icon(Icons.person_add),
                    label: const Text('Invite Caregiver'),
                  ),
                ],
              ),
            ),
          ],

          // Bottom padding for FAB
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  void _showInviteSheet(StudentCaregiverSummary summary) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => InviteBottomSheet(
        studentId: widget.studentId,
        studentName: widget.studentName,
        remainingSlots: summary.remainingSlots,
      ),
    );
  }

  void _showDetailSheet(Caregiver caregiver) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => CaregiverDetailSheet(
        caregiver: caregiver,
        studentId: widget.studentId,
        studentName: widget.studentName,
      ),
    );
  }
}

// =============================================================================
// Slots Indicator
// =============================================================================

class _SlotsIndicator extends StatelessWidget {
  const _SlotsIndicator({required this.current, required this.max});

  final int current;
  final int max;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Semantics(
      label: '$current of $max caregiver slots used',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$current of $max used',
            style: theme.textTheme.labelLarge?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: List.generate(max, (index) {
              final isFilled = index < current;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isFilled
                        ? colorScheme.primary
                        : colorScheme.surfaceContainerHighest,
                    border: Border.all(
                      color: isFilled
                          ? colorScheme.primary
                          : colorScheme.outline,
                      width: 2,
                    ),
                  ),
                  child: isFilled
                      ? Icon(Icons.person,
                          size: 18, color: colorScheme.onPrimary)
                      : null,
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Caregiver Card
// =============================================================================

class _CaregiverCard extends StatelessWidget {
  const _CaregiverCard({required this.caregiver, required this.onTap});

  final Caregiver caregiver;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final label = caregiverRelationshipLabels[caregiver.relationship] ??
        'Caregiver';

    return Semantics(
      button: true,
      label:
          '${caregiver.givenName} ${caregiver.familyName}, $label. Tap to edit.',
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundImage: caregiver.photoUrl != null
                      ? NetworkImage(caregiver.photoUrl!)
                      : null,
                  backgroundColor: colorScheme.primaryContainer,
                  child: caregiver.photoUrl == null
                      ? Text(
                          caregiver.givenName.isNotEmpty
                              ? caregiver.givenName[0].toUpperCase()
                              : '?',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: colorScheme.onPrimaryContainer,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${caregiver.givenName} ${caregiver.familyName}',
                        style: theme.textTheme.titleSmall,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        caregiver.email,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: colorScheme.secondaryContainer,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          label,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSecondaryContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: colorScheme.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Invite Card
// =============================================================================

class _InviteCard extends ConsumerWidget {
  const _InviteCard({required this.invite, required this.studentId});

  final CaregiverInvite invite;
  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final label =
        caregiverRelationshipLabels[invite.relationship] ?? 'Caregiver';
    final resendState = ref.watch(resendInviteNotifierProvider);
    final cancelState = ref.watch(cancelInviteNotifierProvider);

    return Semantics(
      container: true,
      label:
          'Pending invite for ${invite.caregiverEmail}, $label',
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: colorScheme.tertiaryContainer,
                    child: Icon(Icons.email_outlined,
                        size: 20, color: colorScheme.onTertiaryContainer),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invite.caregiverName ?? invite.caregiverEmail,
                          style: theme.textTheme.titleSmall,
                        ),
                        if (invite.caregiverName != null)
                          Text(
                            invite.caregiverEmail,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: colorScheme.tertiaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Pending',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onTertiaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Semantics(
                      button: true,
                      label: 'Resend invitation to ${invite.caregiverEmail}',
                      child: OutlinedButton.icon(
                        onPressed: resendState.isLoading
                            ? null
                            : () => _resendInvite(context, ref),
                        icon: resendState.isLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2),
                              )
                            : const Icon(Icons.send, size: 18),
                        label: const Text('Resend'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Semantics(
                      button: true,
                      label: 'Cancel invitation for ${invite.caregiverEmail}',
                      child: TextButton.icon(
                        onPressed: cancelState.isLoading
                            ? null
                            : () => _cancelInvite(context, ref),
                        icon: cancelState.isLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2),
                              )
                            : Icon(Icons.close, size: 18,
                                color: colorScheme.error),
                        label: Text(
                          'Cancel',
                          style: TextStyle(color: colorScheme.error),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _resendInvite(BuildContext context, WidgetRef ref) async {
    final success = await ref
        .read(resendInviteNotifierProvider.notifier)
        .resend(invite.id, studentId);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Invitation resent to ${invite.caregiverEmail}'
              : 'Failed to resend invitation'),
        ),
      );
    }
  }

  Future<void> _cancelInvite(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Invitation?'),
        content: Text(
            'Cancel the pending invitation for ${invite.caregiverEmail}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel Invite'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final success = await ref
        .read(cancelInviteNotifierProvider.notifier)
        .cancel(invite.id, studentId);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(success
                ? 'Invitation cancelled'
                : 'Failed to cancel invitation')),
      );
    }
  }
}
