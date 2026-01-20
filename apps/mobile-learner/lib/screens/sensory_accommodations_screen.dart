import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';
import '../sensory/sensory_accommodations_service.dart';
import '../sensory/models.dart';

/// Main sensory accommodations screen
/// Provides access to sensory breaks, environment customization, calming activities, and preferences
class SensoryAccommodationsScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const SensoryAccommodationsScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<SensoryAccommodationsScreen> createState() =>
      _SensoryAccommodationsScreenState();
}

class _SensoryAccommodationsScreenState
    extends ConsumerState<SensoryAccommodationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sensory Accommodations'),
        backgroundColor: Colors.purple.shade700,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.self_improvement), text: 'Breaks'),
            Tab(icon: Icon(Icons.tune), text: 'Environment'),
            Tab(icon: Icon(Icons.spa), text: 'Calming'),
            Tab(icon: Icon(Icons.settings), text: 'Preferences'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          SensoryBreaksTab(learnerId: widget.learnerId),
          EnvironmentCustomizationTab(learnerId: widget.learnerId),
          CalmingActivitiesTab(learnerId: widget.learnerId),
          SensoryPreferencesTab(learnerId: widget.learnerId),
        ],
      ),
    );
  }
}

/// Sensory Breaks Tab
class SensoryBreaksTab extends ConsumerStatefulWidget {
  final String learnerId;

  const SensoryBreaksTab({super.key, required this.learnerId});

  @override
  ConsumerState<SensoryBreaksTab> createState() => _SensoryBreaksTabState();
}

