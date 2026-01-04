/// Class Monitoring Screen
///
/// Real-time monitoring of student activity and focus states.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/providers.dart';

/// Screen for monitoring student activity in real-time.
class ClassMonitoringScreen extends ConsumerStatefulWidget {
  const ClassMonitoringScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<ClassMonitoringScreen> createState() => _ClassMonitoringScreenState();
}

class _ClassMonitoringScreenState extends ConsumerState<ClassMonitoringScreen> {
  bool _showGridView = true;

  @override
  void initState() {
    super.initState();
    // Load active sessions for the class
    ref.read(classProvider(widget.classId).notifier).loadClass();
  }

  @override
  Widget build(BuildContext context) {
    final classState = ref.watch(classProvider(widget.classId));
    final classData = classState.classGroup;

    return Scaffold(
      appBar: AppBar(
        title: Text(classData?.name ?? 'Live Monitoring'),
        actions: [
          IconButton(
            icon: Icon(_showGridView ? Icons.view_list : Icons.grid_view),
            onPressed: () => setState(() => _showGridView = !_showGridView),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(classProvider(widget.classId).notifier).loadClass();
            },
          ),
        ],
      ),
      body: classState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : classState.error != null
              ? _buildErrorView(classState.error!)
              : _buildMonitoringContent(classData),
    );
  }

  Widget _buildErrorView(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text('Error loading class', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.read(classProvider(widget.classId).notifier).loadClass(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildMonitoringContent(dynamic classData) {
    // Mock data for demonstration - would connect to real-time session data
    final mockStudents = [
      _MockStudent('Emma W.', 'focused', 'Math Practice', 85),
      _MockStudent('Michael C.', 'focused', 'Reading Quiz', 72),
      _MockStudent('Olivia B.', 'distracted', 'Math Practice', 45),
      _MockStudent('Alex S.', 'idle', 'Word Problems', 30),
      _MockStudent('Sarah J.', 'break', 'Focus Break', 0),
      _MockStudent('James M.', 'needsHelp', 'Fractions', 55),
    ];

    final needsHelpCount = mockStudents.where((s) => s.status == 'needsHelp').length;
    final focusedCount = mockStudents.where((s) => s.status == 'focused').length;

    return Column(
      children: [
        // Summary stats
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatChip(
                icon: Icons.people,
                label: 'Active',
                value: '${mockStudents.length}',
              ),
              _StatChip(
                icon: Icons.psychology,
                label: 'Focused',
                value: '$focusedCount/${mockStudents.length}',
                color: Colors.green,
              ),
              _StatChip(
                icon: Icons.help_outline,
                label: 'Need Help',
                value: '$needsHelpCount',
                color: needsHelpCount > 0 ? Colors.red : null,
              ),
            ],
          ),
        ),

        // Alert banner
        if (needsHelpCount > 0)
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: Colors.red),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '$needsHelpCount student${needsHelpCount > 1 ? 's' : ''} may need assistance',
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),

        // Student list/grid
        Expanded(
          child: _showGridView
              ? _buildGridView(mockStudents)
              : _buildListView(mockStudents),
        ),
      ],
    );
  }

  Widget _buildGridView(List<_MockStudent> students) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.1,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: students.length,
      itemBuilder: (context, index) => _StudentCard(student: students[index]),
    );
  }

  Widget _buildListView(List<_MockStudent> students) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: students.length,
      itemBuilder: (context, index) => _StudentListTile(student: students[index]),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.icon,
    required this.label,
    required this.value,
    this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color ?? Theme.of(context).colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _MockStudent {
  _MockStudent(this.name, this.status, this.activity, this.progress);

  final String name;
  final String status;
  final String activity;
  final int progress;
}

class _StudentCard extends StatelessWidget {
  const _StudentCard({required this.student});

  final _MockStudent student;

  @override
  Widget build(BuildContext context) {
    final statusConfig = _getStatusConfig(student.status);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          // Navigate to student detail
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    child: Text(student.name[0]),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      student.name,
                      style: Theme.of(context).textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusConfig.color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusConfig.icon, size: 14, color: statusConfig.color),
                    const SizedBox(width: 4),
                    Text(
                      statusConfig.label,
                      style: TextStyle(
                        fontSize: 12,
                        color: statusConfig.color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                student.activity,
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              LinearProgressIndicator(
                value: student.progress / 100,
                backgroundColor: Colors.grey.shade200,
              ),
              const SizedBox(height: 2),
              Text(
                '${student.progress}%',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  _StatusConfig _getStatusConfig(String status) {
    switch (status) {
      case 'focused':
        return _StatusConfig('Focused', Icons.check_circle, Colors.green);
      case 'distracted':
        return _StatusConfig('Distracted', Icons.warning, Colors.orange);
      case 'idle':
        return _StatusConfig('Idle', Icons.pause_circle, Colors.grey);
      case 'break':
        return _StatusConfig('On Break', Icons.coffee, Colors.blue);
      case 'needsHelp':
        return _StatusConfig('Needs Help', Icons.help, Colors.red);
      default:
        return _StatusConfig('Unknown', Icons.help_outline, Colors.grey);
    }
  }
}

class _StatusConfig {
  _StatusConfig(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;
}

class _StudentListTile extends StatelessWidget {
  const _StudentListTile({required this.student});

  final _MockStudent student;

  @override
  Widget build(BuildContext context) {
    final statusConfig = _getStatusConfig(student.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(student.name[0])),
        title: Text(student.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(student.activity),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: student.progress / 100,
                    backgroundColor: Colors.grey.shade200,
                  ),
                ),
                const SizedBox(width: 8),
                Text('${student.progress}%'),
              ],
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusConfig.color.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(statusConfig.icon, size: 16, color: statusConfig.color),
              const SizedBox(width: 4),
              Text(
                statusConfig.label,
                style: TextStyle(
                  fontSize: 12,
                  color: statusConfig.color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        isThreeLine: true,
        onTap: () {
          // Navigate to student detail
        },
      ),
    );
  }

  _StatusConfig _getStatusConfig(String status) {
    switch (status) {
      case 'focused':
        return _StatusConfig('Focused', Icons.check_circle, Colors.green);
      case 'distracted':
        return _StatusConfig('Distracted', Icons.warning, Colors.orange);
      case 'idle':
        return _StatusConfig('Idle', Icons.pause_circle, Colors.grey);
      case 'break':
        return _StatusConfig('On Break', Icons.coffee, Colors.blue);
      case 'needsHelp':
        return _StatusConfig('Needs Help', Icons.help, Colors.red);
      default:
        return _StatusConfig('Unknown', Icons.help_outline, Colors.grey);
    }
  }
}
