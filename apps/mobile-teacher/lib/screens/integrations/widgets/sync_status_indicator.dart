/// Sync status indicator widget for Google Classroom integration
/// Shows progress and phase information during sync operations
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/lms_integration.dart';

/// Animated sync status indicator widget
class SyncStatusIndicator extends StatefulWidget {
  const SyncStatusIndicator({
    super.key,
    required this.status,
    this.showLabel = true,
    this.size = SyncIndicatorSize.medium,
    this.onTap,
  });

  /// Current sync status
  final DetailedSyncStatus? status;

  /// Whether to show the phase label
  final bool showLabel;

  /// Size of the indicator
  final SyncIndicatorSize size;

  /// Callback when tapped
  final VoidCallback? onTap;

  @override
  State<SyncStatusIndicator> createState() => _SyncStatusIndicatorState();
}

class _SyncStatusIndicatorState extends State<SyncStatusIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    );

    if (widget.status != null && !widget.status!.phase.isTerminal) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(SyncStatusIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.status != null && !widget.status!.phase.isTerminal) {
      if (!_controller.isAnimating) {
        _controller.repeat();
      }
    } else {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.status;
    if (status == null) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final dimensions = widget.size.dimensions;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: EdgeInsets.all(dimensions.padding),
        decoration: BoxDecoration(
          color: _getBackgroundColor(status.phase),
          borderRadius: BorderRadius.circular(dimensions.borderRadius),
          border: Border.all(
            color: _getBorderColor(status.phase),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Animated sync icon or status icon
            _buildStatusIcon(status, dimensions),

            if (widget.showLabel) ...[
              SizedBox(width: dimensions.spacing),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      status.phase.label,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: _getTextColor(status.phase),
                        fontSize: dimensions.labelFontSize,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (status.message.isNotEmpty &&
                        widget.size != SyncIndicatorSize.small)
                      Text(
                        status.message,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: _getTextColor(status.phase).withValues(alpha: 0.7),
                          fontSize: dimensions.messageFontSize,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                  ],
                ),
              ),
            ],

            // Progress indicator
            if (status.progress > 0 &&
                !status.phase.isTerminal &&
                widget.size != SyncIndicatorSize.small) ...[
              SizedBox(width: dimensions.spacing),
              _buildProgressIndicator(status, dimensions),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusIcon(DetailedSyncStatus status, _SyncIndicatorDimensions dim) {
    if (status.phase == SyncPhase.completed) {
      return Icon(
        Icons.check_circle,
        size: dim.iconSize,
        color: AivoBrand.success,
      );
    }

    if (status.phase == SyncPhase.failed) {
      return Icon(
        Icons.error,
        size: dim.iconSize,
        color: AivoBrand.error,
      );
    }

    // Animated sync icon
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.rotate(
          angle: _controller.value * 2 * 3.14159,
          child: Icon(
            Icons.sync,
            size: dim.iconSize,
            color: _getIconColor(status.phase),
          ),
        );
      },
    );
  }

  Widget _buildProgressIndicator(
    DetailedSyncStatus status,
    _SyncIndicatorDimensions dim,
  ) {
    return SizedBox(
      width: dim.progressSize,
      height: dim.progressSize,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: status.progress,
            strokeWidth: 2,
            backgroundColor: AivoBrand.gray[200],
            valueColor: AlwaysStoppedAnimation<Color>(_getProgressColor(status.phase)),
          ),
          Text(
            '${status.progressPercent}%',
            style: TextStyle(
              fontSize: dim.progressFontSize,
              fontWeight: FontWeight.w600,
              color: _getTextColor(status.phase),
            ),
          ),
        ],
      ),
    );
  }

  Color _getBackgroundColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.completed:
        return AivoBrand.mint[50]!;
      case SyncPhase.failed:
        return AivoBrand.error[50]!;
      default:
        return AivoBrand.primary[50]!;
    }
  }

  Color _getBorderColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.completed:
        return AivoBrand.mint[200]!;
      case SyncPhase.failed:
        return AivoBrand.error[200]!;
      default:
        return AivoBrand.primary[200]!;
    }
  }

  Color _getTextColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.completed:
        return AivoBrand.mint[700]!;
      case SyncPhase.failed:
        return AivoBrand.error[700]!;
      default:
        return AivoBrand.primary[700]!;
    }
  }

  Color _getIconColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.completed:
        return AivoBrand.success;
      case SyncPhase.failed:
        return AivoBrand.error;
      default:
        return AivoBrand.primary;
    }
  }

  Color _getProgressColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.completed:
        return AivoBrand.success;
      case SyncPhase.failed:
        return AivoBrand.error;
      default:
        return AivoBrand.primary;
    }
  }
}

/// Size presets for the sync indicator
enum SyncIndicatorSize {
  small,
  medium,
  large;

  _SyncIndicatorDimensions get dimensions {
    switch (this) {
      case SyncIndicatorSize.small:
        return const _SyncIndicatorDimensions(
          iconSize: 16,
          padding: 6,
          spacing: 6,
          borderRadius: 6,
          labelFontSize: 11,
          messageFontSize: 9,
          progressSize: 0,
          progressFontSize: 0,
        );
      case SyncIndicatorSize.medium:
        return const _SyncIndicatorDimensions(
          iconSize: 20,
          padding: 10,
          spacing: 8,
          borderRadius: 8,
          labelFontSize: 13,
          messageFontSize: 11,
          progressSize: 32,
          progressFontSize: 9,
        );
      case SyncIndicatorSize.large:
        return const _SyncIndicatorDimensions(
          iconSize: 24,
          padding: 14,
          spacing: 12,
          borderRadius: 12,
          labelFontSize: 15,
          messageFontSize: 13,
          progressSize: 44,
          progressFontSize: 11,
        );
    }
  }
}

class _SyncIndicatorDimensions {
  const _SyncIndicatorDimensions({
    required this.iconSize,
    required this.padding,
    required this.spacing,
    required this.borderRadius,
    required this.labelFontSize,
    required this.messageFontSize,
    required this.progressSize,
    required this.progressFontSize,
  });

  final double iconSize;
  final double padding;
  final double spacing;
  final double borderRadius;
  final double labelFontSize;
  final double messageFontSize;
  final double progressSize;
  final double progressFontSize;
}

/// Linear progress variant of sync status indicator
class SyncProgressBar extends StatelessWidget {
  const SyncProgressBar({
    super.key,
    required this.status,
    this.height = 8,
    this.showLabel = true,
  });

  final DetailedSyncStatus? status;
  final double height;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final syncStatus = status;
    if (syncStatus == null) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showLabel) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                syncStatus.phase.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                '${syncStatus.progressPercent}%',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
        ],
        ClipRRect(
          borderRadius: BorderRadius.circular(height / 2),
          child: LinearProgressIndicator(
            value: syncStatus.progress,
            minHeight: height,
            backgroundColor: AivoBrand.gray[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              _getProgressColor(syncStatus.phase),
            ),
          ),
        ),
        if (showLabel && syncStatus.message.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            syncStatus.message,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontSize: 11,
            ),
          ),
        ],
      ],
    );
  }

  Color _getProgressColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.completed:
        return AivoBrand.success;
      case SyncPhase.failed:
        return AivoBrand.error;
      default:
        return AivoBrand.primary;
    }
  }
}
