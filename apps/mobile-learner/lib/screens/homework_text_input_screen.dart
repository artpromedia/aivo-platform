import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../homework/homework_controller.dart';
import '../homework/homework_service.dart';

/// Screen for entering/pasting homework problem text.
/// Includes subject selection and validation before starting the helper.
class HomeworkTextInputScreen extends ConsumerStatefulWidget {
  const HomeworkTextInputScreen({super.key, required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<HomeworkTextInputScreen> createState() => _HomeworkTextInputScreenState();
}

class _HomeworkTextInputScreenState extends ConsumerState<HomeworkTextInputScreen> {
  final _textController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  HomeworkSubject _selectedSubject = HomeworkSubject.math;
  bool _isStarting = false;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _startHelper() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isStarting = true);

    // Set grade band on controller
    final gradeBand = ref.read(gradeThemeControllerProvider);
    final controller = ref.read(homeworkControllerProvider(widget.learnerId).notifier);
    controller.setGradeBand(gradeBand);

    final success = await controller.startHomework(
      problemText: _textController.text.trim(),
      subject: _selectedSubject,
    );

    if (!mounted) return;
    setState(() => _isStarting = false);

    if (success) {
      context.go('/homework/steps', extra: widget.learnerId);
    } else {
      final state = ref.read(homeworkControllerProvider(widget.learnerId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(state.error ?? 'Failed to start homework helper'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = ref.watch(gradeThemeControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Enter Your Question'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Subject selector
              Text(
                'What subject is this for?',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _buildSubjectChips(theme),

              const SizedBox(height: 24),

              // Problem text input
              Text(
                'Type or paste your question:',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _buildTextInput(theme, gradeBand),

              const SizedBox(height: 12),

              // Helper text
              Text(
                _helperTextForGrade(gradeBand),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: 32),

              // Start button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: _isStarting ? null : _startHelper,
                  child: _isStarting
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation(
                              theme.colorScheme.onPrimary,
                            ),
                          ),
                        )
                      : const Text('Start Helper'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubjectChips(ThemeData theme) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: HomeworkSubject.values.map((subject) {
        final isSelected = _selectedSubject == subject;
        return ChoiceChip(
          label: Text(subject.displayName),
          selected: isSelected,
          onSelected: (_) => setState(() => _selectedSubject = subject),
          avatar: isSelected ? const Icon(Icons.check, size: 18) : null,
        );
      }).toList(),
    );
  }

  Widget _buildTextInput(ThemeData theme, AivoGradeBand gradeBand) {
    final minLines = switch (gradeBand) {
      AivoGradeBand.k5 => 4,
      AivoGradeBand.g6_8 => 5,
      AivoGradeBand.g9_12 => 6,
    };

    return TextFormField(
      controller: _textController,
      maxLines: null,
      minLines: minLines,
      textInputAction: TextInputAction.newline,
      keyboardType: TextInputType.multiline,
      decoration: InputDecoration(
        hintText: _hintTextForGrade(gradeBand),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: theme.colorScheme.surfaceContainerLowest,
      ),
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Please enter your homework question';
        }
        if (value.trim().length < 10) {
          return 'Please provide more detail about your question';
        }
        return null;
      },
    );
  }

  String _hintTextForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Write your question here...\n\nExample: "I have 5 apples and my friend gives me 3 more. How many apples do I have now?"',
      AivoGradeBand.g6_8 => 'Paste or type your homework question...\n\nInclude all the information given in the problem.',
      AivoGradeBand.g9_12 => 'Enter your homework problem...\n\nInclude any equations, values, or constraints given.',
    };
  }

  String _helperTextForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Tip: Try to include the whole question!',
      AivoGradeBand.g6_8 => 'Tip: Include all numbers and information from the original problem for best results.',
      AivoGradeBand.g9_12 => 'Tip: Include the complete problem statement with all given values, constraints, and what you\'re solving for.',
    };
  }
}
