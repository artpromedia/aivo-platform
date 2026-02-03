/// App Router
///
/// Application routing configuration.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:go_router/go_router.dart';

import '../screens/dashboard/dashboard_screen.dart';
import '../screens/students/student_list_screen.dart';
import '../screens/students/student_detail_screen.dart';
import '../screens/students/student_iep_screen.dart';
import '../screens/sessions/session_list_screen.dart';
import '../screens/sessions/live_session_screen.dart';
import '../screens/sessions/new_session_screen.dart';
import '../screens/messages/messages_screen.dart';
import '../screens/messages/conversation_screen.dart';
import '../screens/messages/compose_message_screen.dart';
import '../screens/reports/reports_screen.dart';
import '../screens/reports/iep_reports_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/settings/offline_settings_screen.dart';
import '../screens/gradebook/gradebook_screen.dart';
import '../screens/gradebook/grade_submission_screen.dart';
import '../screens/assignments/assignment_list_screen.dart';
import '../screens/assignments/assignment_detail_screen.dart';
import '../screens/login_screen.dart' show TeacherLoginScreen;
import '../features/content_library/presentation/content_library_screen.dart';
import '../features/lesson_planning/presentation/lesson_planning_screen.dart';
import '../features/analytics/presentation/classroom_analytics_screen.dart';
import '../features/professional_development/presentation/pd_screen.dart';
import '../screens/collaboration_dashboard_screen.dart';
import '../screens/learner_collaboration_screen.dart';
import '../screens/risk/risk_dashboard_screen.dart';
import '../screens/risk/student_risk_detail_screen.dart';
import '../screens/risk/intervention_screen.dart';

/// Application router.
final GoRouter appRouter = GoRouter(
  initialLocation: '/dashboard',
  routes: [
    // Auth
    GoRoute(
      path: '/login',
      builder: (context, state) => const TeacherLoginScreen(),
    ),

    // Dashboard
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),

    // Students
    GoRoute(
      path: '/students',
      builder: (context, state) => const StudentListScreen(),
    ),
    GoRoute(
      path: '/students/:id',
      builder: (context, state) => StudentDetailScreen(
        studentId: state.pathParameters['id']!,
      ),
    ),
    GoRoute(
      path: '/students/:id/iep',
      builder: (context, state) => StudentIepScreen(
        studentId: state.pathParameters['id']!,
      ),
    ),

    // Sessions
    GoRoute(
      path: '/sessions',
      builder: (context, state) => const SessionListScreen(),
    ),
    GoRoute(
      path: '/sessions/new',
      builder: (context, state) => NewSessionScreen(
        preselectedStudentId: state.uri.queryParameters['studentId'],
      ),
    ),
    GoRoute(
      path: '/sessions/:id',
      builder: (context, state) => LiveSessionScreen(
        sessionId: state.pathParameters['id']!,
      ),
    ),
    GoRoute(
      path: '/sessions/:id/live',
      builder: (context, state) => LiveSessionScreen(
        sessionId: state.pathParameters['id']!,
      ),
    ),

    // Messages
    GoRoute(
      path: '/messages',
      builder: (context, state) => const MessagesScreen(),
    ),
    GoRoute(
      path: '/messages/compose',
      builder: (context, state) => ComposeMessageScreen(
        studentId: state.uri.queryParameters['studentId'],
      ),
    ),
    GoRoute(
      path: '/messages/:id',
      builder: (context, state) => ConversationScreen(
        conversationId: state.pathParameters['id']!,
      ),
    ),

    // Reports
    GoRoute(
      path: '/reports',
      builder: (context, state) => const ReportsScreen(),
    ),
    GoRoute(
      path: '/reports/iep',
      builder: (context, state) => const IepReportsScreen(),
    ),

    // Settings
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/settings/offline',
      builder: (context, state) => const OfflineSettingsScreen(),
    ),

    // Classes (redirect to dashboard for now)
    GoRoute(
      path: '/classes',
      redirect: (context, state) => '/dashboard',
    ),

    // Gradebook
    GoRoute(
      path: '/gradebook/:classId',
      builder: (context, state) => GradebookScreen(
        classId: state.pathParameters['classId']!,
      ),
    ),
    GoRoute(
      path: '/gradebook/:classId/grade/:studentId/:assignmentId',
      builder: (context, state) => GradeSubmissionScreen(
        assignmentId: state.pathParameters['assignmentId']!,
        submissionId: '${state.pathParameters['studentId']}_${state.pathParameters['assignmentId']}',
      ),
    ),

    // Assignments
    GoRoute(
      path: '/assignments',
      builder: (context, state) => AssignmentListScreen(
        classId: state.uri.queryParameters['classId'],
      ),
    ),
    GoRoute(
      path: '/assignments/:id',
      builder: (context, state) => AssignmentDetailScreen(
        assignmentId: state.pathParameters['id']!,
      ),
    ),
    GoRoute(
      path: '/assignments/:assignmentId/submissions/:submissionId',
      builder: (context, state) => GradeSubmissionScreen(
        assignmentId: state.pathParameters['assignmentId']!,
        submissionId: state.pathParameters['submissionId']!,
      ),
    ),

    // Content Library
    GoRoute(
      path: '/content-library',
      builder: (context, state) {
        final teacherId = state.uri.queryParameters['teacherId'] ?? '';
        return ContentLibraryScreen(teacherId: teacherId);
      },
    ),

    // Lesson Planning
    GoRoute(
      path: '/lesson-planning',
      builder: (context, state) {
        final teacherId = state.uri.queryParameters['teacherId'] ?? '';
        return LessonPlanningScreen(teacherId: teacherId);
      },
    ),

    // Classroom Analytics
    GoRoute(
      path: '/analytics',
      builder: (context, state) {
        final teacherId = state.uri.queryParameters['teacherId'] ?? '';
        final classId = state.uri.queryParameters['classId'];
        return ClassroomAnalyticsScreen(teacherId: teacherId, classId: classId);
      },
    ),

    // Professional Development
    GoRoute(
      path: '/professional-development',
      builder: (context, state) {
        final teacherId = state.uri.queryParameters['teacherId'] ?? '';
        return ProfessionalDevelopmentScreen(teacherId: teacherId);
      },
    ),

    // Collaboration
    GoRoute(
      path: '/collaboration/:classId',
      builder: (context, state) => CollaborationDashboardScreen(
        classId: state.pathParameters['classId']!,
      ),
    ),
    GoRoute(
      path: '/collaboration/meetings',
      builder: (context, state) => const _AllMeetingsScreen(),
    ),
    GoRoute(
      path: '/collaboration/learner/:learnerId',
      builder: (context, state) => LearnerCollaborationScreen(
        learnerId: state.pathParameters['learnerId']!,
        learnerName: state.uri.queryParameters['name'] ?? 'Student',
      ),
    ),
    GoRoute(
      path: '/collaboration/plans/:planId',
      builder: (context, state) => _ActionPlanDetailScreen(
        planId: state.pathParameters['planId']!,
      ),
    ),

    // Risk Dashboard & Interventions
    GoRoute(
      path: '/risk/dashboard/:classId',
      builder: (context, state) => RiskDashboardScreen(
        classId: state.pathParameters['classId']!,
      ),
    ),
    GoRoute(
      path: '/risk/dashboard',
      builder: (context, state) {
        final classId = state.uri.queryParameters['classId'] ?? '';
        return RiskDashboardScreen(classId: classId);
      },
    ),
    GoRoute(
      path: '/students/:id/risk',
      builder: (context, state) => StudentRiskDetailScreen(
        studentId: state.pathParameters['id']!,
        studentName: state.uri.queryParameters['name'],
      ),
    ),
    GoRoute(
      path: '/risk/interventions/:studentId',
      builder: (context, state) => InterventionScreen(
        studentId: state.pathParameters['studentId']!,
        studentName: state.uri.queryParameters['name'] ?? 'Student',
      ),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    appBar: AppBar(title: const Text('Error')),
    body: Center(
      child: Text('Page not found: ${state.uri.path}'),
    ),
  ),
);

