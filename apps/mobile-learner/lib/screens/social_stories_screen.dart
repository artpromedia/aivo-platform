/// Social Stories Screen
///
/// Displays social stories recommendations and allows browsing by category.
/// Integrates with the social stories service for personalized suggestions.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../social_stories/social_stories.dart';

/// Main screen for browsing and viewing social stories
class SocialStoriesScreen extends ConsumerStatefulWidget {
  const SocialStoriesScreen({
    super.key,
    required this.learnerId,
    this.initialCategory,
    this.emotionalState,
    this.activityType,
  });

  final String learnerId;
  final StoryCategory? initialCategory;
  final String? emotionalState;
  final String? activityType;

  @override
  ConsumerState<SocialStoriesScreen> createState() => _SocialStoriesScreenState();
}

class _SocialStoriesScreenState extends ConsumerState<SocialStoriesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  StoryCategory? _selectedCategory;

  static const _tabs = [
    _TabInfo('For You', Icons.star_outline),
    _TabInfo('Feelings', Icons.favorite_outline),
    _TabInfo('School', Icons.school_outlined),
    _TabInfo('Social', Icons.people_outline),
    _TabInfo('All', Icons.grid_view),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _selectedCategory = widget.initialCategory;
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Social Stories'),
        backgroundColor: theme.colorScheme.primaryContainer,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _tabs.map((tab) => Tab(
            icon: Icon(tab.icon),
            text: tab.label,
          )).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // For You - personalized recommendations
          _RecommendationsTab(
            learnerId: widget.learnerId,
            emotionalState: widget.emotionalState,
            activityType: widget.activityType,
          ),
          // Feelings - emotional regulation stories
          _CategoryTab(
            learnerId: widget.learnerId,
            categories: const [
              StoryCategory.feelingFrustrated,
              StoryCategory.feelingOverwhelmed,
              StoryCategory.feelingAnxious,
              StoryCategory.feelingAngry,
              StoryCategory.feelingSad,
              StoryCategory.feelingHappy,
              StoryCategory.emotionalRegulation,
              StoryCategory.calmingDown,
            ],
          ),
          // School - academic and classroom stories
          _CategoryTab(
            learnerId: widget.learnerId,
            categories: const [
              StoryCategory.startingLesson,
              StoryCategory.takingQuiz,
              StoryCategory.classroomRoutine,
              StoryCategory.workingInGroup,
              StoryCategory.homeworkTime,
              StoryCategory.transitionTime,
              StoryCategory.endOfDay,
            ],
          ),
          // Social - social skills stories
          _CategoryTab(
            learnerId: widget.learnerId,
            categories: const [
              StoryCategory.askingForHelp,
              StoryCategory.makingFriends,
              StoryCategory.sharingTurns,
              StoryCategory.personalSpace,
              StoryCategory.waitingTurn,
              StoryCategory.listeningToOthers,
              StoryCategory.playgroundRules,
            ],
          ),
          // All - browse all stories
          _AllStoriesTab(learnerId: widget.learnerId),
        ],
      ),
    );
  }
}

class _TabInfo {
  const _TabInfo(this.label, this.icon);
  final String label;
  final IconData icon;
}

/// Tab showing personalized recommendations
class _RecommendationsTab extends ConsumerWidget {
  const _RecommendationsTab({
    required this.learnerId,
    this.emotionalState,
    this.activityType,
  });

  final String learnerId;
  final String? emotionalState;
  final String? activityType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendationsAsync = ref.watch(
      storyRecommendationsProvider(
        StoryRecommendationQuery(
          learnerId: learnerId,
          emotionalState: emotionalState,
          activityTypes: activityType != null ? [activityType!] : null,
          maxResults: 10,
        ),
      ),
    );

