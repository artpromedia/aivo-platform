/// Skill Matrix Screen
///
/// Heatmap grid showing student × skill mastery levels for a class.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/analytics.dart';
import '../../providers/reports_provider.dart';

/// Skill matrix heatmap screen.
class SkillMatrixScreen extends ConsumerWidget {
  const SkillMatrixScreen({
    super.key,
    required this.classId,
    this.className,
  });

  final String classId;
  final String? className;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matrixAsync = ref.watch(skillMatrixProvider(classId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('${className ?? "Class"} — Skills'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(skillMatrixProvider(classId)),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: matrixAsync.when(
        data: (matrix) => _buildMatrix(context, theme, matrix),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _buildError(context, ref, error),
      ),
    );
  }

  Widget _buildMatrix(
    BuildContext context,
    ThemeData theme,
    SkillMatrix matrix,
  ) {
    if (matrix.skills.isEmpty || matrix.students.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.grid_off, size: 64, color: theme.disabledColor),
            const SizedBox(height: 16),
            Text(
              'No skill data available',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.disabledColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Skill mastery data will appear after assessments.',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Legend
        _buildLegend(theme),
        const Divider(height: 1),

        // Matrix grid
        Expanded(
          child: SingleChildScrollView(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: _buildGrid(context, theme, matrix),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLegend(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _legendItem(theme, 'Low (0-40%)', _masteryColor(20)),
          const SizedBox(width: 16),
          _legendItem(theme, 'Medium (40-70%)', _masteryColor(55)),
          const SizedBox(width: 16),
          _legendItem(theme, 'High (70-100%)', _masteryColor(85)),
        ],
      ),
    );
  }

  Widget _legendItem(ThemeData theme, String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: theme.textTheme.labelSmall),
      ],
    );
  }

  Widget _buildGrid(
    BuildContext context,
    ThemeData theme,
    SkillMatrix matrix,
  ) {
    const cellSize = 60.0;
    const nameWidth = 120.0;
    const headerHeight = 80.0;

    return DataTable(
      columnSpacing: 0,
      horizontalMargin: 8,
      headingRowHeight: headerHeight,
      dataRowMinHeight: cellSize,
      dataRowMaxHeight: cellSize,
      columns: [
        DataColumn(
          label: SizedBox(
            width: nameWidth,
            child: Text(
              'Student',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        ...matrix.skills.map(
          (skill) => DataColumn(
            label: SizedBox(
              width: cellSize,
              child: RotatedBox(
                quarterTurns: -1,
                child: Text(
                  skill,
                  style: theme.textTheme.labelSmall,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            ),
          ),
        ),
      ],
      rows: matrix.students.map((student) {
        return DataRow(
          cells: [
            DataCell(
              SizedBox(
                width: nameWidth,
                child: Text(
                  student.name,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            ...matrix.skills.map((skill) {
              final mastery = matrix.getMastery(student.id, skill);
              return DataCell(
                GestureDetector(
                  onTap: () => _showCellDetail(context, theme, matrix, student, skill, mastery),
                  child: Container(
                    width: cellSize - 8,
                    height: cellSize - 12,
                    decoration: BoxDecoration(
                      color: _masteryColor(mastery),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${mastery.toStringAsFixed(0)}%',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: mastery > 50 ? Colors.white : Colors.black87,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        );
      }).toList(),
    );
  }

  void _showCellDetail(
    BuildContext context,
    ThemeData theme,
    SkillMatrix matrix,
    ({String id, String name}) student,
    String skill,
    double mastery,
  ) {
    // Find the full cell data if available
    final cell = matrix.cells
        .where((c) => c.studentId == student.id && c.skillName == skill)
        .firstOrNull;

    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AivoBrand.primary.withOpacity(0.1),
                  child: Text(
                    student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: AivoBrand.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        student.name,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(skill, style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Mastery progress bar
            Row(
              children: [
                const Text('Mastery'),
                const SizedBox(width: 12),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: mastery / 100,
                      minHeight: 12,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation(_masteryColor(mastery)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '${mastery.toStringAsFixed(0)}%',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: _masteryColor(mastery),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            if (cell != null) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  _detailChip(
                    theme,
                    Icons.assignment,
                    '${cell.recentActivities} recent activities',
                  ),
                  if (cell.lastAssessedAt != null) ...[
                    const SizedBox(width: 12),
                    _detailChip(
                      theme,
                      Icons.schedule,
                      'Last: ${_formatDate(cell.lastAssessedAt!)}',
                    ),
                  ],
                ],
              ),
            ],
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _detailChip(ThemeData theme, IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(label, style: theme.textTheme.labelSmall),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, WidgetRef ref, Object error) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AivoBrand.error),
          const SizedBox(height: 16),
          Text(
            'Failed to load skill matrix',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => ref.invalidate(skillMatrixProvider(classId)),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Color _masteryColor(double mastery) {
    if (mastery >= 70) return AivoBrand.success;
    if (mastery >= 40) return Colors.amber.shade700;
    return AivoBrand.error;
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}
