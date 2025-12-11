import 'package:flutter/material.dart';

import '../shared_device/shared_device.dart';
import 'class_code_entry_screen.dart';
import 'roster_selection_screen.dart';
import 'shared_pin_entry_dialog.dart';
import 'shared_session_bar.dart';

/// Main coordinator widget for shared device flow.
///
/// This widget manages the complete shared device experience:
/// 1. Class code entry (or cached roster)
/// 2. Roster selection (tap your name)
/// 3. PIN entry dialog
/// 4. Session active with end session capability
///
/// Usage:
/// ```dart
/// SharedDeviceFlow(
///   service: sharedDeviceService,
///   onSessionStarted: (session) {
///     // Navigate to Today's Plan
///   },
///   onSessionEnded: () {
///     // Handle session end (usually returns to this flow)
///   },
///   childBuilder: (session, onEndSession) {
///     // Build the app content for active session
///     return TodayPlanScreen(
///       learnerId: session.learnerId,
///       bottomBar: SharedSessionBar(
///         session: session,
///         onEndSession: onEndSession,
///       ),
///     );
///   },
/// )
/// ```
class SharedDeviceFlow extends StatefulWidget {
  final SharedDeviceService service;
  final void Function(SharedDeviceSession session)? onSessionStarted;
  final VoidCallback? onSessionEnded;
  final VoidCallback? onScanQR;
  final Widget Function(SharedDeviceSession session, VoidCallback onEndSession)?
      childBuilder;

  const SharedDeviceFlow({
    super.key,
    required this.service,
    this.onSessionStarted,
    this.onSessionEnded,
    this.onScanQR,
    this.childBuilder,
  });

  @override
  State<SharedDeviceFlow> createState() => _SharedDeviceFlowState();
}

class _SharedDeviceFlowState extends State<SharedDeviceFlow> {
  _FlowStep _currentStep = _FlowStep.loading;
  ClassroomRoster? _roster;
  SharedDeviceSession? _session;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    // Check if we have an active session
    final session = widget.service.activeSession;
    if (session != null) {
      setState(() {
        _session = session;
        _roster = widget.service.roster;
        _currentStep = _FlowStep.sessionActive;
      });
      return;
    }

    // Check if we have a cached roster
    final roster = widget.service.roster;
    if (roster != null) {
      setState(() {
        _roster = roster;
        _currentStep = _FlowStep.rosterSelection;
      });
      return;
    }

    // Start with class code entry
    setState(() => _currentStep = _FlowStep.classCodeEntry);
  }

  void _onRosterLoaded(ClassroomRoster roster) {
    setState(() {
      _roster = roster;
      _currentStep = _FlowStep.rosterSelection;
    });
  }

  Future<void> _onLearnerSelected(RosterLearner learner) async {
    // Show PIN dialog
    final session = await showSharedPinEntryDialog(
      context: context,
      learner: learner,
      service: widget.service,
      onForgotPin: () => _showForgotPinHelp(learner),
    );

    if (session != null) {
      setState(() {
        _session = session;
        _currentStep = _FlowStep.sessionActive;
      });
      widget.onSessionStarted?.call(session);
    }
  }

  void _showForgotPinHelp(RosterLearner learner) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Forgot Your PIN?'),
        content: const Text(
          'Ask your teacher to reset your PIN.\n\n'
          'Your teacher can do this from the Teacher app or website.',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _onEndSession() async {
    if (_session == null) return;

    // Show confirmation dialog
    final confirmed = await showEndSessionConfirmDialog(
      context: context,
      session: _session!,
    );

    if (!confirmed) return;

    // End the session
    await widget.service.endSession();

    setState(() {
      _session = null;
      _currentStep = _FlowStep.rosterSelection;
    });

    widget.onSessionEnded?.call();
  }

  void _goBackToClassCode() {
    setState(() {
      _roster = null;
      _currentStep = _FlowStep.classCodeEntry;
    });
  }

  Future<void> _refreshRoster() async {
    if (_isRefreshing) return;

    setState(() => _isRefreshing = true);
    try {
      final roster = await widget.service.refreshRoster();
      setState(() => _roster = roster);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to refresh: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentStep) {
      case _FlowStep.loading:
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );

      case _FlowStep.classCodeEntry:
        return ClassCodeEntryScreen(
          service: widget.service,
          onRosterLoaded: _onRosterLoaded,
          onScanQR: widget.onScanQR,
        );

      case _FlowStep.rosterSelection:
        return RosterSelectionScreen(
          roster: _roster!,
          onLearnerSelected: _onLearnerSelected,
          onBack: _goBackToClassCode,
          onRefresh: _refreshRoster,
        );

      case _FlowStep.sessionActive:
        if (widget.childBuilder != null && _session != null) {
          return widget.childBuilder!(_session!, _onEndSession);
        }
        // Default session active screen
        return _DefaultSessionScreen(
          session: _session!,
          onEndSession: _onEndSession,
        );
    }
  }
}

enum _FlowStep {
  loading,
  classCodeEntry,
  rosterSelection,
  sessionActive,
}

/// Default screen shown when session is active but no childBuilder provided.
class _DefaultSessionScreen extends StatelessWidget {
  final SharedDeviceSession session;
  final VoidCallback onEndSession;

  const _DefaultSessionScreen({
    required this.session,
    required this.onEndSession,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Hello, ${session.learnerDisplayName.split(' ').first}!'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline, size: 80, color: Colors.green),
            const SizedBox(height: 24),
            Text(
              'Session Active',
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              session.classroomName,
              style: theme.textTheme.bodyLarge,
            ),
          ],
        ),
      ),
      bottomNavigationBar: SharedSessionBar(
        session: session,
        onEndSession: onEndSession,
      ),
    );
  }
}
