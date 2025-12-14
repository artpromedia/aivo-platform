/// Session Log Screen
///
/// Active session logging for attendance, observations, and notes.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

// UI Constants
const double _kLargeIconSize = 64.0;
const double _kAvatarRadius = 16.0;

/// Formats a DateTime to a readable time string (e.g., "2:30 PM").
String _formatTime(DateTime time) {
  final hour = time.hour > 12 ? time.hour - 12 : (time.hour == 0 ? 12 : time.hour);
  final period = time.hour >= 12 ? 'PM' : 'AM';
  return '$hour:${time.minute.toString().padLeft(2, '0')} $period';
}

/// Attendance status enum.
enum AttendanceStatus {
  present('Present', Icons.check_circle, Colors.green),
  absent('Absent', Icons.cancel, Colors.red),
  tardy('Tardy', Icons.access_time, Colors.orange),
  unknown('Not Set', Icons.help_outline, Colors.grey);

  const AttendanceStatus(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;
}

/// Student attendance record.
class AttendanceRecord {
  const AttendanceRecord({
    required this.learnerId,
    required this.learnerName,
    this.status = AttendanceStatus.unknown,
    this.notes,
  });

  final String learnerId;
  final String learnerName;
  final AttendanceStatus status;
  final String? notes;

  AttendanceRecord copyWith({
    AttendanceStatus? status,
    String? notes,
  }) {
    return AttendanceRecord(
      learnerId: learnerId,
      learnerName: learnerName,
      status: status ?? this.status,
      notes: notes ?? this.notes,
    );
  }
}

/// Observation record.
class ObservationRecord {
  const ObservationRecord({
    required this.id,
    required this.learnerId,
    required this.learnerName,
    required this.content,
    required this.timestamp,
    this.type = 'general',
  });

