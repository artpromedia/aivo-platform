import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../focus/focus_controller.dart';
import '../focus/focus_service.dart';
import '../l10n/generated/app_localizations.dart';

/// Screen displaying a regulation/focus break activity.
/// Shows title, instructions, countdown timer, and completion button.
/// Non-punitive, gentle UX appropriate to grade band.
class FocusBreakScreen extends ConsumerStatefulWidget {
  const FocusBreakScreen({
    super.key,
    required this.learnerId,
    required this.activity,
  });

  final String learnerId;
  final RegulationActivity activity;

  @override
  ConsumerState<FocusBreakScreen> createState() => _FocusBreakScreenState();
}

class _FocusBreakScreenState extends ConsumerState<FocusBreakScreen>
    with SingleTickerProviderStateMixin {
  late Timer _countdownTimer;
  late int _secondsRemaining;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _isActivityStarted = false;
  bool _isCompleting = false;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.activity.durationSeconds;

    // Pulse animation for the timer
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Start countdown timer
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), _onTick);

    // Notify that break started
    _startBreak();
  }

  void _startBreak() async {
    if (_isActivityStarted) return;
    _isActivityStarted = true;

    final controller = ref.read(focusControllerProvider(widget.learnerId).notifier);
    await controller.startBreak(widget.activity);
  }

  void _onTick(Timer timer) {
    if (_secondsRemaining > 0) {
      setState(() => _secondsRemaining--);
    } else {
      timer.cancel();
      // Auto-complete when timer reaches 0
      _completeBreak(completedFully: true);
    }
  }

  Future<void> _completeBreak({required bool completedFully}) async {
    if (_isCompleting) return;
    setState(() => _isCompleting = true);

    _countdownTimer.cancel();

    final controller = ref.read(focusControllerProvider(widget.learnerId).notifier);
    await controller.completeBreak(
      activity: widget.activity,
      completedFully: completedFully,
    );

    if (!mounted) return;

    // Show optional feedback dialog
    if (completedFully) {
      await _showFeedbackDialog();
    }

    if (mounted) {
      context.pop();
    }
  }

  Future<void> _showFeedbackDialog() async {
    final gradeBand = ref.read(gradeBandProvider);
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: Icon(
          Icons.favorite,
          size: 48,
          color: theme.colorScheme.tertiary,
        ),
        title: Text(_feedbackTitleForGrade(gradeBand)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _feedbackMessageForGrade(gradeBand),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              l10n.focusBreakWasThisHelpful,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _FeedbackButton(
                  emoji: '👍',
                  label: l10n.commonYes,
                  onTap: () => Navigator.of(context).pop(),
                ),
                const SizedBox(width: 24),
                _FeedbackButton(
                  emoji: '👎',
                  label: l10n.notReally,
                  onTap: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(l10n.skip),
          ),
        ],
      ),
    );
  }

  String _feedbackTitleForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    return switch (gradeBand) {
      AivoGradeBand.k5 => l10n.focusBreakFeedbackTitleK5,
      AivoGradeBand.g6_8 => l10n.focusBreakFeedbackTitleG68,
      AivoGradeBand.g9_12 => l10n.focusBreakFeedbackTitleG912,
    };
  }

  String _feedbackMessageForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    return switch (gradeBand) {
      AivoGradeBand.k5 => l10n.focusBreakFeedbackMessageK5,
      AivoGradeBand.g6_8 => l10n.focusBreakFeedbackMessageG68,
      AivoGradeBand.g9_12 => l10n.focusBreakFeedbackMessageG912,
    };
  }

  @override
  void dispose() {
    _countdownTimer.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = ref.watch(gradeBandProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Skip/close button (non-punitive)
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: _isCompleting ? null : () => _completeBreak(completedFully: false),
                  child: Text(
                    AppLocalizations.of(context).skipForNow,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),

              const Spacer(flex: 1),

              // Activity illustration/icon
              _buildActivityIcon(theme, gradeBand),

              const SizedBox(height: 32),

              // Title
              Text(
                widget.activity.title,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Gentle intro message
              Text(
                _introMessageForGrade(gradeBand),
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 32),

              // Instructions card
              _buildInstructionsCard(theme, gradeBand),

              const SizedBox(height: 32),

              // Countdown timer
              _buildCountdownTimer(theme, gradeBand),

              const Spacer(flex: 2),

              // Ready button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: _isCompleting ? null : () => _completeBreak(completedFully: true),
                  child: _isCompleting
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation(theme.colorScheme.onPrimary),
                          ),
                        )
                      : Text(_continueButtonTextForGrade(gradeBand)),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActivityIcon(ThemeData theme, AivoGradeBand gradeBand) {
    final iconData = switch (widget.activity.type) {
      BreakActivityType.breathing => Icons.air,
      BreakActivityType.stretching => Icons.self_improvement,
      BreakActivityType.movement => Icons.directions_run,
      BreakActivityType.grounding => Icons.spa,
      BreakActivityType.mindfulPause => Icons.psychology,
      BreakActivityType.simpleGame => Icons.sports_esports,
      BreakActivityType.learningGame => Icons.school,
    };

    return ScaleTransition(
      scale: _pulseAnimation,
      child: Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          color: theme.colorScheme.tertiaryContainer,
          shape: BoxShape.circle,
        ),
        child: Icon(
          iconData,
          size: 56,
          color: theme.colorScheme.tertiary,
        ),
      ),
    );
  }

  String _introMessageForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    return switch (gradeBand) {
      AivoGradeBand.k5 => l10n.focusBreakIntroK5,
      AivoGradeBand.g6_8 => l10n.focusBreakIntroG68,
      AivoGradeBand.g9_12 => l10n.focusBreakIntroG912,
    };
  }

  Widget _buildInstructionsCard(ThemeData theme, AivoGradeBand gradeBand) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                Icons.tips_and_updates,
                size: 20,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                AppLocalizations.of(context).instructions,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.activity.instructions,
            style: theme.textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildCountdownTimer(ThemeData theme, AivoGradeBand gradeBand) {
    final minutes = _secondsRemaining ~/ 60;
    final seconds = _secondsRemaining % 60;
    final timeString = minutes > 0
        ? '$minutes:${seconds.toString().padLeft(2, '0')}'
        : '$seconds';

    return Column(
      children: [
        Text(
          timeString,
          style: theme.textTheme.displayLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.primary,
          ),
        ),
        Text(
          _timerLabelForGrade(gradeBand),
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  String _timerLabelForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    final seconds = _secondsRemaining;
    return switch (gradeBand) {
      AivoGradeBand.k5 => seconds > 0 ? l10n.focusBreakSecondsLeftK5 : l10n.focusBreakTimerDoneK5,
      AivoGradeBand.g6_8 => seconds > 0 ? l10n.focusBreakTimerRemainingG68 : l10n.focusBreakTimerDoneG68,
      AivoGradeBand.g9_12 => seconds > 0 ? l10n.focusBreakTimerRemainingG912 : l10n.focusBreakTimerDoneG912,
    };
  }

  String _continueButtonTextForGrade(AivoGradeBand gradeBand) {
    final l10n = AppLocalizations.of(context);
    return switch (gradeBand) {
      AivoGradeBand.k5 => l10n.focusBreakContinueK5,
      AivoGradeBand.g6_8 => l10n.focusBreakContinueG68,
      AivoGradeBand.g9_12 => l10n.focusBreakContinueG912,
    };
  }
}

class _FeedbackButton extends StatelessWidget {
  const _FeedbackButton({
    required this.emoji,
    required this.label,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 32)),
            const SizedBox(height: 4),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