class _SensoryBreaksTabState extends ConsumerState<SensoryBreaksTab> {
  SensoryBreakType? _filterType;
  List<SensoryBreak> _breaks = [];
  List<SensoryBreakSession> _recentSessions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadBreaks();
    _loadRecentSessions();
  }

  Future<void> _loadBreaks() async {
    setState(() => _loading = true);
    try {
      final service = ref.read(sensoryServiceProvider);
      final breaks = await service.getSensoryBreaks(type: _filterType);
      setState(() {
        _breaks = breaks;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load breaks: $e')),
        );
      }
    }
  }

  Future<void> _loadRecentSessions() async {
    try {
      final service = ref.read(sensoryServiceProvider);
      final sessions = await service.getBreakSessions(widget.learnerId);
      setState(() => _recentSessions = sessions.take(5).toList());
    } catch (e) {
      // Silently fail for recent sessions
    }
  }

  Future<void> _startBreak(SensoryBreak breakItem) async {
    final service = ref.read(sensoryServiceProvider);
    
    try {
      final session = await service.startBreakSession(widget.learnerId, breakItem.id);
      
      if (!mounted) return;
      
      // Navigate to break activity screen
      final result = await Navigator.push<int>(
        context,
        MaterialPageRoute(
          builder: (context) => BreakActivityScreen(
            breakItem: breakItem,
            session: session,
          ),
        ),
      );

      // If user completed the break with a rating
      if (result != null) {
        await service.completeBreakSession(session.id, result);
        _loadRecentSessions();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start break: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Filter chips
        Container(
          padding: const EdgeInsets.all(8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: _filterType == null,
                  onSelected: (selected) {
                    setState(() => _filterType = null);
                    _loadBreaks();
                  },
                ),
                const SizedBox(width: 8),
                ...SensoryBreakType.values.map((type) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(_formatBreakType(type)),
                        selected: _filterType == type,
                        onSelected: (selected) {
                          setState(() => _filterType = selected ? type : null);
                          _loadBreaks();
                        },
                      ),
                    )),
              ],
            ),
          ),
        ),
        
        // Recent sessions
        if (_recentSessions.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recent Breaks',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 80,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _recentSessions.length,
                    itemBuilder: (context, index) {
                      final session = _recentSessions[index];
                      return Card(
                        margin: const EdgeInsets.only(right: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                session.breakId,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                              if (session.rating != null)
                                Row(
                                  children: List.generate(
                                    5,
                                    (i) => Icon(
                                      i < session.rating! ? Icons.star : Icons.star_border,
                                      size: 16,
                                      color: Colors.amber,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

        // Breaks list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _breaks.length,
                  itemBuilder: (context, index) {
                    final breakItem = _breaks[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getBreakTypeColor(breakItem.type),
                          child: Icon(
                            _getBreakTypeIcon(breakItem.type),
                            color: Colors.white,
                          ),
                        ),
                        title: Text(breakItem.name),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(breakItem.description),
                            const SizedBox(height: 4),
                            Text(
                              '${breakItem.durationMinutes} minutes',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                        isThreeLine: true,
                        trailing: ElevatedButton(
                          onPressed: () => _startBreak(breakItem),
                          child: const Text('Start'),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  String _formatBreakType(SensoryBreakType type) {
    return type.name[0].toUpperCase() + type.name.substring(1);
  }

  Color _getBreakTypeColor(SensoryBreakType type) {
    switch (type) {
      case SensoryBreakType.breathing:
        return Colors.blue;
      case SensoryBreakType.stretching:
        return AivoBrand.success;
      case SensoryBreakType.movement:
        return AivoBrand.warning;
      case SensoryBreakType.quiet:
        return Colors.purple;
      case SensoryBreakType.visual:
        return Colors.pink;
      case SensoryBreakType.tactile:
        return Colors.teal;
    }
  }

  IconData _getBreakTypeIcon(SensoryBreakType type) {
    switch (type) {
      case SensoryBreakType.breathing:
        return Icons.air;
      case SensoryBreakType.stretching:
        return Icons.accessibility_new;
      case SensoryBreakType.movement:
        return Icons.directions_run;
      case SensoryBreakType.quiet:
        return Icons.volume_off;
      case SensoryBreakType.visual:
        return Icons.remove_red_eye;
      case SensoryBreakType.tactile:
        return Icons.touch_app;
    }
  }
}

/// Break Activity Screen
class BreakActivityScreen extends StatefulWidget {
  final SensoryBreak breakItem;
  final SensoryBreakSession session;

  const BreakActivityScreen({
    super.key,
    required this.breakItem,
    required this.session,
  });

  @override
  State<BreakActivityScreen> createState() => _BreakActivityScreenState();
}

class _BreakActivityScreenState extends State<BreakActivityScreen> {
  int _currentStep = 0;
  int _rating = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.breakItem.name),
        backgroundColor: Colors.purple.shade700,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Progress indicator
          LinearProgressIndicator(
            value: (_currentStep + 1) / widget.breakItem.instructions.length,
          ),
          
          // Instructions
          Expanded(
            child: PageView.builder(
              itemCount: widget.breakItem.instructions.length + 1,
              onPageChanged: (index) {
                setState(() => _currentStep = index);
              },
              itemBuilder: (context, index) {
                if (index < widget.breakItem.instructions.length) {
                  return _buildInstructionPage(widget.breakItem.instructions[index], index + 1);
                } else {
                  return _buildRatingPage();
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionPage(String instruction, int stepNumber) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Step $stepNumber of ${widget.breakItem.instructions.length}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.purple.shade700,
                ),
          ),
          const SizedBox(height: 24),
          Text(
            instruction,
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          const Icon(Icons.swipe, size: 48, color: Colors.grey),
          const Text('Swipe to continue', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildRatingPage() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            'How do you feel?',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              5,
              (index) => IconButton(
                iconSize: 48,
                icon: Icon(
                  index < _rating ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                ),
                onPressed: () {
                  setState(() => _rating = index + 1);
                },
              ),
            ),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: _rating > 0 ? () => Navigator.pop(context, _rating) : null,
            child: const Text('Complete Break'),
          ),
        ],
      ),
    );
  }
}

/// Environment Customization Tab
class EnvironmentCustomizationTab extends ConsumerStatefulWidget {
  final String learnerId;

  const EnvironmentCustomizationTab({super.key, required this.learnerId});

  @override
  ConsumerState<EnvironmentCustomizationTab> createState() =>
      _EnvironmentCustomizationTabState();
}

class _EnvironmentCustomizationTabState
    extends ConsumerState<EnvironmentCustomizationTab> {
  List<EnvironmentSetting> _settings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _loading = true);
    try {
      final service = ref.read(sensoryServiceProvider);
      final settings = await service.getEnvironmentSettings(widget.learnerId);
      setState(() {
        _settings = settings;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load settings: $e')),
        );
      }
    }
  }

  Future<void> _updateSetting(EnvironmentSetting setting, dynamic newValue) async {
    try {
      final service = ref.read(sensoryServiceProvider);
      final updated = await service.updateEnvironmentSetting(
        widget.learnerId,
        setting.id,
        newValue,
      );
      
      setState(() {
        final index = _settings.indexWhere((s) => s.id == setting.id);
        if (index >= 0) {
          _settings[index] = updated;
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update setting: $e')),
        );
      }
    }
  }

  Future<void> _resetSettings() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Settings'),
        content: const Text('Reset all environment settings to defaults?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Reset'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final service = ref.read(sensoryServiceProvider);
        final reset = await service.resetEnvironmentSettings(widget.learnerId);
        setState(() => _settings = reset);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to reset settings: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Customize Your Environment',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              TextButton.icon(
                onPressed: _resetSettings,
                icon: const Icon(Icons.refresh),
                label: const Text('Reset'),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _settings.length,
            itemBuilder: (context, index) {
              final setting = _settings[index];
              return _buildSettingCard(setting);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSettingCard(EnvironmentSetting setting) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              setting.name,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              setting.description,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            _buildSettingControl(setting),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingControl(EnvironmentSetting setting) {
    if (setting.options != null && setting.options!.isNotEmpty) {
      // Dropdown for options
      return DropdownButton<dynamic>(
        value: setting.value,
        isExpanded: true,
        items: setting.options!.map((option) {
          return DropdownMenuItem(
            value: option,
            child: Text(option.toString()),
          );
        }).toList(),
        onChanged: (value) {
          if (value != null) {
            _updateSetting(setting, value);
          }
        },
      );
    } else if (setting.minValue != null && setting.maxValue != null) {
      // Slider for numeric ranges
      return Column(
        children: [
          Slider(
            value: (setting.value as num).toDouble(),
            min: (setting.minValue as num).toDouble(),
            max: (setting.maxValue as num).toDouble(),
            divisions: ((setting.maxValue as num) - (setting.minValue as num)).toInt(),
            label: setting.value.toString(),
            onChanged: (value) {
              _updateSetting(setting, value);
            },
          ),
          Text(
            'Current: ${setting.value}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      );
    } else if (setting.value is bool) {
      // Switch for boolean
      return SwitchListTile(
        title: Text(setting.value ? 'Enabled' : 'Disabled'),
        value: setting.value as bool,
        onChanged: (value) {
          _updateSetting(setting, value);
        },
      );
    } else {
      return Text('Value: ${setting.value}');
    }
  }
}

/// Calming Activities Tab
class CalmingActivitiesTab extends ConsumerStatefulWidget {
  final String learnerId;

  const CalmingActivitiesTab({super.key, required this.learnerId});

  @override
  ConsumerState<CalmingActivitiesTab> createState() =>
      _CalmingActivitiesTabState();
}

class _CalmingActivitiesTabState extends ConsumerState<CalmingActivitiesTab> {
  CalmingActivityType? _filterType;
  List<CalmingActivity> _activities = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadActivities();
  }

  Future<void> _loadActivities() async {
    setState(() => _loading = true);
    try {
      final service = ref.read(sensoryServiceProvider);
      final activities = await service.getCalmingActivities(type: _filterType);
      setState(() {
        _activities = activities;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load activities: $e')),
        );
      }
    }
  }

  Future<void> _startActivity(CalmingActivity activity) async {
    // Get mood before
    final moodBefore = await _showMoodDialog('How are you feeling right now?');
    if (moodBefore == null) return;

    final service = ref.read(sensoryServiceProvider);
    
    try {
      final session = await service.startCalmingSession(
        widget.learnerId,
        activity.id,
        moodBefore,
      );
      
      if (!mounted) return;
      
      // Navigate to activity screen
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CalmingActivityScreen(
            activity: activity,
            session: session,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start activity: $e')),
        );
      }
    }
  }

  Future<int?> _showMoodDialog(String question) async {
    return showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(question),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            5,
            (index) => ListTile(
              leading: Icon(
                _getMoodIcon(index + 1),
                color: _getMoodColor(index + 1),
              ),
              title: Text(_getMoodLabel(index + 1)),
              onTap: () => Navigator.pop(context, index + 1),
            ),
          ),
        ),
      ),
    );
  }

  IconData _getMoodIcon(int mood) {
    switch (mood) {
      case 1:
        return Icons.sentiment_very_dissatisfied;
      case 2:
        return Icons.sentiment_dissatisfied;
      case 3:
        return Icons.sentiment_neutral;
      case 4:
        return Icons.sentiment_satisfied;
      case 5:
        return Icons.sentiment_very_satisfied;
      default:
        return Icons.sentiment_neutral;
    }
  }

  Color _getMoodColor(int mood) {
    switch (mood) {
      case 1:
        return AivoBrand.error;
      case 2:
        return AivoBrand.warning;
      case 3:
        return Colors.yellow;
      case 4:
        return Colors.lightGreen;
      case 5:
        return AivoBrand.success;
      default:
        return AivoBrand.gray;
    }
  }

  String _getMoodLabel(int mood) {
    switch (mood) {
      case 1:
        return 'Very Upset';
      case 2:
        return 'Upset';
      case 3:
        return 'Okay';
      case 4:
        return 'Good';
      case 5:
        return 'Great';
      default:
        return 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Filter chips
        Container(
          padding: const EdgeInsets.all(8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: _filterType == null,
                  onSelected: (selected) {
                    setState(() => _filterType = null);
                    _loadActivities();
                  },
                ),
                const SizedBox(width: 8),
                ...CalmingActivityType.values.map((type) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(_formatActivityType(type)),
                        selected: _filterType == type,
                        onSelected: (selected) {
                          setState(() => _filterType = selected ? type : null);
                          _loadActivities();
                        },
                      ),
                    )),
              ],
            ),
          ),
        ),

        // Activities list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.8,
                  ),
                  itemCount: _activities.length,
                  itemBuilder: (context, index) {
                    final activity = _activities[index];
                    return Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => _startActivity(activity),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Container(
                              height: 100,
                              color: _getActivityTypeColor(activity.type),
                              child: Icon(
                                _getActivityTypeIcon(activity.type),
                                size: 48,
                                color: Colors.white,
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    activity.name,
                                    style: Theme.of(context).textTheme.titleMedium,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${activity.durationMinutes} min',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  String _formatActivityType(CalmingActivityType type) {
    return type.name[0].toUpperCase() + type.name.substring(1);
  }

  Color _getActivityTypeColor(CalmingActivityType type) {
    switch (type) {
      case CalmingActivityType.breathing:
        return Colors.lightBlue;
      case CalmingActivityType.visualization:
        return Colors.purple;
      case CalmingActivityType.music:
        return Colors.pink;
      case CalmingActivityType.sounds:
        return Colors.teal;
      case CalmingActivityType.movement:
        return AivoBrand.warning;
      case CalmingActivityType.tactile:
        return AivoBrand.success;
      case CalmingActivityType.mindfulness:
        return Colors.indigo;
    }
  }

  IconData _getActivityTypeIcon(CalmingActivityType type) {
    switch (type) {
      case CalmingActivityType.breathing:
        return Icons.air;
      case CalmingActivityType.visualization:
        return Icons.visibility;
      case CalmingActivityType.music:
        return Icons.music_note;
      case CalmingActivityType.sounds:
        return Icons.headphones;
      case CalmingActivityType.movement:
        return Icons.directions_walk;
      case CalmingActivityType.tactile:
        return Icons.touch_app;
      case CalmingActivityType.mindfulness:
        return Icons.self_improvement;
    }
  }
}

/// Calming Activity Screen
class CalmingActivityScreen extends ConsumerStatefulWidget {
  final CalmingActivity activity;
  final CalmingActivitySession session;

  const CalmingActivityScreen({
    super.key,
    required this.activity,
    required this.session,
  });

  @override
  ConsumerState<CalmingActivityScreen> createState() =>
      _CalmingActivityScreenState();
}

class _CalmingActivityScreenState extends ConsumerState<CalmingActivityScreen> {
  int _currentStep = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.activity.name),
        backgroundColor: Colors.purple.shade700,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: (_currentStep + 1) / widget.activity.steps.length,
          ),
          Expanded(
            child: PageView.builder(
              itemCount: widget.activity.steps.length + 1,
              onPageChanged: (index) {
                setState(() => _currentStep = index);
              },
              itemBuilder: (context, index) {
                if (index < widget.activity.steps.length) {
                  return _buildStepPage(widget.activity.steps[index], index + 1);
                } else {
                  return _buildCompletionPage();
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepPage(String step, int stepNumber) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Step $stepNumber of ${widget.activity.steps.length}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.purple.shade700,
                ),
          ),
          const SizedBox(height: 24),
          Text(
            step,
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          const Icon(Icons.swipe, size: 48, color: Colors.grey),
          const Text('Swipe to continue', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildCompletionPage() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.check_circle, size: 80, color: AivoBrand.success),
          const SizedBox(height: 24),
          const Text(
            'Activity Complete!',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: () async {
              final moodAfter = await _showMoodDialog('How are you feeling now?');
              if (moodAfter != null) {
                final service = ref.read(sensoryServiceProvider);
                await service.completeCalmingSession(
                  widget.session.id,
                  moodAfter,
                  completed: true,
                );
              }
              if (mounted) {
                Navigator.pop(context);
              }
            },
            child: const Text('Finish'),
          ),
        ],
      ),
    );
  }

  Future<int?> _showMoodDialog(String question) async {
    return showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(question),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            5,
            (index) => ListTile(
              leading: Icon(
                _getMoodIcon(index + 1),
                color: _getMoodColor(index + 1),
              ),
              title: Text(_getMoodLabel(index + 1)),
              onTap: () => Navigator.pop(context, index + 1),
            ),
          ),
        ),
      ),
    );
  }

  IconData _getMoodIcon(int mood) {
    switch (mood) {
      case 1:
        return Icons.sentiment_very_dissatisfied;
      case 2:
        return Icons.sentiment_dissatisfied;
      case 3:
        return Icons.sentiment_neutral;
      case 4:
        return Icons.sentiment_satisfied;
      case 5:
        return Icons.sentiment_very_satisfied;
      default:
        return Icons.sentiment_neutral;
    }
  }

  Color _getMoodColor(int mood) {
    switch (mood) {
      case 1:
        return AivoBrand.error;
      case 2:
        return AivoBrand.warning;
      case 3:
        return Colors.yellow;
      case 4:
        return Colors.lightGreen;
      case 5:
        return AivoBrand.success;
      default:
        return AivoBrand.gray;
    }
  }

  String _getMoodLabel(int mood) {
    switch (mood) {
      case 1:
        return 'Very Upset';
      case 2:
        return 'Upset';
      case 3:
        return 'Okay';
      case 4:
        return 'Good';
      case 5:
        return 'Great';
      default:
        return 'Unknown';
    }
  }
}

