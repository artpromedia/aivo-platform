/// Risk alert banner widget
/// Displays prominent alerts for critical students
library;

import 'package:flutter/material.dart';
import '../../../models/risk_prediction.dart';
import 'risk_level_badge.dart';

/// Banner showing critical risk alert
class RiskAlertBanner extends StatelessWidget {
  const RiskAlertBanner({
    super.key,
    required this.criticalCount,
    this.onTap,
    this.onDismiss,
  });

  final int criticalCount;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            RiskLevelColors.critical,
            RiskLevelColors.critical.withValues(alpha: 0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: RiskLevelColors.critical.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Alert icon with pulse animation
                const _PulsingIcon(
                  icon: Icons.error,
                  color: Colors.white,
                  size: 32,
                ),
                const SizedBox(width: 16),
                // Alert text
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Critical Alert',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$criticalCount student${criticalCount != 1 ? 's' : ''} need${criticalCount == 1 ? 's' : ''} immediate attention',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                // Arrow
                Icon(
                  Icons.arrow_forward,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Pulsing icon animation
class _PulsingIcon extends StatefulWidget {
  const _PulsingIcon({
    required this.icon,
    required this.color,
    required this.size,
  });

  final IconData icon;
  final Color color;
  final double size;

  @override
  State<_PulsingIcon> createState() => _PulsingIconState();
}

class _PulsingIconState extends State<_PulsingIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.scale(
          scale: _animation.value,
          child: Icon(
            widget.icon,
            color: widget.color,
            size: widget.size,
          ),
        );
      },
    );
  }
}

/// At-risk alerts widget for dashboard embedding
class AtRiskAlerts extends StatelessWidget {
  const AtRiskAlerts({
    super.key,
    required this.alerts,
    this.onAlertTap,
    this.maxVisible = 3,
  });

  final List<RiskAlert> alerts;
  final void Function(RiskAlert)? onAlertTap;
  final int maxVisible;

  @override
  Widget build(BuildContext context) {
    if (alerts.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final visibleAlerts = alerts.take(maxVisible).toList();
    final hasMore = alerts.length > maxVisible;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(
                Icons.notifications_active,
                size: 20,
                color: RiskLevelColors.critical,
              ),
              const SizedBox(width: 8),
              Text(
                'Risk Alerts',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (hasMore)
                Text(
                  '+${alerts.length - maxVisible} more',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
            ],
          ),
        ),
        ...visibleAlerts.map((alert) => _AlertItem(
              alert: alert,
              onTap: () => onAlertTap?.call(alert),
            )),
      ],
    );
  }
}

/// Individual alert item
class _AlertItem extends StatelessWidget {
  const _AlertItem({
    required this.alert,
    this.onTap,
  });

  final RiskAlert alert;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = RiskLevelColors.forLevel(alert.riskLevel);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(color: color, width: 4),
            ),
          ),
          child: Row(
            children: [
              Icon(
                _iconForAlertType(alert.type),
                size: 20,
                color: color,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      alert.studentName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      alert.message,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              RiskLevelBadge(
                level: alert.riskLevel,
                size: RiskBadgeSize.small,
                showLabel: false,
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconForAlertType(RiskAlertType type) {
    switch (type) {
      case RiskAlertType.newCritical:
        return Icons.error;
      case RiskAlertType.escalation:
        return Icons.trending_up;
      case RiskAlertType.noContact:
        return Icons.person_off;
      case RiskAlertType.interventionDue:
        return Icons.event;
    }
  }
}

/// Risk alert model
class RiskAlert {
  const RiskAlert({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.riskLevel,
    required this.type,
    required this.message,
    required this.timestamp,
  });

  final String id;
  final String studentId;
  final String studentName;
  final RiskLevel riskLevel;
  final RiskAlertType type;
  final String message;
  final DateTime timestamp;
}

/// Types of risk alerts
enum RiskAlertType {
  newCritical,
  escalation,
  noContact,
  interventionDue,
}
