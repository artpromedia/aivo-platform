import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../pin/pin_storage.dart';
import '../sel_models.dart';
import '../sel_service.dart';

/// Social Scenarios Screen
///
/// Practice social skills through interactive scenarios with choices and feedback.
class SocialScenariosScreen extends StatefulWidget {
  final String learnerId;

  const SocialScenariosScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<SocialScenariosScreen> createState() => _SocialScenariosScreenState();
}

class _SocialScenariosScreenState extends State<SocialScenariosScreen> {
  SELService? _selService;
  String _cachedToken = '';

  List<SocialScenario> _scenarios = [];
  bool _isLoading = true;
  String? _selectedCategory;

  final List<String> _categories = [
    'All',
    'Making Friends',
    'Classroom',
    'Emotions',
    'Conflict',
    'Asking for Help',
  ];

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _selService = SELService(
      baseUrl: EnvironmentConfig.selBaseUrl,
      getAuthToken: () => _cachedToken,
      learnerId: widget.learnerId,
    );

    await _loadScenarios();
  }

  Future<void> _loadScenarios() async {
    if (_selService == null) return;

    setState(() => _isLoading = true);

    try {
      final scenarios = await _selService!.getSocialScenarios();
      if (mounted) {
        setState(() {
          _scenarios = scenarios;
          _isLoading = false;
        });
      }
    } catch (e) {
      // Use default scenarios if API fails
      if (mounted) {
        setState(() {
          _scenarios = _getDefaultScenarios();
          _isLoading = false;
        });
      }
    }
  }

  List<SocialScenario> _getDefaultScenarios() {
    return [
      SocialScenario(
        id: 'scenario-1',
        title: 'Joining a Game',
        description:
            'You see some kids playing a game at recess. You want to join them.',
        category: 'Making Friends',
        imageUrl: '',
        choices: [
          const ScenarioChoice(
            id: 'a',
            text: 'Walk up and say "Can I play too?"',
            isCorrect: true,
            feedback:
                'Great choice! Politely asking to join is a friendly way to include yourself.',
          ),
          const ScenarioChoice(
            id: 'b',
            text: 'Just start playing without asking',
            isCorrect: false,
            feedback:
                'It\'s better to ask first. Joining without asking might upset the other kids.',
          ),
          const ScenarioChoice(
            id: 'c',
            text: 'Stand nearby and hope they notice you',
            isCorrect: false,
            feedback:
                'While this is okay, it\'s more effective to speak up and ask to join!',
          ),
        ],
      ),
      SocialScenario(
        id: 'scenario-2',
        title: 'Feeling Frustrated',
        description:
            'You\'re working on a hard math problem and keep getting it wrong.',
        category: 'Emotions',
        imageUrl: '',
        choices: [
          const ScenarioChoice(
            id: 'a',
            text: 'Take a deep breath and try again',
            isCorrect: true,
            feedback:
                'Excellent! Taking a breath helps calm your mind so you can think clearly.',
          ),
          const ScenarioChoice(
            id: 'b',
            text: 'Give up and put your head down',
            isCorrect: false,
            feedback:
                'It\'s okay to feel frustrated, but giving up means you won\'t learn. Try asking for help!',
          ),
          const ScenarioChoice(
            id: 'c',
            text: 'Raise your hand and ask for help',
            isCorrect: true,
            feedback:
                'Great idea! Teachers are there to help. Asking questions shows you want to learn.',
          ),
        ],
      ),
      SocialScenario(
        id: 'scenario-3',
        title: 'Someone Takes Your Seat',
        description:
            'You come back from the bathroom and someone is sitting in your seat.',
        category: 'Conflict',
        imageUrl: '',
        choices: [
          const ScenarioChoice(
            id: 'a',
            text: 'Politely say "Excuse me, that\'s my seat"',
            isCorrect: true,
            feedback:
                'Perfect! Being polite and clear is the best way to handle this.',
          ),
          const ScenarioChoice(
            id: 'b',
            text: 'Push them out of the seat',
            isCorrect: false,
            feedback:
                'Using physical force isn\'t okay. Use your words to solve problems.',
          ),
          const ScenarioChoice(
            id: 'c',
            text: 'Tell the teacher',
            isCorrect: true,
            feedback:
                'This is also a good choice if asking politely doesn\'t work.',
          ),
        ],
      ),
      SocialScenario(
        id: 'scenario-4',
        title: 'A Friend Seems Sad',
        description: 'Your friend is sitting alone and looks upset.',
        category: 'Emotions',
        imageUrl: '',
        choices: [
          const ScenarioChoice(
            id: 'a',
            text: 'Go over and ask "Are you okay?"',
            isCorrect: true,
            feedback:
                'Wonderful! Checking on friends shows you care about their feelings.',
          ),
          const ScenarioChoice(
            id: 'b',
            text: 'Ignore them - they probably want to be alone',
            isCorrect: false,
            feedback:
                'Sometimes people who look sad actually want someone to notice. Try asking!',
          ),
          const ScenarioChoice(
            id: 'c',
            text: 'Sit with them quietly',
            isCorrect: true,
            feedback:
                'This is kind! Sometimes just being present helps someone feel better.',
          ),
        ],
      ),
      SocialScenario(
        id: 'scenario-5',
        title: 'Following Instructions',
        description:
            'The teacher gives instructions but you didn\'t understand them.',
        category: 'Classroom',
        imageUrl: '',
        choices: [
          const ScenarioChoice(
            id: 'a',
            text: 'Raise your hand and ask for clarification',
            isCorrect: true,
            feedback:
                'Perfect! It\'s always okay to ask questions when you don\'t understand.',
          ),
          const ScenarioChoice(
            id: 'b',
            text: 'Just guess and hope for the best',
            isCorrect: false,
            feedback:
                'Guessing might lead to mistakes. It\'s better to ask for help.',
          ),
          const ScenarioChoice(
            id: 'c',
            text: 'Look at what your neighbor is doing',
            isCorrect: false,
            feedback:
                'Copying others isn\'t a good habit. Ask the teacher to explain again.',
          ),
        ],
      ),
    ];
  }

  List<SocialScenario> get _filteredScenarios {
    if (_selectedCategory == null || _selectedCategory == 'All') {
      return _scenarios;
    }
    return _scenarios.where((s) => s.category == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Social Scenarios'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadScenarios,
              child: Column(
                children: [
                  // Category filter
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: _categories.map((category) {
                        final isSelected = (_selectedCategory ?? 'All') == category;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(category),
                            selected: isSelected,
                            onSelected: (selected) {
                              setState(() {
                                _selectedCategory = selected ? category : null;
                              });
                            },
                            selectedColor:
                                Theme.of(context).primaryColor.withOpacity(0.2),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  // Scenarios list
                  Expanded(
                    child: _filteredScenarios.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.people_outline,
                                  size: 64,
                                  color: AivoBrand.gray.shade400,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No scenarios found',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _filteredScenarios.length,
                            itemBuilder: (context, index) {
                              final scenario = _filteredScenarios[index];
                              return _buildScenarioCard(scenario);
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildScenarioCard(SocialScenario scenario) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _startScenario(scenario),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    '👥',
                    style: TextStyle(fontSize: 28),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      scenario.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      scenario.description,
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AivoBrand.gray.shade100,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        scenario.category,
                        style: TextStyle(
                          color: AivoBrand.gray.shade700,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AivoBrand.gray.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _startScenario(SocialScenario scenario) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _ScenarioPracticeScreen(
          scenario: scenario,
          selService: _selService!,
        ),
      ),
    );
  }
}

class _ScenarioPracticeScreen extends StatefulWidget {
  final SocialScenario scenario;
  final SELService selService;

  const _ScenarioPracticeScreen({
    required this.scenario,
    required this.selService,
  });

  @override
  State<_ScenarioPracticeScreen> createState() => _ScenarioPracticeScreenState();
}

class _ScenarioPracticeScreenState extends State<_ScenarioPracticeScreen> {
  ScenarioChoice? _selectedChoice;
  bool _hasAnswered = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Scenario header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Text(
                    '🎭',
                    style: TextStyle(fontSize: 48),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.scenario.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Scenario description
            Text(
              widget.scenario.description,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    height: 1.5,
                  ),
            ),
            const SizedBox(height: 32),

            // Question
            Text(
              'What would you do?',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),

            // Choices
            ...widget.scenario.choices.map((choice) => _buildChoiceCard(choice)),

            // Feedback
            if (_hasAnswered && _selectedChoice != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _selectedChoice!.isCorrect
                      ? AivoBrand.success.withOpacity(0.1)
                      : AivoBrand.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _selectedChoice!.isCorrect
                        ? AivoBrand.success.withOpacity(0.3)
                        : AivoBrand.warning.withOpacity(0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _selectedChoice!.isCorrect
                              ? Icons.check_circle
                              : Icons.info,
                          color: _selectedChoice!.isCorrect
                              ? AivoBrand.success
                              : AivoBrand.warning,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _selectedChoice!.isCorrect
                              ? 'Great Choice!'
                              : 'Good Try!',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _selectedChoice!.isCorrect
                                ? AivoBrand.success
                                : AivoBrand.warning,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _selectedChoice!.feedback,
                      style: TextStyle(
                        color: AivoBrand.gray.shade700,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    widget.selService.submitScenarioAnswer(
                      scenarioId: widget.scenario.id,
                      choiceId: _selectedChoice!.id,
                    );
                    Navigator.pop(context);
                  },
                  child: const Text('Continue'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildChoiceCard(ScenarioChoice choice) {
    final isSelected = _selectedChoice == choice;
    final showResult = _hasAnswered && isSelected;

    Color? borderColor;
    Color? backgroundColor;

    if (showResult) {
      borderColor = choice.isCorrect ? AivoBrand.success : AivoBrand.error;
      backgroundColor = choice.isCorrect
          ? AivoBrand.success.withOpacity(0.05)
          : AivoBrand.error.withOpacity(0.05);
    } else if (isSelected) {
      borderColor = Theme.of(context).primaryColor;
      backgroundColor = Theme.of(context).primaryColor.withOpacity(0.05);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: _hasAnswered
            ? null
            : () {
                setState(() {
                  _selectedChoice = choice;
                  _hasAnswered = true;
                });
              },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: borderColor ?? AivoBrand.gray.shade200,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  choice.text,
                  style: TextStyle(
                    color: AivoBrand.gray.shade800,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ),
              if (showResult)
                Icon(
                  choice.isCorrect ? Icons.check_circle : Icons.cancel,
                  color: choice.isCorrect ? AivoBrand.success : AivoBrand.error,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
