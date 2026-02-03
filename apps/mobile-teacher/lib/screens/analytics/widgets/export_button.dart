/// Export Button Widget
///
/// Button for exporting analytics reports with format options.
library;

import 'package:flutter/material.dart';

import '../../../models/analytics.dart';

/// Button for exporting analytics.
class ExportButton extends StatelessWidget {
  const ExportButton({
    super.key,
    required this.onExport,
    this.isLoading = false,
    this.formats = const [
      AnalyticsExportFormat.pdf,
      AnalyticsExportFormat.csv,
    ],
    this.defaultFormat = AnalyticsExportFormat.pdf,
    this.showDropdown = true,
    this.label,
    this.icon,
  });

  final void Function(AnalyticsExportFormat format) onExport;
  final bool isLoading;
  final List<AnalyticsExportFormat> formats;
  final AnalyticsExportFormat defaultFormat;
  final bool showDropdown;
  final String? label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    if (formats.length == 1 || !showDropdown) {
      return _buildSimpleButton(context);
    }
    return _buildDropdownButton(context);
  }

  Widget _buildSimpleButton(BuildContext context) {
    return FilledButton.icon(
      onPressed: isLoading ? null : () => onExport(defaultFormat),
      icon: isLoading
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(icon ?? Icons.download),
      label: Text(label ?? 'Export ${defaultFormat.label}'),
    );
  }

  Widget _buildDropdownButton(BuildContext context) {
    final theme = Theme.of(context);

    return PopupMenuButton<AnalyticsExportFormat>(
      onSelected: isLoading ? null : onExport,
      itemBuilder: (context) => formats.map((format) {
        return PopupMenuItem<AnalyticsExportFormat>(
          value: format,
          child: Row(
            children: [
              Icon(
                _getFormatIcon(format),
                size: 20,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 12),
              Text(format.label),
            ],
          ),
        );
      }).toList(),
      child: FilledButton.icon(
        onPressed: isLoading ? null : () {},
        icon: isLoading
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(icon ?? Icons.download),
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label ?? 'Export'),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down, size: 20),
          ],
        ),
      ),
    );
  }

  IconData _getFormatIcon(AnalyticsExportFormat format) {
    switch (format) {
      case AnalyticsExportFormat.pdf:
        return Icons.picture_as_pdf;
      case AnalyticsExportFormat.csv:
        return Icons.table_chart;
      case AnalyticsExportFormat.excel:
        return Icons.grid_on;
    }
  }
}

/// Icon-only export button.
class ExportIconButton extends StatelessWidget {
  const ExportIconButton({
    super.key,
    required this.onExport,
    this.isLoading = false,
    this.format = AnalyticsExportFormat.pdf,
    this.tooltip,
  });

  final VoidCallback onExport;
  final bool isLoading;
  final AnalyticsExportFormat format;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: isLoading ? null : onExport,
      icon: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(_getFormatIcon(format)),
      tooltip: tooltip ?? 'Export as ${format.label}',
    );
  }

  IconData _getFormatIcon(AnalyticsExportFormat format) {
    switch (format) {
      case AnalyticsExportFormat.pdf:
        return Icons.picture_as_pdf;
      case AnalyticsExportFormat.csv:
        return Icons.table_chart;
      case AnalyticsExportFormat.excel:
        return Icons.grid_on;
    }
  }
}

/// Export options dialog.
class ExportOptionsDialog extends StatefulWidget {
  const ExportOptionsDialog({
    super.key,
    required this.onExport,
    this.formats = const [
      AnalyticsExportFormat.pdf,
      AnalyticsExportFormat.csv,
      AnalyticsExportFormat.excel,
    ],
    this.defaultFormat = AnalyticsExportFormat.pdf,
    this.showStudentDetailsOption = true,
    this.showChartsOption = true,
    this.title = 'Export Analytics',
  });

  final void Function({
    required AnalyticsExportFormat format,
    required bool includeStudentDetails,
    required bool includeCharts,
  }) onExport;
  final List<AnalyticsExportFormat> formats;
  final AnalyticsExportFormat defaultFormat;
  final bool showStudentDetailsOption;
  final bool showChartsOption;
  final String title;

