import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../learners/learner_service.dart';

/// IDEA Disability Categories
const ideaDisabilityCategories = [
  {'value': 'autism', 'label': 'Autism Spectrum Disorder'},
  {'value': 'deaf_blindness', 'label': 'Deaf-Blindness'},
  {'value': 'deafness', 'label': 'Deafness'},
  {'value': 'emotional_disturbance', 'label': 'Emotional Disturbance'},
  {'value': 'hearing_impairment', 'label': 'Hearing Impairment'},
  {'value': 'intellectual_disability', 'label': 'Intellectual Disability'},
  {'value': 'multiple_disabilities', 'label': 'Multiple Disabilities'},
  {'value': 'orthopedic_impairment', 'label': 'Orthopedic Impairment'},
  {'value': 'other_health_impairment', 'label': 'Other Health Impairment (ADHD, etc.)'},
  {'value': 'specific_learning_disability', 'label': 'Specific Learning Disability (dyslexia, etc.)'},
  {'value': 'speech_language_impairment', 'label': 'Speech or Language Impairment'},
  {'value': 'traumatic_brain_injury', 'label': 'Traumatic Brain Injury'},
  {'value': 'visual_impairment', 'label': 'Visual Impairment'},
  {'value': 'developmental_delay', 'label': 'Developmental Delay (ages 3-9)'},
];

/// Parent Assessment Screen - IDEA/Section 504 Aligned
/// 
/// Comprehensive assessment to gather information about the child's needs
/// following IDEA and Section 504 standards.
class ParentAssessmentScreen extends ConsumerStatefulWidget {
  const ParentAssessmentScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<ParentAssessmentScreen> createState() => _ParentAssessmentScreenState();
}

class _ParentAssessmentScreenState extends ConsumerState<ParentAssessmentScreen> {
  int _currentStep = 0;
  bool _isSubmitting = false;
  String? _error;

  // Step 1: Existing Documentation
  String _hasIep = 'no';
  String _has504 = 'no';
  final Set<String> _selectedDisabilities = {};

  // Step 2: Communication & Language
  String _receptiveLanguage = 'age_appropriate';
  String _expressiveLanguage = 'age_appropriate';
  String _primaryCommunication = 'verbal';

  // Step 3: Cognitive & Academic
  String _learningPace = 'typical';
  String _readingLevel = 'grade_level';
  String _mathLevel = 'grade_level';

  // Step 4: Motor Skills
  String _fineMotor = 'age_appropriate';
  String _grossMotor = 'age_appropriate';

  // Step 5: Social-Emotional
  String _socialInteraction = 'typical';
  String _emotionalRegulation = 'typical';
  String _behavioralConcerns = 'none';

  // Step 6: Sensory & Attention
  String _sensoryProcessing = 'typical';
  String _attentionFocus = 'typical';

  // Step 7: Current Services & Strengths
  final Set<String> _currentServices = {};
  final Set<String> _assistiveTech = {};
  final Set<String> _selectedStrengths = {};
  final _additionalNotesController = TextEditingController();

  /// Available strength options for parents to select
  static const List<String> _strengthOptions = [
    'Creative thinking',
    'Problem solving',
    'Memory skills',
    'Visual learning',
    'Hands-on learning',
    'Music and rhythm',
    'Art and drawing',
    'Physical activities',
    'Building and construction',
    'Verbal expression',
    'Reading comprehension',
    'Math skills',
    'Attention to detail',
    'Working with others',
    'Self-motivated',
    'Curious and inquisitive',
    'Kind and empathetic',
    'Persistent and determined',
  ];

  @override
  void dispose() {
    _additionalNotesController.dispose();
    super.dispose();
  }

