/// Goals At Risk Card Widget
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../providers/providers.dart';

/// Card showing IEP goals at risk.
class GoalsAtRiskCard extends ConsumerWidget {
  const GoalsAtRiskCard({
    super.key,
    required this.onViewAll,
  });

  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goalsAsync = ref.watch(goalsAtRiskProvider);

    return goalsAsync.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (_, __) => const SizedBox.shrink(),
      data: (goals) {
        if (goals.isEmpty) return const SizedBox.shrink();

        return Card(
          color: Colors.red.shade50,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.flag, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'IEP Goals At Risk',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.red.shade700,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: onViewAll,
                      child: const Text('View All'),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Text(
                  '${goals.length} goal${goals.length == 1 ? '' : 's'} require attention',
                  style: TextStyle(color: Colors.red.shade700),
                ),
              ),
              ...goals.take(3).map((goal) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.red.shade100,
                  child: Text(
                    '${((goal.currentValue / goal.targetValue) * 100).round()}%',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.red.shade700,
                    ),
                  ),
                ),
                title: Text(
                  goal.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(goal.category.name),
              )),
            ],
          ),
        );
      },
    );
  }
}
