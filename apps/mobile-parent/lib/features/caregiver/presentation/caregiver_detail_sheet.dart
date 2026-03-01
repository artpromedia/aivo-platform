/// Caregiver Detail Bottom Sheet
///
/// Shows caregiver profile info, editable permission toggles,
/// and a "Revoke Access" button with confirmation.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/caregiver_models.dart';
import '../providers/caregiver_provider.dart';

/// Bottom sheet for viewing and editing an active caregiver.
class CaregiverDetailSheet extends ConsumerStatefulWidget {
  const CaregiverDetailSheet({
    required this.caregiver,
    required this.studentId,
    required this.studentName,
    super.key,
  });

  final Caregiver caregiver;
  final String studentId;
  final String studentName;

  @override
  ConsumerState<CaregiverDetailSheet> createState() =>
      _CaregiverDetailSheetState();
}

class _CaregiverDetailSheetState extends ConsumerState<CaregiverDetailSheet> {
  late CaregiverPermissions _permissions;
  bool _isRevoking = false;

  @override
  void initState() {
    super.initState();
    _permissions = widget.caregiver.permissions;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final cg = widget.caregiver;
    final label =
        caregiverRelationshipLabels[cg.relationship] ?? 'Caregiver';

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => ListView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colorScheme.onSurfaceVariant.withAlpha(80),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Avatar + name
          Center(
            child: CircleAvatar(
              radius: 36,
              backgroundImage:
                  cg.photoUrl != null ? NetworkImage(cg.photoUrl!) : null,
              backgroundColor: colorScheme.primaryContainer,
              child: cg.photoUrl == null
                  ? Text(
                      cg.givenName.isNotEmpty
                          ? cg.givenName[0].toUpperCase()
                          : '?',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: colorScheme.onPrimaryContainer,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              '${cg.givenName} ${cg.familyName}',
              style: theme.textTheme.titleLarge,
            ),
          ),
          Center(
            child: Text(
              cg.email,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                label,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colorScheme.onSecondaryContainer,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Permissions section
          Semantics(
            header: true,
            child: Text(
              'Permissions',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          _PermissionToggle(
            label: 'View Progress',
            value: _permissions.viewProgress,
            onChanged: (v) => _updatePermission(
              _permissions.copyWith(viewProgress: v),
            ),
          ),
          _PermissionToggle(
            label: 'View Grades',
            value: _permissions.viewGrades,
            onChanged: (v) => _updatePermission(
              _permissions.copyWith(viewGrades: v),
            ),
          ),
          _PermissionToggle(
            label: 'View Activity',
            value: _permissions.viewActivity,
            onChanged: (v) => _updatePermission(
              _permissions.copyWith(viewActivity: v),
            ),
          ),
          _PermissionToggle(
            label: 'View Achievements',
            value: _permissions.viewAchievements,
            onChanged: (v) => _updatePermission(
              _permissions.copyWith(viewAchievements: v),
            ),
          ),
          _PermissionToggle(
            label: 'Receive Notifications',
            value: _permissions.receiveNotifications,
            onChanged: (v) => _updatePermission(
              _permissions.copyWith(receiveNotifications: v),
            ),
          ),
          _PermissionToggle(
            label: 'View Teacher Notes',
            value: _permissions.viewTeacherNotes,
            onChanged: (v) => _updatePermission(
              _permissions.copyWith(viewTeacherNotes: v),
            ),
          ),
          const SizedBox(height: 32),

          // Revoke access button
          Semantics(
            button: true,
            label:
                'Revoke ${cg.givenName}\'s access to ${widget.studentName}\'s data',
            child: OutlinedButton.icon(
              onPressed: _isRevoking ? null : _revokeAccess,
              style: OutlinedButton.styleFrom(
                foregroundColor: colorScheme.error,
                side: BorderSide(color: colorScheme.error),
              ),
              icon: _isRevoking
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colorScheme.error,
                      ),
                    )
                  : const Icon(Icons.person_remove),
              label: const Text('Revoke Access'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _updatePermission(CaregiverPermissions updated) async {
    setState(() => _permissions = updated);

    final request = UpdateCaregiverPermissionsRequest(
      caregiverId: widget.caregiver.id,
      studentId: widget.studentId,
      permissions: updated,
    );

    final success =
        await ref.read(updatePermissionsNotifierProvider.notifier).update(request);

    if (mounted && !success) {
      // Revert on failure
      setState(() => _permissions = widget.caregiver.permissions);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update permissions')),
      );
    }
  }

  Future<void> _revokeAccess() async {
    final cg = widget.caregiver;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Revoke Access?'),
        content: Text(
          'Are you sure you want to revoke ${cg.givenName} '
          '${cg.familyName}\'s access to ${widget.studentName}\'s data? '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Revoke'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isRevoking = true);

    final success = await ref
        .read(revokeCaregiverNotifierProvider.notifier)
        .revoke(cg.id, widget.studentId);

    if (!mounted) return;
    setState(() => _isRevoking = false);

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Access revoked successfully')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to revoke access')),
      );
    }
  }
}

// =============================================================================
// Permission Toggle
// =============================================================================

class _PermissionToggle extends StatelessWidget {
  const _PermissionToggle({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      label: '$label permission',
      child: SwitchListTile(
        title: Text(label),
        value: value,
        onChanged: onChanged,
        dense: true,
        contentPadding: EdgeInsets.zero,
      ),
    );
  }
}
