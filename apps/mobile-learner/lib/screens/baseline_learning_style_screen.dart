import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../baseline/baseline_controller.dart';

// ---------------------------------------------------------------------------
// Learning-style question model
// ---------------------------------------------------------------------------

/// The type of interaction for a learning-style question.
enum LearningStyleQuestionType { choice, multiSelect, emojiScale }

/// A single learning-style question.
class LearningStyleQuestion {
  const LearningStyleQuestion({
    required this.id,
    required this.questionText,
    required this.type,
    required this.options,
    this.emoji,
  });

  final String id;
  final String questionText;
  final LearningStyleQuestionType type;

  /// Each option is `{ 'value': String, 'label': String, 'emoji': String? }`.
  final List<Map<String, String>> options;

  /// Optional header emoji shown above the question text.
  final String? emoji;
}

/// The full set of 7 learning-style questions (mirrors the web assessment).
const List<LearningStyleQuestion> kLearningStyleQuestions = [
  LearningStyleQuestion(
    id: 'ls-1',
    questionText: 'When learning something new, I like to…',
    type: LearningStyleQuestionType.choice,
    emoji: '📚',
    options: [
      {'value': 'watch', 'label': 'Watch someone do it', 'emoji': '👀'},
      {'value': 'listen', 'label': 'Listen to someone explain', 'emoji': '👂'},
      {'value': 'read', 'label': 'Read about it', 'emoji': '📖'},
      {'value': 'hands_on', 'label': 'Try it myself', 'emoji': '✋'},
    ],
  ),
  LearningStyleQuestion(
    id: 'ls-2',
    questionText: 'I remember things best when…',
    type: LearningStyleQuestionType.choice,
    emoji: '🧠',
    options: [
      {'value': 'pictures', 'label': 'I see pictures or videos', 'emoji': '🖼️'},
      {'value': 'songs', 'label': 'I hear songs or rhymes', 'emoji': '🎵'},
      {'value': 'write', 'label': 'I write them down', 'emoji': '✏️'},
      {'value': 'move', 'label': 'I move around or use my hands', 'emoji': '🤸'},
    ],
  ),
  LearningStyleQuestion(
    id: 'int-1',
    questionText: 'What subjects do you like?',
    type: LearningStyleQuestionType.multiSelect,
    emoji: '⭐',
    options: [
      {'value': 'math', 'label': 'Math', 'emoji': '🔢'},
      {'value': 'reading', 'label': 'Reading', 'emoji': '📚'},
      {'value': 'science', 'label': 'Science', 'emoji': '🔬'},
      {'value': 'art', 'label': 'Art', 'emoji': '🎨'},
      {'value': 'music', 'label': 'Music', 'emoji': '🎶'},
      {'value': 'pe', 'label': 'PE / Sports', 'emoji': '⚽'},
      {'value': 'games', 'label': 'Games', 'emoji': '🎮'},
    ],
  ),
  LearningStyleQuestion(
    id: 'str-1',
    questionText: 'I feel really good at…',
    type: LearningStyleQuestionType.multiSelect,
    emoji: '💪',
    options: [
      {'value': 'puzzles', 'label': 'Solving puzzles', 'emoji': '🧩'},
      {'value': 'creative', 'label': 'Being creative', 'emoji': '🎨'},
      {'value': 'helping', 'label': 'Helping others', 'emoji': '🤝'},
      {'value': 'building', 'label': 'Building things', 'emoji': '🏗️'},
      {'value': 'stories', 'label': 'Telling stories', 'emoji': '📖'},
      {'value': 'sports', 'label': 'Sports & moving', 'emoji': '🏃'},
    ],
  ),
  LearningStyleQuestion(
    id: 'ch-1',
    questionText: 'Sometimes I find it hard to…',
    type: LearningStyleQuestionType.multiSelect,
    emoji: '🤔',
    options: [
      {'value': 'focus', 'label': 'Stay focused', 'emoji': '🎯'},
      {'value': 'reading', 'label': 'Read long texts', 'emoji': '📝'},
      {'value': 'math', 'label': 'Do math problems', 'emoji': '➗'},
      {'value': 'writing', 'label': 'Write things down', 'emoji': '✍️'},
      {'value': 'sitting', 'label': 'Sit still', 'emoji': '🪑'},
      {'value': 'none', 'label': 'None of these!', 'emoji': '😊'},
    ],
  ),
  LearningStyleQuestion(
    id: 'pref-1',
    questionText: 'How do you feel about taking breaks?',
    type: LearningStyleQuestionType.emojiScale,
    emoji: '☕',
    options: [
      {'value': 'love', 'label': 'Love them!', 'emoji': '😍'},
      {'value': 'like', 'label': 'They\'re nice', 'emoji': '😊'},
      {'value': 'okay', 'label': 'They\'re okay', 'emoji': '😐'},
      {'value': 'rather_keep_going', 'label': 'Rather keep going', 'emoji': '🚀'},
    ],
  ),
  LearningStyleQuestion(
    id: 'pref-2',
    questionText: 'When do you feel most ready to learn?',
    type: LearningStyleQuestionType.choice,
    emoji: '⏰',
    options: [
      {'value': 'morning', 'label': 'Morning', 'emoji': '🌅'},
      {'value': 'afternoon', 'label': 'Afternoon', 'emoji': '☀️'},
      {'value': 'evening', 'label': 'Evening', 'emoji': '🌙'},
      {'value': 'anytime', 'label': 'Anytime!', 'emoji': '✨'},
    ],
  ),
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/// Displays 7 sequential learning-style questions before domain questions.
class BaselineLearningStyleScreen extends ConsumerStatefulWidget {
  const BaselineLearningStyleScreen({super.key});

  @override
  ConsumerState<BaselineLearningStyleScreen> createState() =>
      _BaselineLearningStyleScreenState();
}

class _BaselineLearningStyleScreenState
    extends ConsumerState<BaselineLearningStyleScreen> {
  int _currentIndex = 0;

  /// For single-select / emoji-scale questions.
  String? _selectedValue;

  /// For multi-select questions.
  final Set<String> _selectedValues = {};

  /// Brief delay before auto-advancing on single-select.
  Timer? _autoAdvanceTimer;

  LearningStyleQuestion get _question =>
      kLearningStyleQuestions[_currentIndex];

  bool get _isLast => _currentIndex == kLearningStyleQuestions.length - 1;

  // ─── lifecycle ──────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _restoreAnswer();
  }

  @override
  void dispose() {
    _autoAdvanceTimer?.cancel();
    super.dispose();
  }

  // ─── answer persistence ─────────────────────────────────────────────

  /// Restore a previously-saved answer when navigating back.
  void _restoreAnswer() {
    final saved = ref
        .read(learnerBaselineControllerProvider)
        .learningStyleAnswers[_question.id];
    if (saved == null) return;

    if (_question.type == LearningStyleQuestionType.multiSelect) {
      _selectedValues
        ..clear()
        ..addAll((saved as List).cast<String>());
    } else {
      _selectedValue = saved as String;
    }
  }

  void _saveAnswer() {
    final controller =
        ref.read(learnerBaselineControllerProvider.notifier);
    if (_question.type == LearningStyleQuestionType.multiSelect) {
      controller.setLearningStyleAnswer(
          _question.id, _selectedValues.toList());
    } else {
      controller.setLearningStyleAnswer(_question.id, _selectedValue);
    }
  }

  // ─── navigation ─────────────────────────────────────────────────────

  void _advance() {
    _saveAnswer();

    if (_isLast) {
      ref.read(learnerBaselineControllerProvider.notifier).completeLearningStyle();
      context.go('/baseline/question');
    } else {
      setState(() {
        _currentIndex++;
        _selectedValue = null;
        _selectedValues.clear();
        _restoreAnswer();
      });
    }
  }

  void _goBack() {
    if (_currentIndex > 0) {
      _saveAnswer();
      setState(() {
        _currentIndex--;
        _selectedValue = null;
        _selectedValues.clear();
        _restoreAnswer();
      });
    } else {
      context.go('/baseline/intro');
    }
  }

  // ─── selection handlers ─────────────────────────────────────────────

  void _onSingleSelect(String value) {
    setState(() => _selectedValue = value);
    _autoAdvanceTimer?.cancel();
    _autoAdvanceTimer = Timer(const Duration(milliseconds: 300), _advance);
  }

  void _onMultiToggle(String value) {
    setState(() {
      if (_selectedValues.contains(value)) {
        _selectedValues.remove(value);
      } else {
        _selectedValues.add(value);
      }
    });
  }

  // ─── build ──────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalQuestions = kLearningStyleQuestions.length;
    final progress = (_currentIndex + 1) / totalQuestions;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // ── Progress header ──
            _LearningStyleHeader(
              current: _currentIndex + 1,
              total: totalQuestions,
              progress: progress,
              onBack: _goBack,
            ),

            // ── Question body ──
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Emoji + question text
                    if (_question.emoji != null) ...[
                      Center(
                        child: Text(
                          _question.emoji!,
                          style: const TextStyle(fontSize: 48),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Text(
                      _question.questionText,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),

                    // Options
                    ..._buildOptions(theme),

                    const SizedBox(height: 24),

                    // Continue button (multi-select only)
                    if (_question.type ==
                        LearningStyleQuestionType.multiSelect)
                      FilledButton(
                        onPressed:
                            _selectedValues.isNotEmpty ? _advance : null,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(double.infinity, 56),
                          textStyle: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        child: Text(_isLast ? 'Start Questions' : 'Continue'),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildOptions(ThemeData theme) {
    switch (_question.type) {
      case LearningStyleQuestionType.choice:
        return _question.options.map((opt) {
          final value = opt['value']!;
          final isSelected = _selectedValue == value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _OptionCard(
              emoji: opt['emoji'],
              label: opt['label']!,
              isSelected: isSelected,
              onTap: () => _onSingleSelect(value),
            ),
          );
        }).toList();

      case LearningStyleQuestionType.multiSelect:
        return _question.options.map((opt) {
          final value = opt['value']!;
          final isSelected = _selectedValues.contains(value);
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _OptionCard(
              emoji: opt['emoji'],
              label: opt['label']!,
              isSelected: isSelected,
              showCheck: true,
              onTap: () => _onMultiToggle(value),
            ),
          );
        }).toList();

      case LearningStyleQuestionType.emojiScale:
        // Render as a horizontal row of large emoji buttons.
        return [
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 12,
            runSpacing: 12,
            children: _question.options.map((opt) {
              final value = opt['value']!;
              final isSelected = _selectedValue == value;
              return _EmojiScaleButton(
                emoji: opt['emoji']!,
                label: opt['label']!,
                isSelected: isSelected,
                onTap: () => _onSingleSelect(value),
              );
            }).toList(),
          ),
        ];
    }
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

/// Compact progress header for the learning-style phase.
class _LearningStyleHeader extends StatelessWidget {
  const _LearningStyleHeader({
    required this.current,
    required this.total,
    required this.progress,
    required this.onBack,
  });

  final int current;
  final int total;
  final double progress;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back),
                tooltip: 'Back',
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.tertiaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.psychology_outlined,
                      size: 16,
                      color: theme.colorScheme.onTertiaryContainer,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Learning Style',
                      style: TextStyle(
                        color: theme.colorScheme.onTertiaryContainer,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                '$current of $total',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 12),
            ],
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                valueColor:
                    AlwaysStoppedAnimation<Color>(theme.colorScheme.tertiary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A tappable card for choice / multi-select options.
class _OptionCard extends StatelessWidget {
  const _OptionCard({
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.emoji,
    this.showCheck = false,
  });

  final String? emoji;
  final String label;
  final bool isSelected;
  final bool showCheck;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: isSelected
          ? theme.colorScheme.primaryContainer
          : theme.colorScheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.outlineVariant,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              if (emoji != null) ...[
                Text(emoji!, style: const TextStyle(fontSize: 28)),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight:
                        isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ),
              if (showCheck)
                Icon(
                  isSelected
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: isSelected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.outline,
                ),
              if (!showCheck && isSelected)
                Icon(Icons.check_circle, color: theme.colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }
}

/// A large emoji button used for the emoji-scale question type.
class _EmojiScaleButton extends StatelessWidget {
  const _EmojiScaleButton({
    required this.emoji,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 80,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primaryContainer
              : theme.colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? theme.colorScheme.primary
                : theme.colorScheme.outlineVariant,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 32)),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected
                    ? theme.colorScheme.onPrimaryContainer
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
