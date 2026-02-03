/// Restriction Chip Widget
///
/// Chips for displaying AI restrictions.
library;

import 'package:flutter/material.dart';

import '../models/ai_autonomy_settings.dart';

/// A chip widget for displaying an AI restriction.
class RestrictionChip extends StatelessWidget {
  const RestrictionChip({
    super.key,
    required this.restriction,
    this.onTap,
    this.onDelete,
    this.compact = false,
  });

  final AIRestriction restriction;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getTypeColor(restriction.type);

    if (compact) {
      return Chip(
        avatar: Icon(
          _getTypeIcon(restriction.type),
          size: 16,
          color: restriction.isActive ? color : theme.colorScheme.onSurface.withValues(alpha: 0.38),
        ),
        label: Text(
          restriction.name,
          style: TextStyle(
            color: restriction.isActive
                ? theme.colorScheme.onSurface
                : theme.colorScheme.onSurface.withValues(alpha: 0.38),
          ),
        ),
        deleteIcon: onDelete != null ? const Icon(Icons.close, size: 16) : null,
        onDeleted: onDelete,
        backgroundColor: restriction.isActive
            ? color.withValues(alpha: 0.1)
            : theme.colorScheme.surfaceContainerHighest,
      );
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: restriction.isActive
                      ? color.withValues(alpha: 0.1)
                      : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getTypeIcon(restriction.type),
                  color: restriction.isActive
                      ? color
                      : theme.colorScheme.onSurface.withValues(alpha: 0.38),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            restriction.name,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: restriction.isActive
                                  ? null
                                  : theme.colorScheme.onSurface
                                      .withValues(alpha: 0.38),
                            ),
                          ),
                        ),
                        _RestrictionStatusBadge(isActive: restriction.isActive),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      restriction.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (_hasTimeInfo(restriction)) ...[
                      const SizedBox(height: 4),
                      _TimeInfo(restriction: restriction),
                    ],
                  ],
                ),
              ),
              if (onDelete != null) ...[
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  iconSize: 20,
                  onPressed: onDelete,
                  color: Colors.red,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  bool _hasTimeInfo(AIRestriction restriction) {
    return restriction.startTime != null ||
        restriction.endTime != null ||
        (restriction.daysOfWeek?.isNotEmpty ?? false);
  }

  IconData _getTypeIcon(RestrictionType type) {
    switch (type) {
      case RestrictionType.time:
        return Icons.schedule;
      case RestrictionType.content:
        return Icons.article;
      case RestrictionType.feature:
        return Icons.extension;
      case RestrictionType.subject:
        return Icons.school;
    }
  }

  Color _getTypeColor(RestrictionType type) {
    switch (type) {
      case RestrictionType.time:
        return Colors.blue;
      case RestrictionType.content:
        return Colors.orange;
      case RestrictionType.feature:
        return Colors.purple;
      case RestrictionType.subject:
        return Colors.teal;
    }
  }
}

/// Status badge for restriction.
class _RestrictionStatusBadge extends StatelessWidget {
  const _RestrictionStatusBadge({required this.isActive});

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isActive
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isActive ? 'Active' : 'Disabled',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: isActive ? Colors.green : Colors.grey,
        ),
      ),
    );
  }
}

/// Time information for restriction.
class _TimeInfo extends StatelessWidget {
  const _TimeInfo({required this.restriction});

  final AIRestriction restriction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parts = <String>[];

    if (restriction.startTime != null && restriction.endTime != null) {
      final startHour = restriction.startTime!.hour;
      final endHour = restriction.endTime!.hour;
      parts.add('${_formatHour(startHour)} - ${_formatHour(endHour)}');
    }

    if (restriction.daysOfWeek?.isNotEmpty ?? false) {
      parts.add(restriction.daysOfWeek!.map(_formatDay).join(', '));
    }

    if (parts.isEmpty) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(
          Icons.access_time,
          size: 12,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          parts.join(' • '),
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  String _formatHour(int hour) {
    if (hour == 0) return '12 AM';
    if (hour == 12) return '12 PM';
    if (hour < 12) return '$hour AM';
    return '${hour - 12} PM';
  }

  String _formatDay(String day) {
    switch (day.toLowerCase()) {
      case 'monday':
        return 'Mon';
      case 'tuesday':
        return 'Tue';
      case 'wednesday':
        return 'Wed';
      case 'thursday':
        return 'Thu';
      case 'friday':
        return 'Fri';
      case 'saturday':
        return 'Sat';
      case 'sunday':
        return 'Sun';
      default:
        return day.substring(0, 3);
    }
  }
}

/// List of restriction chips.
class RestrictionChipList extends StatelessWidget {
  const RestrictionChipList({
    super.key,
    required this.restrictions,
    this.onRestrictionTap,
    this.onRestrictionDelete,
    this.compact = false,
  });

  final List<AIRestriction> restrictions;
  final void Function(AIRestriction)? onRestrictionTap;
  final void Function(AIRestriction)? onRestrictionDelete;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (restrictions.isEmpty) {
      return _EmptyRestrictionsState(compact: compact);
    }

    if (compact) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: restrictions.map((restriction) {
          return RestrictionChip(
            restriction: restriction,
            compact: true,
            onTap: onRestrictionTap != null
                ? () => onRestrictionTap!(restriction)
                : null,
            onDelete: onRestrictionDelete != null
                ? () => onRestrictionDelete!(restriction)
                : null,
          );
        }).toList(),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: restrictions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final restriction = restrictions[index];
        return RestrictionChip(
          restriction: restriction,
          onTap: onRestrictionTap != null
              ? () => onRestrictionTap!(restriction)
              : null,
          onDelete: onRestrictionDelete != null
              ? () => onRestrictionDelete!(restriction)
              : null,
        );
      },
    );
  }
}

/// Empty state for restrictions.
class _EmptyRestrictionsState extends StatelessWidget {
  const _EmptyRestrictionsState({required this.compact});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (compact) {
      return Text(
        'No restrictions',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontStyle: FontStyle.italic,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.block,
            size: 32,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 8),
          Text(
            'No Restrictions',
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Add restrictions to limit specific AI behaviors',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
