/// Collaboration Dashboard Screen for Teachers
///
/// Shows overview of collaboration across learners.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';

/// Teacher's collaboration dashboard.
class CollaborationDashboardScreen extends ConsumerWidget {
  const CollaborationDashboardScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(classroomCollaborationProvider(classId));
    final meetingsAsync = ref.watch(teacherUpcomingMeetingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Care Team Collaboration'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(classroomCollaborationProvider(classId));
          ref.invalidate(teacherUpcomingMeetingsProvider);
        },
        child: CustomScrollView(
          slivers: [
            // Stats cards
            summaryAsync.when(
              loading: () => const SliverToBoxAdapter(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => SliverToBoxAdapter(
                child: Center(child: Text('Error: $error')),
              ),
              data: (summary) => SliverToBoxAdapter(
                child: _StatsSection(summary: summary),
              ),
            ),
            
            // Upcoming meetings section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'Upcoming Meetings',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () {
                        // TODO: Navigate to all meetings
                      },
                      child: const Text('See All'),
                    ),
                  ],
                ),
              ),
            ),
            meetingsAsync.when(
              loading: () => const SliverToBoxAdapter(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => SliverToBoxAdapter(
                child: Center(child: Text('Error: $error')),
              ),
              data: (meetings) => SliverToBoxAdapter(
                child: _MeetingsList(meetings: meetings.take(3).toList()),
              ),
            ),

            // Learners needing attention
            summaryAsync.when(
              loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
              error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
              data: (summary) {
                final needsAttention = summary.learnerSummaries
                    .where((l) => l.needsAttention)
                    .toList();
                if (needsAttention.isEmpty) {
                  return const SliverToBoxAdapter(child: SizedBox.shrink());
                }
                return SliverToBoxAdapter(
                  child: _LearnersNeedingAttention(learners: needsAttention),
                );
              },
            ),

            // All learners with plans
            summaryAsync.when(
              loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
              error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
              data: (summary) => SliverToBoxAdapter(
                child: _AllLearnersSection(learners: summary.learnerSummaries),
              ),
            ),

            const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
          ],
        ),
      ),
    );
  }
}

class _StatsSection extends StatelessWidget {
  const _StatsSection({required this.summary});

  final ClassroomCollaborationSummary summary;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            summary.className,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.people,
                  label: 'With Plans',
                  value: '${summary.learnersWithPlans}/${summary.totalLearners}',
                  color: Colors.blue,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.note,
                  label: 'Pending Notes',
                  value: '${summary.pendingNotes}',
                  color: summary.pendingNotes > 0 ? Colors.orange : Colors.grey,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.event,
                  label: 'Meetings',
                  value: '${summary.upcomingMeetings}',
                  color: Colors.green,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _MeetingsList extends StatelessWidget {
  const _MeetingsList({required this.meetings});

  final List<CareMeeting> meetings;

  @override
  Widget build(BuildContext context) {
    if (meetings.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          'No upcoming meetings',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: meetings.map((meeting) => _MeetingTile(meeting: meeting)).toList(),
      ),
    );
  }
}

class _MeetingTile extends StatelessWidget {
  const _MeetingTile({required this.meeting});

  final CareMeeting meeting;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.blue.withValues(alpha: 0.15),
          child: const Icon(Icons.event, color: Colors.blue),
        ),
        title: Text(meeting.title),
        subtitle: Text(
          '${meeting.learnerName ?? "Student"} • ${_formatDateTime(meeting.scheduledAt)}',
        ),
        trailing: meeting.videoLink != null
            ? IconButton(
                icon: const Icon(Icons.videocam, color: Colors.blue),
                onPressed: () {
                  // TODO: Open video link
                },
              )
            : null,
        onTap: () {
          // TODO: Navigate to meeting detail
        },
      ),
    );
  }

  String _formatDateTime(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final meetingDate = DateTime(date.year, date.month, date.day);
    
    String dateStr;
    if (meetingDate == today) {
      dateStr = 'Today';
    } else if (meetingDate == today.add(const Duration(days: 1))) {
      dateStr = 'Tomorrow';
    } else {
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dateStr = '${months[date.month - 1]} ${date.day}';
    }

    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$dateStr at $hour:${date.minute.toString().padLeft(2, '0')} $period';
  }
}

class _LearnersNeedingAttention extends StatelessWidget {
  const _LearnersNeedingAttention({required this.learners});

  final List<LearnerCollaborationSummary> learners;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.flag, color: Colors.orange, size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'Needs Attention',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...learners.map((learner) => _LearnerAttentionCard(learner: learner)),
        ],
      ),
    );
  }
}

class _LearnerAttentionCard extends StatelessWidget {
  const _LearnerAttentionCard({required this.learner});

  final LearnerCollaborationSummary learner;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Colors.orange.withValues(alpha: 0.05),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.orange.withValues(alpha: 0.15),
          child: Text(
            learner.learnerName.isNotEmpty ? learner.learnerName[0] : '?',
            style: const TextStyle(
              color: Colors.orange,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(learner.learnerName),
        subtitle: _buildReasons(),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          // TODO: Navigate to learner collaboration detail
        },
      ),
    );
  }

  Widget _buildReasons() {
    final reasons = <String>[];
    if (learner.unreadNoteCount > 0) {
      reasons.add('${learner.unreadNoteCount} unread notes');
    }
    if (learner.pendingTaskCount > 2) {
      reasons.add('${learner.pendingTaskCount} pending tasks');
    }
    return Text(
      reasons.join(' • '),
      style: const TextStyle(color: Colors.orange),
    );
  }
}

class _AllLearnersSection extends StatelessWidget {
  const _AllLearnersSection({required this.learners});

  final List<LearnerCollaborationSummary> learners;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.groups, size: 20),
              SizedBox(width: 8),
              Text(
                'All Learners with Plans',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...learners.map((learner) => _LearnerSummaryTile(learner: learner)),
        ],
      ),
    );
  }
}

class _LearnerSummaryTile extends StatelessWidget {
  const _LearnerSummaryTile({required this.learner});

  final LearnerCollaborationSummary learner;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          // TODO: Navigate to learner collaboration detail
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: Colors.blue.withValues(alpha: 0.15),
                child: Text(
                  learner.learnerName.isNotEmpty ? learner.learnerName[0] : '?',
                  style: const TextStyle(
                    color: Colors.blue,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      learner.learnerName,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(
                      '${learner.activePlanCount} plan${learner.activePlanCount != 1 ? "s" : ""}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              // Quick stats
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (learner.unreadNoteCount > 0) ...[
                    _MiniStat(
                      icon: Icons.note,
                      value: learner.unreadNoteCount,
                      color: Colors.orange,
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (learner.upcomingMeetingCount > 0) ...[
                    _MiniStat(
                      icon: Icons.event,
                      value: learner.upcomingMeetingCount,
                      color: Colors.green,
                    ),
                  ],
                ],
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 2),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
