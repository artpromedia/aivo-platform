/// Activity Session Screen
///
/// Main screen for ELA/Math activity flows with questions, hints, and progress.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Activity type.
enum ActivityType {
  ela('ELA', Icons.menu_book),
  math('Math', Icons.calculate),
  science('Science', Icons.science),
  sel('Social-Emotional', Icons.emoji_emotions);

  const ActivityType(this.displayName, this.icon);

  final String displayName;
  final IconData icon;
}

/// Question type.
enum QuestionType {
  multipleChoice,
  textInput,
  dragAndDrop,
  matching,
  fillInBlank,
}

/// A question in an activity.
class ActivityQuestion {
  const ActivityQuestion({
    required this.id,
    required this.type,
    required this.prompt,
    this.stimulus,
    this.options = const [],
    this.correctAnswer,
    this.hints = const [],
    this.explanation,
    this.mediaUrl,
  });

  final String id;
  final QuestionType type;
  final String prompt;
  final String? stimulus;
  final List<String> options;
  final String? correctAnswer;
  final List<String> hints;
  final String? explanation;
  final String? mediaUrl;

  factory ActivityQuestion.fromJson(Map<String, dynamic> json) {
    return ActivityQuestion(
      id: json['id'] as String,
      type: QuestionType.values.firstWhere(
        (t) => t.name == (json['type'] as String? ?? 'multipleChoice'),
        orElse: () => QuestionType.multipleChoice,
      ),
      prompt: json['prompt'] as String,
      stimulus: json['stimulus'] as String?,
      options: (json['options'] as List?)?.cast<String>() ?? [],
      correctAnswer: json['correctAnswer'] as String?,
      hints: (json['hints'] as List?)?.cast<String>() ?? [],
      explanation: json['explanation'] as String?,
      mediaUrl: json['mediaUrl'] as String?,
    );
  }
}

/// Activity session state.
class ActivitySession {
  const ActivitySession({
    required this.id,
    required this.type,
    required this.title,
    required this.questions,
    this.currentIndex = 0,
    this.answers = const {},
    this.hintsUsed = const {},
    this.startedAt,
    this.completedAt,
  });

  final String id;
  final ActivityType type;
  final String title;
  final List<ActivityQuestion> questions;
  final int currentIndex;
  final Map<String, String> answers; // questionId -> answer
  final Map<String, int> hintsUsed; // questionId -> hints used count
  final DateTime? startedAt;
  final DateTime? completedAt;

  bool get isComplete => completedAt != null;
  int get questionsAnswered => answers.length;
  double get progress => questions.isEmpty ? 0 : questionsAnswered / questions.length;
  ActivityQuestion? get currentQuestion =>
      currentIndex < questions.length ? questions[currentIndex] : null;

