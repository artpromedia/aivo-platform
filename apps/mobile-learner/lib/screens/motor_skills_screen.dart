import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_common/theme/theme.dart';
import '../motor_skills/models.dart';
import '../motor_skills/motor_skills_service.dart';

class MotorSkillsScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const MotorSkillsScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<MotorSkillsScreen> createState() => _MotorSkillsScreenState();
}

class _MotorSkillsScreenState extends ConsumerState<MotorSkillsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late MotorSkillsService _service;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _service = MotorSkillsService(client: http.Client());
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
        title: const Text('Motor Skills'),
        backgroundColor: AivoBrand.mint[700],
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Handwriting', icon: Icon(Icons.edit)),
            Tab(text: 'Fine Motor', icon: Icon(Icons.touch_app)),
            Tab(text: 'Gross Motor', icon: Icon(Icons.directions_run)),
            Tab(text: 'Adaptive Input', icon: Icon(Icons.settings_accessibility)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          HandwritingPracticeTab(learnerId: widget.learnerId, service: _service),
          FineMotorActivitiesTab(learnerId: widget.learnerId, service: _service),
          GrossMotorExercisesTab(learnerId: widget.learnerId, service: _service),
          AdaptiveInputTab(learnerId: widget.learnerId, service: _service),
        ],
      ),
    );
  }
}

// Handwriting Practice Tab
class HandwritingPracticeTab extends StatefulWidget {
  final String learnerId;
  final MotorSkillsService service;

  const HandwritingPracticeTab({
    super.key,
    required this.learnerId,
    required this.service,
  });

  @override
  State<HandwritingPracticeTab> createState() => _HandwritingPracticeTabState();
}

