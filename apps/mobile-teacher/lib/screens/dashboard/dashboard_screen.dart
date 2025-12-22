/// Dashboard Screen
///
/// Main dashboard with overview cards and quick actions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import 'widgets/widgets.dart';

/// Main dashboard screen.
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // Load initial data
    ref.read(classesProvider.notifier).loadClasses();
    ref.read(studentsProvider.notifier).loadStudents();
    ref.read(sessionsProvider.notifier).loadSessions();
    ref.read(messagesProvider.notifier).loadConversations();
    ref.read(iepProvider.notifier).loadAllGoals();
  }

  @override
  Widget build(BuildContext context) {
    final classesState = ref.watch(classesProvider);
    final sessionsState = ref.watch(sessionsProvider);
    final messagesState = ref.watch(messagesProvider);
    final syncState = ref.watch(syncProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          // Sync indicator
          if (syncState.hasPendingChanges)
            IconButton(
              icon: Badge(
                label: Text('${syncState.pendingCount}'),
                child: const Icon(Icons.sync),
              ),
              onPressed: () => ref.read(syncProvider.notifier).syncNow(),
            ),
          // Connectivity indicator
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Icon(
              isOnline ? Icons.cloud_done : Icons.cloud_off,
              color: isOnline ? Colors.green : Colors.orange,
            ),
          ),
          // Messages
          IconButton(
            icon: Badge(
              isLabelVisible: messagesState.unreadCount > 0,
              label: Text('${messagesState.unreadCount}'),
              child: const Icon(Icons.message),
            ),
            onPressed: () => context.push('/messages'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Quick stats row
            QuickStatsRow(
              classCount: classesState.classes.length,
              activeSessionCount: sessionsState.activeSessions.length,
              unreadMessages: messagesState.unreadCount,
            ),
            const SizedBox(height: 16),

            // Today's sessions
            TodaysSessionsCard(
              sessions: ref.watch(todaysSessionsProvider),
              onSessionTap: (session) => context.push('/sessions/${session.id}'),
              onStartSession: (session) {
                ref.read(sessionsProvider.notifier).startSession(session.id);
              },
            ),
            const SizedBox(height: 16),

            // Students requiring attention
            StudentsAttentionCard(
              students: ref.watch(studentsRequiringAttentionProvider),
              onStudentTap: (student) => context.push('/students/${student.id}'),
            ),
            const SizedBox(height: 16),

            // Goals at risk
            GoalsAtRiskCard(
              onViewAll: () => context.push('/reports/iep'),
            ),
            const SizedBox(height: 16),

            // Quick actions
            QuickActionsCard(
              onNewSession: () => context.push('/sessions/new'),
              onViewStudents: () => context.push('/students'),
              onViewClasses: () => context.push('/classes'),
              onViewReports: () => context.push('/reports'),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Students'),
          BottomNavigationBarItem(icon: Icon(Icons.play_circle), label: 'Sessions'),
          BottomNavigationBarItem(icon: Icon(Icons.class_), label: 'Classes'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'),
        ],
        onTap: (index) {
          switch (index) {
            case 0: break; // Already on dashboard
            case 1: context.go('/students');
            case 2: context.go('/sessions');
            case 3: context.go('/classes');
            case 4: context.go('/settings');
          }
        },
      ),
    );
  }
}
