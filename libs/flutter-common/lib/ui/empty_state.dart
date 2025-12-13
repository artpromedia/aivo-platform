/// Empty State Widget
///
/// Placeholder for empty lists and content.
library;

import 'package:flutter/material.dart';

import 'aivo_button.dart';

/// Empty state placeholder.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.message,
    this.title,
    this.icon,
    this.actionLabel,
    this.onAction,
  });

  final String message;
  final String? title;
  final IconData? icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon ?? Icons.inbox_outlined,
              size: 64,
              color: colorScheme.primary.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            if (title != null) ...[
              Text(
                title!,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
            ],
            Text(
              message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              AivoButton(
                label: actionLabel!,
                onPressed: onAction,
                variant: AivoButtonVariant.primary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Empty state for lists.
class EmptyListState extends StatelessWidget {
  const EmptyListState({
    super.key,
    this.itemType = 'items',
    this.addLabel,
    this.onAdd,
  });

  final String itemType;
  final String? addLabel;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.list,
      title: 'No $itemType yet',
      message: 'Get started by adding your first ${itemType.toLowerCase()}.',
      actionLabel: addLabel,
      onAction: onAdd,
    );
  }
}

/// Empty state for search results.
class EmptySearchState extends StatelessWidget {
  const EmptySearchState({
    super.key,
    this.query,
    this.onClear,
  });

  final String? query;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.search_off,
      title: 'No results found',
      message: query != null
          ? 'No results found for "$query". Try a different search term.'
          : 'Try adjusting your search criteria.',
      actionLabel: onClear != null ? 'Clear Search' : null,
      onAction: onClear,
    );
  }
}
