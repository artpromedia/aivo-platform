import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../screens/login_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/messages/presentation/messages_screen.dart';
import '../features/messages/presentation/conversation_screen.dart';
import '../features/consent/presentation/consent_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/reports/presentation/reports_screen.dart';
import '../features/resources/presentation/resource_library_screen.dart';
import '../features/community/presentation/community_support_screen.dart';
import '../features/privacy/presentation/data_rights_screen.dart';
import '../features/iep/presentation/iep_upload_screen.dart';
import '../screens/parent_assessment_screen.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../shared/widgets/main_scaffold.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  
  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggedIn = authState.status == AuthStatus.authenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      
      if (!isLoggedIn && !isAuthRoute) {
        return '/auth/login';
      }
      if (isLoggedIn && isAuthRoute) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      
      // Main app routes with bottom navigation
      ShellRoute(
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/messages',
            name: 'messages',
            builder: (context, state) => const MessagesScreen(),
            routes: [
              GoRoute(
                path: ':conversationId',
                name: 'conversation',
                builder: (context, state) {
                  final conversationId = state.pathParameters['conversationId']!;
                  return ConversationScreen(conversationId: conversationId);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/reports',
            name: 'reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: '/consent',
            name: 'consent',
            builder: (context, state) => const ConsentManagementScreen(),
          ),
          GoRoute(
            path: '/settings',
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/resources',
            name: 'resources',
            builder: (context, state) => const ResourceLibraryScreen(),
          ),
          GoRoute(
            path: '/community',
            name: 'community',
            builder: (context, state) => const CommunitySupportScreen(),
          ),
          GoRoute(
            path: '/data-rights',
            name: 'data-rights',
            builder: (context, state) => const DataRightsScreen(),
          ),
          GoRoute(
            path: '/iep/:childId',
            name: 'iep',
            builder: (context, state) {
              final childId = state.pathParameters['childId']!;
              final childName = state.extra as String? ?? 'Child';
              return IEPUploadScreen(childId: childId, childName: childName);
            },
          ),
          GoRoute(
            path: '/parent-assessment/:learnerId',
            name: 'parent-assessment',
            builder: (context, state) {
              final learnerId = state.pathParameters['learnerId']!;
              final extra = state.extra as Map<String, dynamic>?;
              final learnerName = extra?['learnerName'] as String? ?? 'Your child';
              return ParentAssessmentScreen(learnerId: learnerId, learnerName: learnerName);
            },
          ),
        ],
      ),
    ],
  );
});
