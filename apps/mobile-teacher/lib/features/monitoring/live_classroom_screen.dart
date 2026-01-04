/**
 * Live Classroom Monitoring Screen (Flutter)
 *
 * Mobile-friendly classroom monitoring with:
 * - Real-time student status cards
 * - Push notifications for urgent alerts
 * - Quick intervention actions
 * - Pull-to-refresh
 * - Optimized for mobile viewing
 */

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Focus states for students
enum FocusState {
  focused,
  idle,
  struggling,
  frustrated,
  helpRequested,
  offTask,
}

/// Student activity status
class StudentStatus {
  final String studentId;
  final String studentName;
  final String? currentActivity;
  final double progress;
  final FocusState focusState;
  final int timeOnTask;
  final DateTime lastInteraction;
  final int errorCount;
  final double successRate;
  final int idleTime;
  final bool isActive;
  final Map<String, dynamic>? metadata;

  StudentStatus({
    required this.studentId,
    required this.studentName,
    this.currentActivity,
    required this.progress,
    required this.focusState,
    required this.timeOnTask,
    required this.lastInteraction,
    required this.errorCount,
    required this.successRate,
    required this.idleTime,
    required this.isActive,
    this.metadata,
  });

  factory StudentStatus.fromJson(Map<String, dynamic> json) {
    return StudentStatus(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      currentActivity: json['currentActivity'] as String?,
      progress: (json['progress'] as num).toDouble(),
      focusState: _parseFocusState(json['focusState'] as String),
      timeOnTask: json['timeOnTask'] as int,
      lastInteraction: DateTime.parse(json['lastInteraction'] as String),
      errorCount: json['errorCount'] as int,
      successRate: (json['successRate'] as num).toDouble(),
      idleTime: json['idleTime'] as int,
      isActive: json['isActive'] as bool,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  static FocusState _parseFocusState(String state) {
    switch (state) {
      case 'focused':
        return FocusState.focused;
      case 'idle':
        return FocusState.idle;
      case 'struggling':
        return FocusState.struggling;
      case 'frustrated':
        return FocusState.frustrated;
      case 'help_requested':
        return FocusState.helpRequested;
      case 'off_task':
        return FocusState.offTask;
      default:
        return FocusState.idle;
    }
  }
}

/// Alert
class ClassroomAlert {
  final String id;
  final String type;
  final String priority;
  final String studentId;
  final String studentName;
  final String message;
  final DateTime timestamp;
  final bool acknowledged;

  ClassroomAlert({
    required this.id,
    required this.type,
    required this.priority,
    required this.studentId,
    required this.studentName,
    required this.message,
    required this.timestamp,
    this.acknowledged = false,
  });

  factory ClassroomAlert.fromJson(Map<String, dynamic> json) {
    return ClassroomAlert(
      id: json['id'] as String,
      type: json['type'] as String,
      priority: json['priority'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      message: json['message'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      acknowledged: json['acknowledged'] as bool? ?? false,
    );
  }
}

/// Live Classroom Screen
class LiveClassroomScreen extends StatefulWidget {
  final String classroomId;
  final String classroomName;

  const LiveClassroomScreen({
    Key? key,
    required this.classroomId,
    required this.classroomName,
  }) : super(key: key);

  @override
  State<LiveClassroomScreen> createState() => _LiveClassroomScreenState();
}

class _LiveClassroomScreenState extends State<LiveClassroomScreen> {
  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  List<StudentStatus> _students = [];
  List<ClassroomAlert> _alerts = [];
  bool _isLoading = true;
  bool _isConnected = false;
  String? _errorMessage;
  FocusState? _filterState;

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
    _loadClassroomData();
    // TODO: Initialize WebSocket connection
  }

  /// Initialize push notifications
  Future<void> _initializeNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notificationsPlugin.initialize(settings);
  }

  /// Show notification for urgent alert
  Future<void> _showNotification(ClassroomAlert alert) async {
    const androidDetails = AndroidNotificationDetails(
      'classroom_alerts',
      'Classroom Alerts',
      channelDescription: 'Urgent alerts from your classroom',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _notificationsPlugin.show(
      alert.id.hashCode,
      'Alert: ${alert.studentName}',
      alert.message,
      details,
    );
  }

  /// Load classroom data
  Future<void> _loadClassroomData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // TODO: Replace with actual API call
      // final response = await http.get(
      //   Uri.parse('$apiUrl/monitor/classroom/${widget.classroomId}'),
      //   headers: {'Authorization': 'Bearer $token'},
      // );

      // Mock data for now
      await Future.delayed(const Duration(seconds: 1));

      setState(() {
        _students = []; // Parse from response
        _isLoading = false;
        _isConnected = true;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load classroom data';
        _isLoading = false;
      });
    }
  }

  /// Get color for focus state
  Color _getFocusColor(FocusState state) {
    switch (state) {
      case FocusState.focused:
        return Colors.green;
      case FocusState.idle:
        return Colors.grey;
      case FocusState.struggling:
        return Colors.orange;
      case FocusState.frustrated:
        return Colors.deepOrange;
      case FocusState.helpRequested:
        return Colors.red;
      case FocusState.offTask:
        return Colors.purple;
    }
  }

  /// Get label for focus state
  String _getFocusLabel(FocusState state) {
    switch (state) {
      case FocusState.focused:
        return 'Focused';
      case FocusState.idle:
        return 'Idle';
      case FocusState.struggling:
        return 'Struggling';
      case FocusState.frustrated:
        return 'Frustrated';
      case FocusState.helpRequested:
        return 'Help Needed';
      case FocusState.offTask:
        return 'Off Task';
    }
  }

  /// Format time duration
  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    if (minutes < 60) {
      return '${minutes}m';
    }
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    return '${hours}h ${remainingMinutes}m';
  }

