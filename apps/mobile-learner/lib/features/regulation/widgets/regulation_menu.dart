/// Regulation Menu Widget - ND-3.2
///
/// Main menu for accessing offline regulation activities.
/// Provides categorized access to breathing, grounding, movement, and sensory activities.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../offline/cached_activities.dart';
import '../../../offline/offline_regulation_service.dart';
import '../../../offline/offline_manager.dart';
import 'activity_player.dart';

class RegulationMenuScreen extends ConsumerStatefulWidget {
  final String learnerId;
  final AgeGroup? ageGroup;

  const RegulationMenuScreen({
    super.key,
    required this.learnerId,
    this.ageGroup,
  });

  @override
  ConsumerState<RegulationMenuScreen> createState() => _RegulationMenuScreenState();
}

class _RegulationMenuScreenState extends ConsumerState<RegulationMenuScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedMood;

  static const _categoryTabs = [
    (ActivityCategory.breathing, 'Breathing', Icons.air),
    (ActivityCategory.grounding, 'Grounding', Icons.spa),
    (ActivityCategory.movement, 'Movement', Icons.directions_run),
    (ActivityCategory.sensory, 'Sensory', Icons.touch_app),
    (ActivityCategory.sounds, 'Sounds', Icons.music_note),
    (ActivityCategory.counting, 'Counting', Icons.format_list_numbered),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categoryTabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final offlineManager = ref.watch(offlineManagerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Calm Corner'),
        actions: [
          // Offline indicator
          _buildOfflineIndicator(offlineManager),
          IconButton(
            icon: const Icon(Icons.favorite_outline),
            onPressed: () => _showFavorites(context),
            tooltip: 'Favorites',
          ),
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => _showRecent(context),
            tooltip: 'Recent',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _categoryTabs
              .map((t) => Tab(icon: Icon(t.$3), text: t.$2))
              .toList(),
        ),
      ),
      body: Column(
        children: [
          // Quick mood selector
          _buildMoodSelector(),

          // Recommendations section
          _buildRecommendationsSection(),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: _categoryTabs
                  .map((t) => _buildCategoryContent(t.$1))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOfflineIndicator(OfflineManager offlineManager) {
    final isOnline = offlineManager.isOnline;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Chip(
        avatar: Icon(
          isOnline ? Icons.cloud_done : Icons.cloud_off,
          size: 18,
          color: isOnline ? Colors.green : Colors.orange,
        ),
        label: Text(
          isOnline ? 'Online' : 'Offline',
          style: TextStyle(
            fontSize: 12,
            color: isOnline ? Colors.green : Colors.orange,
          ),
        ),
        backgroundColor: (isOnline ? Colors.green : Colors.orange).withOpacity(0.1),
        side: BorderSide.none,
        padding: EdgeInsets.zero,
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildMoodSelector() {
    final moods = [
      ('😰', 'Anxious'),
      ('😤', 'Frustrated'),
      ('😢', 'Sad'),
      ('😵', 'Overwhelmed'),
      ('😴', 'Tired'),
      ('🏃', 'Restless'),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'How are you feeling?',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: moods.map((mood) => _buildMoodChip(mood.$1, mood.$2)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMoodChip(String emoji, String label) {
    final isSelected = _selectedMood == label.toLowerCase();
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 4),
            Text(label),
          ],
        ),
        onSelected: (selected) {
          setState(() {
            _selectedMood = selected ? label.toLowerCase() : null;
          });
        },
      ),
    );
  }

  Widget _buildRecommendationsSection() {
    if (_selectedMood == null) return const SizedBox.shrink();

    final params = RecommendationParams(
      learnerId: widget.learnerId,
      currentMood: _selectedMood,
      limit: 3,
    );

    return ref.watch(recommendedActivitiesProvider(params)).when(
      data: (activities) => _buildRecommendationsList(activities),
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildRecommendationsList(List<CachedActivity> activities) {
    if (activities.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, size: 20, color: Colors.amber),
              const SizedBox(width: 8),
              Text(
                'Recommended for you',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: activities.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) =>
                  _buildRecommendationCard(activities[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationCard(CachedActivity activity) {
    return InkWell(
      onTap: () => _startActivity(activity),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 160,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              _getCategoryColor(activity.category).withOpacity(0.2),
              _getCategoryColor(activity.category).withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _getCategoryColor(activity.category).withOpacity(0.3),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              _getCategoryIcon(activity.category),
              color: _getCategoryColor(activity.category),
            ),
            const Spacer(),
            Text(
              activity.name,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              '${activity.durationSeconds ~/ 60} min',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryContent(ActivityCategory category) {
    final filters = ActivityFilters(
      category: category,
      ageGroup: widget.ageGroup,
    );

    return ref.watch(availableActivitiesProvider(filters)).when(
      data: (activities) => _buildActivityGrid(activities),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Text('Error loading activities: $error'),
      ),
    );
  }

  Widget _buildActivityGrid(List<CachedActivity> activities) {
    if (activities.isEmpty) {
      return const Center(
        child: Text('No activities in this category'),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: activities.length,
      itemBuilder: (context, index) => _buildActivityCard(activities[index]),
    );
  }

  Widget _buildActivityCard(CachedActivity activity) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () => _startActivity(activity),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _getCategoryColor(activity.category).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getCategoryIcon(activity.category),
                      color: _getCategoryColor(activity.category),
                      size: 24,
                    ),
                  ),
                  _buildFavoriteButton(activity),
                ],
              ),
              const Spacer(),
              Text(
                activity.name,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                activity.description,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.timer_outlined,
                    size: 14,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${activity.durationSeconds ~/ 60} min',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const Spacer(),
                  _buildDifficultyIndicator(activity.difficulty),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFavoriteButton(CachedActivity activity) {
    return FutureBuilder<bool>(
      future: ref.read(offlineRegulationServiceProvider)
          .isFavorite(widget.learnerId, activity.id),
      builder: (context, snapshot) {
        final isFavorite = snapshot.data ?? false;
        return IconButton(
          icon: Icon(
            isFavorite ? Icons.favorite : Icons.favorite_border,
            color: isFavorite ? Colors.red : null,
            size: 20,
          ),
          onPressed: () async {
            await ref.read(offlineRegulationServiceProvider)
                .toggleFavorite(widget.learnerId, activity.id);
            setState(() {}); // Refresh UI
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        );
      },
    );
  }

  Widget _buildDifficultyIndicator(ActivityDifficulty difficulty) {
    final colors = {
      ActivityDifficulty.beginner: Colors.green,
      ActivityDifficulty.intermediate: Colors.orange,
      ActivityDifficulty.advanced: Colors.red,
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        final level = ActivityDifficulty.values.indexOf(difficulty);
        return Container(
          width: 6,
          height: 6,
          margin: const EdgeInsets.only(right: 2),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: index <= level
                ? colors[difficulty]
                : Colors.grey.withOpacity(0.3),
          ),
        );
      }),
    );
  }

  void _startActivity(CachedActivity activity) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ActivityPlayerScreen(
          activity: activity,
          learnerId: widget.learnerId,
        ),
      ),
    );
  }

  void _showFavorites(BuildContext context) async {
    final favorites = await ref.read(offlineRegulationServiceProvider)
        .getFavoriteActivities(widget.learnerId);
    
    if (!mounted) return;
    
    _showActivityListDialog(
      context,
      'Favorites',
      favorites,
      Icons.favorite,
    );
  }

  void _showRecent(BuildContext context) async {
    final recent = await ref.read(offlineRegulationServiceProvider)
        .getRecentActivities(widget.learnerId);
    
    if (!mounted) return;
    
    _showActivityListDialog(
      context,
      'Recent Activities',
      recent,
      Icons.history,
    );
  }

  void _showActivityListDialog(
    BuildContext context,
    String title,
    List<CachedActivity> activities,
    IconData icon,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(icon),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: activities.isEmpty
                  ? Center(
                      child: Text(
                        'No $title yet',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: scrollController,
                      itemCount: activities.length,
                      itemBuilder: (context, index) =>
                          _buildActivityListTile(activities[index]),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityListTile(CachedActivity activity) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: _getCategoryColor(activity.category).withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          _getCategoryIcon(activity.category),
          color: _getCategoryColor(activity.category),
        ),
      ),
      title: Text(activity.name),
      subtitle: Text('${activity.durationSeconds ~/ 60} min'),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        Navigator.of(context).pop();
        _startActivity(activity);
      },
    );
  }

  Color _getCategoryColor(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.breathing:
        return Colors.blue;
      case ActivityCategory.grounding:
        return Colors.green;
      case ActivityCategory.movement:
        return Colors.orange;
      case ActivityCategory.sensory:
        return Colors.purple;
      case ActivityCategory.sounds:
        return Colors.indigo;
      case ActivityCategory.counting:
        return Colors.teal;
      case ActivityCategory.visualization:
        return Colors.pink;
      case ActivityCategory.progressive:
        return Colors.cyan;
    }
  }

  IconData _getCategoryIcon(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.breathing:
        return Icons.air;
      case ActivityCategory.grounding:
        return Icons.spa;
      case ActivityCategory.movement:
        return Icons.directions_run;
      case ActivityCategory.sensory:
        return Icons.touch_app;
      case ActivityCategory.sounds:
        return Icons.music_note;
      case ActivityCategory.counting:
        return Icons.format_list_numbered;
      case ActivityCategory.visualization:
        return Icons.visibility;
      case ActivityCategory.progressive:
        return Icons.trending_up;
    }
  }
}
