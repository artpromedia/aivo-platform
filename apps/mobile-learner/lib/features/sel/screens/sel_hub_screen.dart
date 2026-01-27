import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../pin/pin_storage.dart';
import '../sel_models.dart';
import '../sel_service.dart';
import 'emotion_check_in_screen.dart';
import 'coping_strategies_screen.dart';
import 'mindfulness_exercises_screen.dart';
import 'social_scenarios_screen.dart';
import 'feelings_journal_screen.dart';

/// SEL Hub Screen
///
/// Main entry point for Social-Emotional Learning features.
/// Provides navigation to all SEL tools and displays progress overview.
class SELHubScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const SELHubScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<SELHubScreen> createState() => _SELHubScreenState();
}

class _SELHubScreenState extends ConsumerState<SELHubScreen> {
  SELService? _selService;
  String _cachedToken = '';
  SELProgress? _progress;
  MoodCheckIn? _lastCheckIn;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _selService = SELService(
      baseUrl: EnvironmentConfig.selBaseUrl,
      getAuthToken: () => _cachedToken,
      learnerId: widget.learnerId,
    );

    await _loadData();
  }

  Future<void> _loadData() async {
    if (_selService == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _selService!.getProgress(),
        _selService!.getMoodCheckIns(limit: 1),
      ]);

      if (mounted) {
        setState(() {
          _progress = results[0] as SELProgress;
          final checkIns = results[1] as List<MoodCheckIn>;
          _lastCheckIn = checkIns.isNotEmpty ? checkIns.first : null;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Social-Emotional Learning'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Text(
                      'How are you feeling today?',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Build skills for understanding and managing emotions',
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick Check-In Card
                    _buildQuickCheckInCard(),
                    const SizedBox(height: 24),

                    // Progress Overview
                    if (_progress != null) ...[
                      _buildProgressOverview(),
                      const SizedBox(height: 24),
                    ],

                    // SEL Tools Grid
                    Text(
                      'SEL Tools',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 12),
                    _buildToolsGrid(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildQuickCheckInCard() {
    final hasCheckedInToday = _lastCheckIn != null &&
        _lastCheckIn!.timestamp.day == DateTime.now().day;

    return Card(
      child: InkWell(
        onTap: () => _navigateTo(EmotionCheckInScreen(
          learnerId: widget.learnerId,
          onCheckInComplete: _loadData,
        )),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: hasCheckedInToday
                      ? AivoBrand.success.withOpacity(0.1)
                      : Theme.of(context).primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Center(
                  child: Text(
                    hasCheckedInToday
                        ? _lastCheckIn!.mood.emoji
                        : '😊',
                    style: const TextStyle(fontSize: 28),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasCheckedInToday
                          ? "You're feeling ${_lastCheckIn!.mood.label.toLowerCase()}"
                          : 'Daily Check-In',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hasCheckedInToday
                          ? 'Tap to check in again'
                          : 'How are you feeling right now?',
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AivoBrand.gray.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressOverview() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Your Progress',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                if (_progress!.currentStreak > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AivoBrand.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🔥', style: TextStyle(fontSize: 14)),
                        const SizedBox(width: 4),
                        Text(
                          '${_progress!.currentStreak} day streak',
                          style: TextStyle(
                            color: AivoBrand.warning.shade700,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    '📊',
                    '${_progress!.totalCheckIns}',
                    'Check-ins',
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    '🧘',
                    '${_progress!.exercisesCompleted}',
                    'Exercises',
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    '💪',
                    '${_progress!.strategiesLearned}',
                    'Strategies',
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    '📖',
                    '${_progress!.journalEntries}',
                    'Entries',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String emoji, String value, String label) {
    return Column(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 20)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: AivoBrand.gray.shade600,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildToolsGrid() {
    final tools = [
      _ToolItem(
        title: 'Mood Check-In',
        description: 'Track how you feel',
        icon: '😊',
        color: const Color(0xFFFEF3C7),
        onTap: () => _navigateTo(EmotionCheckInScreen(
          learnerId: widget.learnerId,
          onCheckInComplete: _loadData,
        )),
      ),
      _ToolItem(
        title: 'Coping Strategies',
        description: 'Learn calming techniques',
        icon: '🧘',
        color: const Color(0xFFDCFCE7),
        onTap: () => _navigateTo(CopingStrategiesScreen(
          learnerId: widget.learnerId,
        )),
      ),
      _ToolItem(
        title: 'Mindfulness',
        description: 'Breathing & meditation',
        icon: '🌬️',
        color: const Color(0xFFDBEAFE),
        onTap: () => _navigateTo(MindfulnessExercisesScreen(
          learnerId: widget.learnerId,
        )),
      ),
      _ToolItem(
        title: 'Social Scenarios',
        description: 'Practice social skills',
        icon: '👥',
        color: const Color(0xFFF3E8FF),
        onTap: () => _navigateTo(SocialScenariosScreen(
          learnerId: widget.learnerId,
        )),
      ),
      _ToolItem(
        title: 'Feelings Journal',
        description: 'Write about emotions',
        icon: '📓',
        color: const Color(0xFFFFEDD5),
        onTap: () => _navigateTo(FeelingsJournalScreen(
          learnerId: widget.learnerId,
        )),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: tools.length,
      itemBuilder: (context, index) {
        final tool = tools[index];
        return _buildToolCard(tool);
      },
    );
  }

  Widget _buildToolCard(_ToolItem tool) {
    return Card(
      child: InkWell(
        onTap: tool.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: tool.color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    tool.icon,
                    style: const TextStyle(fontSize: 24),
                  ),
                ),
              ),
              const Spacer(),
              Text(
                tool.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                tool.description,
                style: TextStyle(
                  color: AivoBrand.gray.shade600,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _navigateTo(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );
  }
}

class _ToolItem {
  final String title;
  final String description;
  final String icon;
  final Color color;
  final VoidCallback onTap;

  _ToolItem({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.onTap,
  });
}
