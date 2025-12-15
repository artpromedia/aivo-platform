/// Care Team Screen
///
/// Displays the care team members for a learner with contact info.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';

/// Screen showing care team members.
class CareTeamScreen extends ConsumerWidget {
  const CareTeamScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final careTeamAsync = ref.watch(careTeamProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text("$learnerName's Care Team"),
      ),
      body: careTeamAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load care team: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(careTeamProvider(learnerId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (members) => _CareTeamList(members: members),
      ),
    );
  }
}

class _CareTeamList extends StatelessWidget {
  const _CareTeamList({required this.members});

  final List<CareTeamMember> members;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.group_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No care team members yet',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Care team members will appear here',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Group members by role type
    final parents = members.where((m) =>
        m.role == CareTeamRole.parent || m.role == CareTeamRole.guardian).toList();
    final educators = members.where((m) =>
        m.role == CareTeamRole.teacher ||
        m.role == CareTeamRole.specialist ||
        m.role == CareTeamRole.aide).toList();
    final specialists = members.where((m) =>
        m.role == CareTeamRole.therapist ||
        m.role == CareTeamRole.counselor ||
        m.role == CareTeamRole.caseManager).toList();
    final other = members.where((m) =>
        m.role == CareTeamRole.districtAdmin || m.role == CareTeamRole.other).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (parents.isNotEmpty) ...[
          _SectionHeader(title: 'Family', icon: Icons.home),
          ...parents.map((m) => _CareTeamMemberCard(member: m)),
          const SizedBox(height: 16),
        ],
        if (educators.isNotEmpty) ...[
          _SectionHeader(title: 'Educators', icon: Icons.school),
          ...educators.map((m) => _CareTeamMemberCard(member: m)),
          const SizedBox(height: 16),
        ],
        if (specialists.isNotEmpty) ...[
          _SectionHeader(title: 'Specialists', icon: Icons.psychology),
          ...specialists.map((m) => _CareTeamMemberCard(member: m)),
          const SizedBox(height: 16),
        ],
        if (other.isNotEmpty) ...[
          _SectionHeader(title: 'Other', icon: Icons.people),
          ...other.map((m) => _CareTeamMemberCard(member: m)),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
        ],
      ),
    );
  }
}

class _CareTeamMemberCard extends StatelessWidget {
  const _CareTeamMemberCard({required this.member});

  final CareTeamMember member;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getRoleColor(member.role),
          child: Text(
            member.displayName.substring(0, 1).toUpperCase(),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(member.displayName),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(member.title ?? member.roleDisplayName),
            if (member.contactEmail != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(
                  children: [
                    const Icon(Icons.email_outlined, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        member.contactEmail!,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        trailing: member.contactPhone != null
            ? IconButton(
                icon: const Icon(Icons.phone_outlined),
                onPressed: () {
                  // TODO: Launch phone dialer
                },
              )
            : null,
        isThreeLine: member.contactEmail != null,
        onTap: () => _showMemberDetails(context, member),
      ),
    );
  }

  Color _getRoleColor(CareTeamRole role) {
    switch (role) {
      case CareTeamRole.parent:
      case CareTeamRole.guardian:
        return Colors.blue;
      case CareTeamRole.teacher:
      case CareTeamRole.specialist:
      case CareTeamRole.aide:
        return Colors.green;
      case CareTeamRole.therapist:
      case CareTeamRole.counselor:
        return Colors.purple;
      case CareTeamRole.caseManager:
        return Colors.orange;
      case CareTeamRole.districtAdmin:
      case CareTeamRole.administrator:
        return Colors.teal;
      case CareTeamRole.other:
        return Colors.grey;
    }
  }

  void _showMemberDetails(BuildContext context, CareTeamMember member) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: _getRoleColor(member.role),
                  child: Text(
                    member.displayName.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        member.displayName,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        member.title ?? member.roleDisplayName,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (member.contactEmail != null) ...[
              _ContactRow(
                icon: Icons.email_outlined,
                label: 'Email',
                value: member.contactEmail!,
              ),
              const SizedBox(height: 12),
            ],
            if (member.contactPhone != null) ...[
              _ContactRow(
                icon: Icons.phone_outlined,
                label: 'Phone',
                value: member.contactPhone!,
              ),
              const SizedBox(height: 12),
            ],
            _ContactRow(
              icon: Icons.calendar_today_outlined,
              label: 'Member since',
              value: _formatDate(member.joinedAt),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: member.contactEmail != null
                        ? () {
                            // TODO: Launch email
                            Navigator.pop(context);
                          }
                        : null,
                    icon: const Icon(Icons.email_outlined),
                    label: const Text('Email'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      // TODO: Navigate to messaging
                    },
                    icon: const Icon(Icons.message_outlined),
                    label: const Text('Message'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            Text(value),
          ],
        ),
      ],
    );
  }
}
