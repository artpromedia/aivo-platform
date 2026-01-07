import 'package:flutter/material.dart';

import '../providers/lesson_player_provider.dart';

/// Result from completing a lesson block.
class BlockCompletionResult {
  const BlockCompletionResult({
    required this.isCorrect,
    required this.xpEarned,
    required this.shouldAdvance,
  });

  final bool isCorrect;
  final int xpEarned;
  final bool shouldAdvance;
}

/// Widget that renders a single lesson block.
class LessonBlockWidget extends StatelessWidget {
  const LessonBlockWidget({
    super.key,
    required this.block,
    required this.isActive,
    required this.onComplete,
  });

  final LessonBlock block;
  final bool isActive;
  final void Function(BlockCompletionResult) onComplete;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: isActive ? 1.0 : 0.5,
      duration: const Duration(milliseconds: 200),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _buildBlockContent(context),
      ),
    );
  }

  Widget _buildBlockContent(BuildContext context) {
    switch (block.type) {
      case LessonBlockType.instruction:
        return _InstructionBlock(
          content: block.content,
          onContinue: () => onComplete(const BlockCompletionResult(
            isCorrect: true,
            xpEarned: 0,
            shouldAdvance: true,
          )),
        );
      case LessonBlockType.video:
        return _VideoBlock(
          content: block.content,
          onComplete: () => onComplete(const BlockCompletionResult(
            isCorrect: true,
            xpEarned: 5,
            shouldAdvance: true,
          )),
        );
      case LessonBlockType.question:
        return _QuestionBlock(
          content: block.content,
          onAnswer: (correct) => onComplete(BlockCompletionResult(
            isCorrect: correct,
            xpEarned: correct ? 10 : 0,
            shouldAdvance: correct,
          )),
        );
      case LessonBlockType.exercise:
        return _ExerciseBlock(
          content: block.content,
          onComplete: (score) => onComplete(BlockCompletionResult(
            isCorrect: score >= 0.7,
            xpEarned: (score * 20).round(),
            shouldAdvance: true,
          )),
        );
      case LessonBlockType.reflection:
        return _ReflectionBlock(
          content: block.content,
          onSubmit: () => onComplete(const BlockCompletionResult(
            isCorrect: true,
            xpEarned: 5,
            shouldAdvance: true,
          )),
        );
      case LessonBlockType.summary:
        return _SummaryBlock(
          content: block.content,
          onContinue: () => onComplete(const BlockCompletionResult(
            isCorrect: true,
            xpEarned: 0,
            shouldAdvance: true,
          )),
        );
    }
  }
}

class _InstructionBlock extends StatelessWidget {
  const _InstructionBlock({
    required this.content,
    required this.onContinue,
  });

  final Map<String, dynamic> content;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = content['text'] as String? ?? '';

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.info_outline,
          size: 64,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 24),
        Text(
          text,
          style: theme.textTheme.headlineSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: onContinue,
          child: const Text('Got it!'),
        ),
      ],
    );
  }
}

class _VideoBlock extends StatelessWidget {
  const _VideoBlock({
    required this.content,
    required this.onComplete,
  });

  final Map<String, dynamic> content;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: double.infinity,
          height: 200,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Center(
            child: Icon(Icons.play_circle_outline, size: 64),
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: onComplete,
          child: const Text('Video Watched'),
        ),
      ],
    );
  }
}

class _QuestionBlock extends StatefulWidget {
  const _QuestionBlock({
    required this.content,
    required this.onAnswer,
  });

  final Map<String, dynamic> content;
  final void Function(bool correct) onAnswer;

  @override
  State<_QuestionBlock> createState() => _QuestionBlockState();
}

class _QuestionBlockState extends State<_QuestionBlock> {
  final _controller = TextEditingController();
  bool? _isCorrect;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _checkAnswer() {
    final correctAnswer = widget.content['answer'] as String? ?? '';
    final userAnswer = _controller.text.trim().toLowerCase();
    final correct = userAnswer == correctAnswer.toLowerCase();

    setState(() {
      _isCorrect = correct;
    });

    widget.onAnswer(correct);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final question = widget.content['question'] as String? ?? '';

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          question,
          style: theme.textTheme.headlineSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            hintText: 'Your answer',
            border: const OutlineInputBorder(),
            suffixIcon: _isCorrect != null
                ? Icon(
                    _isCorrect! ? Icons.check_circle : Icons.cancel,
                    color: _isCorrect! ? Colors.green : Colors.red,
                  )
                : null,
          ),
          textAlign: TextAlign.center,
          onSubmitted: (_) => _checkAnswer(),
        ),
        const SizedBox(height: 16),
        if (_isCorrect == null)
          ElevatedButton(
            onPressed: _checkAnswer,
            child: const Text('Check'),
          ),
      ],
    );
  }
}

class _ExerciseBlock extends StatelessWidget {
  const _ExerciseBlock({
    required this.content,
    required this.onComplete,
  });

  final Map<String, dynamic> content;
  final void Function(double score) onComplete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.fitness_center,
          size: 64,
          color: theme.colorScheme.secondary,
        ),
        const SizedBox(height: 24),
        Text(
          'Practice Exercise',
          style: theme.textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        Text(
          'Complete the interactive exercise',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: () => onComplete(0.85), // Mock score
          child: const Text('Complete Exercise'),
        ),
      ],
    );
  }
}

class _ReflectionBlock extends StatelessWidget {
  const _ReflectionBlock({
    required this.content,
    required this.onSubmit,
  });

  final Map<String, dynamic> content;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.psychology,
          size: 64,
          color: theme.colorScheme.tertiary,
        ),
        const SizedBox(height: 24),
        Text(
          'Reflection',
          style: theme.textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        const TextField(
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'What did you learn?',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: onSubmit,
          child: const Text('Submit'),
        ),
      ],
    );
  }
}

class _SummaryBlock extends StatelessWidget {
  const _SummaryBlock({
    required this.content,
    required this.onContinue,
  });

  final Map<String, dynamic> content;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = content['text'] as String? ?? '';

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.celebration,
          size: 64,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 24),
        Text(
          text,
          style: theme.textTheme.headlineSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: onContinue,
          child: const Text('Finish'),
        ),
      ],
    );
  }
}