  /// Calculate assessment type based on responses
  AssessmentType _calculateAssessmentType() {
    int modifiedScore = 0;
    int alternateScore = 0;
    int accommodationScore = 0;

    // Check IEP/504
    if (_hasIep == 'yes_current') accommodationScore += 2;
    if (_has504 == 'yes_current') accommodationScore += 1;

    // Check disability categories
    final significantDisabilities = ['intellectual_disability', 'multiple_disabilities', 'deaf_blindness'];
    for (final disability in _selectedDisabilities) {
      if (significantDisabilities.contains(disability)) {
        alternateScore += 3;
      } else {
        modifiedScore += 1;
      }
    }

    // Check communication
    if (_receptiveLanguage == 'significant_difficulty') alternateScore += 2;
    if (_receptiveLanguage == 'some_difficulty') modifiedScore += 1;
    if (_expressiveLanguage == 'significant_difficulty') alternateScore += 2;
    if (_expressiveLanguage == 'some_difficulty') modifiedScore += 1;
    if (_primaryCommunication != 'verbal') modifiedScore += 1;

    // Check cognitive/academic
    if (_learningPace == 'much_slower') alternateScore += 2;
    if (_learningPace == 'slower') modifiedScore += 1;
    if (_readingLevel == 'significantly_below') alternateScore += 2;
    if (_readingLevel == 'below') modifiedScore += 1;

    // Check motor skills
    if (_fineMotor == 'significant_difficulty') modifiedScore += 1;
    if (_grossMotor == 'significant_difficulty') modifiedScore += 1;

    // Check social-emotional
    if (_emotionalRegulation == 'significant_difficulty') modifiedScore += 1;

    // Check sensory/attention
    if (_sensoryProcessing == 'significant_difficulty') modifiedScore += 1;
    if (_attentionFocus == 'significant_difficulty') modifiedScore += 1;

    // Check services
    accommodationScore += _currentServices.length;
    accommodationScore += _assistiveTech.length;

    // Determine assessment type
    if (alternateScore >= 5) {
      return AssessmentType.alternate;
    } else if (modifiedScore >= 4 || alternateScore >= 3) {
      return AssessmentType.modified;
    } else if (accommodationScore >= 2 || modifiedScore >= 2) {
      return AssessmentType.standardWithAccommodations;
    } else {
      return AssessmentType.standard;
    }
  }

  /// Calculate support level (0-100, higher = more support needed)
  int _calculateSupportLevel() {
    int level = 100;

    // Reduce for difficulties
    if (_receptiveLanguage == 'significant_difficulty') level -= 15;
    if (_receptiveLanguage == 'some_difficulty') level -= 5;
    if (_expressiveLanguage == 'significant_difficulty') level -= 15;
    if (_expressiveLanguage == 'some_difficulty') level -= 5;
    if (_learningPace == 'much_slower') level -= 15;
    if (_learningPace == 'slower') level -= 5;
    if (_readingLevel == 'significantly_below') level -= 10;
    if (_readingLevel == 'below') level -= 5;
    if (_fineMotor == 'significant_difficulty') level -= 5;
    if (_grossMotor == 'significant_difficulty') level -= 5;
    if (_emotionalRegulation == 'significant_difficulty') level -= 10;
    if (_sensoryProcessing == 'significant_difficulty') level -= 5;
    if (_attentionFocus == 'significant_difficulty') level -= 10;

    // Add for services (shows awareness of needs)
    level += _currentServices.length * 2;
    level += _assistiveTech.length * 2;

    return level.clamp(20, 100);
  }

  /// Generate areas of concern from responses
  List<String> _generateAreasOfConcern() {
    final concerns = <String>[];

    if (_receptiveLanguage != 'age_appropriate') {
      concerns.add('Receptive language (understanding spoken language)');
    }
    if (_expressiveLanguage != 'age_appropriate') {
      concerns.add('Expressive communication');
    }
    if (_learningPace != 'typical') {
      concerns.add('Learning pace and processing');
    }
    if (_readingLevel != 'grade_level') {
      concerns.add('Reading skills');
    }
    if (_mathLevel != 'grade_level') {
      concerns.add('Math skills');
    }
    if (_fineMotor != 'age_appropriate') {
      concerns.add('Fine motor skills');
    }
    if (_grossMotor != 'age_appropriate') {
      concerns.add('Gross motor skills');
    }
    if (_socialInteraction != 'typical') {
      concerns.add('Social interaction');
    }
    if (_emotionalRegulation != 'typical') {
      concerns.add('Emotional regulation');
    }
    if (_sensoryProcessing != 'typical') {
      concerns.add('Sensory processing');
    }
    if (_attentionFocus != 'typical') {
      concerns.add('Attention and focus');
    }
    if (_behavioralConcerns != 'none') {
      concerns.add('Behavioral considerations');
    }

    return concerns;
  }

