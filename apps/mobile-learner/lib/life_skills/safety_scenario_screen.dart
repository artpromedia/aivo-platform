/// Safety Scenario Screen
/// 
/// Interactive safety training scenarios that teach learners
/// how to handle potentially dangerous situations.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'life_skills_models.dart';
import 'life_skills_service.dart';

/// Safety Scenario Screen - interactive safety decision training
class SafetyScenarioScreen extends StatefulWidget {
  final LifeSkillsService service;
  final String tenantId;
  final String learnerId;
  final SafetyScenario scenario;

  const SafetyScenarioScreen({
    super.key,
    required this.service,
    required this.tenantId,
    required this.learnerId,
    required this.scenario,
  });

  @override
  State<SafetyScenarioScreen> createState() => _SafetyScenarioScreenState();
}

class _SafetyScenarioScreenState extends State<SafetyScenarioScreen>
    with SingleTickerProviderStateMixin {
  bool _isLoading = false;
  SafetyChoice? _selectedChoice;
  bool _hasSubmitted = false;
  DecisionOutcome? _outcome;
  AIGuidance? _coaching;
  late AnimationController _resultController;
  
  @override
  void initState() {
    super.initState();
    _resultController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
  }

  @override
  void dispose() {
    _resultController.dispose();
    super.dispose();
  }

  Future<void> _submitChoice() async {
    if (_selectedChoice == null) return;

    setState(() => _isLoading = true);

    try {
      final result = await widget.service.recordSafetyAttempt(
        tenantId: widget.tenantId,
        learnerId: widget.learnerId,
        scenarioId: widget.scenario.id,
        choiceId: _selectedChoice!.id,
        responseTimeMs: 5000, // TODO: Measure actual time
      );

      final attempt = result['attempt'] as Map<String, dynamic>;
      _outcome = DecisionOutcome.fromString(attempt['outcome'] as String);

      // Use the selected choice's explanation as coaching
      _coaching = AIGuidance(
        guidance: _selectedChoice!.explanation,
        visualCue: null,
        audioPrompt: null,
      );

      setState(() => _hasSubmitted = true);
      _resultController.forward();

      HapticFeedback.mediumImpact();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _tryAgain() {
    setState(() {
      _selectedChoice = null;
      _hasSubmitted = false;
      _outcome = null;
      _coaching = null;
    });
    _resultController.reset();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scenario = widget.scenario;

    return Scaffold(
      appBar: AppBar(
        title: Text(scenario.scenarioType.displayName),
        actions: [
          Chip(
            avatar: Icon(
              Icons.warning_amber,
              size: 16,
              color: scenario.scenarioType.color,
            ),
            label: Text(scenario.scenarioType.displayName),
            backgroundColor: scenario.scenarioType.color.withOpacity(0.1),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Scenario header image
            if (scenario.sceneImageUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  scenario.sceneImageUrl!,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _buildPlaceholder(scenario),
                ),
              )
            else
              _buildPlaceholder(scenario),
            const SizedBox(height: 24),

            // Title
            Text(
              scenario.title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),

            // Scenario description
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.record_voice_over,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'The Situation',
                            style: theme.textTheme.titleSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            scenario.sceneDescription,
                            style: theme.textTheme.bodyLarge,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Question prompt
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.tertiaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.help_outline,
                    color: theme.colorScheme.onTertiaryContainer,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      scenario.decisionPrompt,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.onTertiaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Choices
            Text(
              'What would you do?',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 12),

            ...scenario.choices.map((choice) {
              final isSelected = _selectedChoice?.id == choice.id;
              final showResult = _hasSubmitted && isSelected;
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: SafetyChoiceCard(
                  choice: choice,
                  isSelected: isSelected,
                  isDisabled: _hasSubmitted,
                  showResult: showResult,
                  onTap: _hasSubmitted
                      ? null
                      : () => setState(() => _selectedChoice = choice),
                ),
              );
            }),

            // Result section
            if (_hasSubmitted) ...[
              const SizedBox(height: 16),
              _buildResultSection(theme),
            ],

            // Bottom padding
            const SizedBox(height: 100),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
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
          child: _hasSubmitted
              ? Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _tryAgain,
                        child: const Text('Try Again'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Continue'),
                      ),
                    ),
                  ],
                )
              : FilledButton(
                  onPressed: _selectedChoice == null || _isLoading
                      ? null
                      : _submitChoice,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Submit My Answer'),
                ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder(SafetyScenario scenario) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scenario.scenarioType.color.withOpacity(0.3),
            scenario.scenarioType.color.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Center(
        child: Icon(
          _getScenarioIcon(scenario.scenarioType),
          size: 64,
          color: scenario.scenarioType.color,
        ),
      ),
    );
  }

  IconData _getScenarioIcon(SafetyScenarioType type) {
    switch (type) {
      case SafetyScenarioType.strangerAwareness:
        return Icons.person_off;
      case SafetyScenarioType.roadCrossing:
        return Icons.directions_walk;
      case SafetyScenarioType.fireSafety:
        return Icons.local_fire_department;
      case SafetyScenarioType.waterSafety:
        return Icons.pool;
      case SafetyScenarioType.onlineSafety:
        return Icons.computer;
      case SafetyScenarioType.bodySafety:
        return Icons.shield;
      case SafetyScenarioType.emergencyResponse:
        return Icons.emergency;
      case SafetyScenarioType.homeSafety:
        return Icons.home;
    }
  }

  Widget _buildResultSection(ThemeData theme) {
    final isCorrect = _outcome == DecisionOutcome.safe;
    final resultColor = isCorrect ? Colors.green : Colors.orange;

    return AnimatedBuilder(
      animation: _resultController,
      builder: (context, child) {
        return Transform.scale(
          scale: 0.8 + (_resultController.value * 0.2),
          child: Opacity(
            opacity: _resultController.value,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Result header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: resultColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: resultColor),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isCorrect ? Icons.check_circle : Icons.info,
                        color: resultColor,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isCorrect
                                  ? 'Great choice! 🎉'
                                  : 'Let\'s think about this',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: resultColor,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _selectedChoice?.feedbackText ?? '',
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Correct answer (if wrong)
                if (!isCorrect) ...[
                  const SizedBox(height: 16),
                  Card(
                    color: Colors.green.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.lightbulb, color: Colors.green),
                              const SizedBox(width: 8),
                              Text(
                                'The Safest Choice',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  color: Colors.green.shade700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ...widget.scenario.choices
                              .where((c) => c.outcome == DecisionOutcome.safe)
                              .map((c) => Text(
                                    '✓ ${c.choiceText}',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: Colors.green.shade700,
                                    ),
                                  )),
                        ],
                      ),
                    ),
                  ),
                ],

                // AI Coaching
                if (_coaching != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.psychology, color: Colors.purple),
                              const SizedBox(width: 8),
                              Text(
                                'Coach Says',
                                style: theme.textTheme.titleSmall,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _coaching!.guidance,
                            style: theme.textTheme.bodyMedium,
                          ),
                          if (_coaching!.visualCue != null) ...[
                            const SizedBox(height: 8),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('💡 '),
                                Expanded(child: Text(_coaching!.visualCue!)),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Safety Choice Card - displays a selectable safety choice option
class SafetyChoiceCard extends StatelessWidget {
  final SafetyChoice choice;
  final bool isSelected;
  final bool isDisabled;
  final bool showResult;
  final VoidCallback? onTap;

  const SafetyChoiceCard({
    super.key,
    required this.choice,
    required this.isSelected,
    required this.isDisabled,
    required this.showResult,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Color? backgroundColor;
    Color? borderColor;
    
    if (showResult) {
      final isCorrect = choice.outcome == DecisionOutcome.safe;
      backgroundColor = isCorrect
          ? Colors.green.withOpacity(0.1)
          : Colors.orange.withOpacity(0.1);
      borderColor = isCorrect ? Colors.green : Colors.orange;
    } else if (isSelected) {
      backgroundColor = theme.colorScheme.primaryContainer;
      borderColor = theme.colorScheme.primary;
    }

    return InkWell(
      onTap: isDisabled ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: backgroundColor ?? theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: borderColor ?? theme.colorScheme.outline.withOpacity(0.3),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Selection indicator or result icon
            if (showResult)
              Icon(
                choice.outcome == DecisionOutcome.safe
                    ? Icons.check_circle
                    : Icons.info,
                color: choice.outcome == DecisionOutcome.safe
                    ? Colors.green
                    : Colors.orange,
              )
            else if (isSelected)
              Icon(Icons.check_circle, color: theme.colorScheme.primary)
            else
              Icon(
                Icons.radio_button_unchecked,
                color: theme.colorScheme.outline,
              ),
            const SizedBox(width: 12),
            
            // Choice text
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    choice.choiceText,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: isSelected ? FontWeight.bold : null,
                    ),
                  ),
                  if (choice.choiceSymbolUrl != null) ...[
                    const SizedBox(height: 8),
                    Image.network(
                      choice.choiceSymbolUrl!,
                      height: 40,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Safety Practice Section - used in the life skills hub
class SafetyPracticeSection extends StatefulWidget {
  final LifeSkillsService service;
  final String tenantId;
  final String learnerId;

  const SafetyPracticeSection({
    super.key,
    required this.service,
    required this.tenantId,
    required this.learnerId,
  });

  @override
  State<SafetyPracticeSection> createState() => _SafetyPracticeSectionState();
}

class _SafetyPracticeSectionState extends State<SafetyPracticeSection> {
  List<SafetyScenario> _scenarios = [];
  SafetyScenario? _recommendedScenario;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadScenarios();
  }

  Future<void> _loadScenarios() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        widget.service.getSafetyScenarios(tenantId: widget.tenantId),
        widget.service.getNextPracticeScenario(
          tenantId: widget.tenantId,
          learnerId: widget.learnerId,
        ).catchError((_) => null),
      ]);

      setState(() {
        _scenarios = results[0] as List<SafetyScenario>;
        _recommendedScenario = results[1] as SafetyScenario?;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
            Text('Could not load safety scenarios'),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: _loadScenarios,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadScenarios,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Text(
            'Safety Training',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Practice making safe choices in different situations',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 24),

          // Recommended scenario
          if (_recommendedScenario != null) ...[
            Text(
              'Recommended for You',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            SafetyScenarioCard(
              scenario: _recommendedScenario!,
              isRecommended: true,
              onTap: () => _openScenario(_recommendedScenario!),
            ),
            const SizedBox(height: 24),
          ],

          // All scenarios by type
          Text(
            'All Safety Scenarios',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 12),

          // Group scenarios by type
          ..._groupByType(_scenarios).entries.map((entry) {
            final type = entry.key;
            final typeScenarios = entry.value;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        _getTypeIcon(type),
                        size: 20,
                        color: type.color,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        type.displayName,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: type.color,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '(${typeScenarios.length})',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                ...typeScenarios.map((scenario) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: SafetyScenarioCard(
                        scenario: scenario,
                        onTap: () => _openScenario(scenario),
                      ),
                    )),
                const SizedBox(height: 8),
              ],
            );
          }),
        ],
      ),
    );
  }

  Map<SafetyScenarioType, List<SafetyScenario>> _groupByType(List<SafetyScenario> scenarios) {
    final grouped = <SafetyScenarioType, List<SafetyScenario>>{};
    for (final scenario in scenarios) {
      grouped.putIfAbsent(scenario.scenarioType, () => []).add(scenario);
    }
    return grouped;
  }

  IconData _getTypeIcon(SafetyScenarioType type) {
    switch (type) {
      case SafetyScenarioType.strangerAwareness:
        return Icons.person_off;
      case SafetyScenarioType.roadCrossing:
        return Icons.directions_walk;
      case SafetyScenarioType.fireSafety:
        return Icons.local_fire_department;
      case SafetyScenarioType.waterSafety:
        return Icons.pool;
      case SafetyScenarioType.onlineSafety:
        return Icons.computer;
      case SafetyScenarioType.bodySafety:
        return Icons.shield;
      case SafetyScenarioType.emergencyResponse:
        return Icons.emergency;
      case SafetyScenarioType.homeSafety:
        return Icons.home;
    }
  }

  void _openScenario(SafetyScenario scenario) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => SafetyScenarioScreen(
          service: widget.service,
          tenantId: widget.tenantId,
          learnerId: widget.learnerId,
          scenario: scenario,
        ),
      ),
    ).then((_) => _loadScenarios());
  }
}

/// Safety Scenario Card - card for displaying a safety scenario in lists
class SafetyScenarioCard extends StatelessWidget {
  final SafetyScenario scenario;
  final bool isRecommended;
  final VoidCallback? onTap;

  const SafetyScenarioCard({
    super.key,
    required this.scenario,
    this.isRecommended = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: isRecommended ? 4 : 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Icon/Image
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: scenario.scenarioType.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: scenario.sceneImageUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          scenario.sceneImageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.security,
                            color: scenario.scenarioType.color,
                          ),
                        ),
                      )
                    : Icon(
                        Icons.security,
                        color: scenario.scenarioType.color,
                        size: 32,
                      ),
              ),
              const SizedBox(width: 16),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isRecommended)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        margin: const EdgeInsets.only(bottom: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'RECOMMENDED',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onPrimary,
                          ),
                        ),
                      ),
                    Text(
                      scenario.title,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      scenario.sceneDescription,
                      style: theme.textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Arrow
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
