/// Metric Card Widget
///
/// Displays a single metric with value, trend, and optional chart.
library;

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../models/analytics.dart';

/// A card displaying a single performance metric.
class MetricCard extends StatelessWidget {
  const MetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.unit,
    this.change,
    this.changePercent,
    this.trend = TrendDirection.stable,
    this.trendData = const [],
    this.target,
    this.icon,
    this.color,
    this.onTap,
    this.showChart = true,
    this.compact = false,
  });

  final String title;
  final double value;
  final String unit;
  final double? change;
  final double? changePercent;
  final TrendDirection trend;
  final List<TimeSeriesDataPoint> trendData;
  final double? target;
  final IconData? icon;
  final Color? color;
  final VoidCallback? onTap;
  final bool showChart;
  final bool compact;

  factory MetricCard.fromMetric(
    PerformanceMetric metric, {
    IconData? icon,
    Color? color,
    VoidCallback? onTap,
    bool showChart = true,
    bool compact = false,
  }) {
    return MetricCard(
      title: metric.metricName,
      value: metric.value,
      unit: metric.unit,
      change: metric.change,
      changePercent: metric.changePercent,
      trend: metric.trend,
      trendData: metric.trendData,
      target: metric.target,
      icon: icon,
      color: color,
      onTap: onTap,
      showChart: showChart,
      compact: compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardColor = color ?? theme.colorScheme.primary;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(compact ? 12 : 16),
          child: compact ? _buildCompactContent(theme, cardColor) : _buildFullContent(theme, cardColor),
        ),
      ),
    );
  }

  Widget _buildCompactContent(ThemeData theme, Color cardColor) {
    return Row(
      children: [
        if (icon != null) ...[
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: cardColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: cardColor, size: 20),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(
                    _formatValue(value, unit),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (changePercent != null) ...[
                    const SizedBox(width: 8),
                    _buildTrendBadge(theme),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFullContent(ThemeData theme, Color cardColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: cardColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: cardColor, size: 24),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _formatValue(value, unit),
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 4),
                      if (unit.isNotEmpty && !_isPercentage())
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            unit,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (changePercent != null) _buildTrendBadge(theme),
          ],
        ),
        if (target != null) ...[
          const SizedBox(height: 12),
          _buildTargetProgress(theme, cardColor),
        ],
        if (showChart && trendData.isNotEmpty) ...[
          const SizedBox(height: 16),
          SizedBox(
            height: 60,
            child: _buildSparkline(theme, cardColor),
          ),
        ],
      ],
    );
  }

  Widget _buildTrendBadge(ThemeData theme) {
    final isPositive = (changePercent ?? 0) >= 0;
    final trendColor = trend == TrendDirection.increasing
        ? Colors.green
        : trend == TrendDirection.decreasing
            ? Colors.red
            : theme.colorScheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: trendColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isPositive ? Icons.trending_up : Icons.trending_down,
            size: 14,
            color: trendColor,
          ),
          const SizedBox(width: 4),
          Text(
            '${isPositive ? '+' : ''}${changePercent?.toStringAsFixed(1)}%',
            style: theme.textTheme.bodySmall?.copyWith(
              color: trendColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTargetProgress(ThemeData theme, Color cardColor) {
    final progress = target != null && target! > 0 ? (value / target!).clamp(0.0, 1.0) : 0.0;
    final isTargetMet = value >= (target ?? 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Target: ${_formatValue(target!, unit)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (isTargetMet)
              Icon(
                Icons.check_circle,
                size: 16,
                color: Colors.green,
              ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: cardColor.withValues(alpha: 0.1),
            valueColor: AlwaysStoppedAnimation(
              isTargetMet ? Colors.green : cardColor,
            ),
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildSparkline(ThemeData theme, Color cardColor) {
    if (trendData.isEmpty) return const SizedBox.shrink();

    final spots = trendData.asMap().entries.map((entry) {
      return FlSpot(entry.key.toDouble(), entry.value.value);
    }).toList();

    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineTouchData: const LineTouchData(enabled: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: cardColor,
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: cardColor.withValues(alpha: 0.1),
            ),
          ),
        ],
        minY: spots.map((s) => s.y).reduce((a, b) => a < b ? a : b) * 0.9,
        maxY: spots.map((s) => s.y).reduce((a, b) => a > b ? a : b) * 1.1,
      ),
    );
  }

  String _formatValue(double value, String unit) {
    if (_isPercentage()) {
      return '${value.toStringAsFixed(1)}%';
    }
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    }
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    if (value == value.roundToDouble()) {
      return value.toInt().toString();
    }
    return value.toStringAsFixed(1);
  }

  bool _isPercentage() => unit == '%' || unit.toLowerCase() == 'percent';
}

/// A row of metric cards.
class MetricCardRow extends StatelessWidget {
  const MetricCardRow({
    super.key,
    required this.metrics,
    this.crossAxisCount = 2,
    this.childAspectRatio = 1.5,
    this.mainAxisSpacing = 12,
    this.crossAxisSpacing = 12,
  });

  final List<PerformanceMetric> metrics;
  final int crossAxisCount;
  final double childAspectRatio;
  final double mainAxisSpacing;
  final double crossAxisSpacing;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        mainAxisSpacing: mainAxisSpacing,
        crossAxisSpacing: crossAxisSpacing,
      ),
      itemCount: metrics.length,
      itemBuilder: (context, index) {
        return MetricCard.fromMetric(
          metrics[index],
          compact: true,
        );
      },
    );
  }
}
