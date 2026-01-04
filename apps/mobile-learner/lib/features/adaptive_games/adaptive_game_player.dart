/// Adaptive Game Player - Flutter Widget
///
/// Mobile implementation of AI-generated adaptive games.
/// Features:
/// - Touch-optimized interactions
/// - Gesture-based puzzle solving
/// - Dynamic game rendering based on game type
/// - Real-time difficulty adaptation
/// - Hint system with AI-generated guidance

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

class GeneratedGame {
  final String id;
  final String gameType;
  final String title;
  final String description;
  final List<String> instructions;
  final String difficulty;
  final int estimatedDuration;
  final Map<String, dynamic> parameters;
  final Map<String, dynamic> gameData;
  final GameScoring scoring;

  GeneratedGame({
    required this.id,
    required this.gameType,
    required this.title,
    required this.description,
    required this.instructions,
    required this.difficulty,
    required this.estimatedDuration,
    required this.parameters,
    required this.gameData,
    required this.scoring,
  });

  factory GeneratedGame.fromJson(Map<String, dynamic> json) {
    return GeneratedGame(
      id: json['id'] as String,
      gameType: json['gameType'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      instructions: List<String>.from(json['instructions'] as List),
      difficulty: json['difficulty'] as String,
      estimatedDuration: json['estimatedDuration'] as int,
      parameters: json['parameters'] as Map<String, dynamic>,
      gameData: json['gameData'] as Map<String, dynamic>,
      scoring: GameScoring.fromJson(json['scoring'] as Map<String, dynamic>),
    );
  }
}

class GameScoring {
  final int maxPoints;
  final bool timeBonus;

  GameScoring({required this.maxPoints, required this.timeBonus});

  factory GameScoring.fromJson(Map<String, dynamic> json) {
    return GameScoring(
      maxPoints: json['maxPoints'] as int,
      timeBonus: json['timeBonus'] as bool,
    );
  }
}

class GameSession {
  final String sessionId;
  final DateTime startTime;
  int score;
  int hintsUsed;
  int attempts;
  int correctAttempts;

  GameSession({
    required this.sessionId,
    required this.startTime,
    this.score = 0,
    this.hintsUsed = 0,
    this.attempts = 0,
    this.correctAttempts = 0,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE GAME PLAYER WIDGET
// ══════════════════════════════════════════════════════════════════════════════

class AdaptiveGamePlayer extends StatefulWidget {
  final GeneratedGame game;
  final String learnerId;
  final String apiEndpoint;
  final void Function(Map<String, dynamic> results)? onComplete;
  final VoidCallback? onExit;

  const AdaptiveGamePlayer({
    super.key,
    required this.game,
    required this.learnerId,
    this.apiEndpoint = '/api/ai/games',
    this.onComplete,
    this.onExit,
  });

  @override
  State<AdaptiveGamePlayer> createState() => _AdaptiveGamePlayerState();
}

class _AdaptiveGamePlayerState extends State<AdaptiveGamePlayer> {
  GameSession? _session;
  bool _showInstructions = true;
  bool _isPaused = false;
  String _currentDifficulty = '';
  int _timeElapsed = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _currentDifficulty = widget.game.difficulty;
    _createSession();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _createSession() async {
    try {
      final response = await http.post(
        Uri.parse('${widget.apiEndpoint}/session'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'gameId': widget.game.id,
          'gameType': widget.game.gameType,
          'learnerId': widget.learnerId,
          'initialDifficulty': widget.game.difficulty,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final session = data['session'] as Map<String, dynamic>;

        setState(() {
          _session = GameSession(
            sessionId: session['sessionId'] as String,
            startTime: DateTime.now(),
          );
        });
      }
    } catch (e) {
      // Fallback to local session
      setState(() {
        _session = GameSession(
          sessionId: 'local',
          startTime: DateTime.now(),
        );
      });
    }
  }

  void _startGame() {
    setState(() {
      _showInstructions = false;
    });
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!_isPaused) {
        setState(() {
          _timeElapsed++;
        });
      }
    });
  }

  void _handleAttempt(bool isCorrect, int responseTime) {
    if (_session == null) return;

    setState(() {
      _session!.attempts++;
      if (isCorrect) {
        _session!.correctAttempts++;
      }
    });

    // Record attempt via API
    http.post(
      Uri.parse('${widget.apiEndpoint}/session/attempt'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'sessionId': _session!.sessionId,
        'isCorrect': isCorrect,
        'responseTime': responseTime,
      }),
    );
  }

  void _handleScoreUpdate(int points) {
    if (_session == null) return;
    setState(() {
      _session!.score += points;
    });
  }

