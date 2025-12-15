/// Meetings Screen
///
/// View and schedule care team meetings.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';

/// Screen showing care team meetings.
class MeetingsScreen extends ConsumerWidget {
  const MeetingsScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meetingsAsync = ref.watch(meetingsProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text("$learnerName's Meetings"),
      ),
      body: meetingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load meetings: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(meetingsProvider(learnerId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (meetings) => _MeetingsView(
          learnerId: learnerId,
          meetings: meetings,
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showScheduleMeetingSheet(context, learnerId, ref),
        icon: const Icon(Icons.add),
        label: const Text('Schedule Meeting'),
      ),
    );
  }

  void _showScheduleMeetingSheet(BuildContext context, String learnerId, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _ScheduleMeetingSheet(learnerId: learnerId),
      ),
    );
  }
}

class _MeetingsView extends StatelessWidget {
  const _MeetingsView({
    required this.learnerId,
    required this.meetings,
  });

  final String learnerId;
  final List<CareMeeting> meetings;

  @override
  Widget build(BuildContext context) {
    if (meetings.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No meetings scheduled',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Schedule a meeting to coordinate\nwith the care team',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Separate upcoming and past meetings
    final now = DateTime.now();
    final upcomingMeetings = meetings
        .where((m) => m.scheduledAt.isAfter(now) && m.status == MeetingStatus.scheduled)
        .toList()
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    
    final pastMeetings = meetings
        .where((m) => m.scheduledAt.isBefore(now) || m.status != MeetingStatus.scheduled)
        .toList()
      ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      children: [
        if (upcomingMeetings.isNotEmpty) ...[
          _SectionHeader(
            title: 'Upcoming',
            count: upcomingMeetings.length,
          ),
          ...upcomingMeetings.map((m) => _MeetingCard(
                learnerId: learnerId,
                meeting: m,
                isUpcoming: true,
              )),
          const SizedBox(height: 24),
        ],
        if (pastMeetings.isNotEmpty) ...[
          _SectionHeader(
            title: 'Past Meetings',
            count: pastMeetings.length,
          ),
          ...pastMeetings.map((m) => _MeetingCard(
                learnerId: learnerId,
                meeting: m,
                isUpcoming: false,
              )),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.count,
  });

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MeetingCard extends ConsumerWidget {
  const _MeetingCard({
    required this.learnerId,
    required this.meeting,
    required this.isUpcoming,
  });

  final String learnerId;
  final CareMeeting meeting;
  final bool isUpcoming;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showMeetingDetail(context),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  Container(
                    width: 56,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _getStatusColor(meeting.status).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Text(
                          _getMonthAbbr(meeting.scheduledAt.month),
                          style: TextStyle(
                            fontSize: 12,
                            color: _getStatusColor(meeting.status),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '${meeting.scheduledAt.day}',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(meeting.status),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          meeting.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Text(
                              _formatTime(meeting.scheduledAt),
                              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                            ),
                            if (meeting.durationMinutes > 0) ...[
                              Text(
                                ' • ${meeting.durationMinutes} min',
                                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(status: meeting.status),
                ],
              ),
              const SizedBox(height: 12),
              // Meeting type and location
              Row(
                children: [
                  Icon(
                    _getMeetingTypeIcon(meeting.meetingType),
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    meeting.meetingTypeDisplayName,
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  ),
                  if (meeting.location != null) ...[
                    const SizedBox(width: 12),
                    Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        meeting.location!,
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
              // Participants
              if (meeting.participants.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    // Avatar stack
                    SizedBox(
                      width: 20.0 + (meeting.participants.length - 1) * 14,
                      height: 24,
                      child: Stack(
                        children: meeting.participants.take(4).toList().asMap().entries.map((entry) {
                          final index = entry.key;
                          final participant = entry.value;
                          return Positioned(
                            left: index * 14.0,
                            child: Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: _getRoleColor(participant.role),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                              ),
                              child: Center(
                                child: Text(
                                  participant.displayName.isNotEmpty
                                      ? participant.displayName[0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _getParticipantsSummary(meeting.participants),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ],
              // Action buttons for upcoming meetings
              if (isUpcoming) ...[
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (meeting.videoLink != null)
                      TextButton.icon(
                        onPressed: () {
                          // TODO: Open video link
                        },
                        icon: const Icon(Icons.videocam, size: 18),
                        label: const Text('Join'),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          minimumSize: Size.zero,
                        ),
                      ),
                    TextButton.icon(
                      onPressed: () {
                        // TODO: Add to calendar
                      },
                      icon: const Icon(Icons.calendar_today, size: 18),
                      label: const Text('Add to Calendar'),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        minimumSize: Size.zero,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(MeetingStatus status) {
    switch (status) {
      case MeetingStatus.scheduled:
        return Colors.blue;
      case MeetingStatus.inProgress:
        return Colors.green;
      case MeetingStatus.completed:
        return Colors.grey;
      case MeetingStatus.cancelled:
        return Colors.red;
      case MeetingStatus.rescheduled:
        return Colors.orange;
    }
  }

  IconData _getMeetingTypeIcon(MeetingType type) {
    switch (type) {
      case MeetingType.virtual:
        return Icons.videocam;
      case MeetingType.inPerson:
        return Icons.people;
      case MeetingType.phone:
        return Icons.phone;
      case MeetingType.hybrid:
        return Icons.devices;
      case MeetingType.checkIn:
        return Icons.check_circle_outline;
      case MeetingType.iepMeeting:
        return Icons.assignment;
      case MeetingType.progressReview:
        return Icons.trending_up;
      case MeetingType.strategySession:
        return Icons.lightbulb_outline;
      case MeetingType.parentTeacher:
        return Icons.family_restroom;
      case MeetingType.teamMeeting:
        return Icons.groups;
      case MeetingType.other:
        return Icons.event;
    }
  }

  Color _getRoleColor(CareTeamRole role) {
    switch (role) {
      case CareTeamRole.parent:
      case CareTeamRole.guardian:
        return Colors.indigo;
      case CareTeamRole.teacher:
        return Colors.green;
      case CareTeamRole.therapist:
        return Colors.purple;
      case CareTeamRole.counselor:
        return Colors.orange;
      case CareTeamRole.specialist:
        return Colors.teal;
      case CareTeamRole.administrator:
      case CareTeamRole.districtAdmin:
        return Colors.blueGrey;
      case CareTeamRole.caseManager:
        return Colors.deepOrange;
      case CareTeamRole.aide:
        return Colors.cyan;
      case CareTeamRole.other:
        return Colors.grey;
    }
  }

  String _getMonthAbbr(int month) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months[month - 1];
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${date.minute.toString().padLeft(2, '0')} $period';
  }

  String _getParticipantsSummary(List<MeetingParticipant> participants) {
    if (participants.isEmpty) return 'No participants';
    if (participants.length == 1) return participants[0].displayName;
    if (participants.length == 2) {
      return '${participants[0].displayName} and ${participants[1].displayName}';
    }
    return '${participants[0].displayName} and ${participants.length - 1} others';
  }

  void _showMeetingDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          child: ListView(
            controller: scrollController,
            children: [
              // Title
              Text(
                meeting.title,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              // Date/time
              ListTile(
                leading: const Icon(Icons.calendar_today),
                title: Text(_formatFullDate(meeting.scheduledAt)),
                subtitle: Text('${_formatTime(meeting.scheduledAt)} • ${meeting.durationMinutes} minutes'),
                contentPadding: EdgeInsets.zero,
              ),
              // Meeting type
              ListTile(
                leading: Icon(_getMeetingTypeIcon(meeting.meetingType)),
                title: Text(meeting.meetingTypeDisplayName),
                subtitle: meeting.location != null ? Text(meeting.location!) : null,
                contentPadding: EdgeInsets.zero,
              ),
              if (meeting.videoLink != null)
                ListTile(
                  leading: const Icon(Icons.link),
                  title: const Text('Video Link'),
                  subtitle: Text(meeting.videoLink!),
                  contentPadding: EdgeInsets.zero,
                  trailing: IconButton(
                    icon: const Icon(Icons.open_in_new),
                    onPressed: () {
                      // TODO: Open link
                    },
                  ),
                ),
              // Description
              if (meeting.description != null) ...[
                const SizedBox(height: 16),
                const Text(
                  'Description',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(meeting.description!),
              ],
              // Agenda
              if (meeting.agenda != null && meeting.agenda!.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Agenda',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...meeting.agenda!.asMap().entries.map((entry) => ListTile(
                      leading: CircleAvatar(
                        radius: 12,
                        child: Text('${entry.key + 1}', style: const TextStyle(fontSize: 12)),
                      ),
                      title: Text(entry.value),
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                    )),
              ],
              // Participants
              const SizedBox(height: 16),
              const Text(
                'Participants',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...meeting.participants.map((p) => ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getRoleColor(p.role),
                      child: Text(
                        p.displayName.isNotEmpty ? p.displayName[0].toUpperCase() : '?',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    title: Text(p.displayName),
                    subtitle: Text(p.roleDisplayName),
                    trailing: _ResponseStatusIcon(status: p.responseStatus),
                    contentPadding: EdgeInsets.zero,
                  )),
            ],
          ),
        ),
      ),
    );
  }

  String _formatFullDate(DateTime date) {
    final weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    final months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final MeetingStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      MeetingStatus.scheduled => (Colors.blue, 'Scheduled'),
      MeetingStatus.inProgress => (Colors.green, 'In Progress'),
      MeetingStatus.completed => (Colors.grey, 'Completed'),
      MeetingStatus.cancelled => (Colors.red, 'Cancelled'),
      MeetingStatus.rescheduled => (Colors.orange, 'Rescheduled'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _ResponseStatusIcon extends StatelessWidget {
  const _ResponseStatusIcon({required this.status});

  final ResponseStatus status;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (status) {
      ResponseStatus.accepted => (Icons.check_circle, Colors.green),
      ResponseStatus.declined => (Icons.cancel, Colors.red),
      ResponseStatus.tentative => (Icons.help, Colors.orange),
      ResponseStatus.pending => (Icons.schedule, Colors.grey),
    };

    return Icon(icon, size: 20, color: color);
  }
}

class _ScheduleMeetingSheet extends ConsumerStatefulWidget {
  const _ScheduleMeetingSheet({required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<_ScheduleMeetingSheet> createState() => _ScheduleMeetingSheetState();
}

class _ScheduleMeetingSheetState extends ConsumerState<_ScheduleMeetingSheet> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  MeetingType _meetingType = MeetingType.virtual;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 10, minute: 0);
  int _durationMinutes = 30;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Schedule Meeting',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Title
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Meeting Title',
                hintText: 'e.g., Monthly Care Team Check-in',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            // Meeting type
            const Text(
              'Meeting Type',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            SegmentedButton<MeetingType>(
              segments: const [
                ButtonSegment(
                  value: MeetingType.virtual,
                  icon: Icon(Icons.videocam),
                  label: Text('Virtual'),
                ),
                ButtonSegment(
                  value: MeetingType.inPerson,
                  icon: Icon(Icons.people),
                  label: Text('In Person'),
                ),
                ButtonSegment(
                  value: MeetingType.phone,
                  icon: Icon(Icons.phone),
                  label: Text('Phone'),
                ),
              ],
              selected: {_meetingType},
              onSelectionChanged: (selection) {
                setState(() => _meetingType = selection.first);
              },
            ),
            const SizedBox(height: 16),
            // Date and Time
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today),
                    label: Text(_formatDate(_selectedDate)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickTime,
                    icon: const Icon(Icons.access_time),
                    label: Text(_selectedTime.format(context)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Duration
            const Text(
              'Duration',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 15, label: Text('15m')),
                ButtonSegment(value: 30, label: Text('30m')),
                ButtonSegment(value: 45, label: Text('45m')),
                ButtonSegment(value: 60, label: Text('1h')),
              ],
              selected: {_durationMinutes},
              onSelectionChanged: (selection) {
                setState(() => _durationMinutes = selection.first);
              },
            ),
            const SizedBox(height: 16),
            // Location
            if (_meetingType == MeetingType.inPerson) ...[
              TextField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Location',
                  hintText: 'e.g., Room 203, Main Building',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
            ],
            // Description
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'Add any notes or agenda items...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            // Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting || _titleController.text.isEmpty
                    ? null
                    : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Schedule Meeting'),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  Future<void> _submit() async {
    if (_titleController.text.isEmpty) return;

    setState(() => _isSubmitting = true);

    final scheduledAt = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );

    try {
      final service = ref.read(collaborationServiceProvider);
      await service.scheduleMeeting(
        learnerId: widget.learnerId,
        title: _titleController.text,
        scheduledAt: scheduledAt,
        durationMinutes: _durationMinutes,
        meetingType: _meetingType,
        location: _meetingType == MeetingType.inPerson ? _locationController.text : null,
        description: _descriptionController.text.isNotEmpty ? _descriptionController.text : null,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Meeting scheduled!'),
            backgroundColor: Colors.green,
          ),
        );
        ref.invalidate(meetingsProvider(widget.learnerId));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to schedule meeting: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}