  @override
  State<ExportOptionsDialog> createState() => _ExportOptionsDialogState();
}

class _ExportOptionsDialogState extends State<ExportOptionsDialog> {
  late AnalyticsExportFormat _selectedFormat;
  bool _includeStudentDetails = true;
  bool _includeCharts = true;

  @override
  void initState() {
    super.initState();
    _selectedFormat = widget.defaultFormat;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Format',
            style: theme.textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          ...widget.formats.map((format) {
            return RadioListTile<AnalyticsExportFormat>(
              value: format,
              groupValue: _selectedFormat,
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedFormat = value);
                }
              },
              title: Text(format.label),
              secondary: Icon(_getFormatIcon(format)),
              dense: true,
              contentPadding: EdgeInsets.zero,
            );
          }),
          const Divider(height: 24),
          Text(
            'Options',
            style: theme.textTheme.titleSmall,
          ),
          if (widget.showStudentDetailsOption)
            CheckboxListTile(
              value: _includeStudentDetails,
              onChanged: (value) {
                setState(() => _includeStudentDetails = value ?? true);
              },
              title: const Text('Include student details'),
              dense: true,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
            ),
          if (widget.showChartsOption &&
              _selectedFormat == AnalyticsExportFormat.pdf)
            CheckboxListTile(
              value: _includeCharts,
              onChanged: (value) {
                setState(() => _includeCharts = value ?? true);
              },
              title: const Text('Include charts'),
              dense: true,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton.icon(
          onPressed: () {
            widget.onExport(
              format: _selectedFormat,
              includeStudentDetails: _includeStudentDetails,
              includeCharts: _includeCharts,
            );
            Navigator.of(context).pop();
          },
          icon: const Icon(Icons.download),
          label: const Text('Export'),
        ),
      ],
    );
  }

  IconData _getFormatIcon(AnalyticsExportFormat format) {
    switch (format) {
      case AnalyticsExportFormat.pdf:
        return Icons.picture_as_pdf;
      case AnalyticsExportFormat.csv:
        return Icons.table_chart;
      case AnalyticsExportFormat.excel:
        return Icons.grid_on;
    }
  }
}

/// Helper function to show export options dialog.
Future<void> showExportOptionsDialog(
  BuildContext context, {
  required void Function({
    required AnalyticsExportFormat format,
    required bool includeStudentDetails,
    required bool includeCharts,
  }) onExport,
  List<AnalyticsExportFormat> formats = const [
    AnalyticsExportFormat.pdf,
    AnalyticsExportFormat.csv,
  ],
  String title = 'Export Analytics',
}) {
  return showDialog(
    context: context,
    builder: (context) => ExportOptionsDialog(
      onExport: onExport,
      formats: formats,
      title: title,
    ),
  );
}

/// Export status indicator.
class ExportStatusIndicator extends StatelessWidget {
  const ExportStatusIndicator({
    super.key,
    required this.isExporting,
    this.downloadUrl,
    this.error,
    this.onDownload,
    this.onDismiss,
  });

  final bool isExporting;
  final String? downloadUrl;
  final String? error;
  final VoidCallback? onDownload;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!isExporting && downloadUrl == null && error == null) {
      return const SizedBox.shrink();
    }

    Color backgroundColor;
    IconData icon;
    String message;
    Widget? action;

    if (isExporting) {
      backgroundColor = theme.colorScheme.primaryContainer;
      icon = Icons.hourglass_bottom;
      message = 'Generating export...';
    } else if (error != null) {
      backgroundColor = theme.colorScheme.errorContainer;
      icon = Icons.error_outline;
      message = 'Export failed';
      action = TextButton(
        onPressed: onDismiss,
        child: const Text('Dismiss'),
      );
    } else {
      backgroundColor = theme.colorScheme.tertiaryContainer;
      icon = Icons.check_circle_outline;
      message = 'Export ready';
      action = TextButton(
        onPressed: onDownload,
        child: const Text('Download'),
      );
    }

    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            if (isExporting)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              Icon(icon, size: 18),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: theme.textTheme.bodyMedium,
              ),
            ),
            if (action != null) action,
          ],
        ),
      ),
    );
  }
}