/// Sensory Preferences Tab
class SensoryPreferencesTab extends ConsumerStatefulWidget {
  final String learnerId;

  const SensoryPreferencesTab({super.key, required this.learnerId});

  @override
  ConsumerState<SensoryPreferencesTab> createState() =>
      _SensoryPreferencesTabState();
}

class _SensoryPreferencesTabState extends ConsumerState<SensoryPreferencesTab> {
  SensoryProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final service = ref.read(sensoryServiceProvider);
      final profile = await service.getSensoryProfile(widget.learnerId);
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load profile: $e')),
        );
      }
    }
  }

  Future<void> _updatePreference(SensoryPreference preference) async {
    try {
      final service = ref.read(sensoryServiceProvider);
      await service.updateSensoryPreference(widget.learnerId, preference);
      _loadProfile();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update preference: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_profile == null) {
      return const Center(child: Text('No sensory profile found'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Your Sensory Preferences',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 16),
        
        // Preferences by category
        ...SensoryPreferenceCategory.values.map((category) {
          final categoryPrefs = _profile!.preferences
              .where((p) => p.category == category)
              .toList();
          
          if (categoryPrefs.isEmpty) return const SizedBox.shrink();
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  _formatCategory(category),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              ...categoryPrefs.map((pref) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  pref.name,
                                  style: Theme.of(context).textTheme.titleSmall,
                                ),
                              ),
                              Switch(
                                value: pref.enabled,
                                onChanged: (value) {
                                  _updatePreference(pref.copyWith(enabled: value));
                                },
                              ),
                            ],
                          ),
                          Text(
                            pref.description,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          if (pref.enabled)
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 8),
                                Text(
                                  'Intensity',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                Slider(
                                  value: pref.intensity.toDouble(),
                                  min: 1,
                                  max: 5,
                                  divisions: 4,
                                  label: pref.intensity.toString(),
                                  onChanged: (value) {
                                    _updatePreference(pref.copyWith(intensity: value.toInt()));
                                  },
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  )),
            ],
          );
        }),
      ],
    );
  }

  String _formatCategory(SensoryPreferenceCategory category) {
    return category.name[0].toUpperCase() + category.name.substring(1);
  }
}

// Provider for sensory service (reusing existing provider structure)
final sensoryServiceProvider = Provider<SensoryService>((ref) {
  return SensoryService(
    baseUrl: 'http://localhost:8087/api/sensory',
  );
});
