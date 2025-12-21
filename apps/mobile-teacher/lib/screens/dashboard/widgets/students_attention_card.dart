/// Students Attention Card Widget
library;

import 'package:flutter/material.dart';

import '../../../models/models.dart';

/// Card showing students requiring attention.
class StudentsAttentionCard extends StatelessWidget {
  const StudentsAttentionCard({
    super.key,
    required this.students,
    required this.onStudentTap,
  });

  final List<Student> students;
  final void Function(Student) onStudentTap;

  @override
  Widget build(BuildContext context) {
    if (students.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      color: Colors.orange.shade50,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.orange.shade700),
                const SizedBox(width: 8),
                Text(
                  'Students Requiring Attention',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.orange.shade700,
                  ),
                ),
              ],
            ),
          ),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: students.length.clamp(0, 5),
            itemBuilder: (context, index) {
              final student = students[index];
              return ListTile(
                onTap: () => onStudentTap(student),
                leading: CircleAvatar(
                  backgroundImage: student.avatarUrl != null
                      ? NetworkImage(student.avatarUrl!)
                      : null,
                  child: student.avatarUrl == null
                      ? Text(student.initials)
                      : null,
                ),
                title: Text('${student.firstName} ${student.lastName}'),
                subtitle: Text(_getAttentionReason(student)),
                trailing: const Icon(Icons.chevron_right),
              );
            },
          ),
          if (students.length > 5)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Text(
                  '+ ${students.length - 5} more',
                  style: TextStyle(color: Colors.orange.shade700),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _getAttentionReason(Student student) {
    if (student.status == StudentStatus.inactive) {
      return 'Inactive - needs follow-up';
    }
    if (student.hasIep) {
      return 'IEP goal at risk';
    }
    return 'Requires attention';
  }
}
