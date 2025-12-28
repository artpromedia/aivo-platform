/// Today's Sessions Card Widget
library;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/models.dart';

/// Card showing today's scheduled sessions.
class TodaysSessionsCard extends StatelessWidget {
  const TodaysSessionsCard({
    super.key,
    required this.sessions,
    required this.onSessionTap,
    required this.onStartSession,
  });

  final List<Session> sessions;
  final void Function(Session) onSessionTap;
  final void Function(Session) onStartSession;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Today's Sessions",
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  DateFormat('EEEE, MMM d').format(DateTime.now()),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          if (sessions.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: Text('No sessions scheduled for today'),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: sessions.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final session = sessions[index];
                return _SessionTile(
                  session: session,
                  onTap: () => onSessionTap(session),
                  onStart: session.status == SessionStatus.scheduled
                      ? () => onStartSession(session)
                      : null,
                );
              },
            ),
        ],
      ),
    );
  }
}

class _SessionTile extends StatelessWidget {
  const _SessionTile({
    required this.session,
    required this.onTap,
    this.onStart,
  });

  final Session session;
  final VoidCallback onTap;
  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context) {
    final time = session.scheduledAt != null
        ? DateFormat('h:mm a').format(session.scheduledAt!)
        : 'Unscheduled';

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: _statusColor,
        child: Icon(_statusIcon, color: Colors.white, size: 20),
      ),
      title: Text(session.title ?? 'Session'),
      subtitle: Text('$time • ${session.studentIds.length} students'),
      trailing: onStart != null
          ? IconButton(
              icon: const Icon(Icons.play_arrow),
              onPressed: onStart,
              color: Colors.green,
            )
          : _StatusChip(status: session.status),
    );
  }

  Color get _statusColor {
    switch (session.status) {
      case SessionStatus.scheduled: return Colors.blue;
      case SessionStatus.active: return Colors.green;
      case SessionStatus.paused: return Colors.orange;
      case SessionStatus.completed: return Colors.grey;
      case SessionStatus.cancelled: return Colors.red;
    }
  }

  IconData get _statusIcon {
    switch (session.status) {
      case SessionStatus.scheduled: return Icons.schedule;
      case SessionStatus.active: return Icons.play_arrow;
      case SessionStatus.paused: return Icons.pause;
      case SessionStatus.completed: return Icons.check;
      case SessionStatus.cancelled: return Icons.close;
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final SessionStatus status;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(
        status.name.toUpperCase(),
        style: const TextStyle(fontSize: 10),
      ),
      backgroundColor: _color.withOpacity(0.2),
      labelStyle: TextStyle(color: _color),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }

  Color get _color {
    switch (status) {
      case SessionStatus.scheduled: return Colors.blue;
      case SessionStatus.active: return Colors.green;
      case SessionStatus.paused: return Colors.orange;
      case SessionStatus.completed: return Colors.grey;
      case SessionStatus.cancelled: return Colors.red;
    }
  }
}
