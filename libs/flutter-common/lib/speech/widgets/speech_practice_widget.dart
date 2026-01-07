/// Speech practice widget for articulation practice
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../speech_models.dart';

/// Speech practice widget with recording and feedback
class SpeechPracticeWidget extends StatefulWidget {
  final TargetSound targetSound;
  final List<PracticeWord> words;
  final PracticeType practiceType;
  final bool showVisualCues;
  final bool autoAdvance;
  final Duration recordingDuration;
  final void Function(PracticeAttempt attempt)? onAttempt;
  final void Function(List<PracticeAttempt> attempts)? onComplete;

  const SpeechPracticeWidget({
    super.key,
    required this.targetSound,
    required this.words,
    this.practiceType = PracticeType.word,
    this.showVisualCues = true,
    this.autoAdvance = true,
    this.recordingDuration = const Duration(seconds: 5),
    this.onAttempt,
    this.onComplete,
  });

  @override
  State<SpeechPracticeWidget> createState() => _SpeechPracticeWidgetState();
}

class _SpeechPracticeWidgetState extends State<SpeechPracticeWidget>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  bool _isRecording = false;
  bool _isAnalyzing = false;
  bool _showResult = false;
  SpeechAnalysisResult? _lastResult;
  final List<PracticeAttempt> _attempts = [];
  late AnimationController _pulseController;

  PracticeWord get _currentWord => widget.words[_currentIndex];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _startRecording() async {
    if (_isRecording) return;

    HapticFeedback.mediumImpact();

    setState(() {
      _isRecording = true;
      _showResult = false;
      _lastResult = null;
    });

    // Simulate recording duration
    await Future.delayed(widget.recordingDuration);

    if (mounted && _isRecording) {
      _stopRecording();
    }
  }

  void _stopRecording() async {
    if (!_isRecording) return;

    setState(() {
      _isRecording = false;
      _isAnalyzing = true;
    });

    // Simulate analysis (in real app, would call speech service)
    await Future.delayed(const Duration(seconds: 1));

    // Mock result
    final isCorrect = DateTime.now().millisecond % 3 != 0; // 66% success rate
    final result = SpeechAnalysisResult(
      isCorrect: isCorrect,
      confidence: isCorrect ? 0.85 + (DateTime.now().millisecond % 15) / 100 : 0.45,
      feedback: isCorrect
          ? 'Great job! Your ${widget.targetSound.sound} sound was clear.'
          : 'Try again! Focus on the position of your tongue.',
      issues: isCorrect
          ? []
          : [
              SpeechIssue(
                type: 'articulation',
                description: 'Sound was slightly distorted',
                suggestion: 'Try placing your tongue a bit higher',
              ),
            ],
    );

    final attempt = PracticeAttempt(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      itemId: _currentWord.id,
      itemType: 'word',
      isCorrect: isCorrect,
      confidenceScore: result.confidence,
      feedback: result.feedback,
      timestamp: DateTime.now(),
    );

    _attempts.add(attempt);
    widget.onAttempt?.call(attempt);

    if (mounted) {
      setState(() {
        _isAnalyzing = false;
        _showResult = true;
        _lastResult = result;
      });

      HapticFeedback.lightImpact();

      if (widget.autoAdvance && isCorrect) {
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          _nextWord();
        }
      }
    }
  }

  void _nextWord() {
    if (_currentIndex < widget.words.length - 1) {
      setState(() {
        _currentIndex++;
        _showResult = false;
        _lastResult = null;
      });
    } else {
      _completeSession();
    }
  }

  void _previousWord() {
    if (_currentIndex > 0) {
      setState(() {
        _currentIndex--;
        _showResult = false;
        _lastResult = null;
      });
    }
  }

  void _completeSession() {
    widget.onComplete?.call(_attempts);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Progress bar
        LinearProgressIndicator(
          value: (_currentIndex + 1) / widget.words.length,
          backgroundColor: Colors.grey[300],
        ),

        // Target sound info
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    widget.targetSound.sound.toUpperCase(),
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Target Sound: /${widget.targetSound.phoneme}/',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Word ${_currentIndex + 1} of ${widget.words.length}',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              _buildAccuracyIndicator(),
            ],
          ),
        ),

        // Main practice area
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Word image
                if (_currentWord.imageUrl != null)
                  Container(
                    width: 200,
                    height: 200,
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        _currentWord.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.image,
                          size: 64,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                  ),

                // Word display
                _buildWordDisplay(),

                const SizedBox(height: 8),

                // Phonetic
                if (_currentWord.phonetic != null)
                  Text(
                    '/${_currentWord.phonetic}/',
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.grey[600],
                      fontStyle: FontStyle.italic,
                    ),
                  ),

                const SizedBox(height: 32),

                // Recording button
                _buildRecordButton(),

                const SizedBox(height: 24),

                // Result feedback
                if (_showResult && _lastResult != null) _buildResultFeedback(),
              ],
            ),
          ),
        ),

        // Navigation
        _buildNavigationBar(),
      ],
    );
  }

  Widget _buildAccuracyIndicator() {
    final correctCount = _attempts.where((a) => a.isCorrect).length;
    final accuracy = _attempts.isNotEmpty ? correctCount / _attempts.length : 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: accuracy >= 0.8
            ? Colors.green[100]
            : accuracy >= 0.5
                ? Colors.orange[100]
                : Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.target,
            size: 16,
            color: accuracy >= 0.8
                ? Colors.green
                : accuracy >= 0.5
                    ? Colors.orange
                    : Colors.grey,
          ),
          const SizedBox(width: 4),
          Text(
            '${(accuracy * 100).toInt()}%',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: accuracy >= 0.8
                  ? Colors.green[700]
                  : accuracy >= 0.5
                      ? Colors.orange[700]
                      : Colors.grey[700],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWordDisplay() {
    final word = _currentWord.word;
    final targetSound = widget.targetSound.sound.toLowerCase();
    final position = _currentWord.position;

    return RichText(
      text: TextSpan(
        style: const TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.bold,
          color: Colors.black,
        ),
        children: _highlightSound(word, targetSound, position),
      ),
    );
  }

  List<TextSpan> _highlightSound(String word, String sound, WordPosition position) {
    final spans = <TextSpan>[];
    final lowerWord = word.toLowerCase();
    final soundIndex = lowerWord.indexOf(sound);

    if (soundIndex >= 0) {
      if (soundIndex > 0) {
        spans.add(TextSpan(text: word.substring(0, soundIndex)));
      }
      spans.add(TextSpan(
        text: word.substring(soundIndex, soundIndex + sound.length),
        style: TextStyle(color: Theme.of(context).colorScheme.primary),
      ));
      if (soundIndex + sound.length < word.length) {
        spans.add(TextSpan(text: word.substring(soundIndex + sound.length)));
      }
    } else {
      spans.add(TextSpan(text: word));
    }

    return spans;
  }

  Widget _buildRecordButton() {
    return GestureDetector(
      onTapDown: (_) => _startRecording(),
      onTapUp: (_) => _stopRecording(),
      onTapCancel: _stopRecording,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          final scale = _isRecording ? 1.0 + (_pulseController.value * 0.1) : 1.0;
          return Transform.scale(
            scale: scale,
            child: child,
          );
        },
        child: Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _isRecording
                ? Colors.red
                : _isAnalyzing
                    ? Colors.orange
                    : Theme.of(context).colorScheme.primary,
            boxShadow: [
              BoxShadow(
                color: (_isRecording
                    ? Colors.red
                    : Theme.of(context).colorScheme.primary).withOpacity(0.3),
                blurRadius: 16,
                spreadRadius: 4,
              ),
            ],
          ),
          child: Icon(
            _isRecording
                ? Icons.stop
                : _isAnalyzing
                    ? Icons.hourglass_top
                    : Icons.mic,
            size: 48,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildResultFeedback() {
    final result = _lastResult!;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: result.isCorrect ? Colors.green[50] : Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: result.isCorrect ? Colors.green : Colors.orange,
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                result.isCorrect ? Icons.check_circle : Icons.info,
                color: result.isCorrect ? Colors.green : Colors.orange,
              ),
              const SizedBox(width: 8),
              Text(
                result.isCorrect ? 'Great job!' : 'Try again!',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: result.isCorrect ? Colors.green[700] : Colors.orange[700],
                ),
              ),
            ],
          ),
          if (result.feedback != null) ...[
            const SizedBox(height: 8),
            Text(
              result.feedback!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[700]),
            ),
          ],
          if (!result.isCorrect && result.issues.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              result.issues.first.suggestion ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.orange[700],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildNavigationBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton.icon(
            onPressed: _currentIndex > 0 ? _previousWord : null,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Previous'),
          ),
          if (_showResult && !_lastResult!.isCorrect)
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _showResult = false;
                  _lastResult = null;
                });
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          TextButton.icon(
            onPressed: _nextWord,
            icon: const Icon(Icons.arrow_forward),
            label: Text(
              _currentIndex < widget.words.length - 1 ? 'Next' : 'Finish',
            ),
          ),
        ],
      ),
    );
  }
}
