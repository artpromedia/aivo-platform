/// Risk level badge widget
/// Visual indicator for student risk levels with color coding
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import '../../../models/risk_prediction.dart';

/// Color definitions for risk levels
class RiskLevelColors {
  RiskLevelColors._();

  static const Color onTrack = Color(0xFF22C55E); // Green
  static const Color watch = Color(0xFFEAB308); // Yellow
  static const Color atRisk = Color(0xFFF97316); // Orange
  static const Color critical = Color(0xFFEF4444); // Red

  static Color forLevel(RiskLevel level) {
    switch (level) {
      case RiskLevel.onTrack:
        return onTrack;
      case RiskLevel.watch:
        return watch;
      case RiskLevel.atRisk:
        return atRisk;
      case RiskLevel.critical:
        return critical;
    }
  }

  static Color backgroundForLevel(RiskLevel level) {
    return forLevel(level).withOpacity(0.1);
  }

  static Color borderForLevel(RiskLevel level) {
    return forLevel(level).withOpacity(0.3);
  }
}

/// Badge size options
enum RiskBadgeSize {
  small,
  medium,
  large,
}

/// Visual badge displaying risk level
class RiskLevelBadge extends StatelessWidget {
  const RiskLevelBadge({
    super.key,
    required this.level,
    this.size = RiskBadgeSize.medium,
    this.showLabel = true,
  });

  final RiskLevel level;
  final RiskBadgeSize size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final color = RiskLevelColors.forLevel(level);
    final bgColor = RiskLevelColors.backgroundForLevel(level);

    final (paddingH, paddingV, fontSize, iconSize) = switch (size) {
      RiskBadgeSize.small => (8.0, 4.0, 11.0, 12.0),
      RiskBadgeSize.medium => (12.0, 6.0, 13.0, 16.0),
      RiskBadgeSize.large => (16.0, 8.0, 15.0, 20.0),
    };

    return Container(
      padding: EdgeInsets.symmetric(horizontal: paddingH, vertical: paddingV),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: RiskLevelColors.borderForLevel(level),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _iconForLevel(level),
            size: iconSize,
            color: color,
          ),
          if (showLabel) ...[
            const SizedBox(width: 4),
            Text(
              level.label,
              style: TextStyle(
                color: color,
                fontSize: fontSize,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  IconData _iconForLevel(RiskLevel level) {
    switch (level) {
      case RiskLevel.onTrack:
        return Icons.check_circle;
      case RiskLevel.watch:
        return Icons.visibility;
      case RiskLevel.atRisk:
        return Icons.warning;
      case RiskLevel.critical:
        return Icons.error;
    }
  }
}

/// Risk score gauge widget - circular progress indicator
class RiskScoreGauge extends StatelessWidget {
  const RiskScoreGauge({
    super.key,
    required this.score,
    required this.level,
    this.size = 80,
    this.showLabel = true,
  });

  final double score; // 0-1 normalized
  final RiskLevel level;
  final double size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final color = RiskLevelColors.forLevel(level);
    final scorePercent = (score * 100).round();

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background circle
          CircularProgressIndicator(
            value: 1,
            strokeWidth: size * 0.1,
            backgroundColor: AivoBrand.gray[200],
            valueColor: AlwaysStoppedAnimation(AivoBrand.gray[200]!),
          ),
          // Progress indicator
          CircularProgressIndicator(
            value: score,
            strokeWidth: size * 0.1,
            backgroundColor: Colors.transparent,
            valueColor: AlwaysStoppedAnimation(color),
            strokeCap: StrokeCap.round,
          ),
          // Center text
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$scorePercent%',
                  style: TextStyle(
                    fontSize: size * 0.25,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                if (showLabel)
                  Text(
                    'Risk',
                    style: TextStyle(
                      fontSize: size * 0.12,
                      color: AivoBrand.gray[600],
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

/// Risk trend indicator showing direction of change
class RiskTrendIndicator extends StatelessWidget {
  const RiskTrendIndicator({
    super.key,
    required this.trend,
    this.scoreChange,
    this.compact = false,
  });

  final RiskTrend trend;
  final double? scoreChange;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (icon, color, label) = switch (trend) {
      RiskTrend.increasing => (Icons.trending_up, AivoBrand.error, 'Increasing'),
      RiskTrend.stable => (Icons.trending_flat, AivoBrand.gray, 'Stable'),
      RiskTrend.decreasing => (Icons.trending_down, AivoBrand.success, 'Decreasing'),
    };

    if (compact) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          if (scoreChange != null) ...[
            const SizedBox(width: 2),
            Text(
              '${scoreChange! > 0 ? '+' : ''}${(scoreChange! * 100).round()}%',
              style: TextStyle(
                fontSize: 12,
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (scoreChange != null) ...[
            const SizedBox(width: 4),
            Text(
              '(${scoreChange! > 0 ? '+' : ''}${(scoreChange! * 100).round()}%)',
              style: TextStyle(
                fontSize: 11,
                color: color,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Intervention urgency badge
class InterventionUrgencyBadge extends StatelessWidget {
  const InterventionUrgencyBadge({
    super.key,
    required this.urgency,
  });

  final InterventionUrgency urgency;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (urgency) {
      InterventionUrgency.immediate => (AivoBrand.error, Icons.priority_high),
      InterventionUrgency.shortTerm => (AivoBrand.warning, Icons.schedule),
      InterventionUrgency.mediumTerm => (Colors.blue, Icons.calendar_today),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            urgency.label,
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
}

/// Intervention intensity badge
class InterventionIntensityBadge extends StatelessWidget {
  const InterventionIntensityBadge({
    super.key,
    required this.intensity,
  });

  final InterventionIntensity intensity;

  @override
  Widget build(BuildContext context) {
    final (color, bars) = switch (intensity) {
      InterventionIntensity.light => (AivoBrand.success, 1),
      InterventionIntensity.moderate => (AivoBrand.warning, 2),
      InterventionIntensity.intensive => (AivoBrand.error, 3),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Intensity bars
          Row(
            children: List.generate(3, (index) {
              return Container(
                width: 4,
                height: 12 + (index * 2),
                margin: const EdgeInsets.only(right: 2),
                decoration: BoxDecoration(
                  color: index < bars ? color : color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              );
            }),
          ),
          const SizedBox(width: 4),
          Text(
            intensity.label,
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
}
