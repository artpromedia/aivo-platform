/// Student risk card widget
/// Displays student risk information in a card format
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import '../../../models/risk_prediction.dart';
import 'risk_level_badge.dart';

/// Card displaying student risk summary
class StudentRiskCard extends StatelessWidget {
  const StudentRiskCard({
    super.key,
    required this.student,
    this.compact = false,
    this.onTap,
    this.onLogContact,
    this.onScheduleMeeting,
  });

  final EarlyWarningStudent student;
  final bool compact;
  final VoidCallback? onTap;
  final VoidCallback? onLogContact;
  final VoidCallback? onScheduleMeeting;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (compact) {
      return _buildCompactCard(context, theme);
    }

    return _buildFullCard(context, theme);
  }

  Widget _buildCompactCard(BuildContext context, ThemeData theme) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar
              _buildAvatar(32),
              const SizedBox(width: 12),
              // Name and risk level
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.studentName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        RiskLevelBadge(
                          level: student.riskLevel,
                          size: RiskBadgeSize.small,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${student.riskScorePercent}%',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: RiskLevelColors.forLevel(student.riskLevel),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Arrow
              Icon(
                Icons.chevron_right,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFullCard(BuildContext context, ThemeData theme) {
    final riskColor = RiskLevelColors.forLevel(student.riskLevel);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Risk level indicator bar
            Container(
              height: 4,
              color: riskColor,
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row
                  Row(
                    children: [
                      _buildAvatar(48),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              student.studentName,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                RiskLevelBadge(level: student.riskLevel),
                                const SizedBox(width: 8),
                                if (student.daysAtRisk > 0)
                                  Text(
                                    '${student.daysAtRisk} days',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: theme.colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Risk score gauge
                      RiskScoreGauge(
                        score: student.riskScore,
                        level: student.riskLevel,
                        size: 56,
                        showLabel: false,
                      ),
                    ],
                  ),

                  // Risk factors
                  if (student.primaryRiskFactors.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Risk Factors',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: student.primaryRiskFactors
                          .take(3)
                          .map((factor) => _RiskFactorChip(factor: factor))
                          .toList(),
                    ),
                  ],

                  // Suggested interventions
                  if (student.suggestedInterventions.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Suggested Actions',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    ...student.suggestedInterventions.take(2).map(
                          (intervention) => Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.lightbulb_outline,
                                  size: 16,
                                  color: theme.colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    intervention,
                                    style: theme.textTheme.bodySmall,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                  ],

                  // Last contact info
                  if (student.lastTeacherContact != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          Icons.history,
                          size: 16,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Last contact: ${_formatRelativeDate(student.lastTeacherContact!)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],

                  // Action buttons
                  if (onLogContact != null || onScheduleMeeting != null) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        if (onLogContact != null)
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: onLogContact,
                              icon: const Icon(Icons.note_add, size: 18),
                              label: const Text('Log Contact'),
                            ),
                          ),
                        if (onLogContact != null && onScheduleMeeting != null)
                          const SizedBox(width: 8),
                        if (onScheduleMeeting != null)
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: onScheduleMeeting,
                              icon: const Icon(Icons.calendar_today, size: 18),
                              label: const Text('Schedule'),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar(double size) {
    final initials = _getInitials(student.studentName);
    final color = RiskLevelColors.forLevel(student.riskLevel);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.3), width: 2),
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            fontSize: size * 0.4,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String _formatRelativeDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else if (difference.inDays < 30) {
      return '${(difference.inDays / 7).floor()} weeks ago';
    } else {
      return '${(difference.inDays / 30).floor()} months ago';
    }
  }
}

/// Chip displaying a risk factor
class _RiskFactorChip extends StatelessWidget {
  const _RiskFactorChip({required this.factor});

  final RiskFactor factor;

  @override
  Widget build(BuildContext context) {
    final color = _colorForSeverity(factor.severity);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _iconForCategory(factor.category),
            size: 14,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            factor.feature,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Color _colorForSeverity(RiskSeverity severity) {
    switch (severity) {
      case RiskSeverity.high:
        return AivoBrand.error;
      case RiskSeverity.medium:
        return AivoBrand.warning;
      case RiskSeverity.low:
        return Colors.amber;
    }
  }

  IconData _iconForCategory(RiskCategory category) {
    switch (category) {
      case RiskCategory.academic:
        return Icons.school;
      case RiskCategory.engagement:
        return Icons.trending_down;
      case RiskCategory.behavioral:
        return Icons.psychology;
      case RiskCategory.temporal:
        return Icons.schedule;
    }
  }
}

/// Full student risk detail card with all information
class StudentRiskDetailCard extends StatelessWidget {
  const StudentRiskDetailCard({
    super.key,
    required this.prediction,
    this.interventions,
    this.onViewInterventions,
  });