/// Placeholder screen for all meetings list.
class _AllMeetingsScreen extends StatefulWidget {
  const _AllMeetingsScreen();

  @override
  State<_AllMeetingsScreen> createState() => _AllMeetingsScreenState();
}

class _AllMeetingsScreenState extends State<_AllMeetingsScreen> {
  final List<_Meeting> _meetings = [
    _Meeting(
      id: '1',
      title: 'IEP Review - Sarah Johnson',
      dateTime: DateTime.now().add(const Duration(days: 2, hours: 10)),
      participants: ['Mrs. Johnson', 'Dr. Smith'],
      type: 'IEP',
    ),
    _Meeting(
      id: '2',
      title: 'Parent Conference - Mike Williams',
      dateTime: DateTime.now().add(const Duration(days: 5, hours: 14)),
      participants: ['Mr. Williams', 'Mrs. Williams'],
      type: 'Conference',
    ),
    _Meeting(
      id: '3',
      title: 'Team Collaboration Meeting',
      dateTime: DateTime.now().add(const Duration(days: 7, hours: 9)),
      participants: ['Ms. Davis', 'Mr. Chen'],
      type: 'Team',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('All Meetings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _scheduleMeeting,
          ),
        ],
      ),
      body: _meetings.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.calendar_today, size: 64, color: AivoBrand.gray[400]),
                  const SizedBox(height: 16),
                  const Text(
                    'No Meetings Scheduled',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Schedule a meeting to collaborate with parents and colleagues',
                    style: TextStyle(color: AivoBrand.gray[600]),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _meetings.length,
              itemBuilder: (context, index) {
                final meeting = _meetings[index];
                return _MeetingTile(meeting: meeting, onTap: () => _viewMeeting(meeting));
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _scheduleMeeting,
        child: const Icon(Icons.add),
      ),
    );
  }

  void _scheduleMeeting() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening meeting scheduler...')),
    );
  }

  void _viewMeeting(_Meeting meeting) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(meeting.title, style: Theme.of(ctx).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Type: ${meeting.type}'),
            Text('Date: ${_formatDateTime(meeting.dateTime)}'),
            Text('Participants: ${meeting.participants.join(", ")}'),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Join'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.month}/${dt.day}/${dt.year} at ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _Meeting {
  final String id;
  final String title;
  final DateTime dateTime;
  final List<String> participants;
  final String type;

  _Meeting({required this.id, required this.title, required this.dateTime, required this.participants, required this.type});
}

