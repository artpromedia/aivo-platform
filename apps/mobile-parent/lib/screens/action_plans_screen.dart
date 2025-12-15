/// Action Plans Screen
///
/// Displays shared action plans for a learner with tasks and progress.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';
import 'action_plan_detail_screen.dart';

/// Screen showing action plans list.
class ActionPlansScreen extends ConsumerWidget {
  const ActionPlansScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plansAsync = ref.watch(actionPlansProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text("$learnerName's Action Plans"),
      ),
      body: plansAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load action plans: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(actionPlansProvider(learnerId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (plans) => _ActionPlansList(
          learnerId: learnerId,
          plans: plans,
        ),
      ),
    );
  }
}

class _ActionPlansList extends StatelessWidget {
  const _ActionPlansList({
    required this.learnerId,
    required this.plans,
  });

  final String learnerId;
  final List<ActionPlan> plans;

  @override
  Widget build(BuildContext context) {
    if (plans.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No action plans yet',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Action plans created by the care team\nwill appear here',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Group by status
    final activePlans = plans.where((p) => p.status == ActionPlanStatus.active).toList();
    final otherPlans = plans.where((p) => p.status != ActionPlanStatus.active).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (activePlans.isNotEmpty) ...[
          _SectionHeader(
            title: 'Active Plans',
            count: activePlans.length,
            color: Colors.green,
          ),
          ...activePlans.map((plan) => _ActionPlanCard(
                learnerId: learnerId,
                plan: plan,
              )),
          const SizedBox(height: 16),
        ],
        if (otherPlans.isNotEmpty) ...[
          _SectionHeader(
            title: 'Other Plans',
            count: otherPlans.length,
            color: Colors.grey,
          ),
          ...otherPlans.map((plan) => _ActionPlanCard(
                learnerId: learnerId,
                plan: plan,
              )),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  final String title;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}

class _ActionPlanCard extends StatelessWidget {
  const _ActionPlanCard({
    required this.learnerId,
    required this.plan,
  });

  final String learnerId;
  final ActionPlan plan;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ActionPlanDetailScreen(
                learnerId: learnerId,
                planId: plan.id,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      plan.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  _StatusChip(status: plan.status),
                ],
              ),
              if (plan.description != null) ...[
                const SizedBox(height: 8),
                Text(
                  plan.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
              const SizedBox(height: 12),
              // Focus areas
              if (plan.focusAreas.isNotEmpty)
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: plan.focusAreas
                      .take(3)
                      .map((area) => _FocusAreaChip(area: area))
                      .toList(),
                ),
              const SizedBox(height: 12),
              // Stats row
              Row(
                children: [
                  _StatItem(
                    icon: Icons.check_circle_outline,
                    label: '${plan.taskCount} tasks',
                  ),
                  const SizedBox(width: 16),
                  _StatItem(
                    icon: Icons.note_outlined,
                    label: '${plan.noteCount} notes',
                  ),
                  const Spacer(),
                  if (plan.createdBy != null)
                    Text(
                      'by ${plan.createdBy!.displayName}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
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
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final ActionPlanStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      ActionPlanStatus.draft => (Colors.grey, 'Draft'),
      ActionPlanStatus.active => (Colors.green, 'Active'),
      ActionPlanStatus.onHold => (Colors.orange, 'On Hold'),
      ActionPlanStatus.completed => (Colors.blue, 'Completed'),
      ActionPlanStatus.archived => (Colors.grey, 'Archived'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _FocusAreaChip extends StatelessWidget {
  const _FocusAreaChip({required this.area});

  final String area;

  String get displayName {
    return area
        .split('-')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        displayName,
        style: TextStyle(
          fontSize: 11,
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }
}
