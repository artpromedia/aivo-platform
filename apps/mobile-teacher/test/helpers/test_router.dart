/// Test Router
///
/// Router configuration for integration testing.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Test routes for navigation testing.
class TestRoutes {
  static const dashboard = '/';
  static const login = '/login';
  static const students = '/students';
  static const studentDetail = '/students/:id';
  static const sessions = '/sessions';
  static const sessionDetail = '/sessions/:id';
  static const classes = '/classes';
  static const classDetail = '/classes/:id';
  static const settings = '/settings';
  static const reports = '/reports';
  static const messages = '/messages';
}

/// Create a test router for navigation tests.
GoRouter createTestRouter({
  String initialLocation = '/',
  Widget? dashboardScreen,
  Widget? loginScreen,
  Widget? studentsScreen,
  Widget? studentDetailScreen,
  Widget? sessionsScreen,
  Widget? sessionDetailScreen,
  Widget? classesScreen,
  Widget? classDetailScreen,
  Widget? settingsScreen,
  Widget? reportsScreen,
  Widget? messagesScreen,
  GoRouterRedirect? redirect,
}) {
  return GoRouter(
    initialLocation: initialLocation,
    redirect: redirect,
    routes: [
      GoRoute(
        path: TestRoutes.dashboard,
        builder: (context, state) =>
            dashboardScreen ?? const _PlaceholderScreen(name: 'Dashboard'),
      ),
      GoRoute(
        path: TestRoutes.login,
        builder: (context, state) =>
            loginScreen ?? const _PlaceholderScreen(name: 'Login'),
      ),
      GoRoute(
        path: TestRoutes.students,
        builder: (context, state) =>
            studentsScreen ?? const _PlaceholderScreen(name: 'Students'),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id'];
              return studentDetailScreen ??
                  _PlaceholderScreen(name: 'Student $id');
            },
          ),
        ],
      ),
      GoRoute(
        path: TestRoutes.sessions,
        builder: (context, state) =>
            sessionsScreen ?? const _PlaceholderScreen(name: 'Sessions'),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id'];
              return sessionDetailScreen ??
                  _PlaceholderScreen(name: 'Session $id');
            },
          ),
        ],
      ),
      GoRoute(
        path: TestRoutes.classes,
        builder: (context, state) =>
            classesScreen ?? const _PlaceholderScreen(name: 'Classes'),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id'];
              return classDetailScreen ??
                  _PlaceholderScreen(name: 'Class $id');
            },
          ),
        ],
      ),
      GoRoute(
        path: TestRoutes.settings,
        builder: (context, state) =>
            settingsScreen ?? const _PlaceholderScreen(name: 'Settings'),
      ),
      GoRoute(
        path: TestRoutes.reports,
        builder: (context, state) =>
            reportsScreen ?? const _PlaceholderScreen(name: 'Reports'),
      ),
      GoRoute(
        path: TestRoutes.messages,
        builder: (context, state) =>
            messagesScreen ?? const _PlaceholderScreen(name: 'Messages'),
      ),
    ],
  );
}

/// Placeholder screen for routes not specified in tests.
class _PlaceholderScreen extends StatelessWidget {
  const _PlaceholderScreen({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: Center(
        child: Text('$name Screen'),
      ),
    );
  }
}

/// Mock navigator observer for tracking navigation.
class MockNavigatorObserver extends NavigatorObserver {
  final List<Route<dynamic>> pushedRoutes = [];
  final List<Route<dynamic>> poppedRoutes = [];
  final List<Route<dynamic>> replacedRoutes = [];

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    pushedRoutes.add(route);
    super.didPush(route, previousRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    poppedRoutes.add(route);
    super.didPop(route, previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (newRoute != null) replacedRoutes.add(newRoute);
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
  }

  void reset() {
    pushedRoutes.clear();
    poppedRoutes.clear();
    replacedRoutes.clear();
  }
}
