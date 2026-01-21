/// Step by Step View
/// 
/// Interactive view that guides learners through each step of a skill
/// with AI coaching, visual prompts, and progressive prompting.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'life_skills_models.dart';
import 'life_skills_service.dart';
import 'widgets/widgets.dart';

/// Step by Step View - interactive step-by-step teaching view
class StepByStepView extends StatefulWidget {
  final LifeSkillsService service;
  final String tenantId;
  final String learnerId;
  final SkillGuide guide;
  final LearnerSkillProgress? existingProgress;

  const StepByStepView({
    super.key,
    required this.service,
    required this.tenantId,
    required this.learnerId,
    required this.guide,
    this.existingProgress,
  });

  @override
  State<StepByStepView> createState() => _StepByStepViewState();
}

class _StepByStepViewState extends State<StepByStepView>
    with SingleTickerProviderStateMixin {
  String? _sessionId;
  int _currentStepIndex = 0;
  bool _isLoading = false;
  bool _showAIGuidance = false;
  AIGuidance? _currentGuidance;
  PromptLevel _currentPromptLevel = PromptLevel.fullPhysical;
  late AnimationController _celebrationController;
  bool _showCelebration = false;

  List<SkillStep> get _steps => widget.guide.steps;
  SkillStep get _currentStep => _steps[_currentStepIndex];
  bool get _isFirstStep => _currentStepIndex == 0;
  bool get _isLastStep => _currentStepIndex == _steps.length - 1;

  @override
  void initState() {
    super.initState();
    _celebrationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _startSession();
  }

  @override
  void dispose() {
    _celebrationController.dispose();
    _endSession();
    super.dispose();
  }

  Future<void> _startSession() async {
    setState(() => _isLoading = true);

    try {
      final result = await widget.service.startSession(
        tenantId: widget.tenantId,
        learnerId: widget.learnerId,
        skillId: widget.guide.skill.id,
      );
      
      _sessionId = result['session']['id'] as String;
      
      // Determine starting step based on existing progress
      if (widget.existingProgress != null) {
        // Use stepsCompleted to find where to continue from
        final lastCompleted = widget.existingProgress!.stepsCompleted;
        _currentStepIndex = lastCompleted < _steps.length ? lastCompleted : 0;
        _currentPromptLevel = widget.existingProgress!.currentPromptLevel;
      }

      await _loadGuidance();
    } catch (e) {
      _showError('Could not start session: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadGuidance() async {
    try {
      final guidance = await widget.service.getAIGuidance(
        tenantId: widget.tenantId,
        learnerId: widget.learnerId,
        skillId: widget.guide.skill.id,
        stepNumber: _currentStep.stepNumber,
        currentPromptLevel: _currentPromptLevel,
      );
      setState(() => _currentGuidance = guidance);
    } catch (e) {
      // Guidance is optional, continue without it
      debugPrint('Could not load AI guidance: $e');
    }
  }

  Future<void> _endSession() async {
    if (_sessionId == null) return;
    
    try {
      await widget.service.endSession(
        sessionId: _sessionId!,
      );
    } catch (e) {
      debugPrint('Could not end session: $e');
    }
  }

  Future<void> _recordAttempt(bool success) async {
    if (_sessionId == null) return;

    setState(() => _isLoading = true);

    try {
      await widget.service.recordStepAttempt(
        sessionId: _sessionId!,
        stepNumber: _currentStep.stepNumber,
        promptLevel: _currentPromptLevel,
        wasSuccessful: success,
      );

      if (success) {
        // Success - celebrate and maybe advance
        HapticFeedback.mediumImpact();
        
        if (_isLastStep) {
          await _showSkillComplete();
        } else {
          setState(() {
            _showCelebration = true;
          });
          _celebrationController.forward(from: 0);

          await Future.delayed(const Duration(milliseconds: 1200));
          
          setState(() {
            _showCelebration = false;
            _currentStepIndex++;
          });
          await _loadGuidance();
        }
      } else {
        // Not quite - adjust prompt level if needed
        HapticFeedback.lightImpact();
        // Try a lower prompt level for more support
        if (_currentPromptLevel.index > 0) {
          _currentPromptLevel = PromptLevel.values[_currentPromptLevel.index - 1];
        }
        setState(() {
          _showAIGuidance = true;
        });
        await _loadGuidance();
      }
    } catch (e) {
      _showError('Could not record attempt: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _showSkillComplete() async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => SkillCompleteDialog(
        skill: widget.guide.skill,
        onContinue: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _goToStep(int index) {
    if (index >= 0 && index < _steps.length) {
      setState(() => _currentStepIndex = index);
      _loadGuidance();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.guide.skill.name),
        actions: [
          IconButton(
            icon: Icon(_showAIGuidance ? Icons.lightbulb : Icons.lightbulb_outline),
            onPressed: () => setState(() => _showAIGuidance = !_showAIGuidance),
            tooltip: 'AI Help',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_currentStepIndex + 1) / _steps.length,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
          ),
        ),
      ),
      body: _isLoading && _sessionId == null
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                // Main content
                Column(
                  children: [
                    // Step indicator
                    StepIndicatorRow(
                      currentStep: _currentStepIndex,
                      totalSteps: _steps.length,
                      onStepTap: _goToStep,
                    ),

                    // AI Guidance panel (collapsible)
                    if (_showAIGuidance && _currentGuidance != null)
                      AIGuidancePanel(
                        guidance: _currentGuidance!,
                        onDismiss: () => setState(() => _showAIGuidance = false),
                      ),

                    // Step content
                    Expanded(
                      child: _buildStepContent(theme),
                    ),

                    // Prompt level indicator
                    PromptLevelIndicator(
                      currentLevel: _currentPromptLevel,
                      onLevelChange: (level) {
                        setState(() => _currentPromptLevel = level);
                        _loadGuidance();
                      },
                    ),

                    // Action buttons
                    _buildActionButtons(theme),
                  ],
                ),

                // Celebration overlay
                if (_showCelebration)
                  CelebrationOverlay(
                    animation: _celebrationController,
                    message: 'Great job! 🎉',
                  ),

                // Loading overlay
                if (_isLoading && _sessionId != null)
                  Container(
                    color: Colors.black26,
                    child: const Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
    );
  }

  Widget _buildStepContent(ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Step title
          Text(
            'Step ${_currentStepIndex + 1}: ${_currentStep.instruction}',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // Step media (video, image, or symbol)
          if (_currentStep.videoUrl != null)
            StepMediaPlayer(
              videoUrl: _currentStep.videoUrl!,
              thumbnailUrl: _currentStep.imageUrl,
            )
          else if (_currentStep.imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                _currentStep.imageUrl!,
                fit: BoxFit.cover,
                width: double.infinity,
                height: 250,
                errorBuilder: (_, __, ___) => const StepPlaceholder(),
              ),
            )
          else if (_currentStep.symbolUrl != null)
            Center(
              child: Image.network(
                _currentStep.symbolUrl!,
                width: 200,
                height: 200,
                errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 100),
              ),
            )
          else
            const StepPlaceholder(),
          const SizedBox(height: 24),

          // Step instruction
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'What to do',
                        style: theme.textTheme.titleMedium,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _currentStep.instruction,
                    style: theme.textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Prompt for current level
          if (_currentGuidance != null)
            Card(
              color: theme.colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.assistant,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Try this (${_currentPromptLevel.displayName})',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: theme.colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _currentGuidance!.guidance,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Detailed prompt (for caregiver/teacher)
          if (_currentStep.detailedPrompt != null) ...[
            const SizedBox(height: 16),
            ExpansionTile(
              leading: const Icon(Icons.school_outlined),
              title: const Text('Teaching Tip'),
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(_currentStep.detailedPrompt!),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButtons(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            offset: const Offset(0, -2),
            blurRadius: 4,
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Previous button
            if (!_isFirstStep)
              IconButton.outlined(
                onPressed: () => _goToStep(_currentStepIndex - 1),
                icon: const Icon(Icons.arrow_back),
                tooltip: 'Previous step',
              ),
            
            const Spacer(),

            // Try again button
            OutlinedButton.icon(
              onPressed: _isLoading ? null : () => _recordAttempt(false),
              icon: const Icon(Icons.refresh),
              label: const Text('Need Help'),
            ),
            const SizedBox(width: 12),

            // Success button
            FilledButton.icon(
              onPressed: _isLoading ? null : () => _recordAttempt(true),
              icon: const Icon(Icons.check),
              label: Text(_isLastStep ? 'Complete!' : 'I Did It!'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Step placeholder for when no media is available
class StepPlaceholder extends StatelessWidget {
  const StepPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: Icon(Icons.play_circle_outline, size: 64, color: Colors.grey),
      ),
    );
  }
}

/// Step media player for video content
class StepMediaPlayer extends StatelessWidget {
  final String videoUrl;
  final String? thumbnailUrl;

  const StepMediaPlayer({
    super.key,
    required this.videoUrl,
    this.thumbnailUrl,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement actual video player (video_player package)
    // For now, show thumbnail with play button
    return Stack(
      alignment: Alignment.center,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: thumbnailUrl != null
              ? Image.network(
                  thumbnailUrl!,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: 250,
                  errorBuilder: (_, __, ___) => const StepPlaceholder(),
                )
              : Container(
                  height: 250,
                  color: Colors.black87,
                  child: const Center(
                    child: Icon(Icons.video_library, size: 64, color: Colors.white54),
                  ),
                ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.black54,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.play_arrow, size: 48, color: Colors.white),
            onPressed: () {
              // TODO: Launch video player
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Video player not yet implemented')),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Skill complete dialog - shown when learner finishes all steps
class SkillCompleteDialog extends StatelessWidget {
  final LifeSkill skill;
  final VoidCallback onContinue;

  const SkillCompleteDialog({
    super.key,
    required this.skill,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              '🎉',
              style: TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              'Amazing Work!',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You completed "${skill.name}"!',
              style: theme.textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Keep practicing to become even better!',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onContinue,
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}
