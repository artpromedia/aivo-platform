/// "Why This?" UI components for surfacing explanations.
///
/// Provides contextual explanations for AI-driven decisions with:
/// - Subtle "Why this?" buttons
/// - Accessible bottom sheets
/// - Graceful fallbacks when data is missing

import 'package:flutter/material.dart';

import '../data/explanation.dart';

// ══════════════════════════════════════════════════════════════════════════════
// WHY THIS BUTTON
// ══════════════════════════════════════════════════════════════════════════════

/// A subtle "Why this?" button that opens an explanation bottom sheet.
///
/// Usage:
/// ```dart
/// WhyThisButton(
///   entityType: 'LEARNING_OBJECT_VERSION',
///   entityId: activity.id,
///   learnerId: learnerId,
///   explanationService: explanationService,
/// )
/// ```
class WhyThisButton extends StatelessWidget {
  /// The type of entity being explained (e.g., LEARNING_OBJECT_VERSION, SKILL).
  final String entityType;

  /// The ID of the entity being explained.
  final String entityId;

  /// Optional learner ID to filter explanations.
  final String? learnerId;

  /// Service for fetching explanations.
  final ExplanationService explanationService;

  /// Optional custom label (default: "Why this?").
  final String? label;

  /// Whether to show as icon only (more compact).
  final bool iconOnly;

  /// Custom icon (default: info_outline).
  final IconData? icon;

  /// Button style variant.
  final WhyThisButtonStyle style;

  const WhyThisButton({
    super.key,
    required this.entityType,
    required this.entityId,
    required this.explanationService,
    this.learnerId,
    this.label,
    this.iconOnly = false,
    this.icon,
    this.style = WhyThisButtonStyle.subtle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final buttonIcon = icon ?? Icons.info_outline;
    final buttonLabel = label ?? 'Why this?';

    switch (style) {
      case WhyThisButtonStyle.subtle:
        if (iconOnly) {
          return IconButton(
            icon: Icon(
              buttonIcon,
              size: 18,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            onPressed: () => _showExplanation(context),
            tooltip: buttonLabel,
            padding: const EdgeInsets.all(4),
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
          );
        }
        return TextButton.icon(
          onPressed: () => _showExplanation(context),
          icon: Icon(buttonIcon, size: 16),
          label: Text(
            buttonLabel,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.primary,
            ),
          ),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            minimumSize: const Size(0, 28),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        );

      case WhyThisButtonStyle.outlined:
        return OutlinedButton.icon(
          onPressed: () => _showExplanation(context),
          icon: Icon(buttonIcon, size: 16),
          label: Text(buttonLabel),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        );

      case WhyThisButtonStyle.filled:
        return FilledButton.icon(
          onPressed: () => _showExplanation(context),
          icon: Icon(buttonIcon, size: 16),
          label: Text(buttonLabel),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        );
    }
  }

  Future<void> _showExplanation(BuildContext context) async {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => ExplanationBottomSheet(
        entityType: entityType,
        entityId: entityId,
        learnerId: learnerId,
        explanationService: explanationService,
      ),
    );
  }
}

/// Button style variants for WhyThisButton.
enum WhyThisButtonStyle {
  /// Subtle text button (default, least intrusive).
  subtle,

  /// Outlined button.
  outlined,

  /// Filled button.
  filled,
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLANATION BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════

/// Bottom sheet that displays explanation details.
class ExplanationBottomSheet extends StatefulWidget {
  final String entityType;
  final String entityId;
  final String? learnerId;
  final ExplanationService explanationService;

  const ExplanationBottomSheet({
    super.key,
    required this.entityType,
    required this.entityId,
    required this.explanationService,
    this.learnerId,
  });

  @override
  State<ExplanationBottomSheet> createState() => _ExplanationBottomSheetState();
}

class _ExplanationBottomSheetState extends State<ExplanationBottomSheet> {
  late Future<ExplanationsResponse> _explanationFuture;
  bool _showDetails = false;

