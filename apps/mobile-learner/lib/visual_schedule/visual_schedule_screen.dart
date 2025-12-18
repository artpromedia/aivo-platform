/// Visual Schedule Screen - ND-1.3
///
/// Main screen for displaying visual schedules with multiple layout options.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'schedule_models.dart';
import 'schedule_provider.dart';
import 'schedule_item_widget.dart';
import 'schedule_customization_screen.dart';

/// Main screen for displaying visual schedules
class VisualScheduleScreen extends ConsumerStatefulWidget {
  final String? scheduleId;
  final ScheduleDisplayStyle? preferredStyle;

  const VisualScheduleScreen({
    super.key,
    this.scheduleId,
    this.preferredStyle,
  });

  @override
  ConsumerState<VisualScheduleScreen> createState() =>
      _VisualScheduleScreenState();
}

class _VisualScheduleScreenState extends ConsumerState<VisualScheduleScreen>
    with TickerProviderStateMixin {
  late ScrollController _scrollController;
  late AnimationController _celebrationController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _celebrationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSchedule();
    });
  }

  void _loadSchedule() {
    final notifier = ref.read(scheduleNotifierProvider.notifier);
    if (widget.scheduleId != null) {
      notifier.loadSchedule(widget.scheduleId!);
    } else {
      notifier.loadTodaySchedule();
    }
    notifier.loadPreferences();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _celebrationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(scheduleNotifierProvider);

    if (state.isLoading) {
      return const _ScheduleSkeleton();
    }

    if (state.error != null) {
      return _ScheduleError(
        error: state.error!,
        onRetry: _loadSchedule,
      );
    }

    final schedule = state.currentSchedule;
    if (schedule == null) {
      return const _NoScheduleView();
    }

    final preferences = state.preferences;

    return Scaffold(
      backgroundColor:
          preferences?.highContrast == true ? Colors.white : Colors.grey.shade50,
      appBar: _buildAppBar(preferences),
      body: Column(
        children: [
          if (preferences?.showProgressBar ?? true)
            _buildProgressBar(schedule.progress),
          Expanded(
            child: _buildScheduleView(schedule, preferences),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(SchedulePreferences? preferences) {
    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My Schedule'),
          Text(
            _formatDate(DateTime.now()),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.settings),
          onPressed: () => _showPreferencesSheet(),
        ),
      ],
    );
  }

  Widget _buildProgressBar(ScheduleProgress progress) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${progress.completed} of ${progress.total} done',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                '${progress.percentComplete}%',
                style: TextStyle(
                  color: Theme.of(context).primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress.percentComplete / 100,
              minHeight: 12,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation(
                progress.percentComplete == 100
                    ? Colors.green
                    : Theme.of(context).primaryColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleView(
    ScheduleWithProgress schedule,
    SchedulePreferences? preferences,
  ) {
    final style = widget.preferredStyle ??
        preferences?.preferredStyle ??
        ScheduleDisplayStyle.verticalList;

    switch (style) {
      case ScheduleDisplayStyle.verticalList:
        return _buildVerticalList(schedule, preferences);
      case ScheduleDisplayStyle.horizontalStrip:
        return _buildHorizontalStrip(schedule, preferences);
      case ScheduleDisplayStyle.grid:
        return _buildGrid(schedule, preferences);
      case ScheduleDisplayStyle.firstThen:
        return _buildFirstThenBoard(schedule, preferences);
      case ScheduleDisplayStyle.nowNextLater:
        return _buildNowNextLater(schedule, preferences);
    }
  }

  Widget _buildVerticalList(
    ScheduleWithProgress schedule,
    SchedulePreferences? preferences,
  ) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: schedule.items.length,
      itemBuilder: (context, index) {
        final item = schedule.items[index];
        final isFirst = index == 0;

        return Column(
          children: [
            if (!isFirst) _buildConnectionLine(item.status),
            ScheduleItemWidget(
              item: item,
              displayStyle: ScheduleItemDisplayStyle.card,
              showTime: preferences?.showTimes ?? true,
              showDuration: preferences?.showDuration ?? true,
              showImage: preferences?.showImages ?? true,
              useSymbols: preferences?.useSymbols ?? false,
              iconSize: _getIconSize(preferences?.iconSize),
              onTap: item.status == ScheduleItemStatus.current
                  ? () => _showItemActions(item)
                  : null,
              onComplete: item.status == ScheduleItemStatus.current
                  ? () => _completeItem(item)
                  : null,
            ),
          ],
        );
      },
    );
  }

  Widget _buildHorizontalStrip(
    ScheduleWithProgress schedule,
    SchedulePreferences? preferences,
  ) {
    // Scroll to current item
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentIndex =
          schedule.items.indexWhere((i) => i.status == ScheduleItemStatus.current);
      if (currentIndex > 0 && _scrollController.hasClients) {
        _scrollController.animateTo(
          currentIndex * 140.0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });

    return Column(
      children: [
        // Current item highlight
        if (schedule.currentItem != null)
          _buildCurrentItemHighlight(schedule.currentItem!),

        const SizedBox(height: 16),

        // Horizontal scroll strip
        SizedBox(
          height: 180,
          child: ListView.builder(
            controller: _scrollController,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: schedule.items.length,
            itemBuilder: (context, index) {
              final item = schedule.items[index];
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: SizedBox(
                  width: 130,
                  child: ScheduleItemWidget(
                    item: item,
                    displayStyle: ScheduleItemDisplayStyle.compact,
                    showTime: false,
                    showDuration: false,
                    showImage: true,
                    useSymbols: preferences?.useSymbols ?? false,
                    iconSize: 48,
                    onTap: item.status == ScheduleItemStatus.current
                        ? () => _showItemActions(item)
                        : null,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildGrid(
    ScheduleWithProgress schedule,
    SchedulePreferences? preferences,
  ) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.9,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: schedule.items.length,
      itemBuilder: (context, index) {
        final item = schedule.items[index];
        return ScheduleItemWidget(
          item: item,
          displayStyle: ScheduleItemDisplayStyle.gridTile,
          showTime: false,
          showDuration: false,
          showImage: true,
          useSymbols: preferences?.useSymbols ?? false,
          iconSize: 40,
          onTap: item.status == ScheduleItemStatus.current
              ? () => _showItemActions(item)
              : null,
        );
      },
    );
  }

  Widget _buildFirstThenBoard(
    ScheduleWithProgress schedule,
    SchedulePreferences? preferences,
  ) {
    final currentItem = schedule.currentItem;
    final nextItem = schedule.nextItem;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Spacer(),

          // First
          _buildFirstThenSection(
            label: 'FIRST',
            item: currentItem,
            color: Colors.green,
            preferences: preferences,
            isActive: true,
          ),

          const SizedBox(height: 32),

          // Arrow
          Icon(
            Icons.arrow_downward,
            size: 48,
            color: Theme.of(context).primaryColor,
          ),

          const SizedBox(height: 32),

          // Then
          _buildFirstThenSection(
            label: 'THEN',
            item: nextItem,
            color: Colors.blue,
            preferences: preferences,
            isActive: false,
          ),

          const Spacer(),

          // Complete button
          if (currentItem != null)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _completeItem(currentItem),
                icon: const Icon(Icons.check),
                label: const Text('Done with this!'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFirstThenSection({
    required String label,
    required ScheduleItem? item,
    required Color color,
    required SchedulePreferences? preferences,
    required bool isActive,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isActive ? color.withOpacity(0.1) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isActive ? color : Colors.grey.shade300,
          width: 3,
        ),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: isActive ? color : Colors.grey,
            ),
          ),
          const SizedBox(height: 16),
          if (item != null)
            ScheduleItemWidget(
              item: item,
              displayStyle: ScheduleItemDisplayStyle.large,
              showTime: false,
              showDuration: false,
              showImage: true,
              useSymbols: preferences?.useSymbols ?? false,
              iconSize: 80,
            )
          else
            const Text(
              'All done!',
              style: TextStyle(fontSize: 20, color: Colors.grey),
            ),
        ],
      ),
    );
  }

  Widget _buildNowNextLater(
    ScheduleWithProgress schedule,
    SchedulePreferences? preferences,
  ) {
    final items = schedule.items;
    final currentIndex =
        items.indexWhere((i) => i.status == ScheduleItemStatus.current);

    ScheduleItem? now;
    ScheduleItem? next;
    ScheduleItem? later;

    if (currentIndex != -1) {
      now = items[currentIndex];
      if (currentIndex + 1 < items.length) {
        next = items[currentIndex + 1];
      }
      if (currentIndex + 2 < items.length) {
        later = items[currentIndex + 2];
      }
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // NOW - Large
          Expanded(
            flex: 3,
            child: _buildNowNextLaterCard(
              label: 'NOW',
              item: now,
              color: Colors.green,
              preferences: preferences,
              isMain: true,
            ),
          ),

          const SizedBox(height: 16),

          // NEXT and LATER - Side by side
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Expanded(
                  child: _buildNowNextLaterCard(
                    label: 'NEXT',
                    item: next,
                    color: Colors.orange,
                    preferences: preferences,
                    isMain: false,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildNowNextLaterCard(
                    label: 'LATER',
                    item: later,
                    color: Colors.blue,
                    preferences: preferences,
                    isMain: false,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Complete button
          if (now != null)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _completeItem(now!),
                icon: const Icon(Icons.check_circle),
                label: const Text('Finished!'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNowNextLaterCard({
    required String label,
    required ScheduleItem? item,
    required Color color,
    required SchedulePreferences? preferences,
    required bool isMain,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color, width: 2),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              label,
              style: TextStyle(
                color: Colors.white,
                fontSize: isMain ? 18 : 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (item != null)
            Expanded(
              child: ScheduleItemWidget(
                item: item,
                displayStyle: isMain
                    ? ScheduleItemDisplayStyle.large
                    : ScheduleItemDisplayStyle.compact,
                showTime: false,
                showDuration: false,
                showImage: isMain,
                useSymbols: preferences?.useSymbols ?? false,
                iconSize: isMain ? 60 : 40,
              ),
            )
          else
            const Expanded(
              child: Center(
                child: Text(
                  '✨',
                  style: TextStyle(fontSize: 40),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCurrentItemHighlight(ScheduleItem item) {
    final color = _parseColor(item.color);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: item.image != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(item.image!, fit: BoxFit.cover),
                  )
                : Icon(
                    _getIconData(item.icon),
                    size: 40,
                    color: color,
                  ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'NOW',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (item.estimatedDuration > 0)
                  Text(
                    '${item.estimatedDuration} minutes',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionLine(ScheduleItemStatus status) {
    final color = status == ScheduleItemStatus.completed
        ? Colors.green
        : status == ScheduleItemStatus.current
            ? Theme.of(context).primaryColor
            : Colors.grey.shade300;

    return Container(
      width: 3,
      height: 30,
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  void _showItemActions(ScheduleItem item) {
    final notifier = ref.read(scheduleNotifierProvider.notifier);

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                item.title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: const Icon(Icons.check_circle, color: Colors.green),
                title: const Text('Mark as Done'),
                onTap: () {
                  Navigator.pop(context);
                  _completeItem(item);
                },
              ),
              ListTile(
                leading: const Icon(Icons.skip_next, color: Colors.orange),
                title: const Text('Skip This'),
                onTap: () {
                  Navigator.pop(context);
                  notifier.skipCurrentItem();
                },
              ),
              if (item.activityId != null)
                ListTile(
                  leading: const Icon(Icons.play_arrow, color: Colors.blue),
                  title: const Text('Start Activity'),
                  onTap: () {
                    Navigator.pop(context);
                    // Navigate to activity
                  },
                ),
              if (item.notes != null)
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: Text(item.notes!),
                  dense: true,
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _completeItem(ScheduleItem item) async {
    HapticFeedback.mediumImpact();

    final notifier = ref.read(scheduleNotifierProvider.notifier);
    await notifier.markCurrentAsComplete();

    final preferences = ref.read(scheduleNotifierProvider).preferences;

    // Show celebration
    if (preferences?.celebrateCompletion ?? true) {
      _showCompletionCelebration(item);
    }
  }

  void _showCompletionCelebration(ScheduleItem item) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Text('🎉 '),
            Text('${item.title} - Done!'),
          ],
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showPreferencesSheet() {
    final preferences = ref.read(scheduleNotifierProvider).preferences;
    final notifier = ref.read(scheduleNotifierProvider.notifier);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ScheduleCustomizationScreen(
          preferences: preferences,
          onSave: (updates) {
            notifier.updatePreferences(updates);
            Navigator.pop(context);
          },
        ),
      ),
    );
  }

  double _getIconSize(String? size) {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 64;
      default:
        return 48;
    }
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
      'check_circle': Icons.check_circle,
    };
    return icons[iconName] ?? Icons.circle;
  }

  String _formatDate(DateTime date) {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${days[date.weekday % 7]}, ${months[date.month - 1]} ${date.day}';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORTING WIDGETS
// ══════════════════════════════════════════════════════════════════════════════

class _ScheduleSkeleton extends StatelessWidget {
  const _ScheduleSkeleton();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Schedule')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 5,
        itemBuilder: (context, index) {
          return Container(
            height: 100,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(12),
            ),
          );
        },
      ),
    );
  }
}

class _ScheduleError extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ScheduleError({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Schedule')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(error),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Try Again')),
          ],
        ),
      ),
    );
  }
}

class _NoScheduleView extends StatelessWidget {
  const _NoScheduleView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Schedule')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today, size: 80, color: Colors.grey.shade400),
            const SizedBox(height: 24),
            const Text(
              'No schedule for today',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a learning session to create one!',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}
