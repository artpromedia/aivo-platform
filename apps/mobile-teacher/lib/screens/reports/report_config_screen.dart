/// Report Configuration Screen
///
/// Allows teachers to configure and generate reports with class/student
/// selection, date range, and report type options.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/analytics.dart';
import '../../providers/reports_provider.dart';

/// Report configuration and generation screen.
class ReportConfigScreen extends ConsumerStatefulWidget {
  const ReportConfigScreen({
    super.key,
    this.initialType,
  });

  final ReportType? initialType;

  @override
  ConsumerState<ReportConfigScreen> createState() => _ReportConfigScreenState();
}

class _ReportConfigScreenState extends ConsumerState<ReportConfigScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.initialType != null) {
      // Set the report type after build
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(reportGenerationProvider.notifier).setReportType(widget.initialType!);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(reportGenerationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Generate Report'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Report type selector
          Text(
            'Report Type',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          _buildReportTypeSelector(theme, state),
          const SizedBox(height: 24),

          // Class selector (placeholder — uses text field)
          Text(
            'Class',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          _buildClassSelector(theme, state),
          const SizedBox(height: 24),

          // Student selector (for individual reports)
          if (_isStudentReport(state.selectedType)) ...[
            Text(
              'Student (Optional)',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            _buildStudentSelector(theme, state),
            const SizedBox(height: 24),
          ],

          // Date range
          Text(
            'Date Range',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          _buildDateRangeSelector(theme, state),
          const SizedBox(height: 32),

          // Generate button
          _buildGenerateButton(theme, state),

          // Result/status
          if (state.generatedReport != null) ...[
            const SizedBox(height: 24),
            _buildReportResult(theme, state.generatedReport!),
          ],

          if (state.error != null) ...[
            const SizedBox(height: 16),
            _buildErrorBanner(theme, state.error!),
          ],
        ],
      ),
    );
  }

  Widget _buildReportTypeSelector(ThemeData theme, ReportGenerationState state) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: ReportType.values.map((type) {
        final isSelected = state.selectedType == type;
        return ChoiceChip(
          label: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                type.icon,
                size: 16,
                color: isSelected
                    ? theme.colorScheme.onPrimary
                    : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Text(type.label),
            ],
          ),
          selected: isSelected,
          onSelected: (_) {
            ref.read(reportGenerationProvider.notifier).setReportType(type);
          },
        );
      }).toList(),
    );
  }

  Widget _buildClassSelector(ThemeData theme, ReportGenerationState state) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.class_),
        title: Text(
          state.selectedClassName ?? 'Select a class',
          style: state.selectedClassName == null
              ? TextStyle(color: theme.disabledColor)
              : null,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _showClassPicker(context),
      ),
    );
  }

  Widget _buildStudentSelector(ThemeData theme, ReportGenerationState state) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.person),
        title: Text(
          state.selectedStudentName ?? 'All students',
          style: state.selectedStudentName == null
              ? TextStyle(color: theme.disabledColor)
              : null,
        ),
        subtitle: state.selectedStudentName != null
            ? null
            : const Text('Leave blank for class-wide report'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (state.selectedStudentName != null)
              IconButton(
                icon: const Icon(Icons.clear, size: 18),
                onPressed: () {
                  ref.read(reportGenerationProvider.notifier).clearStudent();
                },
              ),
            const Icon(Icons.chevron_right),
          ],
        ),
        onTap: () => _showStudentPicker(context),
      ),
    );
  }

  Widget _buildDateRangeSelector(ThemeData theme, ReportGenerationState state) {
    final start = state.startDate;
    final end = state.endDate;

    return Card(
      child: ListTile(
        leading: const Icon(Icons.date_range),
        title: Text(
          start != null && end != null
              ? '${_formatDate(start)} — ${_formatDate(end)}'
              : 'Select date range',
          style: start == null
              ? TextStyle(color: theme.disabledColor)
              : null,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _showDateRangePicker(context, state),
      ),
    );
  }

  Widget _buildGenerateButton(ThemeData theme, ReportGenerationState state) {
    final canGenerate = state.selectedType != null &&
        state.selectedClassId != null &&
        !state.isGenerating;

    return FilledButton.icon(
      onPressed: canGenerate
          ? () => ref.read(reportGenerationProvider.notifier).generateReport()
          : null,
      icon: state.isGenerating
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : const Icon(Icons.description),
      label: Text(state.isGenerating ? 'Generating…' : 'Generate Report'),
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
      ),
    );
  }

  Widget _buildReportResult(ThemeData theme, GeneratedReport report) {
    return Card(
      color: AivoBrand.success.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.check_circle, color: AivoBrand.success, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Report Generated',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: AivoBrand.success,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              report.title,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Generated at ${_formatDateTime(report.generatedAt)}',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // TODO: Implement download
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Download starting…')),
                      );
                    },
                    icon: const Icon(Icons.download),
                    label: const Text('Download PDF'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // TODO: Implement share
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Preparing share…')),
                      );
                    },
                    icon: const Icon(Icons.share),
                    label: const Text('Share'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorBanner(ThemeData theme, String error) {
    return Card(
      color: AivoBrand.error.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AivoBrand.error, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                error,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AivoBrand.error,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _isStudentReport(ReportType? type) {
    if (type == null) return false;
    return type == ReportType.progress ||
        type == ReportType.iepProgress ||
        type == ReportType.parentReportCard;
  }

  void _showClassPicker(BuildContext context) {
    // Simplified class picker using a bottom sheet with text field
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          24,
          24,
          24,
          MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select Class',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            // Placeholder — in production this would list actual classes
            ListTile(
              leading: const CircleAvatar(child: Text('1')),
              title: const Text('Class 1'),
              onTap: () {
                ref.read(reportGenerationProvider.notifier).setClass('class-1', 'Class 1');
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const CircleAvatar(child: Text('2')),
              title: const Text('Class 2'),
              onTap: () {
                ref.read(reportGenerationProvider.notifier).setClass('class-2', 'Class 2');
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const CircleAvatar(child: Text('3')),
              title: const Text('Class 3'),
              onTap: () {
                ref.read(reportGenerationProvider.notifier).setClass('class-3', 'Class 3');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showStudentPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select Student',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            const Text('Student list will be populated from class roster.'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDateRangePicker(
    BuildContext context,
    ReportGenerationState state,
  ) async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: now,
      initialDateRange: state.startDate != null && state.endDate != null
          ? DateTimeRange(start: state.startDate!, end: state.endDate!)
          : DateTimeRange(
              start: now.subtract(const Duration(days: 30)),
              end: now,
            ),
    );

    if (picked != null && mounted) {
      ref.read(reportGenerationProvider.notifier).setDateRange(
            picked.start,
            picked.end,
          );
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  String _formatDateTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : date.hour;
    final amPm = date.hour >= 12 ? 'PM' : 'AM';
    final minute = date.minute.toString().padLeft(2, '0');
    return '${_formatDate(date)} $hour:$minute $amPm';
  }
}
