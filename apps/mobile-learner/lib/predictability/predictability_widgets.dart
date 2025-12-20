import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_common/theme/aivo_brand.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'predictability_models.dart';
import 'predictability_service.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTABLE SESSION WRAPPER
// Wraps a session to provide predictability features when needed
// ═══════════════════════════════════════════════════════════════════════════════

/// Wraps a session with predictability features for learners who need them.
///
/// This widget checks if the learner requires predictable flow and provides:
/// - Visual session outline
/// - Progress tracking
/// - Change warnings
/// - Routine scaffolding
class PredictableSessionWrapper extends ConsumerStatefulWidget {
  const PredictableSessionWrapper({
    super.key,
    required this.tenantId,
    required this.learnerId,
    required this.sessionId,
    required this.activities,
    required this.child,
    this.onSessionComplete,
    this.structureType = 'default',
  });

  final String tenantId;
  final String learnerId;
  final String sessionId;
  final List<Map<String, dynamic>> activities;
  final Widget child;
  final VoidCallback? onSessionComplete;
  final String structureType;

  @override
  ConsumerState<PredictableSessionWrapper> createState() => _PredictableSessionWrapperState();
}

class _PredictableSessionWrapperState extends ConsumerState<PredictableSessionWrapper> {
  PredictableSessionPlan? _plan;
  bool _isLoading = true;
  bool _requiresPredictability = false;
  bool _showSchedule = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializePredictability();
  }

  Future<void> _initializePredictability() async {
    final service = ref.read(predictabilityServiceProvider);

    try {
      // Check if learner requires predictability
      _requiresPredictability = await service.requiresPredictability(
        widget.tenantId,
        widget.learnerId,
      );

      if (_requiresPredictability) {
        // Create session plan
        _plan = await service.createSessionPlan(
          tenantId: widget.tenantId,
          sessionId: widget.sessionId,
          learnerId: widget.learnerId,
          activities: widget.activities,
          structureType: widget.structureType,
        );
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }

  void _toggleSchedule() {
    setState(() {
      _showSchedule = !_showSchedule;
    });
    HapticFeedback.lightImpact();
  }

  // TODO: Wire up _updateProgress to schedule item interactions
  // ignore: unused_element
  Future<void> _updateProgress(String itemId) async {
    if (_plan == null) return;

    final service = ref.read(predictabilityServiceProvider);
    final updatedPlan = await service.updateProgress(
      widget.tenantId,
      _plan!.id,
      itemId,
    );

    if (updatedPlan != null) {
      setState(() {
        _plan = updatedPlan;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error loading session', style: Theme.of(context).textTheme.titleMedium),
            TextButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
                _initializePredictability();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    // If no predictability needed, just return the child
    if (!_requiresPredictability || _plan == null) {
      return widget.child;
    }

    // Wrap with predictability UI
    return Stack(
      children: [
        // Main content
        widget.child,

        // Floating schedule button
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          right: 16,
          child: _ScheduleButton(
            onTap: _toggleSchedule,
            progress: _plan!.progressPercent,
          ),
        ),

        // Progress indicator at top
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: _SessionProgressBar(
            progress: _plan!.progressPercent / 100,
            phase: _plan!.currentPhase,
          ),
        ),

        // Schedule overlay
        if (_showSchedule)
          _ScheduleOverlay(
            plan: _plan!,
            onClose: _toggleSchedule,
            onItemTap: (item) {
              // In real implementation, this would navigate to the item
              _toggleSchedule();
            },
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

class _ScheduleButton extends StatelessWidget {
  const _ScheduleButton({
    required this.onTap,
    required this.progress,
  });

  final VoidCallback onTap;
  final int progress;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 4,
      borderRadius: BorderRadius.circular(24),
      color: Theme.of(context).colorScheme.primaryContainer,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.calendar_today,
                size: 20,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
              const SizedBox(width: 8),
              Text(
                '$progress%',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

class _SessionProgressBar extends StatelessWidget {
  const _SessionProgressBar({
    required this.progress,
    required this.phase,
  });

  final double progress;
  final SessionPhase phase;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 4,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress.clamp(0.0, 1.0),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                _getPhaseColor(phase),
                _getPhaseColor(phase).withValues(alpha: 0.7),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getPhaseColor(SessionPhase phase) {
    switch (phase) {
      case SessionPhase.welcome:
        return AivoBrand.sessionPhaseColors['welcome']!;
      case SessionPhase.checkin:
        return AivoBrand.sessionPhaseColors['checkin']!;
      case SessionPhase.main:
        return AivoBrand.sessionPhaseColors['main']!;
      case SessionPhase.breakPhase:
        return AivoBrand.sessionPhaseColors['break']!;
      case SessionPhase.goodbye:
        return AivoBrand.sessionPhaseColors['goodbye']!;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════

class _ScheduleOverlay extends StatelessWidget {
  const _ScheduleOverlay({
    required this.plan,
    required this.onClose,
    required this.onItemTap,
  });

  final PredictableSessionPlan plan;
  final VoidCallback onClose;
  final void Function(SessionOutlineItem) onItemTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onClose,
      child: Container(
        color: Colors.black54,
        child: Center(
          child: GestureDetector(
            onTap: () {}, // Prevent close when tapping card
            child: Card(
              margin: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: 400,
                  maxHeight: MediaQuery.of(context).size.height * 0.7,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Today's Plan",
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                Text(
                                  '${plan.remainingMinutes} minutes left',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: onClose,
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                    ),

                    // Progress
                    LinearProgressIndicator(
                      value: plan.progressPercent / 100,
                      minHeight: 6,
                    ),

                    // Outline items
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(16),
                        itemCount: plan.outline.length,
                        itemBuilder: (context, index) {
                          final item = plan.outline[index];
                          return _OutlineItemTile(
                            item: item,
                            isCurrent: item.status == OutlineItemStatus.current,
                            onTap: () => onItemTap(item),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTLINE ITEM TILE
// ═══════════════════════════════════════════════════════════════════════════════

class _OutlineItemTile extends StatelessWidget {
  const _OutlineItemTile({
    required this.item,
    required this.isCurrent,
    required this.onTap,
  });

  final SessionOutlineItem item;
  final bool isCurrent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isCompleted = item.status == OutlineItemStatus.completed;
    final color = _parseColor(item.color) ?? Theme.of(context).colorScheme.primary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: isCurrent ? color.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Status indicator
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isCompleted ? Colors.green : (isCurrent ? color : Colors.grey.shade300),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isCompleted
                        ? Icons.check
                        : (isCurrent ? Icons.play_arrow : _getIconForType(item.icon)),
                    color: Colors.white,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: TextStyle(
                                fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                                decoration: isCompleted ? TextDecoration.lineThrough : null,
                                color: isCompleted ? Colors.grey : null,
                              ),
                            ),
                          ),
                          if (item.isNew)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.orange,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'NEW',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                      Text(
                        '${item.estimatedMinutes} min • ${item.type}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getIconForType(String? iconName) {
    final icons = {
      'waving_hand': Icons.waving_hand,
      'mood': Icons.mood,
      'calculate': Icons.calculate,
      'self_improvement': Icons.self_improvement,
      'auto_stories': Icons.auto_stories,
      'celebration': Icons.celebration,
      'menu_book': Icons.menu_book,
      'play_circle': Icons.play_circle,
      'quiz': Icons.quiz,
      'edit': Icons.edit,
      'games': Icons.games,
      'create': Icons.create,
      'school': Icons.school,
      'touch_app': Icons.touch_app,
      'spa': Icons.spa,
    };
    return icons[iconName] ?? Icons.circle;
  }

  Color? _parseColor(String? colorHex) {
    if (colorHex == null || !colorHex.startsWith('#')) return null;
    try {
      return Color(int.parse(colorHex.substring(1), radix: 16) + 0xFF000000);
    } catch (_) {
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTINE INDICATOR WIDGET
// Shows routine steps with visual progress
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows a routine's steps and progress through them.
class RoutineIndicator extends StatefulWidget {
  const RoutineIndicator({
    super.key,
    required this.routine,
    required this.onComplete,
    this.onStepComplete,
    this.autoAdvance = true,
  });

  final SessionRoutine routine;
  final VoidCallback onComplete;
  final void Function(int stepIndex, RoutineStep step)? onStepComplete;
  final bool autoAdvance;

  @override
  State<RoutineIndicator> createState() => _RoutineIndicatorState();
}

class _RoutineIndicatorState extends State<RoutineIndicator> {
  int _currentStepIndex = 0;
  int _secondsRemaining = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.routine.steps.isNotEmpty) {
      _secondsRemaining = widget.routine.steps[0].durationSeconds;
      if (widget.autoAdvance) {
        _startTimer();
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining <= 0) {
        _advanceStep();
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  void _advanceStep() {
    final currentStep = widget.routine.steps[_currentStepIndex];
    widget.onStepComplete?.call(_currentStepIndex, currentStep);

    if (_currentStepIndex >= widget.routine.steps.length - 1) {
      _timer?.cancel();
      widget.onComplete();
    } else {
      setState(() {
        _currentStepIndex++;
        _secondsRemaining = widget.routine.steps[_currentStepIndex].durationSeconds;
      });
    }
  }

  void _skipStep() {
    HapticFeedback.lightImpact();
    _advanceStep();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.routine.steps.isEmpty) {
      return const SizedBox.shrink();
    }

    final currentStep = widget.routine.steps[_currentStepIndex];
    final progress = _currentStepIndex / widget.routine.steps.length;

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Routine name
            Text(
              widget.routine.name,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),

            // Step indicator dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(widget.routine.steps.length, (index) {
                final isCompleted = index < _currentStepIndex;
                final isCurrent = index == _currentStepIndex;
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: isCurrent ? 16 : 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? Colors.green
                        : (isCurrent ? Theme.of(context).colorScheme.primary : Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(5),
                  ),
                );
              }),
            ),
            const SizedBox(height: 24),

            // Current step instruction
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  if (currentStep.imageUrl != null)
                    Image.network(
                      currentStep.imageUrl!,
                      height: 80,
                      errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 80),
                    )
                  else
                    Icon(
                      _getStepIcon(currentStep.type),
                      size: 64,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  const SizedBox(height: 16),
                  Text(
                    currentStep.instruction ?? 'Step ${_currentStepIndex + 1}',
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Timer
            Text(
              _formatTime(_secondsRemaining),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                  ),
            ),
            const SizedBox(height: 16),

            // Overall progress
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: Colors.grey.shade200,
              ),
            ),
            const SizedBox(height: 16),

            // Action buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton.icon(
                  onPressed: _skipStep,
                  icon: const Icon(Icons.skip_next),
                  label: const Text('Skip'),
                ),
                if (!widget.autoAdvance)
                  ElevatedButton.icon(
                    onPressed: _advanceStep,
                    icon: const Icon(Icons.check),
                    label: const Text('Done'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _getStepIcon(String type) {
    final icons = {
      'breathing': Icons.air,
      'movement': Icons.directions_run,
      'sensory': Icons.touch_app,
      'countdown': Icons.timer,
      'preview': Icons.visibility,
      'ready_check': Icons.check_circle,
      'greeting': Icons.waving_hand,
      'review': Icons.rate_review,
      'celebration': Icons.celebration,
      'farewell': Icons.waving_hand,
      'grounding': Icons.anchor,
      'affirmation': Icons.favorite,
    };
    return icons[type] ?? Icons.circle;
  }

  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION STRUCTURE WIDGET
// Visual representation of the session structure
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows the visual session structure/schedule.
class SessionStructureWidget extends StatelessWidget {
  const SessionStructureWidget({
    super.key,
    required this.outline,
    required this.currentItemId,
    this.onItemTap,
    this.compact = false,
  });

  final List<SessionOutlineItem> outline;
  final String currentItemId;
  final void Function(SessionOutlineItem)? onItemTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return _buildCompactView(context);
    }
    return _buildFullView(context);
  }

  Widget _buildCompactView(BuildContext context) {
    return SizedBox(
      height: 60,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: outline.length,
        separatorBuilder: (_, __) => const _CompactConnector(),
        itemBuilder: (context, index) {
          final item = outline[index];
          final isCurrent = item.id == currentItemId;
          return _CompactOutlineItem(
            item: item,
            isCurrent: isCurrent,
            onTap: onItemTap != null ? () => onItemTap!(item) : null,
          );
        },
      ),
    );
  }

  Widget _buildFullView(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: outline.length,
      itemBuilder: (context, index) {
        final item = outline[index];
        final isCurrent = item.id == currentItemId;
        final isLast = index == outline.length - 1;

        return _FullOutlineItem(
          item: item,
          isCurrent: isCurrent,
          showConnector: !isLast,
          onTap: onItemTap != null ? () => onItemTap!(item) : null,
        );
      },
    );
  }
}

class _CompactOutlineItem extends StatelessWidget {
  const _CompactOutlineItem({
    required this.item,
    required this.isCurrent,
    this.onTap,
  });

  final SessionOutlineItem item;
  final bool isCurrent;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isCompleted = item.status == OutlineItemStatus.completed;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: isCurrent ? 56 : 44,
        height: isCurrent ? 56 : 44,
        decoration: BoxDecoration(
          color: isCompleted
              ? Colors.green
              : (isCurrent ? Theme.of(context).colorScheme.primary : Colors.grey.shade300),
          shape: BoxShape.circle,
          border: isCurrent ? Border.all(color: Theme.of(context).colorScheme.primary, width: 3) : null,
        ),
        child: Icon(
          isCompleted ? Icons.check : _getIconForItem(item),
          color: Colors.white,
          size: isCurrent ? 28 : 22,
        ),
      ),
    );
  }

  IconData _getIconForItem(SessionOutlineItem item) {
    switch (item.type) {
      case 'routine':
        return Icons.auto_awesome;
      case 'break':
        return Icons.self_improvement;
      default:
        return Icons.school;
    }
  }
}

class _CompactConnector extends StatelessWidget {
  const _CompactConnector();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 2,
      color: Colors.grey.shade300,
      margin: const EdgeInsets.symmetric(vertical: 29),
    );
  }
}

class _FullOutlineItem extends StatelessWidget {
  const _FullOutlineItem({
    required this.item,
    required this.isCurrent,
    required this.showConnector,
    this.onTap,
  });

  final SessionOutlineItem item;
  final bool isCurrent;
  final bool showConnector;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isCompleted = item.status == OutlineItemStatus.completed;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline indicator
          Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? Colors.green
                      : (isCurrent ? Theme.of(context).colorScheme.primary : Colors.grey.shade300),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCompleted ? Icons.check : (isCurrent ? Icons.play_arrow : null),
                  color: Colors.white,
                  size: 14,
                ),
              ),
              if (showConnector)
                Expanded(
                  child: Container(
                    width: 2,
                    color: isCompleted ? Colors.green : Colors.grey.shade300,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: GestureDetector(
              onTap: onTap,
              child: Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isCurrent
                      ? Theme.of(context).colorScheme.primaryContainer
                      : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: isCurrent
                      ? Border.all(color: Theme.of(context).colorScheme.primary, width: 2)
                      : null,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: TextStyle(
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                              decoration: isCompleted ? TextDecoration.lineThrough : null,
                            ),
                          ),
                          Text(
                            '${item.estimatedMinutes} min',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    if (item.isNew)
                      const Chip(
                        label: Text('NEW', style: TextStyle(fontSize: 10)),
                        backgroundColor: Colors.orange,
                        labelStyle: TextStyle(color: Colors.white),
                        padding: EdgeInsets.zero,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANGE WARNING DIALOG
// Shows when an unexpected change is about to happen
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows a warning dialog when an unexpected change is about to happen.
class ChangeWarningDialog extends StatelessWidget {
  const ChangeWarningDialog({
    super.key,
    required this.explanation,
    required this.onAccept,
    required this.onDecline,
    this.showCopingStrategies = true,
  });

  final ChangeExplanation explanation;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final bool showCopingStrategies;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(
            _getSeverityIcon(explanation.severity),
            color: _getSeverityColor(explanation.severity),
          ),
          const SizedBox(width: 8),
          const Text('Change Coming'),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Main message
            Text(
              explanation.message,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),

            // Social story
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                explanation.socialStory,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),

            // Coping strategies
            if (showCopingStrategies && explanation.copingStrategies.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Things that might help:',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              ...explanation.copingStrategies.map(
                (strategy) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline, size: 16, color: Colors.green),
                      const SizedBox(width: 8),
                      Expanded(child: Text(strategy)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: onDecline,
          child: const Text("I'm not ready"),
        ),
        ElevatedButton(
          onPressed: onAccept,
          child: const Text('Okay'),
        ),
      ],
    );
  }

  IconData _getSeverityIcon(ChangeSeverity severity) {
    switch (severity) {
      case ChangeSeverity.low:
        return Icons.info_outline;
      case ChangeSeverity.medium:
        return Icons.warning_amber;
      case ChangeSeverity.high:
        return Icons.error_outline;
    }
  }

  Color _getSeverityColor(ChangeSeverity severity) {
    switch (severity) {
      case ChangeSeverity.low:
        return Colors.blue;
      case ChangeSeverity.medium:
        return Colors.orange;
      case ChangeSeverity.high:
        return Colors.red;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANXIETY SUPPORT BUTTON
// Quick access to report anxiety and get support
// ═══════════════════════════════════════════════════════════════════════════════

/// A floating button for learners to report anxiety and get support.
class AnxietySupportButton extends ConsumerWidget {
  const AnxietySupportButton({
    super.key,
    required this.tenantId,
    required this.sessionId,
    required this.learnerId,
    this.onSupportProvided,
  });

  final String tenantId;
  final String sessionId;
  final String learnerId;
  final void Function(AnxietyReportResult)? onSupportProvided;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FloatingActionButton.small(
      heroTag: 'anxiety_support',
      backgroundColor: Colors.purple.shade100,
      onPressed: () => _showAnxietyDialog(context, ref),
      child: const Icon(Icons.sentiment_neutral, color: Colors.purple),
    );
  }

  Future<void> _showAnxietyDialog(BuildContext context, WidgetRef ref) async {
    final result = await showDialog<AnxietyLevel>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('How are you feeling?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _AnxietyOption(
              level: AnxietyLevel.mild,
              emoji: '😐',
              label: 'A little worried',
              onTap: () => Navigator.pop(context, AnxietyLevel.mild),
            ),
            _AnxietyOption(
              level: AnxietyLevel.moderate,
              emoji: '😟',
              label: 'Pretty worried',
              onTap: () => Navigator.pop(context, AnxietyLevel.moderate),
            ),
            _AnxietyOption(
              level: AnxietyLevel.severe,
              emoji: '😰',
              label: 'Very worried',
              onTap: () => Navigator.pop(context, AnxietyLevel.severe),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("I'm okay"),
          ),
        ],
      ),
    );

    if (result != null && context.mounted) {
      final service = ref.read(predictabilityServiceProvider);
      final reportResult = await service.reportAnxiety(
        tenantId: tenantId,
        sessionId: sessionId,
        learnerId: learnerId,
        level: result,
      );

      onSupportProvided?.call(reportResult);

      if (context.mounted) {
        _showSupportDialog(context, reportResult);
      }
    }
  }

  void _showSupportDialog(BuildContext context, AnxietyReportResult result) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.favorite, color: Colors.pink.shade300),
            const SizedBox(width: 8),
            const Text("It's okay"),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (result.calmingMessage != null)
              Text(
                result.calmingMessage!,
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
            const SizedBox(height: 16),
            const Text('Would you like to:'),
            const SizedBox(height: 8),
            ...result.supportActions.map(
              (action) => ListTile(
                leading: const Icon(Icons.check_circle_outline, color: Colors.green),
                title: Text(action),
                dense: true,
              ),
            ),
          ],
        ),
        actions: [
          if (result.recommendedRoutine != null)
            TextButton.icon(
              onPressed: () {
                Navigator.pop(context);
                // TODO: Navigate to calming routine
              },
              icon: const Icon(Icons.spa),
              label: const Text('Take a calming break'),
            ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("I'm ready to continue"),
          ),
        ],
      ),
    );
  }
}

class _AnxietyOption extends StatelessWidget {
  const _AnxietyOption({
    required this.level,
    required this.emoji,
    required this.label,
    required this.onTap,
  });

  final AnxietyLevel level;
  final String emoji;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Text(emoji, style: const TextStyle(fontSize: 32)),
                const SizedBox(width: 16),
                Text(label, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
