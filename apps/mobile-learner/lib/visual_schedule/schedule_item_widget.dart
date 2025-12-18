/// Schedule Item Widget - ND-1.3
///
/// Reusable widget for displaying a single schedule item.

import 'package:flutter/material.dart';
import 'schedule_models.dart';

/// Display style for schedule items
enum ScheduleItemDisplayStyle {
  card,
  compact,
  gridTile,
  large,
}

/// Widget for displaying a schedule item
class ScheduleItemWidget extends StatelessWidget {
  final ScheduleItem item;
  final ScheduleItemDisplayStyle displayStyle;
  final bool showTime;
  final bool showDuration;
  final bool showImage;
  final bool useSymbols;
  final double iconSize;
  final VoidCallback? onTap;
  final VoidCallback? onComplete;

  const ScheduleItemWidget({
    super.key,
    required this.item,
    this.displayStyle = ScheduleItemDisplayStyle.card,
    this.showTime = true,
    this.showDuration = true,
    this.showImage = true,
    this.useSymbols = false,
    this.iconSize = 48,
    this.onTap,
    this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    switch (displayStyle) {
      case ScheduleItemDisplayStyle.card:
        return _buildCardStyle(context);
      case ScheduleItemDisplayStyle.compact:
        return _buildCompactStyle(context);
      case ScheduleItemDisplayStyle.gridTile:
        return _buildGridTileStyle(context);
      case ScheduleItemDisplayStyle.large:
        return _buildLargeStyle(context);
    }
  }

  Widget _buildCardStyle(BuildContext context) {
    final color = _parseColor(item.color);
    final isCompleted = item.status == ScheduleItemStatus.completed;
    final isCurrent = item.status == ScheduleItemStatus.current;
    final isSkipped = item.status == ScheduleItemStatus.skipped;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isCompleted || isSkipped
              ? Colors.grey.shade100
              : isCurrent
                  ? color.withOpacity(0.1)
                  : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isCurrent ? color : Colors.grey.shade200,
            width: isCurrent ? 2 : 1,
          ),
          boxShadow: isCurrent
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            // Status indicator
            _buildStatusIndicator(color, isCompleted, isSkipped),
            const SizedBox(width: 12),

            // Icon or image
            _buildItemVisual(color, isCompleted || isSkipped),
            const SizedBox(width: 16),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                      decoration: isCompleted || isSkipped
                          ? TextDecoration.lineThrough
                          : null,
                      color: isCompleted || isSkipped
                          ? Colors.grey
                          : Colors.black87,
                    ),
                  ),
                  if (showTime && item.scheduledTime != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.access_time,
                            size: 14, color: Colors.grey.shade600),
                        const SizedBox(width: 4),
                        Text(
                          item.scheduledTime!,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        if (showDuration) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.timer_outlined,
                              size: 14, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Text(
                            '${item.estimatedDuration} min',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                  if (item.notes != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.notes!,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                        fontStyle: FontStyle.italic,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),

            // Complete button for current item
            if (isCurrent && onComplete != null)
              IconButton(
                onPressed: onComplete,
                icon: const Icon(Icons.check_circle_outline),
                color: Colors.green,
                iconSize: 32,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactStyle(BuildContext context) {
    final color = _parseColor(item.color);
    final isCompleted = item.status == ScheduleItemStatus.completed;
    final isCurrent = item.status == ScheduleItemStatus.current;
    final isSkipped = item.status == ScheduleItemStatus.skipped;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isCurrent ? color.withOpacity(0.15) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCurrent ? color : Colors.grey.shade300,
            width: isCurrent ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildItemVisual(color, isCompleted || isSkipped, size: iconSize),
            const SizedBox(height: 8),
            Text(
              item.title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                decoration:
                    isCompleted || isSkipped ? TextDecoration.lineThrough : null,
                color: isCompleted || isSkipped ? Colors.grey : Colors.black87,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (isCompleted)
              const Icon(Icons.check_circle, color: Colors.green, size: 20),
            if (isSkipped)
              const Icon(Icons.skip_next, color: Colors.orange, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildGridTileStyle(BuildContext context) {
    final color = _parseColor(item.color);
    final isCompleted = item.status == ScheduleItemStatus.completed;
    final isCurrent = item.status == ScheduleItemStatus.current;
    final isSkipped = item.status == ScheduleItemStatus.skipped;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isCurrent ? color.withOpacity(0.15) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCurrent ? color : Colors.grey.shade300,
            width: isCurrent ? 3 : 1,
          ),
          boxShadow: isCurrent
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildItemVisual(color, isCompleted || isSkipped,
                      size: iconSize),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      item.title,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight:
                            isCurrent ? FontWeight.bold : FontWeight.w500,
                        color: isCompleted || isSkipped
                            ? Colors.grey
                            : Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            if (isCompleted)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check, color: Colors.white, size: 14),
                ),
              ),
            if (isSkipped)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.orange,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.skip_next,
                      color: Colors.white, size: 14),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLargeStyle(BuildContext context) {
    final color = _parseColor(item.color);
    final isCompleted = item.status == ScheduleItemStatus.completed;
    final isSkipped = item.status == ScheduleItemStatus.skipped;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (showImage && item.image != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.network(
              item.image!,
              width: iconSize * 2,
              height: iconSize * 2,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  _buildItemVisual(color, isCompleted || isSkipped,
                      size: iconSize * 1.5),
            ),
          )
        else
          _buildItemVisual(color, isCompleted || isSkipped, size: iconSize * 1.5),
        const SizedBox(height: 16),
        Text(
          item.title,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: isCompleted || isSkipped ? Colors.grey : Colors.black87,
          ),
          textAlign: TextAlign.center,
        ),
        if (showDuration) ...[
          const SizedBox(height: 8),
          Text(
            '${item.estimatedDuration} minutes',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatusIndicator(Color color, bool isCompleted, bool isSkipped) {
    if (isCompleted) {
      return Container(
        width: 24,
        height: 24,
        decoration: const BoxDecoration(
          color: Colors.green,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.check, color: Colors.white, size: 16),
      );
    }

    if (isSkipped) {
      return Container(
        width: 24,
        height: 24,
        decoration: const BoxDecoration(
          color: Colors.orange,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.skip_next, color: Colors.white, size: 16),
      );
    }

    if (item.status == ScheduleItemStatus.current) {
      return Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.play_arrow, color: Colors.white, size: 16),
      );
    }

    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300, width: 2),
        shape: BoxShape.circle,
      ),
    );
  }

  Widget _buildItemVisual(Color color, bool isGrayedOut, {double? size}) {
    final effectiveSize = size ?? iconSize;

    if (showImage && item.image != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(effectiveSize / 4),
        child: ColorFiltered(
          colorFilter: isGrayedOut
              ? const ColorFilter.mode(Colors.grey, BlendMode.saturation)
              : const ColorFilter.mode(Colors.transparent, BlendMode.multiply),
          child: Image.network(
            item.image!,
            width: effectiveSize,
            height: effectiveSize,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                _buildIconFallback(color, isGrayedOut, effectiveSize),
          ),
        ),
      );
    }

    if (useSymbols && item.symbolUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(effectiveSize / 4),
        child: Image.network(
          item.symbolUrl!,
          width: effectiveSize,
          height: effectiveSize,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              _buildIconFallback(color, isGrayedOut, effectiveSize),
        ),
      );
    }

    return _buildIconFallback(color, isGrayedOut, effectiveSize);
  }

  Widget _buildIconFallback(Color color, bool isGrayedOut, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: (isGrayedOut ? Colors.grey : color).withOpacity(0.15),
        borderRadius: BorderRadius.circular(size / 4),
      ),
      child: Icon(
        _getIconData(item.icon),
        size: size * 0.6,
        color: isGrayedOut ? Colors.grey : color,
      ),
    );
  }

  Color _parseColor(String colorString) {
    try {
      final hex = colorString.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (e) {
      return Colors.blue;
    }
  }

  IconData _getIconData(String iconName) {
    const icons = {
      'menu_book': Icons.menu_book,
      'play_circle': Icons.play_circle,
      'quiz': Icons.quiz,
      'games': Icons.games,
      'edit': Icons.edit,
      'school': Icons.school,
      'swap_horiz': Icons.swap_horiz,
      'transition': Icons.swap_horiz,
      'celebration': Icons.celebration,
      'coffee': Icons.coffee,
      'break': Icons.coffee,
      'restaurant': Icons.restaurant,
      'check_circle': Icons.check_circle,
      'assignment': Icons.assignment,
      'auto_stories': Icons.auto_stories,
      'edit_note': Icons.edit_note,
      'calculate': Icons.calculate,
      'science': Icons.science,
      'palette': Icons.palette,
      'music_note': Icons.music_note,
      'replay': Icons.replay,
      'visibility': Icons.visibility,
      'psychology': Icons.psychology,
      'touch_app': Icons.touch_app,
      'arrow_forward': Icons.arrow_forward,
      'article': Icons.article,
      'flag': Icons.flag,
      'refresh': Icons.refresh,
    };
    return icons[iconName] ?? Icons.circle;
  }
}
