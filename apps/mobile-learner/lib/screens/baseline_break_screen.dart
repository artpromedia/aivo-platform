import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../baseline/baseline_controller.dart';

/// Calming break screen shown when learner needs a pause.
/// Simple, low-stimulation UI with a breathing animation and "Ready" button.
class BaselineBreakScreen extends ConsumerStatefulWidget {
  const BaselineBreakScreen({super.key});

  @override
  ConsumerState<BaselineBreakScreen> createState() => _BaselineBreakScreenState();
}

class _BaselineBreakScreenState extends ConsumerState<BaselineBreakScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _breathingController;
  late Animation<double> _breathingAnimation;

  @override
  void initState() {
    super.initState();
    _breathingController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    _breathingAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(
        parent: _breathingController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _breathingController.dispose();
    super.dispose();
  }

  void _resumeAssessment() {
    ref.read(learnerBaselineControllerProvider.notifier).resumeFromBreak();
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Calming animation
              AnimatedBuilder(
                animation: _breathingAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _breathingAnimation.value,
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            theme.colorScheme.primaryContainer,
                            theme.colorScheme.primary.withOpacity(0.3),
                          ],
                        ),
                      ),
                      child: Icon(
                        Icons.spa_outlined,
                        size: 64,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 48),

              // Title
              Text(
                'Take a Moment',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Breathing instruction
              Text(
                'Breathe in... breathe out...',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Take as long as you need. When you\'re ready, we\'ll continue.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              const Spacer(),

              // Tips card
              Card(
                color: theme.colorScheme.surfaceContainerLow,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.lightbulb_outline,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Quick Tips',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _TipRow(
                        icon: Icons.remove_red_eye_outlined,
                        text: 'Look away from the screen',
                        theme: theme,
                      ),
                      const SizedBox(height: 8),
                      _TipRow(
                        icon: Icons.water_drop_outlined,
                        text: 'Take a sip of water',
                        theme: theme,
                      ),
                      const SizedBox(height: 8),
                      _TipRow(
                        icon: Icons.self_improvement,
                        text: 'Stretch your arms and legs',
                        theme: theme,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Ready button
              FilledButton.icon(
                onPressed: _resumeAssessment,
                icon: const Icon(Icons.play_arrow),
                label: const Text('I\'m Ready to Continue'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(double.infinity, 64),
                  textStyle: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TipRow extends StatelessWidget {
  const _TipRow({
    required this.icon,
    required this.text,
    required this.theme,
  });

  final IconData icon;
  final String text;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 10),
        Text(
          text,
          style: theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}