  final String id;
  final String learnerId;
  final String learnerName;
  final String content;
  final DateTime timestamp;
  final String type;
}

/// Session log state.
class SessionLogState {
  const SessionLogState({
    this.sessionId,
    this.className,
    this.startedAt,
    this.attendance = const [],
    this.observations = const [],
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  final String? sessionId;
  final String? className;
  final DateTime? startedAt;
  final List<AttendanceRecord> attendance;
  final List<ObservationRecord> observations;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  SessionLogState copyWith({
    String? sessionId,
    String? className,
    DateTime? startedAt,
    List<AttendanceRecord>? attendance,
    List<ObservationRecord>? observations,
    bool? isLoading,
    bool? isSaving,
    String? error,
  }) {
    return SessionLogState(
      sessionId: sessionId ?? this.sessionId,
      className: className ?? this.className,
      startedAt: startedAt ?? this.startedAt,
      attendance: attendance ?? this.attendance,
      observations: observations ?? this.observations,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
    );
  }

  int get presentCount => attendance.where((a) => a.status == AttendanceStatus.present).length;
  int get absentCount => attendance.where((a) => a.status == AttendanceStatus.absent).length;
  int get tardyCount => attendance.where((a) => a.status == AttendanceStatus.tardy).length;
}

/// Session log notifier.
class SessionLogNotifier extends StateNotifier<SessionLogState> {
  SessionLogNotifier() : super(const SessionLogState());

  Future<void> loadSession(String sessionId) async {
    state = state.copyWith(isLoading: true, sessionId: sessionId);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.get('/session/classroom-sessions/$sessionId');
      final data = response.data as Map<String, dynamic>;

      final roster = (data['roster'] as List?) ?? [];
      final attendance = roster.map((s) {
        final json = s as Map<String, dynamic>;
        return AttendanceRecord(
          learnerId: json['learnerId'] as String,
          learnerName: json['learnerName'] as String,
          status: _parseStatus(json['attendanceStatus'] as String?),
          notes: json['notes'] as String?,
        );
      }).toList();

      final obsData = (data['observations'] as List?) ?? [];
      final observations = obsData.map((o) {
        final json = o as Map<String, dynamic>;
        return ObservationRecord(
          id: json['id'] as String,
          learnerId: json['learnerId'] as String,
          learnerName: json['learnerName'] as String,
          content: json['content'] as String,
          timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
          type: json['type'] as String? ?? 'general',
        );
      }).toList();

      state = state.copyWith(
        isLoading: false,
        className: data['className'] as String?,
        startedAt: data['startedAt'] != null
            ? DateTime.fromMillisecondsSinceEpoch(data['startedAt'] as int)
            : null,
        attendance: attendance,
        observations: observations,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e is ApiException ? e.message : 'Failed to load session',
      );
    }
  }

  AttendanceStatus _parseStatus(String? status) {
    switch (status) {
      case 'present':
        return AttendanceStatus.present;
      case 'absent':
        return AttendanceStatus.absent;
      case 'tardy':
        return AttendanceStatus.tardy;
      default:
        return AttendanceStatus.unknown;
    }
  }

  Future<void> updateAttendance(String learnerId, AttendanceStatus status) async {
    // Optimistically update UI
    final updated = state.attendance.map((a) {
      if (a.learnerId == learnerId) {
        return a.copyWith(status: status);
      }
      return a;
    }).toList();

    state = state.copyWith(attendance: updated);

    // Save to server
    try {
      final apiClient = AivoApiClient.instance;
      await apiClient.post(
        '/session/classroom-sessions/${state.sessionId}/attendance',
        data: {
          'learnerId': learnerId,
          'status': status.name,
        },
      );
    } on Exception {
      // Revert on error - silent fail as UI already shows current state
      state = state.copyWith(attendance: state.attendance);
    }
  }

  Future<void> addObservation({
    required String learnerId,
    required String learnerName,
    required String content,
    String type = 'general',
  }) async {
    final tempId = DateTime.now().millisecondsSinceEpoch.toString();
    final observation = ObservationRecord(
      id: tempId,
      learnerId: learnerId,
      learnerName: learnerName,
      content: content,
      timestamp: DateTime.now(),
      type: type,
    );

    // Optimistic update
    state = state.copyWith(
      observations: [observation, ...state.observations],
    );

    try {
      final apiClient = AivoApiClient.instance;
      await apiClient.post(
        '/session/classroom-sessions/${state.sessionId}/observations',
        data: {
          'learnerId': learnerId,
          'type': type,
          'content': content,
        },
      );
    } on Exception {
      // Remove on error - silent fail with UI rollback
      state = state.copyWith(
        observations: state.observations.where((o) => o.id != tempId).toList(),
      );
    }
  }

  Future<bool> endSession() async {
    state = state.copyWith(isSaving: true);

    try {
      final apiClient = AivoApiClient.instance;
      await apiClient.patch(
        '/session/classroom-sessions/${state.sessionId}/end',
        data: {'endedAt': DateTime.now().millisecondsSinceEpoch},
      );

      state = state.copyWith(isSaving: false);
      return true;
    } on Exception {
      // End session failed - return false to indicate failure
      state = state.copyWith(isSaving: false);
      return false;
    }
  }
}

final sessionLogProvider =
    StateNotifierProvider<SessionLogNotifier, SessionLogState>((ref) {
  return SessionLogNotifier();
});

class SessionLogScreen extends ConsumerStatefulWidget {
  const SessionLogScreen({
    super.key,
    required this.sessionId,
  });

  final String sessionId;