  @override
  void initState() {
    super.initState();
    _explanationFuture = widget.explanationService.getByEntity(
      relatedEntityType: widget.entityType,
      relatedEntityId: widget.entityId,
      learnerId: widget.learnerId,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.4,
      minChildSize: 0.25,
      maxChildSize: 0.85,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      color: theme.colorScheme.primary,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Why Aivo chose this',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                      tooltip: 'Close',
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Content
              Expanded(
                child: FutureBuilder<ExplanationsResponse>(
                  future: _explanationFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: CircularProgressIndicator(),
                      );
                    }

                    if (snapshot.hasError) {
                      return _buildErrorState(context);
                    }

                    final response = snapshot.data;
                    if (response == null || response.explanations.isEmpty) {
                      return _buildErrorState(context);
                    }

                    final explanation = response.primary!;
                    return _buildExplanationContent(
                      context,
                      scrollController,
                      explanation,
                      response.hasFallback,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildExplanationContent(
    BuildContext context,
    ScrollController scrollController,
    Explanation explanation,
    bool isFallback,
  ) {
    final theme = Theme.of(context);

    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(20),
      children: [
        // Summary
        Text(
          explanation.summary,
          style: theme.textTheme.bodyLarge?.copyWith(
            height: 1.5,
          ),
        ),
        // Details section (if available)
        if (explanation.details.hasContent && !isFallback) ...[
          const SizedBox(height: 16),
          _buildDetailsToggle(context),
          if (_showDetails) ...[
            const SizedBox(height: 12),
            _buildDetailsSection(context, explanation.details),
          ],
        ],
        // Fallback note
        if (isFallback) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'We\'re working on providing more detailed explanations.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDetailsToggle(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () => setState(() => _showDetails = !_showDetails),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(
              _showDetails ? Icons.expand_less : Icons.expand_more,
              size: 20,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(width: 4),
            Text(
              _showDetails ? 'Hide details' : 'More details',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsSection(BuildContext context, ExplanationDetails details) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Reasons
        if (details.reasons.isNotEmpty) ...[
          Text(
            'What Aivo considered:',
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          ...details.reasons.map((reason) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        reason.label,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              )),
        ],
        // Inputs
        if (details.inputs.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'Based on these factors:',
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          ...details.inputs.map((input) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      input.label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      input.displayValue,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              )),
        ],
        // Additional context
        if (details.additionalContext != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              details.additionalContext!,
              style: theme.textTheme.bodySmall?.copyWith(
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildErrorState(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.help_outline,
            size: 48,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            "Aivo used your child's recent work and learning goals to pick this activity.",
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: 8),
          Text(
            "We're working on providing more detailed explanations.",
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLANATION CARD
// ══════════════════════════════════════════════════════════════════════════════

/// A card displaying an explanation summary with optional "More" action.
///
/// Useful for showing recent explanations in a list.
class ExplanationCard extends StatelessWidget {
  final Explanation explanation;
  final VoidCallback? onTap;

  const ExplanationCard({
    super.key,
    required this.explanation,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _getActionIcon(explanation.actionType),
                    size: 18,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _getActionLabel(explanation.actionType),
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(explanation.createdAt),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                explanation.summary,
                style: theme.textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getActionIcon(String actionType) {
    switch (actionType) {
      case 'CONTENT_SELECTION':
        return Icons.auto_awesome;
      case 'DIFFICULTY_CHANGE':
        return Icons.tune;
      case 'FOCUS_BREAK_TRIGGER':
        return Icons.timer;
      case 'MODULE_RECOMMENDATION':
        return Icons.school;
      case 'SCAFFOLDING_DECISION':
        return Icons.support;
      default:
        return Icons.lightbulb_outline;
    }
  }

  String _getActionLabel(String actionType) {
    switch (actionType) {
      case 'CONTENT_SELECTION':
        return 'Activity Selection';
      case 'DIFFICULTY_CHANGE':
        return 'Difficulty Adjustment';
      case 'FOCUS_BREAK_TRIGGER':
        return 'Focus Break';
      case 'MODULE_RECOMMENDATION':
        return 'Module Suggestion';
      case 'SCAFFOLDING_DECISION':
        return 'Learning Support';
      default:
        return 'Decision';
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}
