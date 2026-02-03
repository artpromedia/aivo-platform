/// Period Selector Widget
///
/// Dropdown or segmented control for selecting analytics period.
library;

import 'package:flutter/material.dart';

import '../../../models/analytics.dart';

/// Segmented period selector.
class PeriodSelector extends StatelessWidget {
  const PeriodSelector({
    super.key,
    required this.selectedPeriod,
    required this.onPeriodChanged,
    this.availablePeriods = const [
      AnalyticsPeriod.day,
      AnalyticsPeriod.week,
      AnalyticsPeriod.month,
      AnalyticsPeriod.semester,
    ],
    this.style = PeriodSelectorStyle.segmented,
    this.compact = false,
  });

  final AnalyticsPeriod selectedPeriod;
  final ValueChanged<AnalyticsPeriod> onPeriodChanged;
  final List<AnalyticsPeriod> availablePeriods;
  final PeriodSelectorStyle style;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    switch (style) {
      case PeriodSelectorStyle.segmented:
        return _buildSegmentedSelector(context);
      case PeriodSelectorStyle.dropdown:
        return _buildDropdownSelector(context);
      case PeriodSelectorStyle.chips:
        return _buildChipSelector(context);
    }
  }

  Widget _buildSegmentedSelector(BuildContext context) {
    return SegmentedButton<AnalyticsPeriod>(
      segments: availablePeriods.map((period) {
        return ButtonSegment<AnalyticsPeriod>(
          value: period,
          label: Text(
            compact ? _getCompactLabel(period) : period.label,
            style: compact ? const TextStyle(fontSize: 12) : null,
          ),
        );
      }).toList(),
      selected: {selectedPeriod},
      onSelectionChanged: (selection) {
        if (selection.isNotEmpty) {
          onPeriodChanged(selection.first);
        }
      },
      showSelectedIcon: false,
    );
  }

  Widget _buildDropdownSelector(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButton<AnalyticsPeriod>(
        value: selectedPeriod,
        underline: const SizedBox.shrink(),
        isExpanded: false,
        items: availablePeriods.map((period) {
          return DropdownMenuItem<AnalyticsPeriod>(
            value: period,
            child: Text(period.label),
          );
        }).toList(),
        onChanged: (value) {
          if (value != null) {
            onPeriodChanged(value);
          }
        },
      ),
    );
  }

  Widget _buildChipSelector(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: availablePeriods.map((period) {
          final isSelected = period == selectedPeriod;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(compact ? _getCompactLabel(period) : period.label),
              selected: isSelected,
              onSelected: (_) => onPeriodChanged(period),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _getCompactLabel(AnalyticsPeriod period) {
    switch (period) {
      case AnalyticsPeriod.day:
        return 'Day';
      case AnalyticsPeriod.week:
        return 'Week';
      case AnalyticsPeriod.month:
        return 'Month';
      case AnalyticsPeriod.semester:
        return 'Sem';
      case AnalyticsPeriod.year:
        return 'Year';
      case AnalyticsPeriod.custom:
        return 'Custom';
    }
  }
}

/// Style options for period selector.
enum PeriodSelectorStyle {
  segmented,
  dropdown,
  chips,
}

/// Date range picker for custom period selection.
class CustomDateRangePicker extends StatelessWidget {
  const CustomDateRangePicker({
    super.key,
    required this.startDate,
    required this.endDate,
    required this.onDateRangeChanged,
    this.minDate,
    this.maxDate,
    this.label,
  });

  final DateTime startDate;
  final DateTime endDate;
  final void Function(DateTime start, DateTime end) onDateRangeChanged;
  final DateTime? minDate;
  final DateTime? maxDate;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
        ],
        InkWell(
          onTap: () => _showDateRangePicker(context),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              border: Border.all(color: theme.colorScheme.outline),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Text(
                  '${_formatDate(startDate)} - ${_formatDate(endDate)}',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.arrow_drop_down,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  Future<void> _showDateRangePicker(BuildContext context) async {
    final result = await showDateRangePicker(
      context: context,
      firstDate: minDate ?? DateTime(2020),
      lastDate: maxDate ?? DateTime.now(),
      initialDateRange: DateTimeRange(start: startDate, end: endDate),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme,
          ),
          child: child!,
        );
      },
    );

    if (result != null) {
      onDateRangeChanged(result.start, result.end);
    }
  }
}

/// Quick period presets.
class PeriodPresets extends StatelessWidget {
  const PeriodPresets({
    super.key,
    required this.onPresetSelected,
  });

  final void Function(DateTime start, DateTime end) onPresetSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _PresetChip(
          label: 'Last 7 days',
          onTap: () {
            final now = DateTime.now();
            onPresetSelected(
              now.subtract(const Duration(days: 7)),
              now,
            );
          },
        ),
        _PresetChip(
          label: 'Last 30 days',
          onTap: () {
            final now = DateTime.now();
            onPresetSelected(
              now.subtract(const Duration(days: 30)),
              now,
            );
          },
        ),
        _PresetChip(
          label: 'This month',
          onTap: () {
            final now = DateTime.now();
            onPresetSelected(
              DateTime(now.year, now.month, 1),
              now,
            );
          },
        ),
        _PresetChip(
          label: 'Last month',
          onTap: () {
            final now = DateTime.now();
            final lastMonth = DateTime(now.year, now.month - 1, 1);
            onPresetSelected(
              lastMonth,
              DateTime(now.year, now.month, 0),
            );
          },
        ),
        _PresetChip(
          label: 'This quarter',
          onTap: () {
            final now = DateTime.now();
            final quarter = ((now.month - 1) ~/ 3) * 3 + 1;
            onPresetSelected(
              DateTime(now.year, quarter, 1),
              now,
            );
          },
        ),
      ],
    );
  }
}

class _PresetChip extends StatelessWidget {
  const _PresetChip({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
    );
  }
}

/// Combined period selector with custom option.
class AdvancedPeriodSelector extends StatefulWidget {
  const AdvancedPeriodSelector({
    super.key,
    required this.selectedPeriod,
    required this.onPeriodChanged,
    this.customStartDate,
    this.customEndDate,
    this.onCustomDateRangeChanged,
  });

  final AnalyticsPeriod selectedPeriod;
  final ValueChanged<AnalyticsPeriod> onPeriodChanged;
  final DateTime? customStartDate;
  final DateTime? customEndDate;
  final void Function(DateTime start, DateTime end)? onCustomDateRangeChanged;

  @override
  State<AdvancedPeriodSelector> createState() => _AdvancedPeriodSelectorState();
}

class _AdvancedPeriodSelectorState extends State<AdvancedPeriodSelector> {
  late DateTime _customStart;
  late DateTime _customEnd;

  @override
  void initState() {
    super.initState();
    _customStart = widget.customStartDate ?? DateTime.now().subtract(const Duration(days: 30));
    _customEnd = widget.customEndDate ?? DateTime.now();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PeriodSelector(
          selectedPeriod: widget.selectedPeriod,
          onPeriodChanged: widget.onPeriodChanged,
          style: PeriodSelectorStyle.chips,
        ),
        if (widget.selectedPeriod == AnalyticsPeriod.custom) ...[
          const SizedBox(height: 16),
          CustomDateRangePicker(
            startDate: _customStart,
            endDate: _customEnd,
            onDateRangeChanged: (start, end) {
              setState(() {
                _customStart = start;
                _customEnd = end;
              });
              widget.onCustomDateRangeChanged?.call(start, end);
            },
            label: 'Custom Date Range',
          ),
        ],
      ],
    );
  }
}