  /// Filter students by focus state
  List<StudentStatus> get _filteredStudents {
    if (_filterState == null) {
      return _students;
    }
    return _students.where((s) => s.focusState == _filterState).toList();
  }

  /// Send intervention
  Future<void> _sendIntervention(String studentId, String type) async {
    // TODO: Implement API call
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Sending $type intervention...')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final urgentAlerts = _alerts.where((a) =>
      a.priority == 'urgent' && !a.acknowledged
    ).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.classroomName),
        actions: [
          // Connection indicator
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Icon(
              Icons.circle,
              size: 12,
              color: _isConnected ? Colors.green : Colors.red,
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadClassroomData,
        child: _buildBody(urgentAlerts),
      ),
    );
  }

  Widget _buildBody(List<ClassroomAlert> urgentAlerts) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(_errorMessage!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadClassroomData,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Urgent alerts banner
        if (urgentAlerts.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.red.shade50,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning, color: Colors.red),
                    const SizedBox(width: 8),
                    Text(
                      '${urgentAlerts.length} Student${urgentAlerts.length > 1 ? 's' : ''} Need Attention',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...urgentAlerts.take(2).map((alert) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    '${alert.studentName}: ${alert.message}',
                    style: TextStyle(fontSize: 13, color: Colors.red.shade700),
                  ),
                )),
              ],
            ),
          ),

        // Filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              _buildFilterChip('All', null, _students.length),
              const SizedBox(width: 8),
              ...FocusState.values.map((state) {
                final count = _students.where((s) => s.focusState == state).length;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _buildFilterChip(
                    _getFocusLabel(state),
                    state,
                    count,
                  ),
                );
              }),
            ],
          ),
        ),

        // Student list
        Expanded(
          child: _filteredStudents.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('No active students'),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: _filteredStudents.length,
                  itemBuilder: (context, index) {
                    return _buildStudentCard(_filteredStudents[index]);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String label, FocusState? state, int count) {
    final isSelected = _filterState == state;
    final color = state != null ? _getFocusColor(state) : Colors.grey;

    return FilterChip(
      label: Text('$label ($count)'),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _filterState = selected ? state : null;
        });
      },
      selectedColor: color.withOpacity(0.3),
      checkmarkColor: color,
    );
  }

  Widget _buildStudentCard(StudentStatus student) {
    final color = _getFocusColor(student.focusState);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color, width: 2),
      ),
      child: InkWell(
        onTap: () {
          // TODO: Navigate to student detail
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      student.studentName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getFocusLabel(student.focusState),
                      style: TextStyle(
                        fontSize: 12,
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Activity
              if (student.currentActivity != null)
                Text(
                  student.currentActivity!,
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              const SizedBox(height: 8),

              // Progress bar
              Row(
                children: [
                  Expanded(
                    child: LinearProgressIndicator(
                      value: student.progress / 100,
                      backgroundColor: Colors.grey.shade200,
                      color: color,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${student.progress.round()}%',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Metrics
              Row(
                children: [
                  Icon(Icons.access_time, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    _formatDuration(student.timeOnTask),
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.check_circle, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    '${student.successRate.round()}% correct',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Quick actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _sendIntervention(
                        student.studentId,
                        'encouragement',
                      ),
                      icon: const Icon(Icons.favorite, size: 16),
                      label: const Text('Encourage'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _sendIntervention(
                        student.studentId,
                        'chat',
                      ),
                      icon: const Icon(Icons.message, size: 16),
                      label: const Text('Chat'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
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
