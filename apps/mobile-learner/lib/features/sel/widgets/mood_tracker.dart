import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import '../sel_models.dart';

/// Mood Tracker Widget
///
/// Displays recent mood check-ins in a compact timeline view.
class MoodTracker extends StatelessWidget {
  final List<MoodCheckIn> checkIns;
  final int maxItems;

  const MoodTracker({
    super.key,
    required this.checkIns,
    this.maxItems = 7,
  });

  @override
  Widget build(BuildContext context) {
    if (checkIns.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AivoBrand.gray.shade50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              Icons.timeline,
              size: 32,
              color: AivoBrand.gray.shade400,
            ),
            const SizedBox(height: 8),
            Text(
              'No check-ins yet',
              style: TextStyle(
                color: AivoBrand.gray.shade600,
              ),
            ),
          ],
        ),
      );
    }

    final displayCheckIns = checkIns.take(maxItems).toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.gray.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Moods',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                'Last ${displayCheckIns.length} days',
                style: TextStyle(
                  color: AivoBrand.gray.shade500,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Mood timeline
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: displayCheckIns.reversed.map((checkIn) {
              return _MoodDayItem(checkIn: checkIn);
            }).toList(),
          ),

          // Legend
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: _getMostFrequentMoods(displayCheckIns).map((mood) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: mood.color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    mood.label,
                    style: TextStyle(
                      color: AivoBrand.gray.shade600,
                      fontSize: 11,
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  List<Mood> _getMostFrequentMoods(List<MoodCheckIn> checkIns) {
    final moodCounts = <Mood, int>{};
    for (final checkIn in checkIns) {
      moodCounts[checkIn.mood] = (moodCounts[checkIn.mood] ?? 0) + 1;
    }

    final sortedMoods = moodCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return sortedMoods.take(4).map((e) => e.key).toList();
  }
}

class _MoodDayItem extends StatelessWidget {
  final MoodCheckIn checkIn;

  const _MoodDayItem({required this.checkIn});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Mood emoji with background
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: checkIn.mood.color,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              checkIn.mood.emoji,
              style: const TextStyle(fontSize: 18),
            ),
          ),
        ),
        const SizedBox(height: 4),
        // Intensity indicator
        SizedBox(
          width: 36,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final isFilled = index < checkIn.intensity;
              return Container(
                width: 4,
                height: 4,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  color: isFilled
                      ? checkIn.mood.textColor
                      : AivoBrand.gray.shade300,
                  shape: BoxShape.circle,
                ),
              );
            }),
          ),
        ),
        const SizedBox(height: 4),
        // Day label
        Text(
          _getDayLabel(checkIn.timestamp),
          style: TextStyle(
            color: AivoBrand.gray.shade600,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  String _getDayLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final checkInDate = DateTime(date.year, date.month, date.day);
    final diff = today.difference(checkInDate).inDays;

    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yday';

    final weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[date.weekday % 7];
  }
}

/// Mood Chart Widget
///
/// Line chart showing mood trends over time.
class MoodChart extends StatelessWidget {
  final List<MoodTrend> trends;
  final int daysToShow;

  const MoodChart({
    super.key,
    required this.trends,
    this.daysToShow = 7,
  });

  @override
  Widget build(BuildContext context) {
    if (trends.isEmpty) {
      return Container(
        height: 120,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AivoBrand.gray.shade50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            'Not enough data to show trends',
            style: TextStyle(color: AivoBrand.gray.shade600),
          ),
        ),
      );
    }

    final displayTrends = trends.take(daysToShow).toList().reversed.toList();

    return Container(
      height: 120,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.gray.shade200),
      ),
      child: CustomPaint(
        size: Size.infinite,
        painter: _MoodChartPainter(
          trends: displayTrends,
          primaryColor: Theme.of(context).primaryColor,
        ),
      ),
    );
  }
}

class _MoodChartPainter extends CustomPainter {
  final List<MoodTrend> trends;
  final Color primaryColor;

  _MoodChartPainter({
    required this.trends,
    required this.primaryColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (trends.isEmpty) return;

    final paint = Paint()
      ..color = primaryColor
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final dotPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.fill;

    final fillPaint = Paint()
      ..color = primaryColor.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    final path = Path();
    final fillPath = Path();

    final xStep = size.width / (trends.length - 1).clamp(1, double.infinity);
    final yMax = 5.0; // Max intensity

    for (var i = 0; i < trends.length; i++) {
      final x = i * xStep;
      final y = size.height - (trends[i].intensity / yMax * size.height);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      // Draw dot
      canvas.drawCircle(Offset(x, y), 4, dotPaint);
    }

    // Complete fill path
    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    // Draw fill first, then line
    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _MoodChartPainter oldDelegate) {
    return trends != oldDelegate.trends || primaryColor != oldDelegate.primaryColor;
  }
}