    return recommendationsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.orange),
            const SizedBox(height: 16),
            Text('Unable to load recommendations'),
            TextButton(
              onPressed: () => ref.invalidate(storyRecommendationsProvider(
                StoryRecommendationQuery(
                  learnerId: learnerId,
                  emotionalState: emotionalState,
                  activityTypes: activityType != null ? [activityType!] : null,
                  maxResults: 10,
                ),
              )),
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
      data: (recommendations) {
        if (recommendations.isEmpty) {
          return const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_stories, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('No stories available right now'),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: recommendations.length,
          itemBuilder: (context, index) {
            final recommendation = recommendations[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: StoryRecommendationCard(
                recommendation: recommendation,
                onTap: () => _launchStory(context, ref, recommendation.story),
              ),
            );
          },
        );
      },
    );
  }

  void _launchStory(BuildContext context, WidgetRef ref, SocialStory story) {
    StoryLauncher.launchStory(
      context,
      story: story,
      learnerId: learnerId,
      triggerType: StoryTriggerType.manual,
    );
  }
}

/// Tab showing stories for specific categories
class _CategoryTab extends ConsumerWidget {
  const _CategoryTab({
    required this.learnerId,
    required this.categories,
  });

  final String learnerId;
  final List<StoryCategory> categories;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final storiesAsync = ref.watch(
      storyRecommendationsProvider(
        StoryRecommendationQuery(
          learnerId: learnerId,
          categories: categories,
          maxResults: 20,
        ),
      ),
    );

    return storiesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.orange),
            const SizedBox(height: 16),
            Text('Unable to load stories'),
          ],
        ),
      ),
      data: (recommendations) {
        if (recommendations.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_stories, size: 64, color: theme.disabledColor),
                const SizedBox(height: 16),
                Text(
                  'No stories in this category yet',
                  style: theme.textTheme.bodyLarge,
                ),
              ],
            ),
          );
        }

        // Group by category
        final byCategory = <StoryCategory, List<StoryRecommendation>>{};
        for (final rec in recommendations) {
          byCategory.putIfAbsent(rec.story.category, () => []).add(rec);
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            for (final entry in byCategory.entries) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 8, top: 8),
                child: Text(
                  _getCategoryLabel(entry.key),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              ...entry.value.map(
                (rec) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: StoryRecommendationCard(
                    recommendation: rec,
                    compact: true,
                    onTap: () => StoryLauncher.launchStory(
                      context,
                      story: rec.story,
                      learnerId: learnerId,
                      triggerType: StoryTriggerType.manual,
                    ),
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  String _getCategoryLabel(StoryCategory category) {
    // Convert enum to readable label
    final name = category.name;
    // Split camelCase into words
    final words = name.replaceAllMapped(
      RegExp(r'([A-Z])'),
      (m) => ' ${m.group(1)}',
    );
    // Capitalize first letter of each word
    return words.trim().split(' ').map((w) =>
      w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}'
    ).join(' ');
  }
}

/// Tab showing all stories with search/filter
class _AllStoriesTab extends ConsumerStatefulWidget {
  const _AllStoriesTab({required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<_AllStoriesTab> createState() => _AllStoriesTabState();
}

class _AllStoriesTabState extends ConsumerState<_AllStoriesTab> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final storiesAsync = ref.watch(
      storyRecommendationsProvider(
        StoryRecommendationQuery(
          learnerId: widget.learnerId,
          maxResults: 50,
        ),
      ),
    );

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search stories...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
            onChanged: (value) => setState(() => _searchQuery = value.toLowerCase()),
          ),
        ),
        // Stories list
        Expanded(
          child: storiesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => const Center(
              child: Text('Unable to load stories'),
            ),
            data: (recommendations) {
              // Filter by search query
              final filtered = _searchQuery.isEmpty
                  ? recommendations
                  : recommendations.where((rec) =>
                      rec.story.title.toLowerCase().contains(_searchQuery) ||
                      (rec.story.description?.toLowerCase().contains(_searchQuery) ?? false)
                    ).toList();

              if (filtered.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.search_off, size: 48, color: theme.disabledColor),
                      const SizedBox(height: 16),
                      Text(
                        _searchQuery.isEmpty
                            ? 'No stories available'
                            : 'No stories match your search',
                        style: theme.textTheme.bodyLarge,
                      ),
                    ],
                  ),
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
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final recommendation = filtered[index];
                  return StoryRecommendationCard(
                    recommendation: recommendation,
                    onTap: () => StoryLauncher.launchStory(
                      context,
                      story: recommendation.story,
                      learnerId: widget.learnerId,
                      triggerType: StoryTriggerType.manual,
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