  void _handleGameComplete() {
    _timer?.cancel();

    final results = {
      'score': _session?.score ?? 0,
      'maxScore': widget.game.scoring.maxPoints,
      'accuracy': _session != null && _session!.attempts > 0
          ? _session!.correctAttempts / _session!.attempts
          : 0.0,
      'timeElapsed': _timeElapsed,
      'hintsUsed': _session?.hintsUsed ?? 0,
      'completedAt': DateTime.now().toIso8601String(),
    };

    widget.onComplete?.call(results);
  }

  @override
  Widget build(BuildContext context) {
    if (_session == null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.game.title)),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_showInstructions) {
      return _buildInstructionsView();
    }

    return _buildGameView();
  }

  Widget _buildInstructionsView() {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.game.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: widget.onExit,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Game Info
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  _InfoChip(
                    icon: Icons.timer_outlined,
                    label: '${(widget.game.estimatedDuration / 60).round()} min',
                  ),
                  _InfoChip(
                    icon: Icons.star_outline,
                    label: _currentDifficulty,
                  ),
                  _InfoChip(
                    icon: Icons.emoji_events_outlined,
                    label: '${widget.game.scoring.maxPoints} points',
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Description
              Text(
                widget.game.description,
                style: Theme.of(context).textTheme.bodyLarge,
              ),

              const SizedBox(height: 24),

              // Instructions
              Text(
                'How to Play:',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 16),

              ...widget.game.instructions.asMap().entries.map((entry) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${entry.key + 1}',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          entry.value,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 32),

              // Start Button
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _startGame,
                  child: const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Start Game'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGameView() {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.game.title),
            Text(
              'Score: ${_session!.score}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          // Timer
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  const Icon(Icons.timer, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${_timeElapsed ~/ 60}:${(_timeElapsed % 60).toString().padLeft(2, '0')}',
                  ),
                ],
              ),
            ),
          ),

          // Pause/Resume
          IconButton(
            icon: Icon(_isPaused ? Icons.play_arrow : Icons.pause),
            onPressed: () {
              setState(() {
                _isPaused = !_isPaused;
              });
            },
          ),

          // Exit
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: widget.onExit,
          ),
        ],
      ),
      body: _isPaused
          ? _buildPausedView()
          : _buildGameContent(),
    );
  }

  Widget _buildPausedView() {
    return Center(
      child: Card(
        margin: const EdgeInsets.all(24),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Game Paused',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  setState(() {
                    _isPaused = false;
                  });
                },
                child: const Text('Resume'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGameContent() {
    // Route to appropriate game widget based on game type
    final gameType = widget.game.gameType;

    if (gameType == 'mental_math' || gameType.contains('math')) {
      return _MentalMathGame(
        gameData: widget.game.gameData,
        onAttempt: _handleAttempt,
        onScoreUpdate: _handleScoreUpdate,
        onComplete: _handleGameComplete,
      );
    }

    if (gameType == 'anagram' || gameType.contains('word')) {
      return _AnagramGame(
        gameData: widget.game.gameData,
        onAttempt: _handleAttempt,
        onScoreUpdate: _handleScoreUpdate,
        onComplete: _handleGameComplete,
      );
    }

    // Fallback
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Game type not yet implemented: $gameType',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _handleGameComplete,
              child: const Text('Exit Game'),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INFO CHIP
// ══════════════════════════════════════════════════════════════════════════════

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MENTAL MATH GAME
// ══════════════════════════════════════════════════════════════════════════════

class _MentalMathGame extends StatefulWidget {
  final Map<String, dynamic> gameData;
  final void Function(bool isCorrect, int responseTime) onAttempt;
  final void Function(int points) onScoreUpdate;
  final VoidCallback onComplete;

  const _MentalMathGame({
    required this.gameData,
    required this.onAttempt,
    required this.onScoreUpdate,
    required this.onComplete,
  });

  @override
  State<_MentalMathGame> createState() => _MentalMathGameState();
}

class _MentalMathGameState extends State<_MentalMathGame> {
  int _currentIndex = 0;
  String _userAnswer = '';
  int _streak = 0;
  String? _feedback;
  bool? _isCorrect;
  late DateTime _attemptStartTime;

  List<dynamic> get _problems => widget.gameData['problems'] as List<dynamic>? ?? [];

  @override
  void initState() {
    super.initState();
    _attemptStartTime = DateTime.now();
  }

  void _submitAnswer() {
    if (_userAnswer.isEmpty) return;

    final problem = _problems[_currentIndex] as Map<String, dynamic>;
    final correctAnswer = problem['answer'] as int;
    final userNum = int.tryParse(_userAnswer);
    final isCorrect = userNum == correctAnswer;

    final responseTime = DateTime.now().difference(_attemptStartTime).inMilliseconds;
    widget.onAttempt(isCorrect, responseTime);

    setState(() {
      _isCorrect = isCorrect;
      if (isCorrect) {
        _streak++;
        _feedback = _streak >= 3 ? '$_streak in a row!' : 'Correct!';
        widget.onScoreUpdate(5 + (_streak ~/ 3));
      } else {
        _streak = 0;
        _feedback = 'Not quite. The answer is $correctAnswer';
      }
    });

    Future.delayed(const Duration(milliseconds: isCorrect ? 800 : 1500), () {
      if (_currentIndex < _problems.length - 1) {
        setState(() {
          _currentIndex++;
          _userAnswer = '';
          _feedback = null;
          _isCorrect = null;
          _attemptStartTime = DateTime.now();
        });
      } else {
        widget.onComplete();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_problems.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final problem = _problems[_currentIndex] as Map<String, dynamic>;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Streak indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.local_fire_department, color: Colors.orange),
              const SizedBox(width: 8),
              Text(
                '$_streak',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),

          const SizedBox(height: 48),

          // Problem
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  Theme.of(context).colorScheme.primary.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              problem['question'] as String,
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ),

          const SizedBox(height: 32),

          // Answer input
          if (_feedback == null) ...[
            TextField(
              autofocus: true,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.displaySmall,
              decoration: const InputDecoration(
                hintText: '?',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                setState(() {
                  _userAnswer = value;
                });
              },
              onSubmitted: (_) => _submitAnswer(),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _userAnswer.isEmpty ? null : _submitAnswer,
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Submit'),
                ),
              ),
            ),
          ],

          // Feedback
          if (_feedback != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _isCorrect == true
                    ? Colors.green.withOpacity(0.2)
                    : Colors.red.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _feedback!,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: _isCorrect == true ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANAGRAM GAME
// ══════════════════════════════════════════════════════════════════════════════

class _AnagramGame extends StatefulWidget {
  final Map<String, dynamic> gameData;
  final void Function(bool isCorrect, int responseTime) onAttempt;
  final void Function(int points) onScoreUpdate;
  final VoidCallback onComplete;

  const _AnagramGame({
    required this.gameData,
    required this.onAttempt,
    required this.onScoreUpdate,
    required this.onComplete,
  });

  @override
  State<_AnagramGame> createState() => _AnagramGameState();
}

class _AnagramGameState extends State<_AnagramGame> {
  int _currentIndex = 0;
  String _userAnswer = '';
  String? _feedback;
  bool? _isCorrect;
  late DateTime _attemptStartTime;

  List<dynamic> get _anagrams => widget.gameData['anagrams'] as List<dynamic>? ?? [];

  @override
  void initState() {
    super.initState();
    _attemptStartTime = DateTime.now();
  }

  void _submitAnswer() {
    if (_userAnswer.isEmpty) return;

    final anagram = _anagrams[_currentIndex] as Map<String, dynamic>;
    final correctAnswer = (anagram['answer'] as String).toUpperCase();
    final isCorrect = _userAnswer.trim().toUpperCase() == correctAnswer;

    final responseTime = DateTime.now().difference(_attemptStartTime).inMilliseconds;
    widget.onAttempt(isCorrect, responseTime);

    setState(() {
      _isCorrect = isCorrect;
      _feedback = isCorrect ? 'Correct!' : 'Try again!';
    });

    if (isCorrect) {
      widget.onScoreUpdate(5);
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (_currentIndex < _anagrams.length - 1) {
          setState(() {
            _currentIndex++;
            _userAnswer = '';
            _feedback = null;
            _isCorrect = null;
            _attemptStartTime = DateTime.now();
          });
        } else {
          widget.onComplete();
        }
      });
    } else {
      Future.delayed(const Duration(milliseconds: 1000), () {
        setState(() {
          _feedback = null;
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_anagrams.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final anagram = _anagrams[_currentIndex] as Map<String, dynamic>;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Unscramble these letters:',
            style: Theme.of(context).textTheme.titleMedium,
          ),

          const SizedBox(height: 32),

          // Scrambled letters
          Wrap(
            spacing: 8,
            alignment: WrapAlignment.center,
            children: (anagram['scrambled'] as String).split('').map((letter) {
              return Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.primary,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    letter.toUpperCase(),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 32),

          // Answer input
          TextField(
            autofocus: true,
            textAlign: TextAlign.center,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              hintText: 'Your answer',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              setState(() {
                _userAnswer = value;
              });
            },
            onSubmitted: (_) => _submitAnswer(),
          ),

          const SizedBox(height: 16),

          // Feedback
          if (_feedback != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _isCorrect == true
                    ? Colors.green.withOpacity(0.2)
                    : Colors.red.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _feedback!,
                style: TextStyle(
                  color: _isCorrect == true ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _userAnswer.isEmpty ? null : _submitAnswer,
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Submit'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
