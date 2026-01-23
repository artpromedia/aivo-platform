import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../baseline/baseline_service.dart';

/// Domains for pre-generation
const preparingDomains = [
  {'name': 'Math', 'icon': Icons.calculate},
  {'name': 'Reading & Language', 'icon': Icons.menu_book},
  {'name': 'Spelling', 'icon': Icons.spellcheck},
  {'name': 'Speech & Language', 'icon': Icons.record_voice_over},
  {'name': 'Creative Writing', 'icon': Icons.edit_note},
  {'name': 'Social-Emotional', 'icon': Icons.favorite},
  {'name': 'Life Skills', 'icon': Icons.stars},
];

/// Screen shown while pre-generating questions based on parent assessment
class BaselinePreparingScreen extends ConsumerStatefulWidget {
  const BaselinePreparingScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
    this.assessmentType,
    this.accommodations,
    this.areasOfConcern,
    this.hasIep,
    this.has504,
    this.disabilityCategories,
  });

  final String learnerId;
  final String learnerName;
  
  /// Parent assessment data for personalized question generation
  final String? assessmentType;
  final List<String>? accommodations;
  final List<String>? areasOfConcern;
  final bool? hasIep;
  final bool? has504;
  final List<String>? disabilityCategories;

  @override
  ConsumerState<BaselinePreparingScreen> createState() => _BaselinePreparingScreenState();
}

class _BaselinePreparingScreenState extends ConsumerState<BaselinePreparingScreen>
    with TickerProviderStateMixin {
  late AnimationController _progressController;
  late AnimationController _pulseController;
  
  int _currentDomainIndex = 0;
  final List<bool> _completedDomains = List.filled(preparingDomains.length, false);
  bool _allComplete = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _startPreparation();
  }

  @override
  void dispose() {
    _progressController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _startPreparation() async {
    try {
      // Call the prepare baseline endpoint with parent assessment data
      final baselineService = ref.read(learnerBaselineServiceProvider);
      
      // Start animating domain progress
      for (int i = 0; i < preparingDomains.length; i++) {
        if (!mounted) return;
        
        setState(() => _currentDomainIndex = i);
        
        // First domain waits for API, rest animate to completion
        if (i == 0) {
          // Call prepare endpoint on first domain
          await baselineService.prepareBaseline(
            learnerId: widget.learnerId,
            assessmentType: widget.assessmentType ?? 'STANDARD',
            accommodations: widget.accommodations,
            areasOfConcern: widget.areasOfConcern,
            hasIep: widget.hasIep ?? false,
            has504: widget.has504 ?? false,
            disabilityCategories: widget.disabilityCategories,
          );
        } else {
          // Animate remaining domains
          await Future.delayed(Duration(milliseconds: 300 + (i * 100)));
        }
        
        if (!mounted) return;
        
        setState(() => _completedDomains[i] = true);
        _progressController.forward(from: 0);
      }
      
      if (!mounted) return;
      
      // All domains complete
      await Future.delayed(const Duration(milliseconds: 500));
      
      if (!mounted) return;
      
      setState(() => _allComplete = true);
      
      // Auto-navigate after a brief pause
      await Future.delayed(const Duration(seconds: 1));
      
      if (mounted) {
        context.go('/baseline/question');
      }
    } catch (e) {
      debugPrint('[BaselinePreparing] Error preparing questions: $e');
      if (mounted) {
        setState(() => _error = 'Failed to prepare questions. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = _completedDomains.where((c) => c).length / preparingDomains.length;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              theme.colorScheme.primary.withValues(alpha: 0.1),
              theme.colorScheme.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                
                // Animated icon
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    final scale = 1.0 + (_pulseController.value * 0.1);
                    return Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: theme.colorScheme.primary.withValues(alpha: 0.3),
                              blurRadius: 20,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: Icon(
                          _allComplete ? Icons.check_circle : Icons.auto_awesome,
                          size: 64,
                          color: _allComplete 
                              ? AivoBrand.success 
                              : theme.colorScheme.primary,
                        ),
                      ),
                    );
                  },
                ),
                
                const SizedBox(height: 40),
                
                // Title
                Text(
                  _allComplete 
                      ? 'All Ready! 🎉' 
                      : 'Preparing Your Questions...',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 12),
                
                // Subtitle
                Text(
                  _allComplete
                      ? 'Your personalized assessment is ready!'
                      : 'We\'re creating questions just for ${widget.learnerName}',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 48),
                
                // Progress bar
                Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 12,
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${(_completedDomains.where((c) => c).length)} of ${preparingDomains.length} domains ready',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 32),
                
                // Domain list
                Expanded(
                  child: ListView.builder(
                    itemCount: preparingDomains.length,
                    itemBuilder: (context, index) {
                      final domain = preparingDomains[index];
                      final isComplete = _completedDomains[index];
                      final isCurrent = index == _currentDomainIndex && !isComplete;
                      
                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isCurrent 
                              ? theme.colorScheme.primaryContainer.withValues(alpha: 0.5)
                              : isComplete 
                                  ? theme.colorScheme.surface
                                  : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                          border: isCurrent 
                              ? Border.all(color: theme.colorScheme.primary, width: 2)
                              : null,
                        ),
                        child: Row(
                          children: [
                            // Status icon
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isComplete 
                                    ? AivoBrand.success.withValues(alpha: 0.2)
                                    : isCurrent
                                        ? theme.colorScheme.primary.withValues(alpha: 0.2)
                                        : theme.colorScheme.surfaceContainerHighest,
                                shape: BoxShape.circle,
                              ),
                              child: isComplete
                                  ? Icon(Icons.check, color: AivoBrand.success, size: 20)
                                  : isCurrent
                                      ? SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: theme.colorScheme.primary,
                                          ),
                                        )
                                      : Icon(
                                          domain['icon'] as IconData,
                                          color: theme.colorScheme.onSurfaceVariant,
                                          size: 18,
                                        ),
                            ),
                            const SizedBox(width: 16),
                            
                            // Domain name
                            Expanded(
                              child: Text(
                                domain['name'] as String,
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  fontWeight: isCurrent || isComplete 
                                      ? FontWeight.w600 
                                      : FontWeight.normal,
                                  color: isCurrent 
                                      ? theme.colorScheme.primary
                                      : isComplete
                                          ? theme.colorScheme.onSurface
                                          : theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                            
                            // Status text
                            if (isComplete)
                              Text(
                                'Ready',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AivoBrand.success,
                                  fontWeight: FontWeight.w600,
                                ),
                              )
                            else if (isCurrent)
                              Text(
                                'Generating...',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                
                // Error message
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: theme.colorScheme.onErrorContainer),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: TextStyle(color: theme.colorScheme.onErrorContainer),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _error = null;
                                _currentDomainIndex = 0;
                                _completedDomains.fillRange(0, _completedDomains.length, false);
                              });
                              _startPreparation();
                            },
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  ),
                
                // Start button (shown when complete)
                if (_allComplete)
                  FilledButton.icon(
                    onPressed: () => context.go('/baseline/question'),
                    icon: const Icon(Icons.play_arrow),
                    label: const Text("Let's Go!"),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(double.infinity, 56),
                    ),
                  ),
                
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