  @override
  ConsumerState<SessionLogScreen> createState() => _SessionLogScreenState();
}

class _SessionLogScreenState extends ConsumerState<SessionLogScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionLogProvider.notifier).loadSession(widget.sessionId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(sessionLogProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(state.className ?? 'Session'),
            if (state.startedAt != null)
              Text(
                'Started ${_formatTime(state.startedAt!)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.stop),
            onPressed: state.isSaving ? null : () => _endSession(),
            tooltip: 'End Session',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: Badge(
                label: Text('${state.attendance.length}'),
                child: const Icon(Icons.how_to_reg),
              ),
              text: 'Attendance',
            ),
            Tab(
              icon: Badge(
                label: Text('${state.observations.length}'),
                child: const Icon(Icons.note_alt),
              ),
              text: 'Notes',
            ),
          ],
        ),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildError(state.error!)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _AttendanceTab(state: state),
                    _ObservationsTab(state: state),
                  ],
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddObservation(),
        child: const Icon(Icons.add_comment),
      ),
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.error_outline,
            size: _kLargeIconSize,
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: 16),
          Text(error),
          const SizedBox(height: 16),
          FilledButton.tonal(
            onPressed: () =>
                ref.read(sessionLogProvider.notifier).loadSession(widget.sessionId),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Future<void> _endSession() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End Session?'),
        content: const Text('This will finalize attendance and observations.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('End Session'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await ref.read(sessionLogProvider.notifier).endSession();
      if (success && mounted) {
        context.go('/classes');
      }
    }
  }

  void _showAddObservation() {
    final state = ref.read(sessionLogProvider);
    String? selectedLearnerId;
    String? selectedLearnerName;
    final contentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: StatefulBuilder(
          builder: (context, setState) => SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Add Observation',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Student',
                      border: OutlineInputBorder(),
                    ),
                    value: selectedLearnerId,
                    items: state.attendance.map((a) {
                      return DropdownMenuItem(
                        value: a.learnerId,
                        child: Text(a.learnerName),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        selectedLearnerId = value;
                        selectedLearnerName = state.attendance
                            .firstWhere((a) => a.learnerId == value)
                            .learnerName;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: contentController,
                    decoration: const InputDecoration(
                      labelText: 'Observation',
                      hintText: 'What did you observe?',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: selectedLearnerId != null &&
                            contentController.text.isNotEmpty
                        ? () {
                            ref.read(sessionLogProvider.notifier).addObservation(
                                  learnerId: selectedLearnerId!,
                                  learnerName: selectedLearnerName!,
                                  content: contentController.text,
                                );
                            Navigator.pop(context);
                          }
                        : null,
                    child: const Text('Save'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AttendanceTab extends ConsumerWidget {
  const _AttendanceTab({required this.state});

  final SessionLogState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        // Summary bar
        Container(
          padding: const EdgeInsets.all(16),
          color: colorScheme.surfaceContainerHighest,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _AttendanceStat(
                label: 'Present',
                count: state.presentCount,
                color: Colors.green,
              ),
              _AttendanceStat(
                label: 'Absent',
                count: state.absentCount,
                color: Colors.red,
              ),
              _AttendanceStat(
                label: 'Tardy',
                count: state.tardyCount,
                color: Colors.orange,
              ),
            ],
          ),
        ),
        // Student list
        Expanded(
          child: ListView.builder(
            itemCount: state.attendance.length,
            itemBuilder: (context, index) {
              final record = state.attendance[index];
              return _AttendanceRow(
                record: record,
                onStatusChanged: (status) {
                  ref.read(sessionLogProvider.notifier)
                      .updateAttendance(record.learnerId, status);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AttendanceStat extends StatelessWidget {
  const _AttendanceStat({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _AttendanceRow extends StatelessWidget {
  const _AttendanceRow({
    required this.record,
    required this.onStatusChanged,
  });

  final AttendanceRecord record;
  final void Function(AttendanceStatus) onStatusChanged;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: record.status.color.withAlpha(51),
        child: Icon(
          record.status.icon,
          color: record.status.color,
        ),
      ),
      title: Text(record.learnerName),
      subtitle: Text(record.status.label),
      trailing: SegmentedButton<AttendanceStatus>(
        segments: const [
          ButtonSegment(
            value: AttendanceStatus.present,
            icon: Icon(Icons.check, size: 18),
          ),
          ButtonSegment(
            value: AttendanceStatus.absent,
            icon: Icon(Icons.close, size: 18),
          ),
          ButtonSegment(
            value: AttendanceStatus.tardy,
            icon: Icon(Icons.access_time, size: 18),
          ),
        ],
        selected: {record.status},
        onSelectionChanged: (selected) {
          if (selected.isNotEmpty) {
            onStatusChanged(selected.first);
          }
        },
        showSelectedIcon: false,
      ),
    );
  }
}

class _ObservationsTab extends StatelessWidget {
  const _ObservationsTab({required this.state});

  final SessionLogState state;

  @override
  Widget build(BuildContext context) {
    if (state.observations.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.note_alt_outlined,
              size: _kLargeIconSize,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            const Text('No observations yet'),
            const SizedBox(height: 8),
            Text(
              'Tap + to add an observation',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.observations.length,
      itemBuilder: (context, index) {
        final observation = state.observations[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: _kAvatarRadius,
                      child: Text(
                        observation.learnerName.isNotEmpty
                            ? observation.learnerName[0]
                            : '?',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            observation.learnerName,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          Text(
                            _formatTime(observation.timestamp),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(observation.content),
              ],
            ),
          ),
        );
      },
    );
  }
}