  /// Generate accommodations based on assessment type
  List<String> _generateAccommodations(AssessmentType type) {
    switch (type) {
      case AssessmentType.alternate:
        return [
          '1:1 support',
          'Performance-based tasks',
          'Adaptive interface',
          'Communication supports',
          'Physical assistance as needed',
          'Extended time',
        ];
      case AssessmentType.modified:
        return [
          'Simplified language',
          'Visual supports',
          'Alternative response options',
          'Shorter sessions',
          'Audio support',
          'Frequent breaks',
        ];
      case AssessmentType.standardWithAccommodations:
        return [
          'Extended time',
          'Frequent breaks',
          'Simplified interface',
        ];
      case AssessmentType.standard:
        return [];
    }
  }

  Future<void> _submitAssessment() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final assessmentType = _calculateAssessmentType();
      final supportLevel = _calculateSupportLevel();
      final areasOfConcern = _generateAreasOfConcern();
      final accommodations = _generateAccommodations(assessmentType);

      // Build assessment data for saving
      final assessmentData = ParentAssessmentData(
        assessmentType: assessmentType,
        hasIep: _hasIep == 'yes_current',
        has504: _has504 == 'yes_current',
        disabilityCategories: _selectedDisabilities.toList(),
        areasOfConcern: areasOfConcern,
        strengths: _selectedStrengths.toList(),
        accommodations: accommodations,
        currentServices: _currentServices.toList(),
        assistiveTechnology: _assistiveTech.toList(),
        supportLevel: supportLevel,
        completedAt: DateTime.now(),
      );

      // Save assessment data to backend
      await ref.read(learnerServiceProvider).saveParentAssessment(
        widget.learnerId,
        assessmentData,
      );
      debugPrint('[ParentAssessment] Assessment saved for learner: ${widget.learnerId}');

