/// Invite Caregiver Bottom Sheet
///
/// Form for sending a caregiver invitation with email, name,
/// relationship, permissions, and optional personal message.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/caregiver_models.dart';
import '../providers/caregiver_provider.dart';

/// Bottom sheet containing the caregiver invite form.
class InviteBottomSheet extends ConsumerStatefulWidget {
  const InviteBottomSheet({
    required this.studentId,
    required this.studentName,
    required this.remainingSlots,
    super.key,
  });

  final String studentId;
  final String studentName;
  final int remainingSlots;

  @override
  ConsumerState<InviteBottomSheet> createState() => _InviteBottomSheetState();
}

class _InviteBottomSheetState extends ConsumerState<InviteBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _nameController = TextEditingController();
  final _messageController = TextEditingController();

  CaregiverRelationship _relationship = CaregiverRelationship.caregiver;
  CaregiverPermissions _permissions = const CaregiverPermissions();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Form(
          key: _formKey,
          child: ListView(
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
              const SizedBox(height: 16),

              // Title
              Semantics(
                header: true,
                child: Text(
                  'Invite Caregiver',
                  style: theme.textTheme.headlineSmall,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${widget.remainingSlots} slot${widget.remainingSlots == 1 ? '' : 's'} remaining',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),

              // Email field
              Semantics(
                label: 'Caregiver email address',
                child: TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email address *',
                    hintText: 'caregiver@example.com',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Email is required';
                    }
                    final emailRegex = RegExp(
                        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
                    if (!emailRegex.hasMatch(value.trim())) {
                      return 'Enter a valid email address';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(height: 16),

              // Name field (optional)
              Semantics(
                label: 'Caregiver name, optional',
                child: TextFormField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Name (optional)',
                    hintText: 'e.g. Grandma Jane',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Relationship dropdown
              Semantics(
                label: 'Relationship to child',
                child: DropdownButtonFormField<CaregiverRelationship>(
                  initialValue: _relationship,
                  decoration: const InputDecoration(
                    labelText: 'Relationship',
                    prefixIcon: Icon(Icons.family_restroom),
                  ),
                  items: CaregiverRelationship.values
                      .map((r) => DropdownMenuItem(
                            value: r,
                            child: Text(
                                caregiverRelationshipLabels[r] ?? r.name),
                          ))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _relationship = value);
                    }
                  },
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
              const SizedBox(height: 4),
              Text(
                'Choose what this caregiver can see',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              _PermissionSwitch(
                label: 'View Progress',
                value: _permissions.viewProgress,
                onChanged: (v) => setState(() =>
                    _permissions = _permissions.copyWith(viewProgress: v)),
              ),
              _PermissionSwitch(
                label: 'View Grades',
                value: _permissions.viewGrades,
                onChanged: (v) => setState(() =>
                    _permissions = _permissions.copyWith(viewGrades: v)),
              ),
              _PermissionSwitch(
                label: 'View Activity',
                value: _permissions.viewActivity,
                onChanged: (v) => setState(() =>
                    _permissions = _permissions.copyWith(viewActivity: v)),
              ),
              _PermissionSwitch(
                label: 'View Achievements',
                value: _permissions.viewAchievements,
                onChanged: (v) => setState(() =>
                    _permissions =
                        _permissions.copyWith(viewAchievements: v)),
              ),
              _PermissionSwitch(
                label: 'Receive Notifications',
                value: _permissions.receiveNotifications,
                onChanged: (v) => setState(() =>
                    _permissions =
                        _permissions.copyWith(receiveNotifications: v)),
              ),
              _PermissionSwitch(
                label: 'View Teacher Notes',
                value: _permissions.viewTeacherNotes,
                onChanged: (v) => setState(() =>
                    _permissions =
                        _permissions.copyWith(viewTeacherNotes: v)),
              ),
              const SizedBox(height: 16),

              // Personal message (optional)
              Semantics(
                label: 'Personal message to include in invitation, optional',
                child: TextFormField(
                  controller: _messageController,
                  maxLines: 3,
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    labelText: 'Personal message (optional)',
                    hintText: 'Add a note to the invitation email…',
                    alignLabelWithHint: true,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Submit button
              Semantics(
                button: true,
                label: 'Send caregiver invitation',
                child: FilledButton.icon(
                  onPressed: _isSubmitting ? null : _submit,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send),
                  label: Text(
                      _isSubmitting ? 'Sending…' : 'Send Invitation'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final request = CreateCaregiverInviteRequest(
      studentId: widget.studentId,
      caregiverEmail: _emailController.text.trim(),
      caregiverName: _nameController.text.trim().isNotEmpty
          ? _nameController.text.trim()
          : null,
      relationship: _relationship,
      permissions: _permissions,
      message: _messageController.text.trim().isNotEmpty
          ? _messageController.text.trim()
          : null,
    );

    final success =
        await ref.read(inviteCaregiverNotifierProvider.notifier).invite(request);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Invitation sent to ${_emailController.text.trim()}'),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to send invitation')),
      );
    }
  }
}

// =============================================================================
// Permission Switch Row
// =============================================================================

class _PermissionSwitch extends StatelessWidget {
  const _PermissionSwitch({
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
