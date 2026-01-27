import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../executive_function/executive_function_service.dart';
import '../../../pin/pin_storage.dart';

/// Strategy Library Screen
///
/// Displays executive function strategies and tips including:
/// - Time management strategies
/// - Organization techniques
/// - Focus strategies
/// - Task initiation help
class StrategyLibraryScreen extends StatefulWidget {
  final String learnerId;

  const StrategyLibraryScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<StrategyLibraryScreen> createState() => _StrategyLibraryScreenState();
}

class _StrategyLibraryScreenState extends State<StrategyLibraryScreen> {
  ExecutiveFunctionService? _efService;
  String _cachedToken = '';

  List<EFStrategy> _strategies = [];
  bool _isLoading = true;
  String? _selectedCategory;

  static const _categories = [
    ('All', null, Icons.apps, Color(0xFF64748B)),
    ('Time', 'TIME_MANAGEMENT', Icons.timer, Color(0xFF3B82F6)),
    ('Organization', 'ORGANIZATION', Icons.folder, Color(0xFF10B981)),
    ('Focus', 'ATTENTION', Icons.center_focus_strong, Color(0xFF8B5CF6)),
    ('Memory', 'WORKING_MEMORY', Icons.psychology, Color(0xFFF59E0B)),
    ('Planning', 'PLANNING', Icons.event_note, Color(0xFFEC4899)),
  ];

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _efService = ExecutiveFunctionService(accessToken: _cachedToken);
    await _loadStrategies();
  }

  Future<void> _loadStrategies() async {
    if (_efService == null) return;

    setState(() => _isLoading = true);

    try {
      final strategies = await _efService!.getRecommendedStrategies(
        skill: _selectedCategory,
      );
      if (mounted) {
        setState(() {
          _strategies = strategies;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _strategies = _getDefaultStrategies();
          _isLoading = false;
        });
      }
    }
  }

  List<EFStrategy> _getDefaultStrategies() {
    return const [
      EFStrategy(
        id: 'pomodoro',
        title: 'Pomodoro Technique',
        description: 'Work for 25 minutes, then take a 5-minute break.',
        category: 'TIME_MANAGEMENT',
        steps: [
          'Set a timer for 25 minutes',
          'Work on your task without distractions',
          'When the timer rings, take a 5-minute break',
          'After 4 pomodoros, take a longer 15-30 minute break',
        ],
        forSkill: 'ATTENTION',
        difficulty: 'BEGINNER',
      ),
      EFStrategy(
        id: 'brain-dump',
        title: 'Brain Dump',
        description: 'Write down everything on your mind to clear your head.',
        category: 'ORGANIZATION',
        steps: [
          'Get a piece of paper or open a note',
          'Write down everything you need to do',
          "Don't worry about order - just get it all out",
          'Then organize by priority',
        ],
        forSkill: 'WORKING_MEMORY',
        difficulty: 'BEGINNER',
      ),
      EFStrategy(
        id: 'two-minute-rule',
        title: 'Two-Minute Rule',
        description: 'If a task takes less than 2 minutes, do it now.',
        category: 'PLANNING',
        steps: [
          'Look at your task',
          'Ask: "Can I do this in under 2 minutes?"',
          'If yes, do it immediately',
          'If no, schedule it for later',
        ],
        forSkill: 'TASK_INITIATION',
        difficulty: 'BEGINNER',
      ),
      EFStrategy(
        id: 'chunking',
        title: 'Chunking',
        description: 'Break large tasks into smaller, manageable pieces.',
        category: 'PLANNING',
        steps: [
          'Look at your big task',
          'Break it into 3-5 smaller steps',
          'Focus on one step at a time',
          'Celebrate completing each step',
        ],
        forSkill: 'PLANNING',
        difficulty: 'BEGINNER',
      ),
      EFStrategy(
        id: 'five-second-rule',
        title: '5-Second Rule',
        description: 'Count down from 5, then start your task immediately.',
        category: 'ATTENTION',
        steps: [
          'Think about the task you need to start',
          'Count down: 5, 4, 3, 2, 1',
          'Immediately begin the task',
          'The momentum will help you continue',
        ],
        forSkill: 'TASK_INITIATION',
        difficulty: 'BEGINNER',
      ),
      EFStrategy(
        id: 'body-double',
        title: 'Body Doubling',
        description: 'Work alongside someone else to stay focused.',
        category: 'ATTENTION',
        steps: [
          'Find a study buddy or join a virtual study room',
          'Work on your task while they work on theirs',
          'The presence of others helps maintain focus',
          'Check in periodically about progress',
        ],
        forSkill: 'ATTENTION',
        difficulty: 'BEGINNER',
      ),
      EFStrategy(
        id: 'eisenhower-matrix',
        title: 'Eisenhower Matrix',
        description: 'Prioritize tasks by urgency and importance.',
        category: 'ORGANIZATION',
        steps: [
          'List all your tasks',
          'For each task, decide: Is it urgent? Is it important?',
          'Urgent + Important: Do first',
          'Important but not urgent: Schedule',
          'Urgent but not important: Delegate or do quick',
          'Neither: Consider eliminating',
        ],
        forSkill: 'PLANNING',
        difficulty: 'INTERMEDIATE',
      ),
      EFStrategy(
        id: 'first-then',
        title: 'First-Then Board',
        description: 'Visual reminder of what comes first, then what reward follows.',
        category: 'PLANNING',
        steps: [
          'Choose your task (FIRST)',
          'Choose your reward (THEN)',
          'Put them on your First-Then board',
          'Complete the task, then enjoy your reward',
        ],
        forSkill: 'TASK_INITIATION',
        difficulty: 'BEGINNER',
      ),
    ];
  }

  List<EFStrategy> get _filteredStrategies {
    if (_selectedCategory == null) return _strategies;
    return _strategies
        .where((s) =>
            s.category == _selectedCategory || s.forSkill == _selectedCategory)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Strategy Library'),
      ),
      body: Column(
        children: [
          // Category Chips
          SizedBox(
            height: 80,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(16),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final (label, category, icon, color) = _categories[index];
                final isSelected = _selectedCategory == category;
                return _CategoryChip(
                  label: label,
                  icon: icon,
                  color: color,
                  isSelected: isSelected,
                  onTap: () {
                    setState(() => _selectedCategory = category);
                    _loadStrategies();
                  },
                );
              },
            ),
          ),

          // Strategies List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredStrategies.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadStrategies,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredStrategies.length,
                          itemBuilder: (context, index) {
                            final strategy = _filteredStrategies[index];
                            return _StrategyCard(
                              strategy: strategy,
                              onTap: () => _showStrategyDetails(strategy),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.lightbulb_outline,
            size: 64,
            color: AivoBrand.gray.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'No strategies found',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Try a different category',
            style: TextStyle(color: AivoBrand.gray.shade600),
          ),
        ],
      ),
    );
  }

  void _showStrategyDetails(EFStrategy strategy) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _StrategyDetailSheet(strategy: strategy),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected ? Colors.white : color,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StrategyCard extends StatelessWidget {
  final EFStrategy strategy;
  final VoidCallback onTap;

  const _StrategyCard({
    required this.strategy,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = _getCategoryColor(strategy.category);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getCategoryIcon(strategy.category),
                  color: color,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strategy.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      strategy.description,
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _DifficultyBadge(difficulty: strategy.difficulty),
                        const SizedBox(width: 8),
                        Text(
                          '${strategy.steps.length} steps',
                          style: TextStyle(
                            color: AivoBrand.gray.shade500,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'TIME_MANAGEMENT':
        return const Color(0xFF3B82F6);
      case 'ORGANIZATION':
        return const Color(0xFF10B981);
      case 'ATTENTION':
        return const Color(0xFF8B5CF6);
      case 'WORKING_MEMORY':
        return const Color(0xFFF59E0B);
      case 'PLANNING':
        return const Color(0xFFEC4899);
      default:
        return AivoBrand.gray;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'TIME_MANAGEMENT':
        return Icons.timer;
      case 'ORGANIZATION':
        return Icons.folder;
      case 'ATTENTION':
        return Icons.center_focus_strong;
      case 'WORKING_MEMORY':
        return Icons.psychology;
      case 'PLANNING':
        return Icons.event_note;
      default:
        return Icons.lightbulb;
    }
  }
}

class _DifficultyBadge extends StatelessWidget {
  final String? difficulty;

  const _DifficultyBadge({this.difficulty});

  @override
  Widget build(BuildContext context) {
    final (label, color) = _getConfig();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  (String, Color) _getConfig() {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER':
        return ('Beginner', AivoBrand.success);
      case 'INTERMEDIATE':
        return ('Intermediate', AivoBrand.warning);
      case 'ADVANCED':
        return ('Advanced', AivoBrand.error);
      default:
        return ('Beginner', AivoBrand.success);
    }
  }
}

class _StrategyDetailSheet extends StatelessWidget {
  final EFStrategy strategy;

  const _StrategyDetailSheet({required this.strategy});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AivoBrand.gray.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                strategy.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),

              // Description
              Text(
                strategy.description,
                style: TextStyle(
                  color: AivoBrand.gray.shade600,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 24),

              // Steps
              Text(
                'How to Do It',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              ...strategy.steps.asMap().entries.map((entry) {
                final index = entry.key;
                final step = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: Theme.of(context).primaryColor,
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          step,
                          style: const TextStyle(fontSize: 15),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 24),

              // Try It Now Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Started: ${strategy.title}'),
                        action: SnackBarAction(
                          label: 'Undo',
                          onPressed: () {},
                        ),
                      ),
                    );
                  },
                  child: const Text('Try This Strategy'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
