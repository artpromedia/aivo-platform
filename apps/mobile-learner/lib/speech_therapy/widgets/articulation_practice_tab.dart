/// Articulation Practice Tab
///
/// Focused practice for specific speech sounds with real-time feedback.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../../screens/speech_therapy_screen.dart';

final targetSoundsProvider = FutureProvider.autoDispose<List<TargetSound>>((ref) async {
  final service = ref.watch(speechTherapyServiceProvider);
  return service.getTargetSounds();
});

final practiceWordsProvider =
    FutureProvider.autoDispose.family<List<PracticeWord>, String>((ref, targetSound) async {
  final service = ref.watch(speechTherapyServiceProvider);
  return service.getPracticeWords(targetSound);
});

/// Tab for articulation practice
class ArticulationPracticeTab extends ConsumerStatefulWidget {
  const ArticulationPracticeTab({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<ArticulationPracticeTab> createState() => _ArticulationPracticeTabState();
}

class _ArticulationPracticeTabState extends ConsumerState<ArticulationPracticeTab> {
  TargetSound? _selectedSound;
  final List<ArticulationAttempt> _attempts = [];

  @override
  Widget build(BuildContext context) {
    final soundsAsync = ref.watch(targetSoundsProvider);

    return soundsAsync.when(
      data: (sounds) {
        if (_selectedSound == null && sounds.isNotEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) setState(() => _selectedSound = sounds.first);
          });
        }

        return Column(
          children: [
            // Sound selector
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Select a sound to practice:',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: sounds.map((sound) {
                      final isSelected = _selectedSound?.id == sound.id;
                      return ChoiceChip(
                        label: Text(sound.sound.toUpperCase()),
                        selected: isSelected,
                        onSelected: (_) => setState(() {
                          _selectedSound = sound;
                          _attempts.clear();
                        }),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Practice area
            if (_selectedSound != null)
              Expanded(
                child: _PracticeArea(
                  targetSound: _selectedSound!,
                  learnerId: widget.learnerId,
                  attempts: _attempts,
                  onAttemptAdded: (attempt) {
                    setState(() => _attempts.add(attempt));
                  },
                ),
              ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Text('Error loading sounds: $error'),
      ),
    );
  }
}

class _PracticeArea extends ConsumerStatefulWidget {
  const _PracticeArea({
    required this.targetSound,
    required this.learnerId,
    required this.attempts,
    required this.onAttemptAdded,
  });

  final TargetSound targetSound;
  final String learnerId;
  final List<ArticulationAttempt> attempts;
  final void Function(ArticulationAttempt) onAttemptAdded;

  @override
  ConsumerState<_PracticeArea> createState() => _PracticeAreaState();
}

class _PracticeAreaState extends ConsumerState<_PracticeArea> {
  int _currentWordIndex = 0;
  bool _isRecording = false;

  @override
  Widget build(BuildContext context) {
    final wordsAsync = ref.watch(practiceWordsProvider(widget.targetSound.sound));
    final theme = Theme.of(context);

    return wordsAsync.when(
      data: (words) {
        if (words.isEmpty) {
          return const Center(child: Text('No practice words available'));
        }

        final currentWord = words[_currentWordIndex];

        return Column(
          children: [
            // Progress
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Word ${_currentWordIndex + 1} of ${words.length}',
                        style: theme.textTheme.titleMedium,
                      ),
                      Text(
                        '${widget.attempts.length} attempts',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: (_currentWordIndex + 1) / words.length,
                  ),
                ],
              ),
            ),

            // Sound info
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    'Target Sound: ${widget.targetSound.sound.toUpperCase()}',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  if (widget.targetSound.description != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      widget.targetSound.description!,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Word display
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (currentWord.imageUrl != null)
                      Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Center(
                          child: Icon(Icons.image, size: 64),
                        ),
                      ),
                    const SizedBox(height: 24),
                    Text(
                      currentWord.word,
                      style: theme.textTheme.displayMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    if (currentWord.phonetic != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        currentWord.phonetic!,
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Position: ${_getPositionLabel(currentWord.position)}',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.onSecondaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Controls
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            // Play model audio
                          },
                          icon: const Icon(Icons.volume_up),
                          label: const Text('Listen'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isRecording ? null : _startRecording,
                          icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                          label: Text(_isRecording ? 'Recording...' : 'Record'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isRecording ? theme.colorScheme.error : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton.icon(
                          onPressed: _currentWordIndex > 0 ? _previousWord : null,
                          icon: const Icon(Icons.arrow_back),
                          label: const Text('Previous'),
                        ),
                      ),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed:
                              _currentWordIndex < words.length - 1 ? _nextWord : _completeSession,
                          icon: Icon(
                              _currentWordIndex < words.length - 1 ? Icons.arrow_forward : Icons.check),
                          label: Text(_currentWordIndex < words.length - 1 ? 'Next' : 'Finish'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
    );
  }

  String _getPositionLabel(WordPosition position) {
    switch (position) {
      case WordPosition.initial:
        return 'Beginning';
      case WordPosition.medial:
        return 'Middle';
      case WordPosition.final_:
        return 'End';
    }
  }

  void _startRecording() {
    setState(() => _isRecording = true);

    // Simulate recording for 2 seconds
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _isRecording = false);

        // Simulate assessment (in real app, would analyze audio)
        final wordsAsync = ref.read(practiceWordsProvider(widget.targetSound.sound));
        wordsAsync.whenData((words) {
          final currentWord = words[_currentWordIndex];
          final attempt = ArticulationAttempt(
            word: currentWord.word,
            position: currentWord.position,
            correct: true, // Simulated
            confidence: 0.85, // Simulated
          );
          widget.onAttemptAdded(attempt);

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Great job! 👏'),
              duration: Duration(seconds: 1),
            ),
          );
        });
      }
    });
  }

  void _previousWord() {
    setState(() => _currentWordIndex--);
  }

  void _nextWord() {
    setState(() => _currentWordIndex++);
  }

  void _completeSession() async {
    if (widget.attempts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please practice at least one word')),
      );
      return;
    }

    try {
      final assessment = await ref.read(speechTherapyServiceProvider).submitArticulationAssessment(
            widget.learnerId,
            widget.targetSound.sound,
            widget.attempts,
          );

      if (!mounted) return;

      // Show results
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Session Complete!'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Overall Accuracy: ${(assessment.overallAccuracy * 100).toStringAsFixed(1)}%'),
              const SizedBox(height: 16),
              if (assessment.strengths.isNotEmpty) ...[
                const Text('Strengths:', style: TextStyle(fontWeight: FontWeight.bold)),
                ...assessment.strengths.map((s) => Text('• $s')),
                const SizedBox(height: 12),
              ],
              if (assessment.areasForImprovement.isNotEmpty) ...[
                const Text('Keep practicing:', style: TextStyle(fontWeight: FontWeight.bold)),
                ...assessment.areasForImprovement.map((a) => Text('• $a')),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      );

      setState(() {
        _currentWordIndex = 0;
        widget.attempts.clear();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error submitting assessment: $e')),
      );
    }
  }
}
