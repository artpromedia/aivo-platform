/// App Router
///
/// Application routing configuration.
library;

import 'package:flutter/material.dart';
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
  ],
  errorBuilder: (context, state) => Scaffold(
    appBar: AppBar(title: const Text('Error')),
    body: Center(
      child: Text('Page not found: ${state.uri.path}'),
    ),
  ),
);
