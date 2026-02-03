/// Risk factor card widget
/// Expandable card displaying individual risk factor details
library;

import 'package:flutter/material.dart';
import '../../../models/risk_prediction.dart';
import 'risk_level_badge.dart';

/// Card displaying a single risk factor with expandable details
class RiskFactorCard extends StatefulWidget {
  const RiskFactorCard({
    super.key,
    required this.factor,
    this.isExpanded = false,
    this.onTap,
  });

  final RiskFactor factor;
  final bool isExpanded;
  final VoidCallback? onTap;

  @override
  State<RiskFactorCard> createState() => _RiskFactorCardState();
}

class _RiskFactorCardState extends State<RiskFactorCard>
    with SingleTickerProviderStateMixin {
  late bool _isExpanded;
  late AnimationController _animationController;
  late Animation<double> _expandAnimation;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.isExpanded;
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _expandAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    if (_isExpanded) {
      _animationController.value = 1.0;
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    });
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final severityColor = _getSeverityColor(widget.factor.severity);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: _toggleExpanded,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Severity indicator bar
            Container(
              height: 4,
              color: severityColor,
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row
                  Row(
                    children: [
                      // Category icon
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: severityColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          _getCategoryIcon(widget.factor.category),
                          size: 20,
                          color: severityColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Factor name and category
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.factor.feature,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.factor.category.label,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Severity badge
                      _SeverityBadge(severity: widget.factor.severity),
                      const SizedBox(width: 8),
                      // Expand/collapse icon
                      AnimatedRotation(
                        turns: _isExpanded ? 0.5 : 0,
                        duration: const Duration(milliseconds: 200),
                        child: Icon(
                          Icons.expand_more,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),

                  // Contribution bar
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text(
                        'Contribution',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ContributionBar(
                          value: widget.factor.contribution,
                          color: severityColor,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${(widget.factor.contribution * 100).round()}%',
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: severityColor,
                        ),
                      ),
                    ],
                  ),

                  // Expandable section
                  SizeTransition(
                    sizeFactor: _expandAnimation,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 12),

                        // Description
                        Text(
                          'Description',
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.factor.description,
                          style: theme.textTheme.bodyMedium,
                        ),

                        // Current value
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Icon(
                              Icons.analytics_outlined,
                              size: 16,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Current Value: ',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                            Text(
                              _formatValue(widget.factor.currentValue),
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),

                        // Recommendation
                        if (widget.factor.recommendation != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primaryContainer
                                  .withOpacity(0.3),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: theme.colorScheme.primary.withOpacity(0.2),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.lightbulb_outline,
                                  size: 18,
                                  color: theme.colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Recommendation',
                                        style: theme.textTheme.labelMedium?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: theme.colorScheme.primary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        widget.factor.recommendation!,
                                        style: theme.textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getSeverityColor(RiskSeverity severity) {
    switch (severity) {
      case RiskSeverity.low:
        return RiskLevelColors.watch;
      case RiskSeverity.medium:
        return RiskLevelColors.atRisk;
      case RiskSeverity.high:
        return RiskLevelColors.critical;
    }
  }

  IconData _getCategoryIcon(RiskCategory category) {
    switch (category) {
      case RiskCategory.academic:
        return Icons.school;
      case RiskCategory.engagement:
        return Icons.touch_app;
      case RiskCategory.behavioral:
        return Icons.psychology;
      case RiskCategory.temporal:
        return Icons.schedule;
    }
  }

  String _formatValue(dynamic value) {
    if (value is double) {
      return value.toStringAsFixed(2);
    } else if (value is int) {
      return value.toString();
    } else if (value is bool) {
      return value ? 'Yes' : 'No';
    }
    return value?.toString() ?? 'N/A';
  }
}

/// Severity badge widget
class _SeverityBadge extends StatelessWidget {
  const _SeverityBadge({required this.severity});

  final RiskSeverity severity;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (severity) {
      RiskSeverity.low => (RiskLevelColors.watch, 'Low'),
      RiskSeverity.medium => (RiskLevelColors.atRisk, 'Medium'),
      RiskSeverity.high => (RiskLevelColors.critical, 'High'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Contribution progress bar
class _ContributionBar extends StatelessWidget {
  const _ContributionBar({
    required this.value,
    required this.color,
  });

  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: SizedBox(
        height: 8,
        child: LinearProgressIndicator(
          value: value.clamp(0.0, 1.0),
          backgroundColor: color.withOpacity(0.1),
          valueColor: AlwaysStoppedAnimation(color),
        ),
      ),
    );
  }
}

/// Compact risk factor list item
class RiskFactorListItem extends StatelessWidget {
  const RiskFactorListItem({
    super.key,
    required this.factor,
    this.onTap,
  });

  final RiskFactor factor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final severityColor = _getSeverityColor(factor.severity);

    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: severityColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          _getCategoryIcon(factor.category),
          size: 20,
          color: severityColor,
        ),
      ),
      title: Text(
        factor.feature,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        factor.description,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${(factor.contribution * 100).round()}%',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: severityColor,
            ),
          ),
          const SizedBox(width: 4),
          Icon(
            Icons.chevron_right,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ],
      ),
    );
  }

  Color _getSeverityColor(RiskSeverity severity) {
    switch (severity) {
      case RiskSeverity.low:
        return RiskLevelColors.watch;
      case RiskSeverity.medium:
        return RiskLevelColors.atRisk;
      case RiskSeverity.high:
        return RiskLevelColors.critical;
    }
  }

  IconData _getCategoryIcon(RiskCategory category) {
    switch (category) {
      case RiskCategory.academic:
        return Icons.school;
      case RiskCategory.engagement:
        return Icons.touch_app;
      case RiskCategory.behavioral:
        return Icons.psychology;
      case RiskCategory.temporal:
        return Icons.schedule;
    }
  }
}

/// Grouped risk factors by category
class RiskFactorsGrouped extends StatelessWidget {
  const RiskFactorsGrouped({
    super.key,
    required this.factors,
    this.onFactorTap,
  });

  final List<RiskFactor> factors;
  final void Function(RiskFactor)? onFactorTap;

  @override
  Widget build(BuildContext context) {
    // Group factors by category
    final grouped = <RiskCategory, List<RiskFactor>>{};
    for (final factor in factors) {
      grouped.putIfAbsent(factor.category, () => []).add(factor);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: grouped.entries.map((entry) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Icon(
                    _getCategoryIcon(entry.key),
                    size: 16,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    entry.key.label,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
              ),
            ),
            ...entry.value.map((factor) {
              return RiskFactorCard(
                factor: factor,
                onTap: () => onFactorTap?.call(factor),
              );
            }),
          ],
        );
      }).toList(),
    );
  }

  IconData _getCategoryIcon(RiskCategory category) {
    switch (category) {
      case RiskCategory.academic:
        return Icons.school;
      case RiskCategory.engagement:
        return Icons.touch_app;
      case RiskCategory.behavioral:
        return Icons.psychology;
      case RiskCategory.temporal:
        return Icons.schedule;
    }
  }
}
