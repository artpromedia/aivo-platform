import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../homework/homework_controller.dart';
import '../l10n/generated/app_localizations.dart';

/// Screen displaying homework scaffolding steps with interactive Q&A.
/// Shows step prompt, optional hint, text input, and progress indicator.
class HomeworkStepsScreen extends ConsumerStatefulWidget {
  const HomeworkStepsScreen({super.key, required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<HomeworkStepsScreen> createState() => _HomeworkStepsScreenState();
}

class _HomeworkStepsScreenState extends ConsumerState<HomeworkStepsScreen>
    with SingleTickerProviderStateMixin {
  final _answerController = TextEditingController();
  late AnimationController _progressAnimController;
  late Animation<double> _progressAnim;

  @override
  void initState() {
    super.initState();
    _progressAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _progressAnim = Tween<double>(begin: 0, end: 0).animate(
      CurvedAnimation(parent: _progressAnimController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _answerController.dispose();
    _progressAnimController.dispose();
    super.dispose();
  }

  void _updateProgressAnimation(double newProgress) {
    final oldProgress = _progressAnim.value;
    _progressAnim = Tween<double>(begin: oldProgress, end: newProgress).animate(
      CurvedAnimation(parent: _progressAnimController, curve: Curves.easeInOut),
    );
    _progressAnimController.forward(from: 0);
  }

  Future<void> _submitAnswer() async {
    final answer = _answerController.text.trim();
    if (answer.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context).homeworkPleaseEnterAnswer)),
      );
      return;
    }

    final controller = ref.read(homeworkControllerProvider(widget.learnerId).notifier);
    final success = await controller.submitAnswer(answer);

    if (!mounted) return;

    if (success) {
      _answerController.clear();

      // Update progress animation
      final state = ref.read(homeworkControllerProvider(widget.learnerId));
      _updateProgressAnimation(state.progress);

      // Check if complete
      if (state.isComplete) {
        _showCompletionDialog();
      }
    }
  }

