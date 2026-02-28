/// Home Shell
///
/// Bottom navigation shell wrapping the four primary tabs:
/// Classes, Assignments, Calendar, and Messages.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/messages_provider.dart';
import 'classes_screen.dart';
import 'assignments/assignment_list_screen.dart';
import 'calendar/calendar_screen.dart';
import 'messages/messages_screen.dart';

/// Main home shell with bottom navigation.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  late int _currentIndex;

  static const _tabs = <Widget>[
    ClassesScreen(),
    AssignmentListScreen(),
    CalendarScreen(),
    MessagesScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = ref.watch(unreadCountProvider);

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.school_outlined),
            selectedIcon: Icon(Icons.school),
            label: 'Classes',
          ),
          const NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Assignments',
          ),
          const NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Calendar',
          ),
          NavigationDestination(
            icon: unreadCount > 0
                ? Badge(
                    label: Text(unreadCount.toString()),
                    child: const Icon(Icons.message_outlined),
                  )
                : const Icon(Icons.message_outlined),
            selectedIcon: unreadCount > 0
                ? Badge(
                    label: Text(unreadCount.toString()),
                    child: const Icon(Icons.message),
                  )
                : const Icon(Icons.message),
            label: 'Messages',
          ),
        ],
      ),
    );
  }
}
