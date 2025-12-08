import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../baseline/baseline_controller.dart';

/// Screen displaying baseline assessment questions.
/// Shows one question at a time with progress indicator and domain chip.
class BaselineQuestionScreen extends ConsumerStatefulWidget {
  const BaselineQuestionScreen({super.key});

  @override
  ConsumerState<BaselineQuestionScreen> createState() => _BaselineQuestionScreenState();
}

class _BaselineQuestionScreenState extends ConsumerState<BaselineQuestionScreen> {
  int? _selectedOption;
  final _textController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Load the first/next question
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(learnerBaselineControllerProvider);
      if (state.currentItem == null && !state.isLoading) {
        ref.read(learnerBaselineControllerProvider.notifier).loadNextItem();
      }
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _resetAnswerState() {
    setState(() {
      _selectedOption = null;
      _textController.clear();
    });
  }

  Future<void> _submitAndNext() async {
    final state = ref.read(learnerBaselineControllerProvider);
    final item = state.currentItem;
    if (item == null) return;

    // Build the response
    dynamic response;
    if (item.isMultipleChoice) {
      if (_selectedOption == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select an answer')),
        );
        return;
      }
      response = {'selectedOption': _selectedOption};
    } else {
      final text = _textController.text.trim();
      if (text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter your answer')),
        );
        return;
      }
      response = {'openResponse': text};
    }

    setState(() => _isSubmitting = true);

    final controller = ref.read(learnerBaselineControllerProvider.notifier);
    final success = await controller.submitAnswer(response);

    if (success) {
      _resetAnswerState();
      await controller.loadNextItem();

      // Check if completed
      final newState = ref.read(learnerBaselineControllerProvider);
      if (newState.isComplete && mounted) {
        context.go('/baseline/complete');
      }
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
    }
  }

  void _takeBreak() {
    ref.read(learnerBaselineControllerProvider.notifier).takeBreak();
    context.push('/baseline/break');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(learnerBaselineControllerProvider);
    final item = state.currentItem;

    // Check if on break (handled by navigation)
    if (state.isOnBreak) {
      return const SizedBox.shrink();
    }

    // Loading state
    if (state.isLoading && item == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Loading your question...',
                style: theme.textTheme.bodyLarge,
              ),
            ],
          ),
        ),
      );
    }

    // Error state
    if (state.error != null && item == null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Oops! Something went wrong',
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  state.error!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () {
                    ref.read(learnerBaselineControllerProvider.notifier).clearError();
                    ref.read(learnerBaselineControllerProvider.notifier).loadNextItem();
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try Again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (item == null) {
      return const Scaffold(
        body: Center(child: Text('No question available')),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Progress header
            _ProgressHeader(
              currentQuestion: state.currentQuestion,
              totalQuestions: state.totalQuestions,
              progress: state.progress,
              domain: item.domain,
              onBreak: _takeBreak,
            ),

            // Question content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Question text
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(
                          item.questionText,
                          style: theme.textTheme.titleLarge?.copyWith(
                            height: 1.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Answer options
                    if (item.isMultipleChoice && item.options != null)
                      ...item.options!.asMap().entries.map((entry) {
                        final index = entry.key;
                        final option = entry.value;
                        final isSelected = _selectedOption == index;

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _AnswerOption(
                            label: String.fromCharCode(65 + index), // A, B, C, D
                            text: option,
                            isSelected: isSelected,
                            onTap: _isSubmitting
                                ? null
                                : () => setState(() => _selectedOption = index),
                          ),
                        );
                      }),

                    // Open-ended text input
                    if (item.isOpenEnded)
                      TextField(
                        controller: _textController,
                        decoration: InputDecoration(
                          hintText: 'Type your answer here...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                        ),
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        enabled: !_isSubmitting,
                      ),

                    const SizedBox(height: 32),

                    // Error message
                    if (state.error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Card(
                          color: theme.colorScheme.errorContainer,
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  color: theme.colorScheme.onErrorContainer,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    state.error!,
                                    style: TextStyle(
                                      color: theme.colorScheme.onErrorContainer,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                    // Submit button
                    FilledButton(
                      onPressed: _isSubmitting || state.isLoading ? null : _submitAndNext,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(double.infinity, 64),
                        textStyle: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      child: _isSubmitting || state.isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              state.currentQuestion >= state.totalQuestions
                                  ? 'Finish!'
                                  : 'Next Question',
                            ),
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
}

class _ProgressHeader extends StatelessWidget {
  const _ProgressHeader({
    required this.currentQuestion,
    required this.totalQuestions,
    required this.progress,
    required this.domain,
    required this.onBreak,
  });

  final int currentQuestion;
  final int totalQuestions;
  final double progress;
  final BaselineDomain domain;
  final VoidCallback onBreak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Domain chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _domainColor(domain).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _domainIcon(domain),
                      size: 16,
                      color: _domainColor(domain),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      domain.label,
                      style: TextStyle(
                        color: _domainColor(domain),
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Question counter
              Text(
                '$currentQuestion of $totalQuestions',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(width: 12),

              // Break button
              IconButton(
                onPressed: onBreak,
                icon: const Icon(Icons.pause_circle_outline),
                tooltip: 'Take a break',
                style: IconButton.styleFrom(
                  minimumSize: const Size(48, 48),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(theme.colorScheme.primary),
            ),
          ),
        ],
      ),
    );
  }

  Color _domainColor(BaselineDomain domain) {
    switch (domain) {
      case BaselineDomain.ela:
        return Colors.blue;
      case BaselineDomain.math:
        return Colors.green;
      case BaselineDomain.science:
        return Colors.purple;
      case BaselineDomain.speech:
        return Colors.orange;
      case BaselineDomain.sel:
        return Colors.pink;
    }
  }

  IconData _domainIcon(BaselineDomain domain) {
    switch (domain) {
      case BaselineDomain.ela:
        return Icons.menu_book;
      case BaselineDomain.math:
        return Icons.calculate;
      case BaselineDomain.science:
        return Icons.science;
      case BaselineDomain.speech:
        return Icons.record_voice_over;
      case BaselineDomain.sel:
        return Icons.favorite;
    }
  }
}

class _AnswerOption extends StatelessWidget {
  const _AnswerOption({
    required this.label,
    required this.text,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final String text;
  final bool isSelected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: isSelected
          ? theme.colorScheme.primaryContainer
          : theme.colorScheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.outlineVariant,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              // Letter circle
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.surfaceContainerHighest,
                ),
                child: Center(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? theme.colorScheme.onPrimary
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Option text
              Expanded(
                child: Text(
                  text,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ),

              // Check icon
              if (isSelected)
                Icon(
                  Icons.check_circle,
                  color: theme.colorScheme.primary,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
