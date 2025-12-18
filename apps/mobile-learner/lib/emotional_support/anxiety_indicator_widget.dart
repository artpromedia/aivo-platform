/// ND-2.3: Anxiety Indicator Widget
///
/// Visual indicator that shows the current anxiety/overwhelm risk level
/// in a non-intrusive way for the learner.

import 'package:flutter/material.dart';

import 'emotional_state_provider.dart';

/// Widget that displays current emotional state risk level.
class AnxietyIndicatorWidget extends StatelessWidget {
  final EmotionalStateAnalysis? analysis;
  final VoidCallback? onTap;
  final bool showLabel;

  const AnxietyIndicatorWidget({
    super.key,
    required this.analysis,
    this.onTap,
    this.showLabel = false,
  });

  @override
  Widget build(BuildContext context) {
    if (analysis == null) {
      return const SizedBox.shrink();
    }

    final riskLevel = _calculateRiskLevel();
    final color = _getRiskColor(riskLevel);
    final icon = _getRiskIcon(riskLevel);
    final label = _getRiskLabel(riskLevel);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildPulsingIndicator(color, riskLevel),
            const SizedBox(width: 8),
            Icon(icon, color: color, size: 20),
            if (showLabel) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPulsingIndicator(Color color, String riskLevel) {
    if (riskLevel == 'critical' || riskLevel == 'high') {
      return TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.5, end: 1.0),
        duration: const Duration(milliseconds: 800),
        builder: (context, value, child) {
          return Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color.withOpacity(value),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.4),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
          );
        },
        onEnd: () {},
      );
    }

    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }

  String _calculateRiskLevel() {
    if (analysis == null) return 'low';

    final maxRisk = [
      analysis!.anxietyRisk,
      analysis!.overwhelmRisk,
      analysis!.meltdownRisk,
    ].reduce((a, b) => a > b ? a : b);

    if (maxRisk >= 8) return 'critical';
    if (maxRisk >= 6) return 'high';
    if (maxRisk >= 4) return 'moderate';
    if (maxRisk >= 2) return 'mild';
    return 'low';
  }

  Color _getRiskColor(String level) {
    switch (level) {
      case 'critical':
        return const Color(0xFFE53935); // Red
      case 'high':
        return const Color(0xFFFF9800); // Orange
      case 'moderate':
        return const Color(0xFFFFC107); // Amber
      case 'mild':
        return const Color(0xFF8BC34A); // Light green
      case 'low':
      default:
        return const Color(0xFF4CAF50); // Green
    }
  }

  IconData _getRiskIcon(String level) {
    switch (level) {
      case 'critical':
        return Icons.warning_rounded;
      case 'high':
        return Icons.error_outline_rounded;
      case 'moderate':
        return Icons.info_outline_rounded;
      case 'mild':
      case 'low':
      default:
        return Icons.check_circle_outline_rounded;
    }
  }

  String _getRiskLabel(String level) {
    switch (level) {
      case 'critical':
        return 'Need a break?';
      case 'high':
        return 'Getting tough';
      case 'moderate':
        return 'Working hard';
      case 'mild':
        return 'Doing well';
      case 'low':
      default:
        return 'Great job!';
    }
  }
}

/// Compact version of the anxiety indicator for use in app bars.
class CompactAnxietyIndicator extends StatelessWidget {
  final EmotionalStateAnalysis? analysis;
  final VoidCallback? onTap;

  const CompactAnxietyIndicator({
    super.key,
    required this.analysis,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (analysis == null) {
      return const SizedBox.shrink();
    }

    final maxRisk = [
      analysis!.anxietyRisk,
      analysis!.overwhelmRisk,
      analysis!.meltdownRisk,
    ].reduce((a, b) => a > b ? a : b);

    Color color;
    if (maxRisk >= 8) {
      color = const Color(0xFFE53935);
    } else if (maxRisk >= 6) {
      color = const Color(0xFFFF9800);
    } else if (maxRisk >= 4) {
      color = const Color(0xFFFFC107);
    } else {
      color = const Color(0xFF4CAF50);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ),
    );
  }
}