class _HandwritingPracticeTabState extends State<HandwritingPracticeTab> {
  HandwritingType? _selectedType;
  int? _selectedDifficulty;
  List<HandwritingExercise>? _exercises;
  List<HandwritingSession>? _recentSessions;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadExercises();
    _loadRecentSessions();
  }

  Future<void> _loadExercises() async {
    setState(() => _loading = true);
    try {
      final exercises = await widget.service.getHandwritingExercises(
        type: _selectedType,
        difficulty: _selectedDifficulty,
      );
      setState(() => _exercises = exercises);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading exercises: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadRecentSessions() async {
    try {
      final sessions = await widget.service.getHandwritingSessions(widget.learnerId);
      setState(() => _recentSessions = sessions.take(5).toList());
    } catch (e) {
      // Silent fail for recent sessions
    }
  }

  void _startExercise(HandwritingExercise exercise) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => HandwritingExerciseScreen(
          learnerId: widget.learnerId,
          exercise: exercise,
          service: widget.service,
        ),
      ),
    ).then((_) => _loadRecentSessions());
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Filters
        Container(
          padding: const EdgeInsets.all(12),
          color: AivoBrand.mint[50],
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filter Exercises', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilterChip(
                    label: const Text('All Types'),
                    selected: _selectedType == null,
                    onSelected: (selected) {
                      setState(() => _selectedType = null);
                      _loadExercises();
                    },
                  ),
                  ...HandwritingType.values.map((type) {
                    final label = type.toString().split('.').last;
                    return FilterChip(
                      label: Text(label[0].toUpperCase() + label.substring(1)),
                      selected: _selectedType == type,
                      onSelected: (selected) {
                        setState(() => _selectedType = selected ? type : null);
                        _loadExercises();
                      },
                    );
                  }),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilterChip(
                    label: const Text('All Difficulties'),
                    selected: _selectedDifficulty == null,
                    onSelected: (selected) {
                      setState(() => _selectedDifficulty = null);
                      _loadExercises();
                    },
                  ),
                  ...[1, 2, 3, 4, 5].map((diff) {
                    return FilterChip(
                      label: Text('Level $diff'),
                      selected: _selectedDifficulty == diff,
                      onSelected: (selected) {
                        setState(() => _selectedDifficulty = selected ? diff : null);
                        _loadExercises();
                      },
                    );
                  }),
                ],
              ),
            ],
          ),
        ),

        // Recent Sessions
        if (_recentSessions != null && _recentSessions!.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Recent Practice', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 80,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _recentSessions!.length,
                    itemBuilder: (context, index) {
                      final session = _recentSessions![index];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('${session.accuracy}%',
                                  style: const TextStyle(
                                      fontSize: 20, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text('${session.strokesCompleted}/${session.totalStrokes} strokes'),
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

        // Exercises List
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _exercises == null || _exercises!.isEmpty
                  ? const Center(child: Text('No exercises found'))
                  : ListView.builder(
                      itemCount: _exercises!.length,
                      itemBuilder: (context, index) {
                        final exercise = _exercises![index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AivoBrand.mint[100],
                              child: Text(
                                exercise.letterOrWord.substring(0, 1).toUpperCase(),
                                style: TextStyle(
                                  color: AivoBrand.mint[700],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            title: Text(exercise.name),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(exercise.description),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.stars,
                                        size: 16, color: AivoBrand.sunshine[700]),
                                    const SizedBox(width: 4),
                                    Text('Level ${exercise.difficulty}'),
                                    const SizedBox(width: 12),
                                    const Icon(Icons.timer, size: 16),
                                    const SizedBox(width: 4),
                                    Text('${exercise.estimatedTime.inMinutes} min'),
                                  ],
                                ),
                              ],
                            ),
                            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                            onTap: () => _startExercise(exercise),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

// Handwriting Exercise Screen
class HandwritingExerciseScreen extends StatefulWidget {
  final String learnerId;
  final HandwritingExercise exercise;
  final MotorSkillsService service;

  const HandwritingExerciseScreen({
    super.key,
    required this.learnerId,
    required this.exercise,
    required this.service,
  });

  @override
  State<HandwritingExerciseScreen> createState() => _HandwritingExerciseScreenState();
}

class _HandwritingExerciseScreenState extends State<HandwritingExerciseScreen> {
  HandwritingSession? _session;
  int _currentStroke = 0;
  int _accuracy = 0;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final session = await widget.service.startHandwritingSession(
        learnerId: widget.learnerId,
        exerciseId: widget.exercise.id,
      );
      setState(() => _session = session);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error starting session: $e')),
        );
      }
    }
  }

  Future<void> _completeSession() async {
    if (_session == null) return;

    try {
      await widget.service.completeHandwritingSession(
        sessionId: _session!.id,
        accuracy: _accuracy,
        strokesCompleted: _currentStroke,
        feedback: ['Practice completed'],
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Practice session completed!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error completing session: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_session == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final currentStrokeData = _currentStroke < widget.exercise.strokes.length
        ? widget.exercise.strokes[_currentStroke]
        : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.exercise.name),
        backgroundColor: AivoBrand.mint[700],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Tips'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: widget.exercise.tips
                        .map((tip) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('• '),
                                  Expanded(child: Text(tip)),
                                ],
                              ),
                            ))
                        .toList(),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress
          Container(
            padding: const EdgeInsets.all(16),
            color: AivoBrand.mint[50],
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Stroke ${_currentStroke + 1} of ${widget.exercise.strokes.length}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text('Accuracy: $_accuracy%',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: (_currentStroke + 1) / widget.exercise.strokes.length,
                  backgroundColor: AivoBrand.gray[300],
                  valueColor: AlwaysStoppedAnimation<Color>(AivoBrand.mint[700]!),
                ),
              ],
            ),
          ),

          // Stroke Guidance
          Expanded(
            child: currentStrokeData != null
                ? Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Large letter display
                        Container(
                          width: 200,
                          height: 200,
                          decoration: BoxDecoration(
                            border: Border.all(color: AivoBrand.gray[400]!, width: 2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Text(
                              widget.exercise.letterOrWord,
                              style: TextStyle(
                                fontSize: 120,
                                fontWeight: FontWeight.bold,
                                color: AivoBrand.mint[700],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        // Stroke instruction
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                Text(
                                  'Stroke ${currentStrokeData.order}',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  currentStrokeData.description,
                                  style: const TextStyle(fontSize: 16),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Direction: ${currentStrokeData.direction}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AivoBrand.gray[700],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        // Practice area placeholder
                        Container(
                          width: double.infinity,
                          height: 150,
                          decoration: BoxDecoration(
                            border: Border.all(color: AivoBrand.mint[300]!, width: 2),
                            borderRadius: BorderRadius.circular(8),
                            color: AivoBrand.mint[50],
                          ),
                          child: Center(
                            child: Text(
                              'Trace the stroke here',
                              style: TextStyle(color: AivoBrand.gray[600]),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle,
                            size: 80, color: AivoBrand.mint[700]),
                        const SizedBox(height: 16),
                        const Text(
                          'All strokes completed!',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text('Final Accuracy: $_accuracy%'),
                      ],
                    ),
                  ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (currentStrokeData != null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _currentStroke++;
                          _accuracy = (_accuracy + 85) ~/ 2; // Simulate accuracy
                        });
                      },
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Next Stroke'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.mint[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
                if (currentStrokeData == null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _completeSession,
                      icon: const Icon(Icons.check),
                      label: const Text('Complete Practice'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.mint[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Fine Motor Activities Tab
class FineMotorActivitiesTab extends StatefulWidget {
  final String learnerId;
  final MotorSkillsService service;

  const FineMotorActivitiesTab({
    super.key,
    required this.learnerId,
    required this.service,
  });

  @override
  State<FineMotorActivitiesTab> createState() => _FineMotorActivitiesTabState();
}

class _FineMotorActivitiesTabState extends State<FineMotorActivitiesTab> {
  FineMotorType? _selectedType;
  List<FineMotorActivity>? _activities;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadActivities();
  }

  Future<void> _loadActivities() async {
    setState(() => _loading = true);
    try {
      final activities = await widget.service.getFineMotorActivities(type: _selectedType);
      setState(() => _activities = activities);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading activities: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _startActivity(FineMotorActivity activity) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FineMotorActivityScreen(
          learnerId: widget.learnerId,
          activity: activity,
          service: widget.service,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Type filters
        Container(
          padding: const EdgeInsets.all(12),
          color: AivoBrand.mint[50],
          child: Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text('All Types'),
                selected: _selectedType == null,
                onSelected: (selected) {
                  setState(() => _selectedType = null);
                  _loadActivities();
                },
              ),
              ...FineMotorType.values.map((type) {
                final label = type.toString().split('.').last;
                return FilterChip(
                  label: Text(label[0].toUpperCase() + label.substring(1)),
                  selected: _selectedType == type,
                  onSelected: (selected) {
                    setState(() => _selectedType = selected ? type : null);
                    _loadActivities();
                  },
                );
              }),
            ],
          ),
        ),

        // Activities grid
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _activities == null || _activities!.isEmpty
                  ? const Center(child: Text('No activities found'))
                  : GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: _activities!.length,
                      itemBuilder: (context, index) {
                        final activity = _activities![index];
                        return Card(
                          clipBehavior: Clip.antiAlias,
                          child: InkWell(
                            onTap: () => _startActivity(activity),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  height: 120,
                                  color: AivoBrand.mint[100],
                                  child: Center(
                                    child: Icon(
                                      _getIconForType(activity.type),
                                      size: 60,
                                      color: AivoBrand.mint[700],
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        activity.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(Icons.stars,
                                              size: 14, color: AivoBrand.sunshine[700]),
                                          const SizedBox(width: 4),
                                          Text('Level ${activity.difficulty}',
                                              style: const TextStyle(fontSize: 12)),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          const Icon(Icons.timer, size: 14),
                                          const SizedBox(width: 4),
                                          Text('${activity.estimatedTime.inMinutes} min',
                                              style: const TextStyle(fontSize: 12)),
                                        ],
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

  IconData _getIconForType(FineMotorType type) {
    switch (type) {
      case FineMotorType.tapping:
        return Icons.touch_app;
      case FineMotorType.dragging:
        return Icons.drag_handle;
      case FineMotorType.pinching:
        return Icons.pinch;
      case FineMotorType.tracing:
        return Icons.edit;
      case FineMotorType.matching:
        return Icons.compare_arrows;
      case FineMotorType.sorting:
        return Icons.sort;
      case FineMotorType.threading:
        return Icons.linear_scale;
      case FineMotorType.manipulation:
        return Icons.pan_tool;
    }
  }
}

// Fine Motor Activity Screen
class FineMotorActivityScreen extends StatefulWidget {
  final String learnerId;
  final FineMotorActivity activity;
  final MotorSkillsService service;

  const FineMotorActivityScreen({
    super.key,
    required this.learnerId,
    required this.activity,
    required this.service,
  });

  @override
  State<FineMotorActivityScreen> createState() => _FineMotorActivityScreenState();
}

class _FineMotorActivityScreenState extends State<FineMotorActivityScreen> {
  FineMotorSession? _session;
  int _currentStep = 0;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final session = await widget.service.startFineMotorSession(
        learnerId: widget.learnerId,
        activityId: widget.activity.id,
      );
      setState(() => _session = session);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error starting session: $e')),
        );
      }
    }
  }

  Future<void> _completeSession() async {
    if (_session == null) return;

    try {
      await widget.service.completeFineMotorSession(
        sessionId: _session!.id,
        stepsCompleted: _currentStep,
        accuracy: 90,
        achievements: ['Activity completed'],
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Activity completed!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error completing session: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_session == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final currentStepData = _currentStep < widget.activity.steps.length
        ? widget.activity.steps[_currentStep]
        : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.activity.name),
        backgroundColor: AivoBrand.mint[700],
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Progress
          Container(
            padding: const EdgeInsets.all(16),
            color: AivoBrand.mint[50],
            child: Column(
              children: [
                Text(
                  'Step ${_currentStep + 1} of ${widget.activity.steps.length}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: (_currentStep + 1) / widget.activity.steps.length,
                  backgroundColor: AivoBrand.gray[300],
                  valueColor: AlwaysStoppedAnimation<Color>(AivoBrand.mint[700]!),
                ),
              ],
            ),
          ),

          // Step content
          Expanded(
            child: currentStepData != null
                ? SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          currentStepData.instruction,
                          style: const TextStyle(fontSize: 18),
                        ),
                        const SizedBox(height: 24),
                        // Interactive area placeholder
                        Container(
                          width: double.infinity,
                          height: 300,
                          decoration: BoxDecoration(
                            border: Border.all(color: AivoBrand.mint[300]!, width: 2),
                            borderRadius: BorderRadius.circular(8),
                            color: AivoBrand.mint[50],
                          ),
                          child: const Center(
                            child: Text('Interactive activity area'),
                          ),
                        ),
                      ],
                    ),
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle,
                            size: 80, color: AivoBrand.mint[700]),
                        const SizedBox(height: 16),
                        const Text(
                          'Activity completed!',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (currentStepData != null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => setState(() => _currentStep++),
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Next Step'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.mint[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
                if (currentStepData == null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _completeSession,
                      icon: const Icon(Icons.check),
                      label: const Text('Complete Activity'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.mint[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Gross Motor Exercises Tab
class GrossMotorExercisesTab extends StatefulWidget {
  final String learnerId;
  final MotorSkillsService service;

  const GrossMotorExercisesTab({
    super.key,
    required this.learnerId,
    required this.service,
  });

  @override
  State<GrossMotorExercisesTab> createState() => _GrossMotorExercisesTabState();
}

class _GrossMotorExercisesTabState extends State<GrossMotorExercisesTab> {
  GrossMotorType? _selectedType;
  List<GrossMotorExercise>? _exercises;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadExercises();
  }

  Future<void> _loadExercises() async {
    setState(() => _loading = true);
    try {
      final exercises = await widget.service.getGrossMotorExercises(type: _selectedType);
      setState(() => _exercises = exercises);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading exercises: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _startExercise(GrossMotorExercise exercise) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GrossMotorExerciseScreen(
          learnerId: widget.learnerId,
          exercise: exercise,
          service: widget.service,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Type filters
        Container(
          padding: const EdgeInsets.all(12),
          color: AivoBrand.mint[50],
          child: Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text('All Types'),
                selected: _selectedType == null,
                onSelected: (selected) {
                  setState(() => _selectedType = null);
                  _loadExercises();
                },
              ),
              ...GrossMotorType.values.map((type) {
                final label = type.toString().split('.').last;
                return FilterChip(
                  label: Text(label[0].toUpperCase() + label.substring(1)),
                  selected: _selectedType == type,
                  onSelected: (selected) {
                    setState(() => _selectedType = selected ? type : null);
                    _loadExercises();
                  },
                );
              }),
            ],
          ),
        ),

        // Exercises list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _exercises == null || _exercises!.isEmpty
                  ? const Center(child: Text('No exercises found'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _exercises!.length,
                      itemBuilder: (context, index) {
                        final exercise = _exercises![index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AivoBrand.mint[100],
                              child: Icon(Icons.directions_run,
                                  color: AivoBrand.mint[700]),
                            ),
                            title: Text(exercise.name),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(exercise.description),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.timer, size: 16),
                                    const SizedBox(width: 4),
                                    Text('${exercise.duration.inMinutes} min'),
                                    const SizedBox(width: 12),
                                    Icon(Icons.local_fire_department,
                                        size: 16, color: AivoBrand.warning),
                                    const SizedBox(width: 4),
                                    Text('${exercise.caloriesBurned} cal'),
                                  ],
                                ),
                              ],
                            ),
                            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                            onTap: () => _startExercise(exercise),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

// Gross Motor Exercise Screen
class GrossMotorExerciseScreen extends StatefulWidget {
  final String learnerId;
  final GrossMotorExercise exercise;
  final MotorSkillsService service;

  const GrossMotorExerciseScreen({
    super.key,
    required this.learnerId,
    required this.exercise,
    required this.service,
  });

  @override
  State<GrossMotorExerciseScreen> createState() => _GrossMotorExerciseScreenState();
}

class _GrossMotorExerciseScreenState extends State<GrossMotorExerciseScreen> {
  GrossMotorSession? _session;
  int _currentMovement = 0;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final session = await widget.service.startGrossMotorSession(
        learnerId: widget.learnerId,
        exerciseId: widget.exercise.id,
      );
      setState(() => _session = session);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error starting session: $e')),
        );
      }
    }
  }

  Future<void> _completeSession() async {
    if (_session == null) return;

    try {
      await widget.service.completeGrossMotorSession(
        sessionId: _session!.id,
        movementsCompleted: _currentMovement,
        accuracy: 95,
        notes: ['Exercise completed successfully'],
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Exercise completed!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error completing session: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_session == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final currentMovementData = _currentMovement < widget.exercise.movements.length
        ? widget.exercise.movements[_currentMovement]
        : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.exercise.name),
        backgroundColor: AivoBrand.mint[700],
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Progress
          Container(
            padding: const EdgeInsets.all(16),
            color: AivoBrand.mint[50],
            child: Column(
              children: [
                Text(
                  'Movement ${_currentMovement + 1} of ${widget.exercise.movements.length}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: (_currentMovement + 1) / widget.exercise.movements.length,
                  backgroundColor: AivoBrand.gray[300],
                  valueColor: AlwaysStoppedAnimation<Color>(AivoBrand.mint[700]!),
                ),
              ],
            ),
          ),

          // Movement content
          Expanded(
            child: currentMovementData != null
                ? SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          currentMovementData.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          currentMovementData.description,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.repeat),
                                    const SizedBox(width: 8),
                                    Text('${currentMovementData.repetitions} reps'),
                                    const SizedBox(width: 24),
                                    const Icon(Icons.timer),
                                    const SizedBox(width: 8),
                                    Text('${currentMovementData.duration.inSeconds}s'),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                const Text('Movement Cues:',
                                    style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                ...currentMovementData.cues.map((cue) => Padding(
                                      padding: const EdgeInsets.only(bottom: 4),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text('• '),
                                          Expanded(child: Text(cue)),
                                        ],
                                      ),
                                    )),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        // Exercise demonstration area
                        Container(
                          width: double.infinity,
                          height: 250,
                          decoration: BoxDecoration(
                            border: Border.all(color: AivoBrand.mint[300]!, width: 2),
                            borderRadius: BorderRadius.circular(8),
                            color: AivoBrand.mint[50],
                          ),
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.play_circle_outline,
                                    size: 80, color: AivoBrand.mint[700]),
                                const SizedBox(height: 8),
                                const Text('Exercise demonstration'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle,
                            size: 80, color: AivoBrand.mint[700]),
                        const SizedBox(height: 16),
                        const Text(
                          'All movements completed!',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${widget.exercise.caloriesBurned} calories burned',
                          style: TextStyle(fontSize: 16, color: AivoBrand.gray[700]),
                        ),
                      ],
                    ),
                  ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (currentMovementData != null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => setState(() => _currentMovement++),
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Next Movement'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.mint[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
                if (currentMovementData == null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _completeSession,
                      icon: const Icon(Icons.check),
                      label: const Text('Complete Exercise'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.mint[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Adaptive Input Tab
class AdaptiveInputTab extends StatefulWidget {
  final String learnerId;
  final MotorSkillsService service;

  const AdaptiveInputTab({
    super.key,
    required this.learnerId,
    required this.service,
  });

  @override
  State<AdaptiveInputTab> createState() => _AdaptiveInputTabState();
}

class _AdaptiveInputTabState extends State<AdaptiveInputTab> {
  AdaptiveInputProfile? _profile;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final profile = await widget.service.getAdaptiveInputProfile(widget.learnerId);
      setState(() => _profile = profile);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading profile: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateSetting(AdaptiveInputSetting setting, dynamic value) async {
    if (_profile == null) return;

    try {
      final updated = await widget.service.updateAdaptiveInputSetting(
        profileId: _profile!.id,
        settingId: setting.id,
        value: value,
      );
      setState(() => _profile = updated);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating setting: $e')),
        );
      }
    }
  }

  Future<void> _resetSettings() async {
    if (_profile == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Settings'),
        content: const Text('Reset all adaptive input settings to defaults?'),
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

    if (confirm == true) {
      try {
        final updated = await widget.service.resetAdaptiveInputSettings(_profile!.id);
        setState(() => _profile = updated);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Settings reset to defaults')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error resetting settings: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _profile == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: AivoBrand.mint[50],
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Customize Input Controls',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
            padding: const EdgeInsets.all(16),
            itemCount: _profile!.settings.length,
            itemBuilder: (context, index) {
              final setting = _profile!.settings[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        setting.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        setting.description,
                        style: TextStyle(color: AivoBrand.gray[700]),
                      ),
                      const SizedBox(height: 12),
                      _buildControl(setting),
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

  Widget _buildControl(AdaptiveInputSetting setting) {
    // Determine control type based on value type and constraints
    if (setting.value is bool) {
      return SwitchListTile(
        title: Text(setting.value ? 'Enabled' : 'Disabled'),
        value: setting.value as bool,
        onChanged: (value) => _updateSetting(setting, value),
        contentPadding: EdgeInsets.zero,
      );
    } else if (setting.value is int || setting.value is double) {
      final constraints = setting.constraints;
      final min = constraints?['min'] ?? 0;
      final max = constraints?['max'] ?? 100;
      final value = (setting.value as num).toDouble();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Value: ${setting.value}'),
              Text('Range: $min - $max',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ],
          ),
          Slider(
            value: value,
            min: (min as num).toDouble(),
            max: (max as num).toDouble(),
            divisions: (max - min) > 10 ? null : (max - min) as int?,
            label: setting.value.toString(),
            onChanged: (newValue) {
              if (setting.value is int) {
                _updateSetting(setting, newValue.round());
              } else {
                _updateSetting(setting, newValue);
              }
            },
          ),
        ],
      );
    } else if (setting.value is String && setting.constraints?['options'] != null) {
      final options = setting.constraints!['options'] as List;
      return DropdownButton<String>(
        value: setting.value as String,
        isExpanded: true,
        items: options.map((opt) {
          return DropdownMenuItem(
            value: opt as String,
            child: Text(opt),
          );
        }).toList(),
        onChanged: (value) {
          if (value != null) {
            _updateSetting(setting, value);
          }
        },
      );
    }

    return Text('Value: ${setting.value}');
  }
}