      if (mounted) {
        await _showCompletionDialog(assessmentType, accommodations);
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to submit assessment. Please try again.';
        _isSubmitting = false;
      });
    }
  }

  Future<void> _showCompletionDialog(AssessmentType type, List<String> accommodations) async {
    final theme = Theme.of(context);
    
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: AivoBrand.success, size: 28),
            const SizedBox(width: 12),
            const Expanded(child: Text('Assessment Complete!')),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Based on your responses, we recommend:',
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _getTypeIcon(type),
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          type.label,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (accommodations.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Accommodations included:',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...accommodations.take(4).map((acc) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Icon(
                            Icons.check,
                            size: 16,
                            color: AivoBrand.success,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(acc, style: theme.textTheme.bodySmall)),
                        ],
                      ),
                    )),
                    if (accommodations.length > 4)
                      Text(
                        '+${accommodations.length - 4} more',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '${widget.learnerName} is ready to begin the baseline assessment!',
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/dashboard');
            },
            child: const Text('Continue to Dashboard'),
          ),
        ],
      ),
    );
  }

  IconData _getTypeIcon(AssessmentType type) {
    switch (type) {
      case AssessmentType.alternate:
        return Icons.accessibility_new;
      case AssessmentType.modified:
        return Icons.tune;
      case AssessmentType.standardWithAccommodations:
        return Icons.timer;
      case AssessmentType.standard:
        return Icons.school;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text("${widget.learnerName}'s Assessment"),
        actions: [
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Skip for Now'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress indicator
          LinearProgressIndicator(
            value: (_currentStep + 1) / 7,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Step ${_currentStep + 1} of 7',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  _getStepTitle(_currentStep),
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Step content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _buildStepContent(),
            ),
          ),

          // Error message
          if (_error != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
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
                ],
              ),
            ),

          // Navigation buttons
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (_currentStep > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isSubmitting ? null : () {
                          setState(() => _currentStep--);
                        },
                        child: const Text('Back'),
                      ),
                    ),
                  if (_currentStep > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _isSubmitting ? null : () {
                        if (_currentStep < 6) {
                          setState(() => _currentStep++);
                        } else {
                          _submitAssessment();
                        }
                      },
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_currentStep < 6 ? 'Continue' : 'Complete Assessment'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 0: return 'Existing Documentation';
      case 1: return 'Communication';
      case 2: return 'Learning & Academics';
      case 3: return 'Motor Skills';
      case 4: return 'Social-Emotional';
      case 5: return 'Sensory & Attention';
      case 6: return 'Current Services';
      default: return '';
    }
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0: return _buildDocumentationStep();
      case 1: return _buildCommunicationStep();
      case 2: return _buildAcademicStep();
      case 3: return _buildMotorStep();
      case 4: return _buildSocialEmotionalStep();
      case 5: return _buildSensoryAttentionStep();
      case 6: return _buildServicesStep();
      default: return const SizedBox.shrink();
    }
  }

  Widget _buildDocumentationStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          'This information helps us provide the most appropriate assessment for ${widget.learnerName}.',
          Icons.info_outline,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Does ${widget.learnerName} have an Individualized Education Program (IEP)?',
          'An IEP is a legally binding document for special education services under IDEA.',
        ),
        _buildRadioGroup(
          value: _hasIep,
          onChanged: (v) => setState(() => _hasIep = v!),
          options: const [
            {'value': 'yes_current', 'label': 'Yes, currently active'},
            {'value': 'yes_expired', 'label': 'Yes, but expired'},
            {'value': 'in_process', 'label': 'Being evaluated'},
            {'value': 'no', 'label': 'No'},
            {'value': 'unsure', 'label': "I'm not sure"},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Does ${widget.learnerName} have a Section 504 Plan?',
          'A 504 Plan provides accommodations for students with disabilities.',
        ),
        _buildRadioGroup(
          value: _has504,
          onChanged: (v) => setState(() => _has504 = v!),
          options: const [
            {'value': 'yes_current', 'label': 'Yes, currently active'},
            {'value': 'yes_expired', 'label': 'Yes, but expired'},
            {'value': 'in_process', 'label': 'Being evaluated'},
            {'value': 'no', 'label': 'No'},
            {'value': 'unsure', 'label': "I'm not sure"},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Has ${widget.learnerName} been identified with any of the following?',
          'These are the disability categories under IDEA. Select all that apply.',
        ),
        _buildCheckboxGroup(
          selected: _selectedDisabilities,
          onChanged: (v) => setState(() {
            if (_selectedDisabilities.contains(v)) {
              _selectedDisabilities.remove(v);
            } else {
              _selectedDisabilities.add(v);
            }
          }),
          options: ideaDisabilityCategories,
        ),
      ],
    );
  }

  Widget _buildCommunicationStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          'Help us understand how ${widget.learnerName} communicates.',
          Icons.chat_bubble_outline,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'How well does ${widget.learnerName} understand spoken language?',
          null,
        ),
        _buildRadioGroup(
          value: _receptiveLanguage,
          onChanged: (v) => setState(() => _receptiveLanguage = v!),
          options: const [
            {'value': 'age_appropriate', 'label': 'Age-appropriate understanding'},
            {'value': 'some_difficulty', 'label': 'Some difficulty with complex language'},
            {'value': 'significant_difficulty', 'label': 'Significant difficulty understanding'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          "How well does ${widget.learnerName} express thoughts and needs?",
          null,
        ),
        _buildRadioGroup(
          value: _expressiveLanguage,
          onChanged: (v) => setState(() => _expressiveLanguage = v!),
          options: const [
            {'value': 'age_appropriate', 'label': 'Communicates clearly for age'},
            {'value': 'some_difficulty', 'label': 'Some difficulty expressing'},
            {'value': 'significant_difficulty', 'label': 'Significant difficulty'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          "What is ${widget.learnerName}'s primary mode of communication?",
          null,
        ),
        _buildRadioGroup(
          value: _primaryCommunication,
          onChanged: (v) => setState(() => _primaryCommunication = v!),
          options: const [
            {'value': 'verbal', 'label': 'Verbal speech'},
            {'value': 'sign_language', 'label': 'Sign language'},
            {'value': 'aac', 'label': 'AAC device'},
            {'value': 'combination', 'label': 'Combination'},
          ],
        ),
      ],
    );
  }

  Widget _buildAcademicStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          "Tell us about ${widget.learnerName}'s learning style.",
          Icons.school_outlined,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          "How would you describe ${widget.learnerName}'s learning pace?",
          null,
        ),
        _buildRadioGroup(
          value: _learningPace,
          onChanged: (v) => setState(() => _learningPace = v!),
          options: const [
            {'value': 'faster', 'label': 'Learns quickly'},
            {'value': 'typical', 'label': 'Typical pace'},
            {'value': 'slower', 'label': 'Needs more time'},
            {'value': 'much_slower', 'label': 'Needs significantly more time'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          "How is ${widget.learnerName}'s reading compared to grade level?",
          null,
        ),
        _buildRadioGroup(
          value: _readingLevel,
          onChanged: (v) => setState(() => _readingLevel = v!),
          options: const [
            {'value': 'above', 'label': 'Above grade level'},
            {'value': 'grade_level', 'label': 'At grade level'},
            {'value': 'below', 'label': 'Below grade level'},
            {'value': 'significantly_below', 'label': 'Significantly below'},
            {'value': 'non_reader', 'label': 'Not yet reading'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          "How is ${widget.learnerName}'s math compared to grade level?",
          null,
        ),
        _buildRadioGroup(
          value: _mathLevel,
          onChanged: (v) => setState(() => _mathLevel = v!),
          options: const [
            {'value': 'above', 'label': 'Above grade level'},
            {'value': 'grade_level', 'label': 'At grade level'},
            {'value': 'below', 'label': 'Below grade level'},
            {'value': 'significantly_below', 'label': 'Significantly below'},
          ],
        ),
      ],
    );
  }

  Widget _buildMotorStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          "Help us understand ${widget.learnerName}'s motor abilities.",
          Icons.accessibility_new,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Fine motor skills (writing, using scissors, buttons):',
          null,
        ),
        _buildRadioGroup(
          value: _fineMotor,
          onChanged: (v) => setState(() => _fineMotor = v!),
          options: const [
            {'value': 'age_appropriate', 'label': 'Age-appropriate'},
            {'value': 'some_difficulty', 'label': 'Some difficulty'},
            {'value': 'significant_difficulty', 'label': 'Significant difficulty'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Gross motor skills (running, climbing, balance):',
          null,
        ),
        _buildRadioGroup(
          value: _grossMotor,
          onChanged: (v) => setState(() => _grossMotor = v!),
          options: const [
            {'value': 'age_appropriate', 'label': 'Age-appropriate'},
            {'value': 'some_difficulty', 'label': 'Some difficulty'},
            {'value': 'significant_difficulty', 'label': 'Significant difficulty'},
          ],
        ),
      ],
    );
  }

  Widget _buildSocialEmotionalStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          "Tell us about ${widget.learnerName}'s social and emotional development.",
          Icons.people_outline,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'How does ${widget.learnerName} interact with peers?',
          null,
        ),
        _buildRadioGroup(
          value: _socialInteraction,
          onChanged: (v) => setState(() => _socialInteraction = v!),
          options: const [
            {'value': 'typical', 'label': 'Typical interactions'},
            {'value': 'some_difficulty', 'label': 'Some difficulty'},
            {'value': 'significant_difficulty', 'label': 'Significant difficulty'},
            {'value': 'prefers_alone', 'label': 'Prefers to be alone'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'How well does ${widget.learnerName} manage emotions?',
          null,
        ),
        _buildRadioGroup(
          value: _emotionalRegulation,
          onChanged: (v) => setState(() => _emotionalRegulation = v!),
          options: const [
            {'value': 'typical', 'label': 'Manages emotions well'},
            {'value': 'some_difficulty', 'label': 'Sometimes struggles'},
            {'value': 'significant_difficulty', 'label': 'Often struggles'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Any behavioral concerns?',
          null,
        ),
        _buildRadioGroup(
          value: _behavioralConcerns,
          onChanged: (v) => setState(() => _behavioralConcerns = v!),
          options: const [
            {'value': 'none', 'label': 'No concerns'},
            {'value': 'mild', 'label': 'Mild concerns'},
            {'value': 'moderate', 'label': 'Moderate concerns'},
            {'value': 'significant', 'label': 'Significant concerns'},
          ],
        ),
      ],
    );
  }

  Widget _buildSensoryAttentionStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          "Help us understand ${widget.learnerName}'s sensory and attention needs.",
          Icons.psychology_outlined,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Sensory processing (reactions to sounds, textures, lights):',
          null,
        ),
        _buildRadioGroup(
          value: _sensoryProcessing,
          onChanged: (v) => setState(() => _sensoryProcessing = v!),
          options: const [
            {'value': 'typical', 'label': 'Typical responses'},
            {'value': 'some_sensitivities', 'label': 'Some sensitivities'},
            {'value': 'significant_difficulty', 'label': 'Significant sensitivities'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Attention and focus:',
          null,
        ),
        _buildRadioGroup(
          value: _attentionFocus,
          onChanged: (v) => setState(() => _attentionFocus = v!),
          options: const [
            {'value': 'typical', 'label': 'Focuses well for age'},
            {'value': 'some_difficulty', 'label': 'Sometimes distracted'},
            {'value': 'significant_difficulty', 'label': 'Often distracted'},
          ],
        ),
      ],
    );
  }

  Widget _buildServicesStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoCard(
          "What services does ${widget.learnerName} currently receive?",
          Icons.support_outlined,
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Current services (select all that apply):',
          null,
        ),
        _buildCheckboxGroup(
          selected: _currentServices,
          onChanged: (v) => setState(() {
            if (_currentServices.contains(v)) {
              _currentServices.remove(v);
            } else {
              _currentServices.add(v);
            }
          }),
          options: const [
            {'value': 'speech_therapy', 'label': 'Speech Therapy'},
            {'value': 'occupational_therapy', 'label': 'Occupational Therapy'},
            {'value': 'physical_therapy', 'label': 'Physical Therapy'},
            {'value': 'aba_therapy', 'label': 'ABA Therapy'},
            {'value': 'counseling', 'label': 'Counseling/Psychology'},
            {'value': 'reading_specialist', 'label': 'Reading Specialist'},
            {'value': 'resource_room', 'label': 'Resource Room'},
            {'value': 'paraprofessional', 'label': '1:1 Aide'},
            {'value': 'none', 'label': 'No current services'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Assistive technology used:',
          null,
        ),
        _buildCheckboxGroup(
          selected: _assistiveTech,
          onChanged: (v) => setState(() {
            if (_assistiveTech.contains(v)) {
              _assistiveTech.remove(v);
            } else {
              _assistiveTech.add(v);
            }
          }),
          options: const [
            {'value': 'text_to_speech', 'label': 'Text-to-Speech'},
            {'value': 'speech_to_text', 'label': 'Speech-to-Text'},
            {'value': 'aac_device', 'label': 'AAC Device'},
            {'value': 'fm_system', 'label': 'FM System'},
            {'value': 'screen_reader', 'label': 'Screen Reader'},
            {'value': 'magnification', 'label': 'Screen Magnification'},
            {'value': 'alt_keyboard', 'label': 'Alternative Keyboard'},
            {'value': 'none', 'label': 'None'},
          ],
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          "${widget.learnerName}'s strengths (select all that apply):",
          "Help us understand what ${widget.learnerName} excels at so we can build on these strengths.",
        ),
        _buildCheckboxGroup(
          selected: _selectedStrengths,
          onChanged: (v) => setState(() {
            if (_selectedStrengths.contains(v)) {
              _selectedStrengths.remove(v);
            } else {
              _selectedStrengths.add(v);
            }
          }),
          options: _strengthOptions.map((s) => {'value': s, 'label': s}).toList(),
        ),
        const SizedBox(height: 24),
        _buildQuestion(
          'Anything else we should know?',
          'Optional: Share any additional information that might help us support ${widget.learnerName}.',
        ),
        TextField(
          controller: _additionalNotesController,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Enter any additional notes...',
            border: OutlineInputBorder(),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(String message, IconData icon) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: theme.colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(message, style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestion(String question, String? helpText) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          question,
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        if (helpText != null) ...[
          const SizedBox(height: 4),
          Text(
            helpText,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildRadioGroup({
    required String value,
    required void Function(String?) onChanged,
    required List<Map<String, String>> options,
  }) {
    return Column(
      children: options.map((option) {
        return RadioListTile<String>(
          value: option['value']!,
          groupValue: value,
          onChanged: onChanged,
          title: Text(option['label']!),
          contentPadding: EdgeInsets.zero,
          dense: true,
        );
      }).toList(),
    );
  }

  Widget _buildCheckboxGroup({
    required Set<String> selected,
    required void Function(String) onChanged,
    required List<Map<String, String>> options,
  }) {
    return Column(
      children: options.map((option) {
        return CheckboxListTile(
          value: selected.contains(option['value']),
          onChanged: (_) => onChanged(option['value']!),
          title: Text(option['label']!),
          contentPadding: EdgeInsets.zero,
          dense: true,
          controlAffinity: ListTileControlAffinity.leading,
        );
      }).toList(),
    );
  }
}
