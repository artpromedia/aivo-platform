/// Risk distribution chart widget
/// Horizontal stacked bar showing student risk distribution
library;

import 'package:flutter/material.dart';
import '../../../models/risk_prediction.dart';
import '../../../repositories/risk_repository.dart';
import 'risk_level_badge.dart';

/// Horizontal stacked bar chart showing risk distribution
class RiskDistributionChart extends StatelessWidget {
  const RiskDistributionChart({
    super.key,
    required this.distribution,
    this.height = 24,
    this.showLabels = false,
    this.orientation = Axis.horizontal,
  });

  final RiskDistribution distribution;
  final double height;
  final bool showLabels;
  final Axis orientation;

  @override
  Widget build(BuildContext context) {
    final total = distribution.total;
    if (total == 0) {
      return SizedBox(
        height: height,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(height / 2),
          ),
        ),
      );
    }

    final segments = [
      _DistributionSegment(
        count: distribution.onTrack,
        color: RiskLevelColors.onTrack,
        label: 'On Track',
      ),
      _DistributionSegment(
        count: distribution.watch,
        color: RiskLevelColors.watch,
        label: 'Watch',
      ),
      _DistributionSegment(
        count: distribution.atRisk,
        color: RiskLevelColors.atRisk,
        label: 'At Risk',
      ),
      _DistributionSegment(
        count: distribution.critical,
        color: RiskLevelColors.critical,
        label: 'Critical',
      ),
    ];

    if (orientation == Axis.vertical) {
      return _buildVerticalChart(segments, total);
    }

    return _buildHorizontalChart(segments, total);
  }

  Widget _buildHorizontalChart(List<_DistributionSegment> segments, int total) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(height / 2),
      child: SizedBox(
        height: height,
        child: Row(
          children: segments.where((s) => s.count > 0).map((segment) {
            final flex = (segment.count / total * 100).round();
            return Flexible(
              flex: flex > 0 ? flex : 1,
              child: Container(
                color: segment.color,
                child: showLabels && segment.count > 0
                    ? Center(
                        child: Text(
                          '${segment.count}',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: height * 0.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    : null,
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildVerticalChart(List<_DistributionSegment> segments, int total) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: Column(
        children: segments.reversed.where((s) => s.count > 0).map((segment) {
          final flex = (segment.count / total * 100).round();
          return Flexible(
            flex: flex > 0 ? flex : 1,
            child: Container(
              width: height,
              color: segment.color,
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _DistributionSegment {
  const _DistributionSegment({
    required this.count,
    required this.color,
    required this.label,
  });

  final int count;
  final Color color;
  final String label;
}

/// Compact risk indicator showing just the distribution
class RiskIndicator extends StatelessWidget {
  const RiskIndicator({
    super.key,
    required this.distribution,
    this.size = 40,
  });

  final RiskDistribution distribution;
  final double size;

  @override
  Widget build(BuildContext context) {
    final total = distribution.total;
    if (total == 0) {
      return SizedBox(
        width: size,
        height: size,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            shape: BoxShape.circle,
          ),
        ),
      );
    }

    // Determine dominant risk level
    final levels = [
      (distribution.critical, RiskLevel.critical),
      (distribution.atRisk, RiskLevel.atRisk),
      (distribution.watch, RiskLevel.watch),
      (distribution.onTrack, RiskLevel.onTrack),
    ];

    final dominant = levels.firstWhere((l) => l.$1 > 0, orElse: () => (0, RiskLevel.onTrack));
    final color = RiskLevelColors.forLevel(dominant.$2);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          // Background
          Container(
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(color: color.withValues(alpha: 0.3), width: 2),
            ),
          ),
          // Need attention count
          if (distribution.needsAttention > 0)
            Center(
              child: Text(
                '${distribution.needsAttention}',
                style: TextStyle(
                  fontSize: size * 0.4,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Category breakdown chart showing scores per category
class RiskCategoryBreakdown extends StatelessWidget {
  const RiskCategoryBreakdown({
    super.key,
    required this.scores,
    this.showLabels = true,
  });

  final RiskCategoryScores scores;
  final bool showLabels;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildCategoryBar('Academic', scores.academic, Colors.blue, theme),
        const SizedBox(height: 8),
        _buildCategoryBar('Engagement', scores.engagement, Colors.purple, theme),
        const SizedBox(height: 8),
        _buildCategoryBar('Behavioral', scores.behavioral, Colors.orange, theme),
        const SizedBox(height: 8),
        _buildCategoryBar('Temporal', scores.temporal, Colors.teal, theme),
      ],
    );
  }

  Widget _buildCategoryBar(
    String label,
    double score,
    Color color,
    ThemeData theme,
  ) {
    final scorePercent = (score * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabels)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                '$scorePercent%',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: _getScoreColor(score),
                ),
              ),
            ],
          ),
        if (showLabels) const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: score,
            backgroundColor: color.withValues(alpha: 0.1),
            valueColor: AlwaysStoppedAnimation(_getScoreColor(score)),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Color _getScoreColor(double score) {
    if (score >= 0.75) return RiskLevelColors.critical;
    if (score >= 0.5) return RiskLevelColors.atRisk;
    if (score >= 0.25) return RiskLevelColors.watch;
    return RiskLevelColors.onTrack;
  }
}

/// Risk history chart showing trend over time
class RiskHistoryChart extends StatelessWidget {
  const RiskHistoryChart({
    super.key,
    required this.history,
    this.height = 120,
  });

  final List<RiskHistoryEntry> history;
  final double height;

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Text(
            'No history available',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey,
                ),
          ),
        ),
      );
    }

    return SizedBox(
      height: height,
      child: CustomPaint(
        size: Size.infinite,
        painter: _RiskHistoryPainter(history: history),
      ),
    );
  }
}

class _RiskHistoryPainter extends CustomPainter {
  _RiskHistoryPainter({required this.history});

  final List<RiskHistoryEntry> history;

  @override
  void paint(Canvas canvas, Size size) {
    if (history.isEmpty) return;

    final paint = Paint()
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..style = PaintingStyle.fill;

    final path = Path();
    final fillPath = Path();

    final maxScore = 1.0;
    final minScore = 0.0;
    final scoreRange = maxScore - minScore;

    final stepX = size.width / (history.length - 1).clamp(1, double.infinity);

    for (var i = 0; i < history.length; i++) {
      final entry = history[i];
      final x = i * stepX;
      final y = size.height - ((entry.riskScore - minScore) / scoreRange * size.height);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      // Draw point
      final pointPaint = Paint()
        ..color = RiskLevelColors.forLevel(entry.riskLevel)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(x, y), 4, pointPaint);
    }

    // Complete fill path
    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    // Draw gradient fill
    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Colors.red.withValues(alpha: 0.2),
        Colors.green.withValues(alpha: 0.1),
      ],
    );
    fillPaint.shader = gradient.createShader(
      Rect.fromLTWH(0, 0, size.width, size.height),
    );
    canvas.drawPath(fillPath, fillPaint);

    // Draw line
    paint.color = Colors.grey.shade400;
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _RiskHistoryPainter oldDelegate) {
    return oldDelegate.history != history;
  }
}
