/// Aivo Teacher App
///
/// Mobile application for teachers to manage classroom sessions,
/// track attendance, and log observations.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import 'offline/offline.dart';
import 'screens/login_screen.dart';
import 'screens/classes_screen.dart';
import 'screens/class_roster_screen.dart';
import 'screens/session_plan_screen.dart';
import 'screens/session_log_screen.dart';
import 'screens/learner_detail_screen.dart';
import 'screens/settings_screen.dart';

/// Secure storage instance for tokens.
const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
);

/// Teacher auth state provider.
final teacherAuthProvider =
    StateNotifierProvider<TeacherAuthNotifier, TeacherAuthState>((ref) {
  return TeacherAuthNotifier(ref);
});

/// Teacher auth state.
class TeacherAuthState {
  const TeacherAuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.teacherId,
    this.teacherName,
    this.error,
  });

  final bool isAuthenticated;
  final bool isLoading;
  final String? teacherId;
  final String? teacherName;
  final String? error;

  TeacherAuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? teacherId,
    String? teacherName,
    String? error,
  }) {
    return TeacherAuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      teacherId: teacherId ?? this.teacherId,
      teacherName: teacherName ?? this.teacherName,
      error: error,
    );
  }
}

/// Teacher auth notifier.
class TeacherAuthNotifier extends StateNotifier<TeacherAuthState> {
  TeacherAuthNotifier(this._ref) : super(const TeacherAuthState()) {
    _checkExistingSession();
  }

  // ignore: unused_field
  final Ref _ref;

  Future<void> _checkExistingSession() async {
    state = state.copyWith(isLoading: true);

    try {
      final token = await _secureStorage.read(key: TokenStorageKeys.accessToken);

      if (token != null && token.isNotEmpty) {
        // Validate token and get teacher info
        final apiClient = AivoApiClient.instance;
        final response = await apiClient.get('/auth/me');
        final data = response.data as Map<String, dynamic>;

        if (data['role'] == 'TEACHER') {
          state = state.copyWith(
            isAuthenticated: true,
            isLoading: false,
            teacherId: data['userId'] as String,
            teacherName: data['displayName'] as String?,
          );
          return;
        }
      }
    } catch (_) {
      // Token invalid or expired
    }

    state = state.copyWith(isAuthenticated: false, isLoading: false);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final data = response.data as Map<String, dynamic>;
      final role = data['role'] as String?;

      if (role != 'TEACHER') {
        state = state.copyWith(
          isLoading: false,
          error: 'This account is not a teacher account.',
        );
        return false;
      }

      // Store tokens
      await _secureStorage.write(
        key: TokenStorageKeys.accessToken,
        value: data['accessToken'] as String,
      );
      await _secureStorage.write(
        key: TokenStorageKeys.refreshToken,
        value: data['refreshToken'] as String,
      );

      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        teacherId: data['userId'] as String,
        teacherName: data['displayName'] as String?,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e is ApiException ? e.message : 'Login failed',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _secureStorage.delete(key: TokenStorageKeys.accessToken);
    await _secureStorage.delete(key: TokenStorageKeys.refreshToken);

    state = const TeacherAuthState(isAuthenticated: false);
  }
}

/// Router provider.
final _routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(teacherAuthProvider);

  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const TeacherLoginScreen(),
      ),
      GoRoute(
        path: '/classes',
        builder: (context, state) => const ClassesScreen(),
      ),
      GoRoute(
        path: '/class/:classId',
        builder: (context, state) {
          final classId = state.pathParameters['classId']!;
          final className = state.uri.queryParameters['name'] ?? 'Class';
          return ClassRosterScreen(classId: classId, className: className);
        },
      ),
      GoRoute(
        path: '/class/:classId/session',
        builder: (context, state) {
          final classId = state.pathParameters['classId']!;
          final className = state.uri.queryParameters['name'] ?? 'Class';
          return SessionPlanScreen(classId: classId, className: className);
        },
      ),
      GoRoute(
        path: '/session/:sessionId/log',
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId']!;
          return SessionLogScreen(sessionId: sessionId);
        },
      ),
      GoRoute(
        path: '/learner/:learnerId',
        builder: (context, state) {
          final learnerId = state.pathParameters['learnerId']!;
          final learnerName = state.uri.queryParameters['name'] ?? 'Student';
          return LearnerDetailScreen(
            learnerId: learnerId,
            learnerName: learnerName,
          );
        },
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const TeacherSettingsScreen(),
      ),
    ],
    redirect: (context, state) {
      if (authState.isLoading) return null;

      final isLoggedIn = authState.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoginRoute) return '/login';
      if (isLoggedIn && isLoginRoute) return '/classes';

      return null;
    },
  );
});

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize offline services
  await initializeOfflineServices();

  // Initialize API client
  AivoApiClient.instance.initialize();

  runApp(const ProviderScope(child: TeacherApp()));
}

class TeacherApp extends ConsumerWidget {
  const TeacherApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
    final authState = ref.watch(teacherAuthProvider);

    if (authState.isLoading) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Loading...'),
              ],
            ),
          ),
        ),
      );
    }

    return MaterialApp.router(
      title: 'Aivo Teacher',
      theme: themeForBand(AivoGradeBand.g6_8),
      darkTheme: themeForBand(AivoGradeBand.g6_8), // TODO: Add dark theme support
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
