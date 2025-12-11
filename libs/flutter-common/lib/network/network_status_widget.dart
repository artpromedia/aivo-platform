/// Network Health Indicator Widget
///
/// Provides visual feedback to users about network status and
/// any degradation in service availability.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import 'circuit_breaker.dart';
import 'graceful_degradation.dart';
import 'network_telemetry.dart';

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK STATUS INDICATOR
// ══════════════════════════════════════════════════════════════════════════════

/// Compact network status indicator.
///
/// Shows a small colored dot/icon indicating current network health.
/// Can be tapped to show detailed status.
class NetworkStatusIndicator extends StatefulWidget {
  const NetworkStatusIndicator({
    super.key,
    this.size = 12.0,
    this.onTap,
    this.showLabel = false,
  });

  final double size;
  final VoidCallback? onTap;
  final bool showLabel;

  @override
  State<NetworkStatusIndicator> createState() => _NetworkStatusIndicatorState();
}

class _NetworkStatusIndicatorState extends State<NetworkStatusIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  StreamSubscription<DegradationState>? _degradationSubscription;
  DegradationState? _currentState;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _currentState = GracefulDegradationService.instance.currentState;

    _degradationSubscription =
        GracefulDegradationService.instance.stateStream.listen((state) {
      setState(() {
        _currentState = state;
      });

      // Pulse animation for degraded/critical states
      if (state.level.index >= DegradationLevel.moderate.index) {
        _pulseController.repeat(reverse: true);
      } else {
        _pulseController.stop();
        _pulseController.value = 0;
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _degradationSubscription?.cancel();
    super.dispose();
  }

  Color _getStatusColor() {
    final level = _currentState?.level ?? DegradationLevel.none;
    switch (level) {
      case DegradationLevel.none:
        return Colors.green;
      case DegradationLevel.minor:
        return Colors.lightGreen;
      case DegradationLevel.moderate:
        return Colors.orange;
      case DegradationLevel.severe:
        return Colors.deepOrange;
      case DegradationLevel.critical:
        return Colors.red;
    }
  }

  IconData _getStatusIcon() {
    final level = _currentState?.level ?? DegradationLevel.none;
    switch (level) {
      case DegradationLevel.none:
        return Icons.wifi;
      case DegradationLevel.minor:
        return Icons.wifi;
      case DegradationLevel.moderate:
        return Icons.wifi_2_bar;
      case DegradationLevel.severe:
        return Icons.wifi_1_bar;
      case DegradationLevel.critical:
        return Icons.wifi_off;
    }
  }

  String _getStatusLabel() {
    final level = _currentState?.level ?? DegradationLevel.none;
    switch (level) {
      case DegradationLevel.none:
        return 'Online';
      case DegradationLevel.minor:
        return 'Slow';
      case DegradationLevel.moderate:
        return 'Limited';
      case DegradationLevel.severe:
        return 'Degraded';
      case DegradationLevel.critical:
        return 'Offline';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor();
    final icon = _getStatusIcon();
    final label = _getStatusLabel();

    Widget indicator = AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        final scale = _currentState?.level.index !=
                    null &&
                _currentState!.level.index >= DegradationLevel.moderate.index
            ? _pulseAnimation.value
            : 1.0;

        return Transform.scale(
          scale: scale,
          child: Icon(
            icon,
            size: widget.size,
            color: color,
          ),
        );
      },
    );

    if (widget.showLabel) {
      indicator = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          indicator,
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: widget.size * 0.9,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }

    return GestureDetector(
      onTap: widget.onTap ??
          () => _showDetailedStatus(context),
      child: Tooltip(
        message: _currentState?.userMessage ?? 'Network status',
        child: indicator,
      ),
    );
  }

  void _showDetailedStatus(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => const NetworkStatusSheet(),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK STATUS SHEET
// ══════════════════════════════════════════════════════════════════════════════

/// Detailed network status bottom sheet.
class NetworkStatusSheet extends StatefulWidget {
  const NetworkStatusSheet({super.key});

  @override
  State<NetworkStatusSheet> createState() => _NetworkStatusSheetState();
}

class _NetworkStatusSheetState extends State<NetworkStatusSheet> {
  TelemetryReport? _report;
  DegradationState? _degradationState;

  @override
  void initState() {
    super.initState();
    _report = NetworkTelemetryService.instance.generateReport();
    _degradationState = GracefulDegradationService.instance.currentState;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                _getHealthIcon(_report?.healthStatus),
                color: _getHealthColor(_report?.healthStatus),
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Network Status',
                      style: theme.textTheme.titleLarge,
                    ),
                    Text(
                      _degradationState?.userMessage ?? 'Checking...',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Metrics
          if (_report != null) ...[
            _buildMetricRow(
              context,
              'Response Time',
              '${_report!.avgRequestLatencyMs.toInt()} ms',
              _report!.avgRequestLatencyMs < 500
                  ? Colors.green
                  : _report!.avgRequestLatencyMs < 2000
                      ? Colors.orange
                      : Colors.red,
            ),
            _buildMetricRow(
              context,
              'Sync Success Rate',
              '${_report!.syncSuccessRate.toStringAsFixed(0)}%',
              _report!.syncSuccessRate > 90
                  ? Colors.green
                  : _report!.syncSuccessRate > 50
                      ? Colors.orange
                      : Colors.red,
            ),
            _buildMetricRow(
              context,
              'Pending Changes',
              '${_report!.pendingSyncItems}',
              _report!.pendingSyncItems == 0
                  ? Colors.green
                  : _report!.pendingSyncItems < 10
                      ? Colors.orange
                      : Colors.red,
            ),
          ],

          const SizedBox(height: 16),

          // Feature status
          if (_degradationState != null) ...[
            Text(
              'Features',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _degradationState!.featureStatuses.entries
                  .map((entry) => _buildFeatureChip(context, entry.key, entry.value))
                  .toList(),
            ),
          ],

          const SizedBox(height: 16),

          // Open circuits warning
          if (_report?.openCircuits.isNotEmpty ?? false) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber, color: Colors.orange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Some services are recovering: ${_report!.openCircuits.join(", ")}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetricRow(
    BuildContext context,
    String label,
    String value,
    Color statusColor,
  ) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.bodyMedium),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                value,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureChip(
    BuildContext context,
    String feature,
    FeatureStatus status,
  ) {
    final color = switch (status) {
      FeatureStatus.available => Colors.green,
      FeatureStatus.degraded => Colors.orange,
      FeatureStatus.unavailable => Colors.red,
    };

    final icon = switch (status) {
      FeatureStatus.available => Icons.check_circle,
      FeatureStatus.degraded => Icons.warning,
      FeatureStatus.unavailable => Icons.cancel,
    };

    // Format feature name
    final displayName = feature
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');

    return Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(displayName),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }

  IconData _getHealthIcon(NetworkHealthStatus? status) {
    return switch (status) {
      NetworkHealthStatus.healthy => Icons.check_circle,
      NetworkHealthStatus.degraded => Icons.warning,
      NetworkHealthStatus.unhealthy => Icons.error,
      NetworkHealthStatus.critical => Icons.cancel,
      null => Icons.help_outline,
    };
  }

  Color _getHealthColor(NetworkHealthStatus? status) {
    return switch (status) {
      NetworkHealthStatus.healthy => Colors.green,
      NetworkHealthStatus.degraded => Colors.orange,
      NetworkHealthStatus.unhealthy => Colors.deepOrange,
      NetworkHealthStatus.critical => Colors.red,
      null => Colors.grey,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFLINE BANNER
// ══════════════════════════════════════════════════════════════════════════════

/// Banner shown when app is offline or degraded.
class NetworkBanner extends StatelessWidget {
  const NetworkBanner({
    super.key,
    this.onDismiss,
  });

  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DegradationState>(
      stream: GracefulDegradationService.instance.stateStream,
      initialData: GracefulDegradationService.instance.currentState,
      builder: (context, snapshot) {
        final state = snapshot.data;
        if (state == null || state.level == DegradationLevel.none) {
          return const SizedBox.shrink();
        }

        final color = switch (state.level) {
          DegradationLevel.none => Colors.transparent,
          DegradationLevel.minor => Colors.blue,
          DegradationLevel.moderate => Colors.orange,
          DegradationLevel.severe => Colors.deepOrange,
          DegradationLevel.critical => Colors.red,
        };

        return MaterialBanner(
          content: Text(state.userMessage),
          leading: Icon(Icons.wifi_off, color: color),
          backgroundColor: color.withOpacity(0.1),
          actions: [
            if (onDismiss != null)
              TextButton(
                onPressed: onDismiss,
                child: const Text('Dismiss'),
              ),
            TextButton(
              onPressed: () => _showDetailedStatus(context),
              child: const Text('Details'),
            ),
          ],
        );
      },
    );
  }

  void _showDetailedStatus(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => const NetworkStatusSheet(),
    );
  }
}
