import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../study_skills_models.dart';
import '../study_skills_service.dart';

/// Test Prep Screen
///
/// Provides test preparation tools including:
/// - Test prep plans with study schedules
/// - Practice tests
/// - Progress tracking
class TestPrepScreen extends StatefulWidget {
  final String learnerId;

  const TestPrepScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<TestPrepScreen> createState() => _TestPrepScreenState();
}

class _TestPrepScreenState extends State<TestPrepScreen>
    with SingleTickerProviderStateMixin {
  StudySkillsService? _service;
  late TabController _tabController;

  List<TestPrepPlan> _plans = [];
  List<PracticeTest> _practiceTests = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initializeService();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    final token = await storage.read() ?? '';

    _service = StudySkillsService(accessToken: token);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _service!.getTestPrepPlans(widget.learnerId),
        _service!.getPracticeTests(widget.learnerId),
      ]);

      if (mounted) {
        setState(() {
          _plans = results[0] as List<TestPrepPlan>;
          _practiceTests = results[1] as List<PracticeTest>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showCreatePlanDialog() {
    final testNameController = TextEditingController();
    final subjectController = TextEditingController();
    final descriptionController = TextEditingController();
    DateTime selectedDate = DateTime.now().add(const Duration(days: 14));

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New Test Prep Plan'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: testNameController,
                  decoration: const InputDecoration(
                    labelText: 'Test Name',
                    border: OutlineInputBorder(),
                    hintText: 'e.g., Math Midterm',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: subjectController,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    border: OutlineInputBorder(),
                    hintText: 'e.g., Mathematics',
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Test Date'),
                  subtitle: Text(
                    '${selectedDate.month}/${selectedDate.day}/${selectedDate.year}',
                  ),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) {
                      setDialogState(() => selectedDate = date);
                    }
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descriptionController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Description (optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (testNameController.text.isNotEmpty &&
                    subjectController.text.isNotEmpty &&
                    _service != null) {
                  await _service!.createTestPrepPlan(
                    userId: widget.learnerId,
                    testName: testNameController.text,
                    testDate: selectedDate,
                    subject: subjectController.text,
                    description: descriptionController.text.isNotEmpty
                        ? descriptionController.text
                        : null,
                  );
                  if (mounted) {
                    Navigator.pop(context);
                    _loadData();
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _openPlanDetail(TestPrepPlan plan) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _TestPrepPlanDetailScreen(
          plan: plan,
          learnerId: widget.learnerId,
        ),
      ),
    ).then((_) => _loadData());
  }

  void _startPracticeTest(PracticeTest test) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _PracticeTestScreen(
          test: test,
          learnerId: widget.learnerId,
        ),
      ),
    ).then((_) => _loadData());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Test Prep'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Study Plans'),
            Tab(text: 'Practice Tests'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildPlansTab(),
                _buildPracticeTestsTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreatePlanDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPlansTab() {
    if (_plans.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No test prep plans yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
            const SizedBox(height: 8),
            const Text('Tap + to create your first plan'),
          ],
        ),
      );
    }

    // Sort by test date
    final sortedPlans = List<TestPrepPlan>.from(_plans)
      ..sort((a, b) => a.testDate.compareTo(b.testDate));

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: sortedPlans.length,
        itemBuilder: (context, index) {
          final plan = sortedPlans[index];
          return _TestPlanCard(
            plan: plan,
            onTap: () => _openPlanDetail(plan),
          );
        },
      ),
    );
  }

  Widget _buildPracticeTestsTab() {
    if (_practiceTests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.quiz, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No practice tests yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _practiceTests.length,
        itemBuilder: (context, index) {
          final test = _practiceTests[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () => _startPracticeTest(test),
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        test.isCompleted ? Icons.check_circle : Icons.quiz,
                        color: test.isCompleted
                            ? AivoBrand.success
                            : const Color(0xFFF59E0B),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            test.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${test.subject} • ${test.questions.length} questions • ${test.duration} min',
                            style: TextStyle(
                              color: AivoBrand.gray.shade600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (test.score != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: test.score! >= 70
                              ? AivoBrand.success.withOpacity(0.1)
                              : AivoBrand.error.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${test.score}%',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: test.score! >= 70
                                ? AivoBrand.success
                                : AivoBrand.error,
                          ),
                        ),
                      )
                    else
                      const Icon(Icons.chevron_right),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _TestPlanCard extends StatelessWidget {
  final TestPrepPlan plan;
  final VoidCallback onTap;

  const _TestPlanCard({
    required this.plan,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final daysLeft = plan.daysUntilTest;
    final urgencyColor = daysLeft <= 3
        ? AivoBrand.error
        : daysLeft <= 7
            ? AivoBrand.warning
            : AivoBrand.success;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: urgencyColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      daysLeft == 0
                          ? 'TODAY!'
                          : daysLeft == 1
                              ? 'Tomorrow'
                              : '$daysLeft days left',
                      style: TextStyle(
                        color: urgencyColor,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    plan.subject,
                    style: TextStyle(
                      color: AivoBrand.gray.shade600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                plan.testName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              if (plan.description != null) ...[
                const SizedBox(height: 4),
                Text(
                  plan.description!,
                  style: TextStyle(
                    color: AivoBrand.gray.shade600,
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 16),

              // Progress
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Progress',
                              style: TextStyle(
                                color: AivoBrand.gray.shade600,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              '${plan.progress}%',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: urgencyColor,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: plan.progress / 100,
                            backgroundColor: AivoBrand.gray.shade200,
                            valueColor: AlwaysStoppedAnimation(urgencyColor),
                            minHeight: 8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 24),
                  Column(
                    children: [
                      Text(
                        '${plan.completedSessions}/${plan.studySessions.length}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        'sessions',
                        style: TextStyle(
                          color: AivoBrand.gray.shade600,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TestPrepPlanDetailScreen extends StatefulWidget {
  final TestPrepPlan plan;
  final String learnerId;

  const _TestPrepPlanDetailScreen({
    required this.plan,
    required this.learnerId,
  });

  @override
  State<_TestPrepPlanDetailScreen> createState() =>
      _TestPrepPlanDetailScreenState();
}

class _TestPrepPlanDetailScreenState extends State<_TestPrepPlanDetailScreen> {
  late TestPrepPlan _plan;

  @override
  void initState() {
    super.initState();
    _plan = widget.plan;
  }

  Color _getUrgencyColor(int daysLeft) {
    if (daysLeft <= 3) return AivoBrand.error;
    if (daysLeft <= 7) return AivoBrand.warning;
    return AivoBrand.success;
  }

  @override
  Widget build(BuildContext context) {
    final daysLeft = _plan.daysUntilTest;
    final urgencyColor = _getUrgencyColor(daysLeft);

    return Scaffold(
      appBar: AppBar(
        title: Text(_plan.testName),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: urgencyColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$daysLeft',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: urgencyColor,
                            ),
                          ),
                          Text(
                            'days',
                            style: TextStyle(
                              fontSize: 12,
                              color: urgencyColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _plan.testName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _plan.subject,
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.calendar_today,
                            size: 16, color: AivoBrand.gray.shade500),
                        const SizedBox(width: 4),
                        Text(
                          '${_plan.testDate.month}/${_plan.testDate.day}/${_plan.testDate.year}',
                          style: TextStyle(color: AivoBrand.gray.shade600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Progress bar
                    Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Progress'),
                            Text(
                              '${_plan.progress}%',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: urgencyColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: _plan.progress / 100,
                            backgroundColor: AivoBrand.gray.shade200,
                            valueColor: AlwaysStoppedAnimation(urgencyColor),
                            minHeight: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Topics
            if (_plan.topics.isNotEmpty) ...[
              const Text(
                'Topics to Cover',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _plan.topics.map((topic) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFFF59E0B).withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      topic,
                      style: const TextStyle(
                        color: Color(0xFFF59E0B),
                        fontSize: 13,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],

            // Study Sessions
            const Text(
              'Study Sessions',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            if (_plan.studySessions.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(Icons.event,
                          size: 48, color: AivoBrand.gray.shade400),
                      const SizedBox(height: 12),
                      Text(
                        'No study sessions scheduled',
                        style: TextStyle(color: AivoBrand.gray.shade600),
                      ),
                    ],
                  ),
                ),
              )
            else
              ..._plan.studySessions.map((session) => _SessionCard(
                    session: session,
                    onComplete: () {
                      // Mark session complete
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Session marked complete!')),
                      );
                    },
                  )),
          ],
        ),
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  final StudySession session;
  final VoidCallback onComplete;

  const _SessionCard({
    required this.session,
    required this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    final isToday = _isToday(session.date);
    final isPast = session.date.isBefore(DateTime.now());

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: session.isCompleted
          ? AivoBrand.success.withOpacity(0.05)
          : isToday
              ? const Color(0xFFF59E0B).withOpacity(0.05)
              : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date/Status icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: session.isCompleted
                    ? AivoBrand.success.withOpacity(0.1)
                    : isToday
                        ? const Color(0xFFF59E0B).withOpacity(0.1)
                        : AivoBrand.gray.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                session.isCompleted
                    ? Icons.check_circle
                    : isToday
                        ? Icons.star
                        : Icons.event,
                color: session.isCompleted
                    ? AivoBrand.success
                    : isToday
                        ? const Color(0xFFF59E0B)
                        : AivoBrand.gray.shade500,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        _formatDate(session.date),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        session.time,
                        style: TextStyle(
                          color: AivoBrand.gray.shade600,
                          fontSize: 13,
                        ),
                      ),
                      if (isToday && !session.isCompleted) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'TODAY',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${session.duration} min • ${session.topics.join(", ")}',
                    style: TextStyle(
                      color: AivoBrand.gray.shade600,
                      fontSize: 13,
                    ),
                  ),
                  if (session.activities.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: session.activities.map((activity) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AivoBrand.gray.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            activity,
                            style: TextStyle(
                              fontSize: 11,
                              color: AivoBrand.gray.shade700,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
            if (!session.isCompleted && (isToday || isPast))
              IconButton(
                onPressed: onComplete,
                icon: const Icon(Icons.check_circle_outline),
                color: AivoBrand.success,
              ),
          ],
        ),
      ),
    );
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  String _formatDate(DateTime date) {
    if (_isToday(date)) return 'Today';

    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);

    if (date.year == tomorrow.year &&
        date.month == tomorrow.month &&
        date.day == tomorrow.day) {
      return 'Tomorrow';
    }

    final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${weekdays[date.weekday - 1]} ${date.month}/${date.day}';
  }
}

class _PracticeTestScreen extends StatefulWidget {
  final PracticeTest test;
  final String learnerId;

  const _PracticeTestScreen({
    required this.test,
    required this.learnerId,
  });

  @override
  State<_PracticeTestScreen> createState() => _PracticeTestScreenState();
}

class _PracticeTestScreenState extends State<_PracticeTestScreen> {
  int _currentQuestion = 0;
  Map<int, String> _answers = {};
  bool _isSubmitted = false;
  int _score = 0;

  void _selectAnswer(String answer) {
    setState(() {
      _answers[_currentQuestion] = answer;
    });
  }

  void _nextQuestion() {
    if (_currentQuestion < widget.test.questions.length - 1) {
      setState(() => _currentQuestion++);
    }
  }

  void _prevQuestion() {
    if (_currentQuestion > 0) {
      setState(() => _currentQuestion--);
    }
  }

  void _submitTest() {
    int correct = 0;
    for (int i = 0; i < widget.test.questions.length; i++) {
      final question = widget.test.questions[i];
      if (_answers[i] == question.correctAnswer) {
        correct++;
      }
    }

    setState(() {
      _isSubmitted = true;
      _score = ((correct / widget.test.questions.length) * 100).round();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isSubmitted) {
      return Scaffold(
        appBar: AppBar(title: const Text('Results')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _score >= 70 ? Icons.celebration : Icons.sentiment_neutral,
                size: 64,
                color: _score >= 70 ? AivoBrand.success : AivoBrand.warning,
              ),
              const SizedBox(height: 24),
              Text(
                '$_score%',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: _score >= 70 ? AivoBrand.success : AivoBrand.error,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _score >= 70 ? 'Great job!' : 'Keep practicing!',
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ],
          ),
        ),
      );
    }

    final question = widget.test.questions[_currentQuestion];

    return Scaffold(
      appBar: AppBar(
        title: Text('${_currentQuestion + 1} / ${widget.test.questions.length}'),
      ),
      body: Column(
        children: [
          // Progress
          LinearProgressIndicator(
            value: (_currentQuestion + 1) / widget.test.questions.length,
            backgroundColor: AivoBrand.gray.shade200,
            valueColor: const AlwaysStoppedAnimation(Color(0xFFF59E0B)),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    question.question,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Options
                  if (question.options != null)
                    ...question.options!.map((option) {
                      final isSelected = _answers[_currentQuestion] == option;
                      return GestureDetector(
                        onTap: () => _selectAnswer(option),
                        child: Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFFF59E0B).withOpacity(0.1)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFFF59E0B)
                                  : AivoBrand.gray.shade300,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSelected
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_off,
                                color: isSelected
                                    ? const Color(0xFFF59E0B)
                                    : AivoBrand.gray.shade400,
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Text(option)),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),

          // Navigation
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Row(
              children: [
                if (_currentQuestion > 0)
                  TextButton.icon(
                    onPressed: _prevQuestion,
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Previous'),
                  ),
                const Spacer(),
                if (_currentQuestion < widget.test.questions.length - 1)
                  ElevatedButton(
                    onPressed: _nextQuestion,
                    child: const Text('Next'),
                  )
                else
                  ElevatedButton(
                    onPressed: _answers.length == widget.test.questions.length
                        ? _submitTest
                        : null,
                    child: const Text('Submit'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
