import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../pin/pin_storage.dart';
import '../sel_models.dart';
import '../sel_service.dart';
import '../widgets/breathing_animation.dart';

/// Mindfulness Exercises Screen
///
/// Provides guided breathing exercises, meditation, and body scan activities.
class MindfulnessExercisesScreen extends StatefulWidget {
  final String learnerId;

  const MindfulnessExercisesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<MindfulnessExercisesScreen> createState() =>
      _MindfulnessExercisesScreenState();
}

class _MindfulnessExercisesScreenState extends State<MindfulnessExercisesScreen> {
  SELService? _selService;
  String _cachedToken = '';

  List<MindfulnessExercise> _exercises = [];
  bool _isLoading = true;
  MindfulnessType? _selectedType;

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

    await _loadExercises();
  }

  Future<void> _loadExercises() async {
    if (_selService == null) return;

    setState(() => _isLoading = true);

    try {
      final exercises = await _selService!.getMindfulnessExercises();
      if (mounted) {
        setState(() {
          _exercises = exercises;
          _isLoading = false;
        });
      }
    } catch (e) {
      // Use default exercises if API fails
      if (mounted) {
        setState(() {
          _exercises = _getDefaultExercises();
          _isLoading = false;
        });
      }
    }
  }

  List<MindfulnessExercise> _getDefaultExercises() {
    return [
      MindfulnessExercise(
        id: 'breathing-4-4-4',
        name: 'Box Breathing',
        type: MindfulnessType.breathing,
        description: 'A calming technique used by Navy SEALs to reduce stress.',
        duration: 120,
        instructions: [
          'Breathe in for 4 seconds',
          'Hold for 4 seconds',
          'Breathe out for 4 seconds',
          'Hold for 4 seconds',
          'Repeat the cycle',
        ],
        breathingPattern: const BreathingPattern(
          inhaleSeconds: 4,
          holdSeconds: 4,
          exhaleSeconds: 4,
          pauseSeconds: 4,
          cycles: 4,
        ),
      ),
      MindfulnessExercise(
        id: 'breathing-4-7-8',
        name: 'Relaxing Breath',
        type: MindfulnessType.breathing,
        description: 'A natural tranquilizer for the nervous system.',
        duration: 90,
        instructions: [
          'Breathe in through your nose for 4 seconds',
          'Hold your breath for 7 seconds',
          'Exhale slowly through your mouth for 8 seconds',
        ],
        breathingPattern: const BreathingPattern(
          inhaleSeconds: 4,
          holdSeconds: 7,
          exhaleSeconds: 8,
          pauseSeconds: 0,
          cycles: 3,
        ),
      ),
      const MindfulnessExercise(
        id: 'grounding-5-4-3-2-1',
        name: '5-4-3-2-1 Grounding',
        type: MindfulnessType.meditation,
        description: 'Use your senses to ground yourself in the present moment.',
        duration: 180,
        instructions: [
          'Notice 5 things you can SEE',
          'Notice 4 things you can TOUCH',
          'Notice 3 things you can HEAR',
          'Notice 2 things you can SMELL',
          'Notice 1 thing you can TASTE',
        ],
      ),
      const MindfulnessExercise(
        id: 'body-scan-quick',
        name: 'Quick Body Scan',
        type: MindfulnessType.bodyScan,
        description: 'Quickly scan your body to release tension.',
        duration: 180,
        instructions: [
          'Close your eyes and take a deep breath',
          'Notice any tension in your face - relax it',
          'Roll your shoulders and let them drop',
          'Unclench your jaw',
          'Release tension in your hands',
          'Take one final deep breath',
        ],
      ),
      const MindfulnessExercise(
        id: 'visualization-safe-place',
        name: 'Safe Place Visualization',
        type: MindfulnessType.visualization,
        description: 'Imagine a peaceful place where you feel safe and calm.',
        duration: 240,
        instructions: [
          'Close your eyes and take 3 deep breaths',
          'Picture a place where you feel completely safe',
          'Notice the colors and shapes around you',
          'Feel the temperature and any textures',
          'Listen to any sounds in your safe place',
          'Stay here as long as you need',
        ],
      ),
    ];
  }

  List<MindfulnessExercise> get _filteredExercises {
    if (_selectedType == null) return _exercises;
    return _exercises.where((e) => e.type == _selectedType).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mindfulness'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadExercises,
              child: Column(
                children: [
                  // Filter chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        _buildFilterChip('All', null),
                        const SizedBox(width: 8),
                        ...MindfulnessType.values.map((type) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: _buildFilterChip(
                                '${type.icon} ${type.label}',
                                type,
                              ),
                            )),
                      ],
                    ),
                  ),

                  // Exercises list
                  Expanded(
                    child: _filteredExercises.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.self_improvement,
                                  size: 64,
                                  color: AivoBrand.gray.shade400,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No exercises found',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _filteredExercises.length,
                            itemBuilder: (context, index) {
                              final exercise = _filteredExercises[index];
                              return _buildExerciseCard(exercise);
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildFilterChip(String label, MindfulnessType? type) {
    final isSelected = _selectedType == type;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() => _selectedType = selected ? type : null);
      },
      selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
    );
  }

  Widget _buildExerciseCard(MindfulnessExercise exercise) {
    final duration = exercise.duration ~/ 60;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _startExercise(exercise),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _getTypeColor(exercise.type).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    exercise.type.icon,
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
                      exercise.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      exercise.description,
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
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: AivoBrand.gray.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$duration min',
                          style: TextStyle(
                            color: AivoBrand.gray.shade500,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: _getTypeColor(exercise.type).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            exercise.type.label,
                            style: TextStyle(
                              color: _getTypeColor(exercise.type),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.play_circle_filled,
                color: Theme.of(context).primaryColor,
                size: 36,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getTypeColor(MindfulnessType type) {
    switch (type) {
      case MindfulnessType.breathing:
        return const Color(0xFF06B6D4);
      case MindfulnessType.meditation:
        return const Color(0xFF8B5CF6);
      case MindfulnessType.bodyScan:
        return const Color(0xFFEC4899);
      case MindfulnessType.visualization:
        return const Color(0xFF22C55E);
    }
  }

  void _startExercise(MindfulnessExercise exercise) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _ExerciseScreen(
          exercise: exercise,
          selService: _selService!,
        ),
      ),
    );
  }
}