  ActivitySession copyWith({
    String? id,
    ActivityType? type,
    String? title,
    List<ActivityQuestion>? questions,
    int? currentIndex,
    Map<String, String>? answers,
    Map<String, int>? hintsUsed,
    DateTime? startedAt,
    DateTime? completedAt,
  }) {
    return ActivitySession(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      questions: questions ?? this.questions,
      currentIndex: currentIndex ?? this.currentIndex,
      answers: answers ?? this.answers,
      hintsUsed: hintsUsed ?? this.hintsUsed,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

class ActivityState {
  const ActivityState({
    this.session,
    this.isLoading = false,
    this.error,
    this.showHint = false,
    this.currentHintIndex = 0,
    this.isSubmitting = false,
    this.lastAnswerCorrect,
  });

  final ActivitySession? session;
  final bool isLoading;
  final String? error;
  final bool showHint;
  final int currentHintIndex;
  final bool isSubmitting;
  final bool? lastAnswerCorrect;

  ActivityState copyWith({
    ActivitySession? session,
    bool? isLoading,
    String? error,
    bool? showHint,
    int? currentHintIndex,
    bool? isSubmitting,
    bool? lastAnswerCorrect,
  }) {
    return ActivityState(
      session: session ?? this.session,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      showHint: showHint ?? this.showHint,
      currentHintIndex: currentHintIndex ?? this.currentHintIndex,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      lastAnswerCorrect: lastAnswerCorrect,
    );
  }
}

class ActivityNotifier extends StateNotifier<ActivityState> {
  ActivityNotifier(this._apiClient) : super(const ActivityState());

  final AivoApiClient _apiClient;

  Future<void> loadSession(String sessionId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiClient.get(ApiEndpoints.session(sessionId));
      final data = response.data as Map<String, dynamic>?;

      if (data == null) {
        state = state.copyWith(isLoading: false, error: 'Session not found');
        return;
      }

      final questions = (data['questions'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map((q) => ActivityQuestion.fromJson(q))
          .toList();

      final session = ActivitySession(
        id: sessionId,
        type: ActivityType.values.firstWhere(
          (t) => t.name.toLowerCase() == (data['type'] as String? ?? '').toLowerCase(),
          orElse: () => ActivityType.ela,
        ),
        title: data['title'] as String? ?? 'Activity',
        questions: questions,
        startedAt: DateTime.now(),
      );

      state = state.copyWith(session: session, isLoading: false);
    } catch (e) {
      final apiError = extractApiException(e);
      state = state.copyWith(
        isLoading: false,
        error: apiError?.message ?? 'Failed to load activity',
      );
    }
  }

  void selectAnswer(String answer) {
    final session = state.session;
    if (session == null || session.currentQuestion == null) return;

    final questionId = session.currentQuestion!.id;
    final newAnswers = Map<String, String>.from(session.answers);
    newAnswers[questionId] = answer;

    state = state.copyWith(
      session: session.copyWith(answers: newAnswers),
    );
  }

  Future<bool> submitAnswer() async {
    final session = state.session;
    if (session == null || session.currentQuestion == null) return false;

    final question = session.currentQuestion!;
    final answer = session.answers[question.id];
    if (answer == null) return false;

    state = state.copyWith(isSubmitting: true);

    try {
      // Submit to API
      await _apiClient.post(
        '${ApiEndpoints.session(session.id)}/answer',
        data: {
          'questionId': question.id,
          'answer': answer,
        },
      );

      // Check if correct (simple check - API should validate)
      final isCorrect = question.correctAnswer == null || 
          answer.toLowerCase().trim() == question.correctAnswer!.toLowerCase().trim();

      state = state.copyWith(
        isSubmitting: false,
        lastAnswerCorrect: isCorrect,
      );

      return isCorrect;
    } catch (_) {
      state = state.copyWith(isSubmitting: false);
      return false;
    }
  }

  void nextQuestion() {
    final session = state.session;
    if (session == null) return;

    final nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.questions.length) {
      // Session complete
      state = state.copyWith(
        session: session.copyWith(
          completedAt: DateTime.now(),
        ),
        showHint: false,
        currentHintIndex: 0,
        lastAnswerCorrect: null,
      );
    } else {
      state = state.copyWith(
        session: session.copyWith(currentIndex: nextIndex),
        showHint: false,
        currentHintIndex: 0,
        lastAnswerCorrect: null,
      );
    }
  }

  void requestHint() {
    final session = state.session;
    if (session == null || session.currentQuestion == null) return;

    final question = session.currentQuestion!;
    if (question.hints.isEmpty) return;

    final currentHints = state.currentHintIndex;
    if (!state.showHint) {
      // First hint request
      final newHintsUsed = Map<String, int>.from(session.hintsUsed);
      newHintsUsed[question.id] = 1;
      state = state.copyWith(
        showHint: true,
        currentHintIndex: 0,
        session: session.copyWith(hintsUsed: newHintsUsed),
      );
    } else if (currentHints < question.hints.length - 1) {
      // Next hint
      final newHintsUsed = Map<String, int>.from(session.hintsUsed);
      newHintsUsed[question.id] = currentHints + 2;
      state = state.copyWith(
        currentHintIndex: currentHints + 1,
        session: session.copyWith(hintsUsed: newHintsUsed),
      );
    }
  }

  void hideHint() {
    state = state.copyWith(showHint: false);
  }
}

final activityNotifierProvider =
    StateNotifierProvider<ActivityNotifier, ActivityState>((ref) {
  final apiClient = AivoApiClient.instance;
  return ActivityNotifier(apiClient);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({
    super.key,
    required this.sessionId,
  });

  final String sessionId;

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(activityNotifierProvider.notifier).loadSession(widget.sessionId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(activityNotifierProvider);

    if (state.isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (state.error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(state.error!),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref
                    .read(activityNotifierProvider.notifier)
                    .loadSession(widget.sessionId),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final session = state.session;
    if (session == null) return const SizedBox.shrink();

    // Check if complete
    if (session.isComplete) {
      return _ActivityCompleteScreen(session: session);
    }

    final question = session.currentQuestion;
    if (question == null) return const SizedBox.shrink();

    return Scaffold(
      appBar: AppBar(
        title: Text(session.title),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _showExitConfirmation(context),
        ),
        actions: [
          // Progress indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: Text(
                '${session.currentIndex + 1}/${session.questions.length}',
                style: theme.textTheme.titleMedium,
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress bar
            LinearProgressIndicator(
              value: session.progress,
              backgroundColor: colorScheme.surfaceContainerHighest,
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stimulus/passage if present
                    if (question.stimulus != null) ...[
                      Card(
                        color: colorScheme.surfaceContainerHighest,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.menu_book,
                                    size: 20,
                                    color: colorScheme.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Read this:',
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      color: colorScheme.primary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                question.stimulus!,
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  height: 1.6,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Question prompt
                    Text(
                      question.prompt,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Answer options
                    _buildAnswerWidget(question, state),

                    // Hint section
                    if (question.hints.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      _HintSection(
                        hints: question.hints,
                        showHint: state.showHint,
                        currentHintIndex: state.currentHintIndex,
                        onRequestHint: () => ref
                            .read(activityNotifierProvider.notifier)
                            .requestHint(),
                      ),
                    ],

                    // Feedback after answer
                    if (state.lastAnswerCorrect != null) ...[
                      const SizedBox(height: 24),
                      _FeedbackCard(
                        isCorrect: state.lastAnswerCorrect!,
                        explanation: question.explanation,
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Bottom action bar
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                border: Border(
                  top: BorderSide(color: colorScheme.outlineVariant),
                ),
              ),
              child: Row(
                children: [
                  // AI Tutor button
                  OutlinedButton.icon(
                    onPressed: () => _showTutorDialog(context, question),
                    icon: const Icon(Icons.smart_toy),
                    label: const Text('Explain'),
                  ),
                  const Spacer(),
                  // Submit/Continue button
                  if (state.lastAnswerCorrect != null)
                    FilledButton(
                      onPressed: () => ref
                          .read(activityNotifierProvider.notifier)
                          .nextQuestion(),
                      child: Text(
                        session.currentIndex < session.questions.length - 1
                            ? 'Next Question'
                            : 'Finish',
                      ),
                    )
                  else
                    FilledButton(
                      onPressed: session.answers[question.id] != null &&
                              !state.isSubmitting
                          ? () => ref
                              .read(activityNotifierProvider.notifier)
                              .submitAnswer()
                          : null,
                      child: state.isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Check Answer'),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnswerWidget(ActivityQuestion question, ActivityState state) {
    final session = state.session!;
    final selectedAnswer = session.answers[question.id];
    final isAnswered = state.lastAnswerCorrect != null;

    switch (question.type) {
      case QuestionType.multipleChoice:
        return Column(
          children: question.options.asMap().entries.map((entry) {
            final index = entry.key;
            final option = entry.value;
            final letter = String.fromCharCode(65 + index); // A, B, C, D
            final isSelected = selectedAnswer == option;
            final isCorrect = question.correctAnswer == option;

            Color? backgroundColor;
            Color? borderColor;
            if (isAnswered) {
              if (isCorrect) {
                backgroundColor = Colors.green.withOpacity(0.2);
                borderColor = Colors.green;
              } else if (isSelected && !isCorrect) {
                backgroundColor = Colors.red.withOpacity(0.2);
                borderColor = Colors.red;
              }
            }

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: isAnswered
                    ? null
                    : () => ref
                        .read(activityNotifierProvider.notifier)
                        .selectAnswer(option),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: backgroundColor ??
                        (isSelected
                            ? Theme.of(context).colorScheme.primaryContainer
                            : null),
                    border: Border.all(
                      color: borderColor ??
                          (isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.outline),
                      width: isSelected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.surfaceContainerHighest,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            letter,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          option,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ),
                      if (isAnswered && isCorrect)
                        const Icon(Icons.check_circle, color: Colors.green)
                      else if (isAnswered && isSelected && !isCorrect)
                        const Icon(Icons.cancel, color: Colors.red),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        );

      case QuestionType.textInput:
        return TextField(
          decoration: const InputDecoration(
            labelText: 'Your answer',
            border: OutlineInputBorder(),
          ),
          enabled: !isAnswered,
          onChanged: (value) => ref
              .read(activityNotifierProvider.notifier)
              .selectAnswer(value),
        );

      default:
        return const Text('Unsupported question type');
    }
  }

  void _showExitConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Activity?'),
        content: const Text(
          'Your progress will be saved, but you\'ll need to continue later.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Stay'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.pop();
            },
            child: const Text('Leave'),
          ),
        ],
      ),
    );
  }

  void _showTutorDialog(BuildContext context, ActivityQuestion question) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (context, scrollController) => _TutorBottomSheet(
          question: question,
          scrollController: scrollController,
        ),
      ),
    );
  }
}

class _HintSection extends StatelessWidget {
  const _HintSection({
    required this.hints,
    required this.showHint,
    required this.currentHintIndex,
    required this.onRequestHint,
  });

  final List<String> hints;
  final bool showHint;
  final int currentHintIndex;
  final VoidCallback onRequestHint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!showHint) {
      return OutlinedButton.icon(
        onPressed: onRequestHint,
        icon: const Icon(Icons.lightbulb_outline),
        label: const Text('Need a hint?'),
      );
    }

    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.lightbulb, color: Colors.amber),
                const SizedBox(width: 8),
                Text(
                  'Hint ${currentHintIndex + 1}/${hints.length}',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: Colors.amber.shade800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              hints[currentHintIndex],
              style: theme.textTheme.bodyMedium,
            ),
            if (currentHintIndex < hints.length - 1) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onRequestHint,
                child: const Text('Show another hint'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({
    required this.isCorrect,
    this.explanation,
  });

  final bool isCorrect;
  final String? explanation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      color: isCorrect ? Colors.green.shade50 : Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isCorrect ? Icons.celebration : Icons.info_outline,
                  color: isCorrect ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  isCorrect ? 'Great job!' : 'Not quite right',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: isCorrect ? Colors.green.shade800 : Colors.orange.shade800,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            if (explanation != null) ...[
              const SizedBox(height: 12),
              Text(
                explanation!,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TutorBottomSheet extends StatefulWidget {
  const _TutorBottomSheet({
    required this.question,
    required this.scrollController,
  });

  final ActivityQuestion question;
  final ScrollController scrollController;

  @override
  State<_TutorBottomSheet> createState() => _TutorBottomSheetState();
}

class _TutorBottomSheetState extends State<_TutorBottomSheet> {
  bool _isLoading = false;
  String? _explanation;

  @override
  void initState() {
    super.initState();
    _requestExplanation();
  }

  Future<void> _requestExplanation() async {
    setState(() => _isLoading = true);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.post(
        ApiEndpoints.aiExplain,
        data: {
          'questionId': widget.question.id,
          'prompt': widget.question.prompt,
          'mode': 'explain_differently',
        },
      );

      final data = response.data as Map<String, dynamic>?;
      setState(() {
        _explanation = data?['explanation'] as String? ??
            'Let me help you think about this differently...\n\n'
            'Try breaking down the problem into smaller steps. '
            'What do you know for sure? What are you trying to find out?';
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _explanation = 'I\'m having trouble connecting right now. '
            'Try using the hints instead!';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: 32,
            height: 4,
            decoration: BoxDecoration(
              color: colorScheme.onSurfaceVariant.withOpacity(0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.smart_toy,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'AI Tutor',
                  style: theme.textTheme.titleLarge,
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Content
          Expanded(
            child: _isLoading
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Thinking...'),
                      ],
                    ),
                  )
                : ListView(
                    controller: widget.scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        _explanation ?? '',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 24),
                      OutlinedButton.icon(
                        onPressed: _requestExplanation,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Explain differently'),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _ActivityCompleteScreen extends StatelessWidget {
  const _ActivityCompleteScreen({required this.session});

  final ActivitySession session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final duration = session.completedAt!.difference(session.startedAt!);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.celebration,
                size: 80,
                color: colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Activity Complete!',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                session.title,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 32),

              // Stats
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _StatItem(
                    icon: Icons.check_circle,
                    label: 'Questions',
                    value: '${session.questionsAnswered}/${session.questions.length}',
                  ),
                  _StatItem(
                    icon: Icons.timer,
                    label: 'Time',
                    value: '${duration.inMinutes}m',
                  ),
                  _StatItem(
                    icon: Icons.lightbulb,
                    label: 'Hints',
                    value: session.hintsUsed.values.fold(0, (a, b) => a + b).toString(),
                  ),
                ],
              ),

              const Spacer(),

              FilledButton(
                onPressed: () => context.go('/plan'),
                child: const Text('Back to Today\'s Plan'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        Icon(icon, size: 32, color: colorScheme.primary),
        const SizedBox(height: 8),
        Text(
          value,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
