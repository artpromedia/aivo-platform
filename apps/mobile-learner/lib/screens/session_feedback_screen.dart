/// Session Feedback Screen
///
/// End-of-session feedback collection (Easy/OK/Hard + optional emoji/voice).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

/// Difficulty rating.
enum DifficultyRating {
  easy('Easy', '😊', Colors.green),
  ok('Just Right', '🙂', Colors.blue),
  hard('Hard', '😓', Colors.orange);

  const DifficultyRating(this.label, this.emoji, this.color);

  final String label;
  final String emoji;
  final Color color;
}

/// Feedback state.
class SessionFeedbackState {
  const SessionFeedbackState({
    this.difficulty,
    this.emoji,
    this.voiceNote,
    this.textComment,
    this.isSubmitting = false,
    this.isComplete = false,
  });

  final DifficultyRating? difficulty;
  final String? emoji;
  final String? voiceNote; // Path to voice recording
  final String? textComment;
  final bool isSubmitting;
  final bool isComplete;

  SessionFeedbackState copyWith({
    DifficultyRating? difficulty,
    String? emoji,
    String? voiceNote,
    String? textComment,
    bool? isSubmitting,
    bool? isComplete,
  }) {
    return SessionFeedbackState(
      difficulty: difficulty ?? this.difficulty,
      emoji: emoji ?? this.emoji,
      voiceNote: voiceNote ?? this.voiceNote,
      textComment: textComment ?? this.textComment,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isComplete: isComplete ?? this.isComplete,
    );
  }
}

class SessionFeedbackNotifier extends StateNotifier<SessionFeedbackState> {
  SessionFeedbackNotifier() : super(const SessionFeedbackState());

  void setDifficulty(DifficultyRating rating) {
    state = state.copyWith(difficulty: rating);
  }

  void setEmoji(String emoji) {
    state = state.copyWith(emoji: emoji);
  }

  void setTextComment(String comment) {
    state = state.copyWith(textComment: comment);
  }

  Future<bool> submit(String sessionId) async {
    if (state.difficulty == null) return false;

    state = state.copyWith(isSubmitting: true);

    try {
      final apiClient = AivoApiClient.instance;
      await apiClient.post(
        '${ApiEndpoints.session(sessionId)}/feedback',
        data: {
          'difficulty': state.difficulty!.name,
          if (state.emoji != null) 'emoji': state.emoji,
          if (state.textComment != null) 'comment': state.textComment,
        },
      );

      state = state.copyWith(isSubmitting: false, isComplete: true);
      return true;
    } catch (_) {
      state = state.copyWith(isSubmitting: false);
      return false;
    }
  }

  void reset() {
    state = const SessionFeedbackState();
  }
}

final sessionFeedbackProvider =
    StateNotifierProvider<SessionFeedbackNotifier, SessionFeedbackState>((ref) {
  return SessionFeedbackNotifier();
});

class SessionFeedbackScreen extends ConsumerStatefulWidget {
  const SessionFeedbackScreen({
    super.key,
    required this.sessionId,
  });

  final String sessionId;

  @override
  ConsumerState<SessionFeedbackScreen> createState() => _SessionFeedbackScreenState();
}

class _SessionFeedbackScreenState extends ConsumerState<SessionFeedbackScreen> {
  final _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionFeedbackProvider.notifier).reset();
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(sessionFeedbackProvider);

    if (state.isComplete) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.thumb_up,
                  size: 80,
                  color: Colors.green,
                ),
                const SizedBox(height: 24),
                Text(
                  'Thanks for your feedback!',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Your feedback helps us make learning better for you.',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                FilledButton(
                  onPressed: () => context.go('/plan'),
                  child: const Text('Continue'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('How did it go?'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'How hard was today\'s activity?',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Difficulty buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: DifficultyRating.values.map((rating) {
                  final isSelected = state.difficulty == rating;
                  return _DifficultyButton(
                    rating: rating,
                    isSelected: isSelected,
                    onTap: () => ref
                        .read(sessionFeedbackProvider.notifier)
                        .setDifficulty(rating),
                  );
                }).toList(),
              ),

              const SizedBox(height: 40),

              // Emoji reaction
              Text(
                'How do you feel?',
                style: theme.textTheme.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              _EmojiSelector(
                selectedEmoji: state.emoji,
                onSelect: (emoji) => ref
                    .read(sessionFeedbackProvider.notifier)
                    .setEmoji(emoji),
              ),

              const SizedBox(height: 32),

              // Optional comment
              TextField(
                controller: _commentController,
                decoration: InputDecoration(
                  labelText: 'Want to tell us more? (optional)',
                  hintText: 'What was fun? What was tricky?',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                maxLines: 3,
                onChanged: (value) => ref
                    .read(sessionFeedbackProvider.notifier)
                    .setTextComment(value),
              ),

              const Spacer(),

              // Submit button
              FilledButton(
                onPressed: state.difficulty != null && !state.isSubmitting
                    ? () async {
                        final success = await ref
                            .read(sessionFeedbackProvider.notifier)
                            .submit(widget.sessionId);
                        if (!success && mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Failed to submit. Please try again.'),
                            ),
                          );
                        }
                      }
                    : null,
                child: state.isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Submit'),
              ),

              const SizedBox(height: 12),

              // Skip button
              TextButton(
                onPressed: () => context.go('/plan'),
                child: const Text('Skip for now'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DifficultyButton extends StatelessWidget {
  const _DifficultyButton({
    required this.rating,
    required this.isSelected,
    required this.onTap,
  });

  final DifficultyRating rating;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: isSelected ? rating.color.withOpacity(0.2) : null,
          border: Border.all(
            color: isSelected ? rating.color : Colors.grey.shade300,
            width: isSelected ? 3 : 1,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Text(
              rating.emoji,
              style: const TextStyle(fontSize: 40),
            ),
            const SizedBox(height: 8),
            Text(
              rating.label,
              style: theme.textTheme.labelLarge?.copyWith(
                color: isSelected ? rating.color : null,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmojiSelector extends StatelessWidget {
  const _EmojiSelector({
    required this.selectedEmoji,
    required this.onSelect,
  });

  final String? selectedEmoji;
  final void Function(String) onSelect;

  static const _emojis = ['😊', '😄', '🤔', '😮', '😴', '🎉', '💪', '🌟'];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 12,
      runSpacing: 12,
      children: _emojis.map((emoji) {
        final isSelected = selectedEmoji == emoji;
        return GestureDetector(
          onTap: () => onSelect(emoji),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected
                  ? Theme.of(context).colorScheme.primaryContainer
                  : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: isSelected
                  ? Border.all(
                      color: Theme.of(context).colorScheme.primary,
                      width: 2,
                    )
                  : null,
            ),
            child: Text(
              emoji,
              style: TextStyle(fontSize: isSelected ? 32 : 28),
            ),
          ),
        );
      }).toList(),
    );
  }
}
