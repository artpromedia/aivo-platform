/// Reports Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';


/// Screen showing available reports.
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ReportCard(
            icon: Icons.assignment,
            title: 'IEP Progress Reports',
            description: 'View and generate IEP progress reports for students',
            color: Colors.blue,
            onTap: () => context.push('/reports/iep'),
          ),
          const SizedBox(height: 12),
          _ReportCard(
            icon: Icons.show_chart,
            title: 'Class Analytics',
            description: 'View class performance and engagement metrics',
            color: Colors.green,
            onTap: () => context.push('/reports/analytics'),
          ),
          const SizedBox(height: 12),
          _ReportCard(
            icon: Icons.people,
            title: 'Student Progress',
            description: 'Individual student progress over time',
            color: Colors.purple,
            onTap: () => context.push('/reports/students'),
          ),
          const SizedBox(height: 12),
          _ReportCard(
            icon: Icons.calendar_month,
            title: 'Session Summary',
            description: 'Summary of completed sessions',
            color: Colors.orange,
            onTap: () => context.push('/reports/sessions'),
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