  void _showCompletionDialog() {
    final theme = Theme.of(context);
    final gradeBand = ref.read(gradeBandProvider);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: Icon(
          Icons.celebration,
          size: 48,
          color: theme.colorScheme.primary,
        ),
        title: Text(_completionTitleForGrade(gradeBand)),
        content: Text(
          _completionMessageForGrade(gradeBand),
          textAlign: TextAlign.center,
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/plan');
            },
            child: Text(AppLocalizations.of(context).done),
          ),
        ],
      ),
    );

    // Mark homework complete
    ref.read(homeworkControllerProvider(widget.learnerId).notifier).completeHomework();
  }

  String _completionTitleForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    return switch (gradeBand) {
      AivoGradeBand.k5 => l10n.homeworkCompletionTitleK5,
      AivoGradeBand.g6_8 => l10n.homeworkCompletionTitleG68,
      AivoGradeBand.g9_12 => l10n.homeworkCompletionTitleG912,
    };
  }

  String _completionMessageForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    return switch (gradeBand) {
      AivoGradeBand.k5 => l10n.homeworkCompletionMessageK5,
      AivoGradeBand.g6_8 => l10n.homeworkCompletionMessageG68,
      AivoGradeBand.g9_12 => l10n.homeworkCompletionMessageG912,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(homeworkControllerProvider(widget.learnerId));
    final gradeBand = ref.watch(gradeBandProvider);

    final currentStep = state.currentStep;

    // No session or no steps - error state
    if (state.session == null || currentStep == null) {
      return Scaffold(
        appBar: AppBar(title: Text(AppLocalizations.of(context).homeworkHelper)),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              Text(AppLocalizations.of(context).somethingWentWrong, style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(state.error ?? AppLocalizations.of(context).homeworkUnableToLoadSteps),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go('/homework/intro', extra: widget.learnerId),
                child: Text(AppLocalizations.of(context).startOver),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context).homeworkHelper),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _showExitConfirmation(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator
            _buildProgressBar(theme, state),

            // Content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Step indicator
                  _buildStepIndicator(theme, state),

                  const SizedBox(height: 20),

                  // Problem summary card
                  _buildProblemCard(theme, state.session!.problem, gradeBand),

                  const SizedBox(height: 20),

                  // Current step prompt
                  _buildStepPrompt(theme, currentStep, gradeBand),

                  // Feedback message
                  if (state.stepFeedback != null) ...[
                    const SizedBox(height: 16),
                    _buildFeedbackCard(theme, state.stepFeedback!),
                  ],

                  // Hint section
                  if (currentStep.hint != null) ...[
                    const SizedBox(height: 16),
                    _buildHintSection(theme, currentStep.hint!, state.showHint),
                  ],

                  const SizedBox(height: 24),

                  // Answer input
                  _buildAnswerInput(theme, gradeBand),

                  const SizedBox(height: 16),

                  // Submit button
                  _buildSubmitButton(theme, state.isLoading),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar(ThemeData theme, HomeworkState state) {
    return AnimatedBuilder(
      animation: _progressAnim,
      builder: (context, child) {
        return LinearProgressIndicator(
          value: _progressAnim.value == 0 ? state.progress : _progressAnim.value,
          backgroundColor: theme.colorScheme.surfaceContainerHighest,
          valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
          minHeight: 6,
        );
      },
    );
  }

  Widget _buildStepIndicator(ThemeData theme, HomeworkState state) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            AppLocalizations.of(context).homeworkStepOfTotal(state.currentStepIndex + 1, state.totalSteps),
            style: theme.textTheme.labelLarge?.copyWith(
              color: theme.colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProblemCard(ThemeData theme, String problem, AivoGradeBand gradeBand) {
    return Card(
      color: theme.colorScheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.question_mark,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Text(
                  AppLocalizations.of(context).homeworkYourQuestion,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              problem,
              style: theme.textTheme.bodyMedium,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepPrompt(ThemeData theme, step, AivoGradeBand gradeBand) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.lightbulb_outline,
                    size: 20,
                    color: theme.colorScheme.onPrimary,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  AppLocalizations.of(context).homeworkLetsThink,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              step.prompt,
              style: theme.textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeedbackCard(ThemeData theme, String feedback) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.secondary.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 20,
            color: theme.colorScheme.secondary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              feedback,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSecondaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHintSection(ThemeData theme, String hint, bool showHint) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () {
            ref.read(homeworkControllerProvider(widget.learnerId).notifier).toggleHint();
          },
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Icon(
                  showHint ? Icons.lightbulb : Icons.lightbulb_outline,
                  size: 20,
                  color: theme.colorScheme.tertiary,
                ),
                const SizedBox(width: 8),
                Text(
                  showHint ? AppLocalizations.of(context).homeworkHideHint : AppLocalizations.of(context).homeworkNeedAHint,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.tertiary,
                  ),
                ),
                const Spacer(),
                Icon(
                  showHint ? Icons.expand_less : Icons.expand_more,
                  color: theme.colorScheme.tertiary,
                ),
              ],
            ),
          ),
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.tertiaryContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.tips_and_updates_outlined,
                  size: 18,
                  color: theme.colorScheme.onTertiaryContainer,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    hint,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onTertiaryContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),
          crossFadeState: showHint ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }

  Widget _buildAnswerInput(ThemeData theme, AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    final hintText = switch (gradeBand) {
      AivoGradeBand.k5 => l10n.homeworkAnswerHintK5,
      AivoGradeBand.g6_8 => l10n.homeworkAnswerHintG68,
      AivoGradeBand.g9_12 => l10n.homeworkAnswerHintG912,
    };

    return TextField(
      controller: _answerController,
      maxLines: 3,
      textInputAction: TextInputAction.newline,
      decoration: InputDecoration(
        hintText: hintText,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: theme.colorScheme.surfaceContainerLowest,
      ),
    );
  }

  Widget _buildSubmitButton(ThemeData theme, bool isLoading) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: isLoading ? null : _submitAnswer,
        child: isLoading
            ? SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(theme.colorScheme.onPrimary),
                ),
              )
            : Text(AppLocalizations.of(context).homeworkSubmitAnswer),
      ),
    );
  }

  void _showExitConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context).homeworkExitTitle),
        content: Text(AppLocalizations.of(context).homeworkExitMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(AppLocalizations.of(context).homeworkKeepWorking),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/plan');
            },
            child: Text(AppLocalizations.of(context).exit),
          ),
        ],
      ),
    );
  }
}
