/// Performance Line Chart Widget
///
/// Displays performance trends over time using fl_chart.
library;

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import '../../../models/analytics.dart';

/// Line chart for displaying performance trends.
class PerformanceLineChart extends StatefulWidget {
  const PerformanceLineChart({
    super.key,
    required this.data,
    this.title,
    this.height = 250,
    this.showGrid = true,
    this.showDots = true,
    this.showArea = true,
    this.lineColor,
    this.areaColor,
    this.gradientColors,
    this.yAxisLabel,
    this.xAxisLabel,
    this.tooltipFormatter,
    this.minY,
    this.maxY,
    this.animate = true,
  });

  final List<TimeSeriesDataPoint> data;
  final String? title;
  final double height;
  final bool showGrid;
  final bool showDots;
  final bool showArea;
  final Color? lineColor;
  final Color? areaColor;
  final List<Color>? gradientColors;
  final String? yAxisLabel;
  final String? xAxisLabel;
  final String Function(TimeSeriesDataPoint)? tooltipFormatter;
  final double? minY;
  final double? maxY;
  final bool animate;

  @override
  State<PerformanceLineChart> createState() => _PerformanceLineChartState();
}

class _PerformanceLineChartState extends State<PerformanceLineChart> {
  int? touchedIndex;

  @override
  Widget build(BuildContext context) {
    if (widget.data.isEmpty) {
      return _buildEmptyState(context);
    }

    final theme = Theme.of(context);
    final primaryColor = widget.lineColor ?? theme.colorScheme.primary;
    final fillColor = widget.areaColor ?? primaryColor.withValues(alpha: 0.15);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.title != null) ...[
          Text(
            widget.title!,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
        ],
        SizedBox(
          height: widget.height,
          child: LineChart(
            _buildChartData(theme, primaryColor, fillColor),
            duration: widget.animate
                ? const Duration(milliseconds: 300)
                : Duration.zero,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: widget.height,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.show_chart,
              size: 48,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'No data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  LineChartData _buildChartData(
    ThemeData theme,
    Color primaryColor,
    Color fillColor,
  ) {
    final spots = _buildSpots();
    final minY = widget.minY ?? _calculateMinY(spots);
    final maxY = widget.maxY ?? _calculateMaxY(spots);

    return LineChartData(
      gridData: _buildGridData(theme),
      titlesData: _buildTitlesData(theme),
      borderData: _buildBorderData(theme),
      lineTouchData: _buildTouchData(theme),
      lineBarsData: [
        _buildLineBarData(primaryColor, fillColor, spots),
      ],
      minY: minY,
      maxY: maxY,
    );
  }

  List<FlSpot> _buildSpots() {
    return widget.data.asMap().entries.map((entry) {
      return FlSpot(entry.key.toDouble(), entry.value.value);
    }).toList();
  }

  double _calculateMinY(List<FlSpot> spots) {
    if (spots.isEmpty) return 0;
    final min = spots.map((s) => s.y).reduce((a, b) => a < b ? a : b);
    return (min * 0.9).floorToDouble();
  }

  double _calculateMaxY(List<FlSpot> spots) {
    if (spots.isEmpty) return 100;
    final max = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    return (max * 1.1).ceilToDouble();
  }

  FlGridData _buildGridData(ThemeData theme) {
    if (!widget.showGrid) {
      return const FlGridData(show: false);
    }

    return FlGridData(
      show: true,
      drawVerticalLine: false,
      horizontalInterval: 20,
      getDrawingHorizontalLine: (value) {
        return FlLine(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
          strokeWidth: 1,
        );
      },
    );
  }

  FlTitlesData _buildTitlesData(ThemeData theme) {
    return FlTitlesData(
      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      bottomTitles: AxisTitles(
        axisNameWidget: widget.xAxisLabel != null
            ? Text(
                widget.xAxisLabel!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              )
            : null,
        sideTitles: SideTitles(
          showTitles: true,
          interval: _calculateXInterval(),
          getTitlesWidget: (value, meta) {
            return _buildBottomTitle(value.toInt(), theme);
          },
          reservedSize: 30,
        ),
      ),
      leftTitles: AxisTitles(
        axisNameWidget: widget.yAxisLabel != null
            ? Text(
                widget.yAxisLabel!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              )
            : null,
        sideTitles: SideTitles(
          showTitles: true,
          interval: 20,
          getTitlesWidget: (value, meta) {
            return Text(
              value.toInt().toString(),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            );
          },
          reservedSize: 40,
        ),
      ),
    );
  }

  double _calculateXInterval() {
    final count = widget.data.length;
    if (count <= 7) return 1;
    if (count <= 14) return 2;
    if (count <= 30) return 5;
    return (count / 6).roundToDouble();
  }

  Widget _buildBottomTitle(int index, ThemeData theme) {
    if (index < 0 || index >= widget.data.length) {
      return const SizedBox.shrink();
    }

    final dataPoint = widget.data[index];
    final label = dataPoint.label ?? _formatDate(dataPoint.timestamp);

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(
        label,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontSize: 10,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    if (widget.data.length <= 7) {
      return DateFormat.E().format(date);
    }
    return DateFormat.MMMd().format(date);
  }

  FlBorderData _buildBorderData(ThemeData theme) {
    return FlBorderData(
      show: true,
      border: Border(
        bottom: BorderSide(
          color: theme.colorScheme.outlineVariant,
          width: 1,
        ),
        left: BorderSide(
          color: theme.colorScheme.outlineVariant,
          width: 1,
        ),
      ),
    );
  }

  LineTouchData _buildTouchData(ThemeData theme) {
    return LineTouchData(
      enabled: true,
      touchCallback: (event, response) {
        if (event is FlTapUpEvent || event is FlPanEndEvent) {
          setState(() => touchedIndex = null);
        } else if (response?.lineBarSpots != null &&
            response!.lineBarSpots!.isNotEmpty) {
          setState(() => touchedIndex = response.lineBarSpots!.first.spotIndex);
        }
      },
      touchTooltipData: LineTouchTooltipData(
        getTooltipColor: (_) => theme.colorScheme.surfaceContainerHighest,
        tooltipRoundedRadius: 8,
        tooltipPadding: const EdgeInsets.all(8),
        getTooltipItems: (touchedSpots) {
          return touchedSpots.map((spot) {
            final dataPoint = widget.data[spot.spotIndex];
            final text = widget.tooltipFormatter != null
                ? widget.tooltipFormatter!(dataPoint)
                : dataPoint.value.toStringAsFixed(1);

            return LineTooltipItem(
              text,
              theme.textTheme.bodySmall!.copyWith(
                color: theme.colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            );
          }).toList();
        },
      ),
    );
  }

  LineChartBarData _buildLineBarData(
    Color primaryColor,
    Color fillColor,
    List<FlSpot> spots,
  ) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      curveSmoothness: 0.3,
      color: primaryColor,
      barWidth: 3,
      isStrokeCapRound: true,
      dotData: FlDotData(
        show: widget.showDots,
        getDotPainter: (spot, percent, barData, index) {
          final isHighlighted = index == touchedIndex;
          return FlDotCirclePainter(
            radius: isHighlighted ? 6 : 4,
            color: primaryColor,
            strokeWidth: isHighlighted ? 2 : 0,
            strokeColor: Colors.white,
          );
        },
      ),
      belowBarData: widget.showArea
          ? BarAreaData(
              show: true,
              gradient: widget.gradientColors != null
                  ? LinearGradient(
                      colors: widget.gradientColors!
                          .map((c) => c.withValues(alpha: 0.3))
                          .toList(),
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    )
                  : null,
              color: widget.gradientColors == null ? fillColor : null,
            )
          : null,
    );
  }
}

/// A multi-line chart for comparing multiple data series.
class MultiLinePerformanceChart extends StatelessWidget {
  const MultiLinePerformanceChart({
    super.key,
    required this.dataSeries,
    this.title,
    this.height = 250,
    this.showLegend = true,
    this.legendPosition = LegendPosition.bottom,
  });

  final List<ChartDataSeries> dataSeries;
  final String? title;
  final double height;
  final bool showLegend;
  final LegendPosition legendPosition;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) ...[
          Text(
            title!,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
        ],
        if (showLegend && legendPosition == LegendPosition.top) ...[
          _buildLegend(theme),
          const SizedBox(height: 12),
        ],
        SizedBox(
          height: height,
          child: dataSeries.isEmpty
              ? _buildEmptyState(theme)
              : LineChart(_buildChartData(theme)),
        ),
        if (showLegend && legendPosition == LegendPosition.bottom) ...[
          const SizedBox(height: 12),
          _buildLegend(theme),
        ],
      ],
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Text(
        'No data available',
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildLegend(ThemeData theme) {
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: dataSeries.map((series) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: series.color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              series.label,
              style: theme.textTheme.bodySmall,
            ),
          ],
        );
      }).toList(),
    );
  }

  LineChartData _buildChartData(ThemeData theme) {
    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (value) {
          return FlLine(
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
            strokeWidth: 1,
          );
        },
      ),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 30,
            getTitlesWidget: (value, meta) {
              return Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  value.toInt().toString(),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
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
            getTitlesWidget: (value, meta) {
              return Text(
                value.toInt().toString(),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              );
            },
          ),
        ),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: dataSeries.map((series) {
        return LineChartBarData(
          spots: series.data.asMap().entries.map((entry) {
            return FlSpot(entry.key.toDouble(), entry.value.value);
          }).toList(),
          isCurved: true,
          color: series.color,
          barWidth: 2,
          dotData: const FlDotData(show: false),
        );
      }).toList(),
    );
  }
}

/// Data series for multi-line charts.
class ChartDataSeries {
  const ChartDataSeries({
    required this.label,
    required this.data,
    required this.color,
  });

  final String label;
  final List<TimeSeriesDataPoint> data;
  final Color color;
}

/// Legend position.
enum LegendPosition { top, bottom }
