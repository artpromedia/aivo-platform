/// Math game widget for practice
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../game_models.dart';

/// Math blaster game widget
class MathGameWidget extends StatefulWidget {
  final List<MathProblem> problems;
  final bool showTimer;
  final bool soundEnabled;
  final bool hapticEnabled;
  final void Function(int correct, int total, int score)? onProgress;
  final void Function(GameResult result)? onComplete;

  const MathGameWidget({
    super.key,
    required this.problems,
    this.showTimer = true,
    this.soundEnabled = true,
    this.hapticEnabled = true,
    this.onProgress,
    this.onComplete,
  });

  @override
  State<MathGameWidget> createState() => _MathGameWidgetState();
}

class _MathGameWidgetState extends State<MathGameWidget>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  int _score = 0;
  int _correctCount = 0;
  int _streak = 0;
  String _userAnswer = '';
  bool _showResult = false;
  bool _isCorrect = false;
  Timer? _problemTimer;
  int _timeRemaining = 0;
  final Stopwatch _totalTime = Stopwatch();
  late AnimationController _shakeController;

  MathProblem get _currentProblem => widget.problems[_currentIndex];

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _totalTime.start();
    _startProblemTimer();
  }

  @override
  void dispose() {
    _problemTimer?.cancel();
    _shakeController.dispose();
    _totalTime.stop();
    super.dispose();
  }

  void _startProblemTimer() {
    _problemTimer?.cancel();
    if (_currentProblem.timeLimit != null) {
      _timeRemaining = _currentProblem.timeLimit!.inSeconds;
      _problemTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        setState(() {
          _timeRemaining--;
          if (_timeRemaining <= 0) {
            timer.cancel();
            _submitAnswer(timedOut: true);
          }
        });
      });
    }
  }

  void _submitAnswer({bool timedOut = false}) {
    if (_showResult) return;

    _problemTimer?.cancel();

    final correct = _userAnswer.trim() == _currentProblem.correctAnswer.trim();

    if (correct) {
      _streak++;
      _correctCount++;
      final streakBonus = _streak >= 5 ? 50 : (_streak >= 3 ? 25 : 0);
      _score += _currentProblem.points + streakBonus;

      if (widget.hapticEnabled) {
        HapticFeedback.mediumImpact();
      }
    } else {
      _streak = 0;
      if (widget.hapticEnabled) {
        HapticFeedback.heavyImpact();
      }
      _shakeController.forward().then((_) => _shakeController.reset());
    }

    setState(() {
      _showResult = true;
      _isCorrect = correct;
    });

    widget.onProgress?.call(_correctCount, _currentIndex + 1, _score);

    // Auto advance after delay
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        _nextProblem();
      }
    });
  }

  void _nextProblem() {
    if (_currentIndex < widget.problems.length - 1) {
      setState(() {
        _currentIndex++;
        _userAnswer = '';
        _showResult = false;
      });
      _startProblemTimer();
    } else {
      _completeGame();
    }
  }

  void _completeGame() {
    _totalTime.stop();
    final accuracy = _correctCount / widget.problems.length;
    final result = GameResult(
      gameId: 'math_blaster',
      sessionId: DateTime.now().millisecondsSinceEpoch.toString(),
      finalScore: _score,
      maxScore: widget.problems.fold(0, (sum, p) => sum + p.points),
      totalTime: _totalTime.elapsed,
      accuracy: accuracy,
      starsEarned: accuracy >= 0.9 ? 3 : (accuracy >= 0.7 ? 2 : (accuracy >= 0.5 ? 1 : 0)),
    );
    widget.onComplete?.call(result);
  }

  void _onNumberTap(String number) {
    if (_showResult) return;

    if (widget.hapticEnabled) {
      HapticFeedback.lightImpact();
    }

    setState(() {
      _userAnswer += number;
    });
  }

  void _onBackspace() {
    if (_showResult || _userAnswer.isEmpty) return;

    setState(() {
      _userAnswer = _userAnswer.substring(0, _userAnswer.length - 1);
    });
  }

  void _onClear() {
    if (_showResult) return;

    setState(() {
      _userAnswer = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Progress bar
        LinearProgressIndicator(
          value: (_currentIndex + 1) / widget.problems.length,
          backgroundColor: Colors.grey[300],
        ),

        // Score and timer
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text(
                    '$_score',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (_streak >= 3) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_streak}x streak!',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              if (widget.showTimer && _currentProblem.timeLimit != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _timeRemaining <= 5 ? Colors.red : Colors.blue,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.timer, color: Colors.white, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        '$_timeRemaining',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        // Problem display
        Expanded(
          flex: 2,
          child: AnimatedBuilder(
            animation: _shakeController,
            builder: (context, child) {
              final shakeOffset = _shakeController.value * 10 *
                  ((_shakeController.value * 10).toInt().isEven ? 1 : -1);
              return Transform.translate(
                offset: Offset(shakeOffset, 0),
                child: child,
              );
            },
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Problem ${_currentIndex + 1} of ${widget.problems.length}',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _currentProblem.question,
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  Container(
                    width: 200,
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                    decoration: BoxDecoration(
                      color: _showResult
                          ? (_isCorrect ? Colors.green[100] : Colors.red[100])
                          : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _showResult
                            ? (_isCorrect ? Colors.green : Colors.red)
                            : Colors.grey[400]!,
                        width: 2,
                      ),
                    ),
                    child: Text(
                      _userAnswer.isEmpty ? '?' : _userAnswer,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: _userAnswer.isEmpty ? Colors.grey : Colors.black,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  if (_showResult) ...[
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _isCorrect ? Icons.check_circle : Icons.cancel,
                          color: _isCorrect ? Colors.green : Colors.red,
                          size: 32,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _isCorrect
                              ? 'Correct!'
                              : 'Answer: ${_currentProblem.correctAnswer}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _isCorrect ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),

        // Number pad
        Expanded(
          flex: 3,
          child: _buildNumberPad(),
        ),
      ],
    );
  }

  Widget _buildNumberPad() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                _buildNumberButton('7'),
                _buildNumberButton('8'),
                _buildNumberButton('9'),
              ],
            ),
          ),
          Expanded(
            child: Row(
              children: [
                _buildNumberButton('4'),
                _buildNumberButton('5'),
                _buildNumberButton('6'),
              ],
            ),
          ),
          Expanded(
            child: Row(
              children: [
                _buildNumberButton('1'),
                _buildNumberButton('2'),
                _buildNumberButton('3'),
              ],
            ),
          ),
          Expanded(
            child: Row(
              children: [
                _buildActionButton(Icons.backspace, _onBackspace),
                _buildNumberButton('0'),
                _buildActionButton(Icons.check, () => _submitAnswer(), color: Colors.green),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberButton(String number) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: ElevatedButton(
          onPressed: _showResult ? null : () => _onNumberTap(number),
          style: ElevatedButton.styleFrom(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
          ),
          child: Text(
            number,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, VoidCallback onPressed, {Color? color}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: ElevatedButton(
          onPressed: _showResult ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
          ),
          child: Icon(icon, size: 28),
        ),
      ),
    );
  }
}
