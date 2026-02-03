/// Risk trend line chart widget
/// Displays student risk score history using fl_chart
library;

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_common/theme/theme.dart';
import '../../../models/risk_prediction.dart';
import '../../../repositories/risk_repository.dart' show RiskHistoryEntry;
import 'risk_level_badge.dart';

/// Line chart showing risk score trends over time
class RiskTrendChart extends StatefulWidget {
  const RiskTrendChart({
    super.key,
    required this.history,
    this.height = 200,
    this.showAxisLabels = true,
    this.showGrid = true,
    this.showDots = true,
    this.animationDuration = const Duration(milliseconds: 500),
  });

  final List<RiskHistoryEntry> history;
  final double height;
  final bool showAxisLabels;
  final bool showGrid;
  final bool showDots;
  final Duration animationDuration;

  @override
  State<RiskTrendChart> createState() => _RiskTrendChartState();
}

class _RiskTrendChartState extends State<RiskTrendChart> {
  int? _touchedIndex;

  @override
  Widget build(BuildContext context) {
    if (widget.history.isEmpty) {
      return SizedBox(
        height: widget.height,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.show_chart,
                size: 48,
                color: AivoBrand.gray[300],
              ),
              const SizedBox(height: 8),
              Text(
                'No history data available',
                style: TextStyle(color: AivoBrand.gray[500]),
              ),
            ],
          ),
        ),
      );
    }

    final theme = Theme.of(context);
    final sortedHistory = List<RiskHistoryEntry>.from(widget.history)
      ..sort((a, b) => a.date.compareTo(b.date));

    return SizedBox(
      height: widget.height,
      child: LineChart(
        LineChartData(
          minY: 0,
          maxY: 1,
          lineTouchData: LineTouchData(
            enabled: true,
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((spot) {
                  final entry = sortedHistory[spot.x.toInt()];
                  return LineTooltipItem(
                    '${(entry.riskScore * 100).round()}%\n',
                    TextStyle(
                      color: _getColorForScore(entry.riskScore),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    children: [
                      TextSpan(
                        text: _formatDate(entry.date),
                        style: TextStyle(
                          color: theme.colorScheme.onSurface,
                          fontWeight: FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  );
                }).toList();
              },
            ),
            touchCallback: (event, response) {
              setState(() {
                if (response != null && response.lineBarSpots != null) {
                  _touchedIndex = response.lineBarSpots!.first.x.toInt();
                } else {
                  _touchedIndex = null;
                }
              });
            },
          ),
          gridData: FlGridData(
            show: widget.showGrid,
            drawVerticalLine: false,
            horizontalInterval: 0.25,
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: AivoBrand.gray[200]!,
                strokeWidth: 1,
                dashArray: [4, 4],
              );
            },
          ),
          titlesData: FlTitlesData(
            show: widget.showAxisLabels,
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                interval: _calculateDateInterval(sortedHistory.length),
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index < 0 || index >= sortedHistory.length) {
                    return const SizedBox.shrink();
                  }
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _formatShortDate(sortedHistory[index].date),
                      style: TextStyle(
                        fontSize: 10,
                        color: AivoBrand.gray[500],
                      ),
                    ),
                  );
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40,
                interval: 0.25,
                getTitlesWidget: (value, meta) {
                  return Text(
                    '${(value * 100).toInt()}%',
                    style: TextStyle(
                      fontSize: 10,
                      color: AivoBrand.gray[500],
                    ),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border(
              bottom: BorderSide(color: AivoBrand.gray[300]!),
              left: BorderSide(color: AivoBrand.gray[300]!),
            ),
          ),
          lineBarsData: [
            // Risk threshold lines
            _buildThresholdLine(0.75, RiskLevelColors.critical.withOpacity(0.3)),
            _buildThresholdLine(0.50, RiskLevelColors.atRisk.withOpacity(0.3)),
            _buildThresholdLine(0.25, RiskLevelColors.watch.withOpacity(0.3)),
            // Main risk line
            LineChartBarData(
              spots: sortedHistory.asMap().entries.map((entry) {
                return FlSpot(entry.key.toDouble(), entry.value.riskScore);
              }).toList(),
              isCurved: true,
              curveSmoothness: 0.3,
              color: theme.colorScheme.primary,
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: widget.showDots,
                getDotPainter: (spot, percent, barData, index) {
                  final isSelected = index == _touchedIndex;
                  final color = _getColorForScore(spot.y);
                  return FlDotCirclePainter(
                    radius: isSelected ? 6 : 4,
                    color: color,
                    strokeWidth: 2,
                    strokeColor: Colors.white,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    theme.colorScheme.primary.withOpacity(0.3),
                    theme.colorScheme.primary.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ],
        ),
        duration: widget.animationDuration,
        curve: Curves.easeInOut,
      ),
    );
  }

  LineChartBarData _buildThresholdLine(double y, Color color) {
    return LineChartBarData(
      spots: [FlSpot(0, y), FlSpot(widget.history.length - 1, y)],
      isCurved: false,
      color: color,
      barWidth: 1,
      dotData: const FlDotData(show: false),
      dashArray: [4, 4],
    );
  }

  Color _getColorForScore(double score) {
    if (score >= 0.75) return RiskLevelColors.critical;
    if (score >= 0.50) return RiskLevelColors.atRisk;
    if (score >= 0.25) return RiskLevelColors.watch;
    return RiskLevelColors.onTrack;
  }

  double _calculateDateInterval(int dataPoints) {
    if (dataPoints <= 5) return 1;
    if (dataPoints <= 10) return 2;
    if (dataPoints <= 20) return 4;
    return (dataPoints / 5).ceil().toDouble();
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  String _formatShortDate(DateTime date) {
    return '${date.month}/${date.day}';
  }
}

/// Risk category breakdown chart (radar/spider or bar chart)
class RiskCategoryChart extends StatelessWidget {
  const RiskCategoryChart({
    super.key,
    required this.categoryScores,
    this.height = 180,
    this.showLabels = true,
  });

  final RiskCategoryScores categoryScores;
  final double height;
  final bool showLabels;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final categories = [
      _CategoryData('Academic', categoryScores.academic, Icons.school),
      _CategoryData('Engagement', categoryScores.engagement, Icons.touch_app),
      _CategoryData('Behavioral', categoryScores.behavioral, Icons.psychology),
      _CategoryData('Temporal', categoryScores.temporal, Icons.schedule),
    ];

    return SizedBox(
      height: height,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 1,
          barTouchData: BarTouchData(
            enabled: true,
            touchTooltipData: BarTouchTooltipData(
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final category = categories[groupIndex];
                return BarTooltipItem(
                  '${category.name}\n',
                  TextStyle(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                  ),
                  children: [
                    TextSpan(
                      text: '${(category.score * 100).round()}%',
                      style: TextStyle(
                        color: _getColorForScore(category.score),
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: showLabels,
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                interval: 0.25,
                getTitlesWidget: (value, meta) {
                  return Text(
                    '${(value * 100).toInt()}%',
                    style: TextStyle(
                      fontSize: 10,
                      color: AivoBrand.gray[500],
                    ),
                  );
                },
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 50,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index < 0 || index >= categories.length) {
                    return const SizedBox.shrink();
                  }
                  final category = categories[index];
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          category.icon,
                          size: 16,
                          color: _getColorForScore(category.score),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          category.name.substring(0, 3),
                          style: TextStyle(
                            fontSize: 10,
                            color: AivoBrand.gray[600],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 0.25,
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: AivoBrand.gray[200]!,
                strokeWidth: 1,
                dashArray: [4, 4],
              );
            },
          ),
          borderData: FlBorderData(show: false),
          barGroups: categories.asMap().entries.map((entry) {
            final color = _getColorForScore(entry.value.score);
            return BarChartGroupData(
              x: entry.key,
              barRods: [
                BarChartRodData(
                  toY: entry.value.score,
                  color: color,
                  width: 24,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(4),
                  ),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: 1,
                    color: color.withOpacity(0.1),
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Color _getColorForScore(double score) {
    if (score >= 0.75) return RiskLevelColors.critical;
    if (score >= 0.50) return RiskLevelColors.atRisk;
    if (score >= 0.25) return RiskLevelColors.watch;
    return RiskLevelColors.onTrack;
  }
}

class _CategoryData {
  _CategoryData(this.name, this.score, this.icon);
  final String name;
  final double score;
  final IconData icon;
}

/// Mini sparkline chart for inline risk display
class RiskSparkline extends StatelessWidget {
  const RiskSparkline({
    super.key,
    required this.history,
    this.width = 80,
    this.height = 30,
    this.color,
  });

  final List<double> history;
  final double width;
  final double height;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) {
      return SizedBox(width: width, height: height);
    }

    final lineColor = color ?? Theme.of(context).colorScheme.primary;

    return SizedBox(
      width: width,
      height: height,
      child: LineChart(
        LineChartData(
          minY: 0,
          maxY: 1,
          lineTouchData: const LineTouchData(enabled: false),
          gridData: const FlGridData(show: false),
          titlesData: const FlTitlesData(show: false),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: history.asMap().entries.map((entry) {
                return FlSpot(entry.key.toDouble(), entry.value);
              }).toList(),
              isCurved: true,
              curveSmoothness: 0.3,
              color: lineColor,
              barWidth: 2,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    lineColor.withOpacity(0.2),
                    lineColor.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pie chart for risk distribution overview
class RiskDistributionPieChart extends StatefulWidget {
  const RiskDistributionPieChart({
    super.key,
    required this.distribution,
    this.size = 150,
    this.showLabels = true,
  });

  final RiskDistribution distribution;
  final double size;
  final bool showLabels;

  @override
  State<RiskDistributionPieChart> createState() => _RiskDistributionPieChartState();
}

class _RiskDistributionPieChartState extends State<RiskDistributionPieChart> {
  int _touchedIndex = -1;

  @override
  Widget build(BuildContext context) {
    final total = widget.distribution.total;
    if (total == 0) {
      return SizedBox(
        width: widget.size,
        height: widget.size,
        child: Center(
          child: Text(
            'No data',
            style: TextStyle(color: AivoBrand.gray[500]),
          ),
        ),
      );
    }

    final sections = [
      _PieSection(
        'On Track',
        widget.distribution.onTrack,
        RiskLevelColors.onTrack,
      ),
      _PieSection(
        'Watch',
        widget.distribution.watch,
        RiskLevelColors.watch,
      ),
      _PieSection(
        'At Risk',
        widget.distribution.atRisk,
        RiskLevelColors.atRisk,
      ),
      _PieSection(
        'Critical',
        widget.distribution.critical,
        RiskLevelColors.critical,
      ),
    ].where((s) => s.count > 0).toList();

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: PieChart(
        PieChartData(
          pieTouchData: PieTouchData(
            touchCallback: (event, response) {
              setState(() {
                if (!event.isInterestedForInteractions ||
                    response == null ||
                    response.touchedSection == null) {
                  _touchedIndex = -1;
                } else {
                  _touchedIndex = response.touchedSection!.touchedSectionIndex;
                }
              });
            },
          ),
          sectionsSpace: 2,
          centerSpaceRadius: widget.size * 0.25,
          sections: sections.asMap().entries.map((entry) {
            final isTouched = entry.key == _touchedIndex;
            final section = entry.value;
            return PieChartSectionData(
              value: section.count.toDouble(),
              color: section.color,
              radius: isTouched ? widget.size * 0.35 : widget.size * 0.3,
              title: widget.showLabels ? '${section.count}' : '',
              titleStyle: TextStyle(
                fontSize: isTouched ? 14 : 12,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              badgeWidget: isTouched
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: section.color,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: section.color.withOpacity(0.4),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Text(
                        section.label,
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  : null,
              badgePositionPercentageOffset: 1.2,
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _PieSection {
  _PieSection(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;
}