class _MeetingTile extends StatelessWidget {
  final _Meeting meeting;
  final VoidCallback onTap;

  const _MeetingTile({required this.meeting, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: _getTypeColor(meeting.type),
        child: Icon(_getTypeIcon(meeting.type), color: Colors.white),
      ),
      title: Text(meeting.title),
      subtitle: Text('${meeting.type} • ${meeting.participants.length} participants'),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'IEP': return AivoBrand.success;
      case 'Conference': return AivoBrand.primary;
      case 'Team': return AivoBrand.warning;
      default: return AivoBrand.gray;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'IEP': return Icons.assignment;
      case 'Conference': return Icons.people;
      case 'Team': return Icons.groups;
      default: return Icons.calendar_today;
    }
  }
}

/// Action plan detail screen with full implementation.
class _ActionPlanDetailScreen extends StatefulWidget {
  const _ActionPlanDetailScreen({required this.planId});

  final String planId;

  @override
  State<_ActionPlanDetailScreen> createState() => _ActionPlanDetailScreenState();
}

class _ActionPlanDetailScreenState extends State<_ActionPlanDetailScreen> {
  // Simulated action plan data
  late _ActionPlan _plan;
  
  @override
  void initState() {
    super.initState();
    _plan = _ActionPlan(
      id: widget.planId,
      title: 'Behavior Improvement Plan',
      studentName: 'Alex Thompson',
      createdAt: DateTime.now().subtract(const Duration(days: 14)),
      status: 'In Progress',
      goals: [
        _ActionGoal(
          id: '1',
          description: 'Reduce classroom disruptions by 50%',
          progress: 0.6,
          status: 'On Track',
        ),
        _ActionGoal(
          id: '2',
          description: 'Complete daily check-ins with teacher',
          progress: 0.8,
          status: 'Ahead',
        ),
        _ActionGoal(
          id: '3',
          description: 'Use calming strategies when frustrated',
          progress: 0.4,
          status: 'Needs Attention',
        ),
      ],
      interventions: [
        'Positive reinforcement for on-task behavior',
        'Quiet corner access for self-regulation',
        'Daily progress communication with parents',
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Action Plan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: _editPlan,
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _sharePlan,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AivoBrand.primary,
                          child: Text(_plan.studentName[0]),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_plan.title, style: Theme.of(context).textTheme.titleMedium),
                              Text(_plan.studentName, style: TextStyle(color: AivoBrand.gray[600])),
                            ],
                          ),
                        ),
                        Chip(
                          label: Text(_plan.status),
                          backgroundColor: AivoBrand.success.withOpacity(0.2),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Goals Section
            Text('Goals', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._plan.goals.map((goal) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(goal.description),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    LinearProgressIndicator(value: goal.progress),
                    const SizedBox(height: 4),
                    Text('${(goal.progress * 100).toInt()}% complete • ${goal.status}'),
                  ],
                ),
              ),
            )),
            const SizedBox(height: 16),
            
            // Interventions Section
            Text('Interventions', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: _plan.interventions.map((intervention) => ListTile(
                  leading: const Icon(Icons.check_circle, color: AivoBrand.success),
                  title: Text(intervention),
                )).toList(),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _logProgress,
        icon: const Icon(Icons.add),
        label: const Text('Log Progress'),
      ),
    );
  }

  void _editPlan() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening plan editor...')),
    );
  }

  void _sharePlan() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sharing plan...')),
    );
  }

  void _logProgress() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Log Progress', style: Theme.of(ctx).textTheme.titleLarge),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Progress Notes',
                hintText: 'Describe today\'s progress...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Progress logged successfully!')),
                );
              },
              child: const Text('Save Progress'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionPlan {
  final String id;
  final String title;
  final String studentName;
  final DateTime createdAt;
  final String status;
  final List<_ActionGoal> goals;
  final List<String> interventions;

  _ActionPlan({
    required this.id,
    required this.title,
    required this.studentName,
    required this.createdAt,
    required this.status,
    required this.goals,
    required this.interventions,
  });
}

class _ActionGoal {
  final String id;
  final String description;
  final double progress;
  final String status;

  _ActionGoal({
    required this.id,
    required this.description,
    required this.progress,
    required this.status,
  });
}
