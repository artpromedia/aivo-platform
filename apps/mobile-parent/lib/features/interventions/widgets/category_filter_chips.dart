/// Category Filter Chips Widget
///
/// Filter chips for intervention categories.
library;

import 'package:flutter/material.dart';

import '../models/intervention_history.dart';

/// Filter chips for selecting intervention categories.
class CategoryFilterChips extends StatelessWidget {
  const CategoryFilterChips({
    super.key,
    required this.selectedCategory,
    required this.onCategorySelected,
  });

  final InterventionCategory? selectedCategory;
  final void Function(InterventionCategory?) onCategorySelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          // All chip
          FilterChip(
            label: const Text('All'),
            selected: selectedCategory == null,
            onSelected: (selected) {
              if (selected) {
                onCategorySelected(null);
              }
            },
          ),
          const SizedBox(width: 8),
          // Category chips
          ...InterventionCategory.values.map((category) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(_getCategoryLabel(category)),
                avatar: Icon(
                  _getCategoryIcon(category),
                  size: 16,
                  color: selectedCategory == category
                      ? Theme.of(context).colorScheme.onSecondaryContainer
                      : _getCategoryColor(category),
                ),
                selected: selectedCategory == category,
                onSelected: (selected) {
                  onCategorySelected(selected ? category : null);
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  String _getCategoryLabel(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return 'Academic';
      case InterventionCategory.behavioral:
        return 'Behavioral';
      case InterventionCategory.social:
        return 'Social';
      case InterventionCategory.accessibility:
        return 'Accessibility';
      case InterventionCategory.engagement:
        return 'Engagement';
      case InterventionCategory.motivation:
        return 'Motivation';
    }
  }

  IconData _getCategoryIcon(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Icons.school;
      case InterventionCategory.behavioral:
        return Icons.psychology;
      case InterventionCategory.social:
        return Icons.people;
      case InterventionCategory.accessibility:
        return Icons.accessibility;
      case InterventionCategory.engagement:
        return Icons.trending_up;
      case InterventionCategory.motivation:
        return Icons.emoji_events;
    }
  }

  Color _getCategoryColor(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Colors.blue;
      case InterventionCategory.behavioral:
        return Colors.orange;
      case InterventionCategory.social:
        return Colors.green;
      case InterventionCategory.accessibility:
        return Colors.purple;
      case InterventionCategory.engagement:
        return Colors.teal;
      case InterventionCategory.motivation:
        return Colors.pink;
    }
  }
}

/// Status filter chips for interventions.
class StatusFilterChips extends StatelessWidget {
  const StatusFilterChips({
    super.key,
    required this.selectedStatus,
    required this.onStatusSelected,
  });

  final InterventionStatus? selectedStatus;
  final void Function(InterventionStatus?) onStatusSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          // All chip
          FilterChip(
            label: const Text('All'),
            selected: selectedStatus == null,
            onSelected: (selected) {
              if (selected) {
                onStatusSelected(null);
              }
            },
          ),
          const SizedBox(width: 8),
          // Status chips
          ...InterventionStatus.values.map((status) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(_getStatusLabel(status)),
                selected: selectedStatus == status,
                selectedColor: _getStatusColor(status).withValues(alpha: 0.2),
                onSelected: (selected) {
                  onStatusSelected(selected ? status : null);
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  String _getStatusLabel(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return 'Active';
      case InterventionStatus.completed:
        return 'Completed';
      case InterventionStatus.paused:
        return 'Paused';
      case InterventionStatus.discontinued:
        return 'Ended';
      case InterventionStatus.pending:
        return 'Pending';
    }
  }

  Color _getStatusColor(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return Colors.blue;
      case InterventionStatus.completed:
        return Colors.green;
      case InterventionStatus.paused:
        return Colors.orange;
      case InterventionStatus.discontinued:
        return Colors.grey;
      case InterventionStatus.pending:
        return Colors.purple;
    }
  }
}