  final RiskPrediction prediction;
  final InterventionPlan? interventions;
  final VoidCallback? onViewInterventions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Risk overview
            Row(
              children: [
                RiskScoreGauge(
                  score: prediction.riskScore,
                  level: prediction.riskLevel,
                  size: 80,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RiskLevelBadge(
                        level: prediction.riskLevel,
                        size: RiskBadgeSize.large,
                      ),
                      const SizedBox(height: 8),
                      RiskTrendIndicator(
                        trend: prediction.riskTrend,
                        scoreChange: prediction.scoreChange,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Confidence: ${prediction.confidencePercent}%',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const Divider(height: 32),

            // Category breakdown
            Text(
              'Risk by Category',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            _buildCategoryBreakdown(theme),

            // Top risk factors
            if (prediction.topRiskFactors.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Top Risk Factors',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              ...prediction.topRiskFactors.map(
                (factor) => _RiskFactorRow(factor: factor),
              ),
            ],

            // Protective factors
            if (prediction.protectiveFactors.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Protective Factors',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AivoBrand.success,
                ),
              ),
              const SizedBox(height: 12),
              ...prediction.protectiveFactors.map(
                (factor) => _ProtectiveFactorRow(factor: factor),
              ),
            ],

            // Interventions CTA
            if (interventions != null &&
                interventions!.allRecommendations.isNotEmpty) ...[
              const SizedBox(height: 24),
              Card(
                color: theme.colorScheme.primaryContainer,
                child: InkWell(
                  onTap: onViewInterventions,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(
                          Icons.lightbulb,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${interventions!.allRecommendations.length} Recommended Interventions',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: theme.colorScheme.onPrimaryContainer,
                                ),
                              ),
                              if (interventions!.requiresImmediateAction)
                                Text(
                                  'Immediate action recommended',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onPrimaryContainer,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBreakdown(ThemeData theme) {
    final categories = [
      ('Academic', prediction.categoryScores.academic, Icons.school, Colors.blue),
      ('Engagement', prediction.categoryScores.engagement, Icons.trending_up, Colors.purple),
      ('Behavioral', prediction.categoryScores.behavioral, Icons.psychology, Colors.orange),
      ('Temporal', prediction.categoryScores.temporal, Icons.schedule, Colors.teal),
    ];

    return Column(
      children: categories.map((cat) {
        final (label, score, icon, color) = cat;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 8),
              SizedBox(
                width: 80,
                child: Text(
                  label,
                  style: theme.textTheme.bodySmall,
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: score,
                    backgroundColor: color.withValues(alpha: 0.1),
                    valueColor: AlwaysStoppedAnimation(
                      _getScoreColor(score),
                    ),
                    minHeight: 8,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 40,
                child: Text(
                  '${(score * 100).round()}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: _getScoreColor(score),
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _getScoreColor(double score) {
    if (score >= 0.75) return RiskLevelColors.critical;
    if (score >= 0.5) return RiskLevelColors.atRisk;
    if (score >= 0.25) return RiskLevelColors.watch;
    return RiskLevelColors.onTrack;
  }
}

/// Row displaying a risk factor
class _RiskFactorRow extends StatelessWidget {
  const _RiskFactorRow({required this.factor});

  final RiskFactor factor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _colorForSeverity(factor.severity);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 6),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
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
                        factor.feature,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Text(
                      '${(factor.contribution * 100).round()}%',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  factor.description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                if (factor.recommendation != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '💡 ${factor.recommendation}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _colorForSeverity(RiskSeverity severity) {
    switch (severity) {
      case RiskSeverity.high:
        return AivoBrand.error;
      case RiskSeverity.medium:
        return AivoBrand.warning;
      case RiskSeverity.low:
        return Colors.amber;
    }
  }
}

/// Row displaying a protective factor
class _ProtectiveFactorRow extends StatelessWidget {
  const _ProtectiveFactorRow({required this.factor});

  final ProtectiveFactor factor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.shield,
            size: 16,
            color: AivoBrand.success,
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
                        factor.feature,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Text(
                      '+${(factor.contribution * 100).round()}%',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AivoBrand.success,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  factor.description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
