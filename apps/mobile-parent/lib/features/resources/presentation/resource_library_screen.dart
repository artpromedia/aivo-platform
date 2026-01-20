/// Resource Library Screen
///
/// Provides parents with:
/// - Educational guides and articles
/// - Video tutorials
/// - Downloadable resources
/// - Webinars and tools
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/resource_models.dart';

/// Resource Library Screen
class ResourceLibraryScreen extends ConsumerStatefulWidget {
  const ResourceLibraryScreen({super.key});

  @override
  ConsumerState<ResourceLibraryScreen> createState() =>
      _ResourceLibraryScreenState();
}

class _ResourceLibraryScreenState extends ConsumerState<ResourceLibraryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  ResourceCategory _selectedCategory = ResourceCategory.guide;
  String _searchQuery = '';
  bool _isLoading = true;
  List<Resource> _resources = [];

  // Mock resources for demo
  final List<Resource> _mockResources = [
    Resource(
      id: '1',
      title: 'Understanding Your Child\'s Learning Profile',
      description:
          'A comprehensive guide to understanding your child\'s unique learning needs and strengths.',
      category: ResourceCategory.guide,
      durationMinutes: 15,
      tags: ['learning', 'profile', 'strengths'],
      publishedAt: DateTime.now().subtract(const Duration(days: 2)),
      isNew: true,
    ),
    Resource(
      id: '2',
      title: 'Supporting Executive Function at Home',
      description:
          'Practical strategies for helping your child develop executive function skills.',
      category: ResourceCategory.guide,
      durationMinutes: 10,
      tags: ['executive function', 'strategies', 'home'],
      publishedAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    Resource(
      id: '3',
      title: 'How to Use AIVO\'s Progress Reports',
      description: 'Learn how to interpret and act on your child\'s progress data.',
      category: ResourceCategory.video,
      durationMinutes: 8,
      tags: ['reports', 'progress', 'tutorial'],
      publishedAt: DateTime.now().subtract(const Duration(days: 1)),
      isNew: true,
    ),
    Resource(
      id: '4',
      title: 'Building Reading Skills at Home',
      description:
          'Fun and effective ways to support your child\'s reading development.',
      category: ResourceCategory.video,
      durationMinutes: 12,
      tags: ['reading', 'home activities', 'literacy'],
      publishedAt: DateTime.now().subtract(const Duration(days: 7)),
    ),
    Resource(
      id: '5',
      title: 'Math Anxiety: What Parents Need to Know',
      description:
          'Understanding and addressing math anxiety in children.',
      category: ResourceCategory.article,
      durationMinutes: 7,
      tags: ['math', 'anxiety', 'support'],
      publishedAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    Resource(
      id: '6',
      title: 'Homework Helper Tips',
      description:
          'Strategies for making homework time more productive and less stressful.',
      category: ResourceCategory.tool,
      durationMinutes: 5,
      tags: ['homework', 'tips', 'strategies'],
      publishedAt: DateTime.now().subtract(const Duration(days: 10)),
    ),
    Resource(
      id: '7',
      title: 'Understanding IEPs: A Parent\'s Guide',
      description:
          'Everything you need to know about Individualized Education Programs.',
      category: ResourceCategory.guide,
      durationMinutes: 20,
      tags: ['IEP', 'special education', 'rights'],
      publishedAt: DateTime.now().subtract(const Duration(days: 14)),
      isFavorite: true,
    ),
    Resource(
      id: '8',
      title: 'Social-Emotional Learning Webinar',
      description:
          'Join our expert panel to learn about supporting your child\'s social-emotional development.',
      category: ResourceCategory.webinar,
      durationMinutes: 45,
      tags: ['SEL', 'webinar', 'expert'],
      publishedAt: DateTime.now().subtract(const Duration(days: 4)),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: ResourceCategory.values.length,
      vsync: this,
    );
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _selectedCategory = ResourceCategory.values[_tabController.index];
        });
      }
    });
    _loadResources();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadResources() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _resources = _mockResources;
      _isLoading = false;
    });
  }

  List<Resource> get _filteredResources {
    var filtered = _resources.where((r) => r.category == _selectedCategory);
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((r) =>
          r.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.description.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.tags.any((t) => t.toLowerCase().contains(_searchQuery.toLowerCase())));
    }
    return filtered.toList();
  }

  IconData _getCategoryIcon(ResourceCategory category) {
    switch (category) {
      case ResourceCategory.guide:
        return Icons.menu_book;
      case ResourceCategory.video:
        return Icons.play_circle;
      case ResourceCategory.article:
        return Icons.article;
      case ResourceCategory.tool:
        return Icons.build;
      case ResourceCategory.webinar:
        return Icons.video_call;
    }
  }

  Color _getCategoryColor(ResourceCategory category) {
    switch (category) {
      case ResourceCategory.guide:
        return Colors.blue;
      case ResourceCategory.video:
        return AivoBrand.error;
      case ResourceCategory.article:
        return AivoBrand.success;
      case ResourceCategory.tool:
        return AivoBrand.warning;
      case ResourceCategory.webinar:
        return Colors.purple;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Resource Library'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // Search bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  onChanged: (value) => setState(() => _searchQuery = value),
                  decoration: InputDecoration(
                    hintText: 'Search resources...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                ),
              ),
              // Category tabs
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabs: ResourceCategory.values.map((category) {
                  return Tab(
                    icon: Icon(_getCategoryIcon(category), size: 20),
                    text: category.label,
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: ResourceCategory.values.map((category) {
                final resources =
                    _filteredResources.where((r) => r.category == category).toList();

                if (resources.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _getCategoryIcon(category),
                          size: 64,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isNotEmpty
                              ? 'No ${category.label.toLowerCase()} found'
                              : 'No ${category.label.toLowerCase()} available',
                          style: theme.textTheme.titleMedium,
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _loadResources,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: resources.length,
                    itemBuilder: (context, index) {
                      final resource = resources[index];
                      return _ResourceCard(
                        resource: resource,
                        categoryColor: _getCategoryColor(resource.category),
                        categoryIcon: _getCategoryIcon(resource.category),
                        onTap: () => _showResourceDetails(context, resource),
                      );
                    },
                  ),
                );
              }).toList(),
            ),
    );
  }

  void _showResourceDetails(BuildContext context, Resource resource) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final color = _getCategoryColor(resource.category);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) {
          return Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Content
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Header
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            backgroundColor: color.withOpacity(0.2),
                            child: Icon(
                              _getCategoryIcon(resource.category),
                              color: color,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (resource.isNew)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    margin: const EdgeInsets.only(bottom: 4),
                                    decoration: BoxDecoration(
                                      color: AivoBrand.success,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'NEW',
                                      style: theme.textTheme.labelSmall?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                Text(
                                  resource.title,
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Meta info
                      Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 16,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${resource.durationMinutes} min',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Icon(
                            Icons.category_outlined,
                            size: 16,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            resource.category.label,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Description
                      Text(
                        resource.description,
                        style: theme.textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 16),

                      // Tags
                      if (resource.tags.isNotEmpty) ...[
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: resource.tags.map((tag) {
                            return Chip(
                              label: Text(tag),
                              backgroundColor: colorScheme.surfaceContainerHighest,
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Actions
                      FilledButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Opening ${resource.title}...')),
                          );
                        },
                        icon: Icon(
                          resource.category == ResourceCategory.video
                              ? Icons.play_arrow
                              : Icons.open_in_new,
                        ),
                        label: Text(
                          resource.category == ResourceCategory.video
                              ? 'Watch Video'
                              : 'Open Resource',
                        ),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () {},
                        icon: Icon(
                          resource.isFavorite
                              ? Icons.bookmark
                              : Icons.bookmark_border,
                        ),
                        label: Text(
                          resource.isFavorite
                              ? 'Saved to Favorites'
                              : 'Save to Favorites',
                        ),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ResourceCard extends StatelessWidget {
  const _ResourceCard({
    required this.resource,
    required this.categoryColor,
    required this.categoryIcon,
    required this.onTap,
  });

  final Resource resource;
  final Color categoryColor;
  final IconData categoryIcon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail/Icon
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: categoryColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(categoryIcon, color: categoryColor, size: 28),
                ),
              ),
              const SizedBox(width: 16),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (resource.isNew) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AivoBrand.success,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'NEW',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Expanded(
                          child: Text(
                            resource.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      resource.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
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
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${resource.durationMinutes} min',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (resource.isFavorite) ...[
                          const SizedBox(width: 12),
                          Icon(
                            Icons.bookmark,
                            size: 14,
                            color: colorScheme.primary,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
