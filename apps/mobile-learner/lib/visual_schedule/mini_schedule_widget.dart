/// Mini Schedule Widget - ND-1.3
///
/// Compact schedule widget for embedding in other screens.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'schedule_models.dart';
import 'schedule_provider.dart';
import 'visual_schedule_screen.dart';

/// Compact schedule widget for embedding in dashboards or other screens
class MiniScheduleWidget extends ConsumerWidget {
  final int maxItems;
  final bool showProgress;
  final VoidCallback? onTap;

  const MiniScheduleWidget({
    super.key,
    this.maxItems = 3,
    this.showProgress = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(scheduleNotifierProvider);

    if (state.isLoading) {
      return _buildSkeleton();
    }

    if (state.error != null || state.currentSchedule == null) {
      return _buildEmptyState(context);
    }

    return _buildSchedulePreview(context, state.currentSchedule!);
  }

  Widget _buildSkeleton() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 20,
            width: 120,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: 16),
          ...List.generate(
            3,
            (index) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today,
              size: 40,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 8),
            Text(
              'No schedule yet',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSchedulePreview(
    BuildContext context,
    ScheduleWithProgress schedule,
  ) {
    final currentIndex = schedule.items.indexWhere(
      (item) => item.status == ScheduleItemStatus.current,
    );

    // Get items around current
    final startIndex = currentIndex >= 0 ? currentIndex : 0;
    final endIndex = (startIndex + maxItems).clamp(0, schedule.items.length);
    final visibleItems = schedule.items.sublist(startIndex, endIndex);

    return GestureDetector(
      onTap: onTap ??
          () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const VisualScheduleScreen(),
              ),
            );
          },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.schedule, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'My Schedule',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Icon(
                  Icons.chevron_right,
                  color: Colors.grey.shade400,
                ),
              ],
            ),

            if (showProgress) ...[
              const SizedBox(height: 12),
              _buildProgressIndicator(schedule.progress),
            ],

            const SizedBox(height: 16),

            // Items
            ...visibleItems.map((item) => _buildMiniItem(item)),

            // More items indicator
            if (schedule.items.length > endIndex)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '+${schedule.items.length - endIndex} more',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressIndicator(ScheduleProgress progress) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${progress.completed}/${progress.total} done',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
            Text(
              '${progress.percentComplete}%',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress.percentComplete / 100,
            minHeight: 6,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation(
              progress.percentComplete == 100 ? Colors.green : Colors.blue,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMiniItem(ScheduleItem item) {
    final color = _parseColor(item.color);
    final isCompleted = item.status == ScheduleItemStatus.completed;
    final isCurrent = item.status == ScheduleItemStatus.current;
    final isSkipped = item.status == ScheduleItemStatus.skipped;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          // Status indicator
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: isCompleted
                  ? Colors.green
                  : isSkipped
                      ? Colors.orange
                      : isCurrent
                          ? color
                          : Colors.grey.shade200,
              shape: BoxShape.circle,
            ),
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 14)
                : isSkipped
                    ? const Icon(Icons.skip_next, color: Colors.white, size: 14)
                    : isCurrent
                        ? const Icon(Icons.play_arrow,
                            color: Colors.white, size: 14)
                        : null,
          ),
          const SizedBox(width: 12),

          // Title
          Expanded(
            child: Text(
              item.title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                decoration: isCompleted || isSkipped
                    ? TextDecoration.lineThrough
                    : null,
                color: isCompleted || isSkipped ? Colors.grey : Colors.black87,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),

          // Duration
          if (item.estimatedDuration > 0)
            Text(
              '${item.estimatedDuration}m',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade500,
              ),
            ),
        ],
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
}

/// Horizontal strip version of mini schedule
class MiniScheduleStrip extends ConsumerWidget {
  final VoidCallback? onTap;

  const MiniScheduleStrip({
    super.key,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(scheduleNotifierProvider);

    if (state.isLoading ||
        state.error != null ||
        state.currentSchedule == null) {
      return const SizedBox.shrink();
    }

    final schedule = state.currentSchedule!;
    final currentItem = schedule.currentItem;
    final nextItem = schedule.nextItem;

    if (currentItem == null) {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: onTap ??
          () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const VisualScheduleScreen(),
              ),
            );
          },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            bottom: BorderSide(color: Colors.grey.shade200),
          ),
        ),
        child: Row(
          children: [
            // Current item
            Expanded(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'NOW',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      currentItem.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            // Arrow
            if (nextItem != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Icon(
                  Icons.arrow_forward,
                  size: 16,
                  color: Colors.grey.shade400,
                ),
              ),

            // Next item
            if (nextItem != null)
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'NEXT',
                        style: TextStyle(
                          color: Colors.black54,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        nextItem.title,
                        style: TextStyle(
                          color: Colors.grey.shade600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

            // Expand icon
            Icon(
              Icons.expand_more,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }
}