class _ExerciseScreen extends StatefulWidget {
  final MindfulnessExercise exercise;
  final SELService selService;

  const _ExerciseScreen({
    required this.exercise,
    required this.selService,
  });

  @override
  State<_ExerciseScreen> createState() => _ExerciseScreenState();
}

class _ExerciseScreenState extends State<_ExerciseScreen> {
  int _currentStep = 0;
  bool _isComplete = false;
  int _elapsedSeconds = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Title
              Text(
                widget.exercise.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 48),

              // Animation or instruction
              Expanded(
                child: _isComplete
                    ? _buildCompletionView()
                    : widget.exercise.breathingPattern != null
                        ? BreathingAnimation(
                            pattern: widget.exercise.breathingPattern!,
                            onComplete: () {
                              setState(() => _isComplete = true);
                            },
                            onTick: (seconds) {
                              setState(() => _elapsedSeconds = seconds);
                            },
                          )
                        : _buildInstructionView(),
              ),

              // Progress indicator
              if (!_isComplete) ...[
                const SizedBox(height: 24),
                Text(
                  'Step ${_currentStep + 1} of ${widget.exercise.instructions.length}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 14,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInstructionView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            children: [
              Text(
                widget.exercise.type.icon,
                style: const TextStyle(fontSize: 64),
              ),
              const SizedBox(height: 24),
              Text(
                widget.exercise.instructions[_currentStep],
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 48),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_currentStep > 0)
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () {
                  setState(() => _currentStep--);
                },
              ),
            const SizedBox(width: 24),
            ElevatedButton(
              onPressed: () {
                if (_currentStep < widget.exercise.instructions.length - 1) {
                  setState(() => _currentStep++);
                } else {
                  setState(() => _isComplete = true);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF1a1a2e),
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
              child: Text(
                _currentStep < widget.exercise.instructions.length - 1
                    ? 'Next'
                    : 'Complete',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCompletionView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          '🎉',
          style: TextStyle(fontSize: 64),
        ),
        const SizedBox(height: 24),
        Text(
          'Great job!',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'You completed ${widget.exercise.name}',
          style: TextStyle(
            color: Colors.white.withOpacity(0.7),
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 48),
        ElevatedButton(
          onPressed: () {
            widget.selService.recordExerciseCompletion(
              exerciseId: widget.exercise.id,
              durationSeconds: _elapsedSeconds > 0
                  ? _elapsedSeconds
                  : widget.exercise.duration,
            );
            Navigator.pop(context);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: const Color(0xFF1a1a2e),
            padding: const EdgeInsets.symmetric(
              horizontal: 32,
              vertical: 16,
            ),
          ),
          child: const Text('Done'),
        ),
      ],
    );
  }
}
