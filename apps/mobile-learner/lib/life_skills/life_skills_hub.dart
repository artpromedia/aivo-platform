/// Life Skills Hub
/// 
/// Main entry point for the life skills module.
/// Displays skill categories, progress, and goals.
library;

import 'package:flutter/material.dart';
import 'life_skills_models.dart';
import 'life_skills_service.dart';
import 'skill_guide_screen.dart';
import 'safety_scenario_screen.dart';
import 'widgets/widgets.dart';

/// Life Skills Hub - main screen for life skills learning
class LifeSkillsHub extends StatefulWidget {
  final LifeSkillsService service;
  final String tenantId;
  final String learnerId;
  final bool showSafetySection;

  const LifeSkillsHub({
    super.key,
    required this.service,
    required this.tenantId,
    required this.learnerId,
    this.showSafetySection = true,
  });

  @override
  State<LifeSkillsHub> createState() => _LifeSkillsHubState();
}

class _LifeSkillsHubState extends State<LifeSkillsHub> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<LifeSkill> _skills = [];
  List<Map<String, dynamic>> _categories = [];
  Map<String, dynamic>? _dashboard;
  bool _isLoading = true;
  String? _error;
  SkillCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.showSafetySection ? 3 : 2,
      vsync: this,
    );
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        widget.service.getSkills(
          tenantId: widget.tenantId,
          category: _selectedCategory,
        ),
        widget.service.getCategories(),
        widget.service.getProgressDashboard(
          tenantId: widget.tenantId,
          learnerId: widget.learnerId,
        ),
      ]);

      setState(() {
        _skills = results[0] as List<LifeSkill>;
        _categories = results[1] as List<Map<String, dynamic>>;
        _dashboard = results[2] as Map<String, dynamic>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Life Skills'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            const Tab(icon: Icon(Icons.school), text: 'Learn'),
            const Tab(icon: Icon(Icons.trending_up), text: 'Progress'),
            if (widget.showSafetySection)
              const Tab(icon: Icon(Icons.security), text: 'Safety'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildLearnTab(theme),
                    _buildProgressTab(theme),
                    if (widget.showSafetySection) _buildSafetyTab(theme),
                  ],
                ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text('Something went wrong', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(_error ?? 'Unknown error'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildLearnTab(ThemeData theme) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        slivers: [
          // Category chips
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Categories',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('All'),
                        selected: _selectedCategory == null,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => _selectedCategory = null);
                            _loadData();
                          }
                        },
                      ),
                      ..._categories.map((cat) {
                        final category = SkillCategory.fromString(cat['category'] as String);
                        return ChoiceChip(
                          avatar: Text(category.icon),
                          label: Text(category.displayName),
                          selected: _selectedCategory == category,
                          onSelected: (selected) {
                            setState(() => _selectedCategory = selected ? category : null);
                            _loadData();
                          },
                        );
                      }),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Skills grid
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.85,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final skill = _skills[index];
                  return SkillCard(
                    skill: skill,
                    onTap: () => _openSkillGuide(skill),
                  );
                },
                childCount: _skills.length,
              ),
            ),
          ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildProgressTab(ThemeData theme) {
    final dashboard = _dashboard?['dashboard'] as Map<String, dynamic>?;
    final summary = dashboard?['summary'] as Map<String, dynamic>?;
    final byCategory = (dashboard?['byCategory'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Progress summary card
          if (summary != null) ...[
            ProgressSummaryCard(
              skillsInProgress: summary['skillsInProgress'] as int? ?? 0,
              skillsAchieved: summary['skillsAchieved'] as int? ?? 0,
              averageMastery: (summary['averageMastery'] as num?)?.toDouble() ?? 0,
              currentStreak: summary['currentStreak'] as int? ?? 0,
              totalMinutes: summary['totalMinutes'] as int? ?? 0,
            ),
            const SizedBox(height: 24),
          ],

          // Progress by category
          Text(
            'Progress by Category',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          ...byCategory.map((cat) {
            final category = SkillCategory.fromString(cat['category'] as String);
            final skills = (cat['skills'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];
            final avgMastery = (cat['averageMastery'] as num?)?.toDouble() ?? 0;
            
            return CategoryProgressCard(
              category: category,
              skillCount: skills.length,
              averageMastery: avgMastery,
              onTap: () {
                setState(() => _selectedCategory = category);
                _tabController.animateTo(0);
                _loadData();
              },
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSafetyTab(ThemeData theme) {
    return SafetyPracticeSection(
      service: widget.service,
      tenantId: widget.tenantId,
      learnerId: widget.learnerId,
    );
  }

  void _openSkillGuide(LifeSkill skill) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => SkillGuideScreen(
          service: widget.service,
          tenantId: widget.tenantId,
          learnerId: widget.learnerId,
          skillId: skill.id,
        ),
      ),
    ).then((_) => _loadData());
  }
}
