/// Tutor Sessions Screen
///
/// View a child's tutor session history with analytics summary,
/// subject breakdown, and detailed session list with transcript access.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_provider.dart';
import 'tutor_transcript_screen.dart';

/// Subject color lookup matching the backend SUBJECT_COLORS.
const Map<String, Color> _subjectColors = {
  'MATH': Color(0xFF3B82F6),
  'ELA': Color(0xFFA855F7),
  'SCIENCE': Color(0xFF22C55E),
  'HISTORY': Color(0xFFF97316),
  'CODING': Color(0xFF06B6D4),
};

Color _colorForSubject(String subject) =>
    _subjectColors[subject.toUpperCase()] ?? Colors.grey;

IconData _iconForSubject(String subject) {
  switch (subject.toUpperCase()) {
    case 'MATH':
      return Icons.calculate;
    case 'ELA':
      return Icons.menu_book;
    case 'SCIENCE':
      return Icons.science;
    case 'HISTORY':
      return Icons.public;
    case 'CODING':
      return Icons.code;
    default:
      return Icons.school;
  }
}

/// Screen displaying analytics summary and session list for a child.
class TutorSessionsScreen extends ConsumerStatefulWidget {
  const TutorSessionsScreen({
    super.key,
    required this.childId,
    required this.childName,
  });

  final String childId;
  final String childName;

  @override
  ConsumerState<TutorSessionsScreen> createState() =>
      _TutorSessionsScreenState();
}

class _TutorSessionsScreenState extends ConsumerState<TutorSessionsScreen> {
  int _currentPage = 1;
  String? _subjectFilter;

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(
      tutorAnalyticsSummaryProvider(learnerId: widget.childId),
    );
    final sessionsAsync = ref.watch(
      tutorAnalyticsSessionsProvider(
        learnerId: widget.childId,
        subject: _subjectFilter,
        page: _currentPage,
      ),
    );
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor Sessions'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(24),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 8),
              child: Text(
                widget.childName,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(
            tutorAnalyticsSummaryProvider(learnerId: widget.childId),
          );
          ref.invalidate(
            tutorAnalyticsSessionsProvider(
              learnerId: widget.childId,
              subject: _subjectFilter,
              page: _currentPage,
            ),
          );
        },
        child: ListView(
          padding: const EdgeInsets.only(bottom: 32),
          children: [
            // ── Summary stats ──────────────────────────────────────
            summaryAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Could not load summary',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              ),
              data: (summary) => _SummarySection(summary: summary),
            ),

            // ── Subject filter ─────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                children: [
                  Text(
                    'Sessions',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  _SubjectFilterChip(
                    selected: _subjectFilter,
                    onChanged: (subject) {
                      setState(() {
                        _subjectFilter = subject;
                        _currentPage = 1;
                      });
                    },
                  ),
                ],
              ),
            ),

            // ── Session list ───────────────────────────────────────
            sessionsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => _ErrorCard(
                message: error.toString(),
                onRetry: () => ref.invalidate(
                  tutorAnalyticsSessionsProvider(
                    learnerId: widget.childId,
                    subject: _subjectFilter,
                    page: _currentPage,
                  ),
                ),
              ),
              data: (response) {
                if (response.sessions.isEmpty) {
                  return _EmptyState(childName: widget.childName);
                }

                return Column(
                  children: [
                    ...response.sessions.map(
                      (session) => _AnalyticsSessionTile(session: session),
                    ),
                    if (response.totalPages > 1)
                      _PaginationControls(
                        currentPage: response.page,
                        totalPages: response.totalPages,
                        onPageChanged: (page) {
                          setState(() => _currentPage = page);
                        },
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY SECTION
// ═══════════════════════════════════════════════════════════════════════════════

class _SummarySection extends StatelessWidget {
  const _SummarySection({required this.summary});

  final TutorAnalyticsSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats row
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.chat_bubble_outline,
                  label: 'Sessions',
                  value: '${summary.totalSessions}',
                  color: Colors.indigo,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _StatCard(
                  icon: Icons.timer_outlined,
                  label: 'Minutes',
                  value: '${summary.totalMinutes}',
                  color: Colors.teal,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _StatCard(
                  icon: Icons.message_outlined,
                  label: 'Messages',
                  value: '${summary.totalMessages}',
                  color: Colors.purple,
                ),
              ),
            ],
          ),

          // Subject breakdown
          if (summary.subjectBreakdown.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'By Subject',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            ...summary.subjectBreakdown.map(
              (sb) => _SubjectBar(breakdown: sb, total: summary.totalMinutes),
            ),
          ],
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
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _SubjectBar extends StatelessWidget {
  const _SubjectBar({required this.breakdown, required this.total});

  final SubjectBreakdown breakdown;
  final int total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _colorForSubject(breakdown.subject);
    final fraction = total > 0 ? breakdown.minutes / total : 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(_iconForSubject(breakdown.subject), size: 16, color: color),
          const SizedBox(width: 8),
          SizedBox(
            width: 64,
            child: Text(
              breakdown.subject,
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction.clamp(0.0, 1.0),
                backgroundColor: color.withValues(alpha: 0.1),
                valueColor: AlwaysStoppedAnimation(color),
                minHeight: 8,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${breakdown.minutes}m',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT FILTER
// ═══════════════════════════════════════════════════════════════════════════════

class _SubjectFilterChip extends StatelessWidget {
  const _SubjectFilterChip({
    required this.selected,
    required this.onChanged,
  });

  final String? selected;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String?>(
      initialValue: selected,
      onSelected: onChanged,
      child: Chip(
        label: Text(selected ?? 'All Subjects'),
        avatar: const Icon(Icons.filter_list, size: 16),
        visualDensity: VisualDensity.compact,
      ),
      itemBuilder: (context) => [
        const PopupMenuItem(value: null, child: Text('All Subjects')),
        const PopupMenuDivider(),
        const PopupMenuItem(value: 'MATH', child: Text('Math')),
        const PopupMenuItem(value: 'ELA', child: Text('ELA')),
        const PopupMenuItem(value: 'SCIENCE', child: Text('Science')),
        const PopupMenuItem(value: 'HISTORY', child: Text('History')),
        const PopupMenuItem(value: 'CODING', child: Text('Coding')),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SESSION TILE
// ═══════════════════════════════════════════════════════════════════════════════

class _AnalyticsSessionTile extends StatelessWidget {
  const _AnalyticsSessionTile({required this.session});

  final AnalyticsSession session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _colorForSubject(session.subject);
    final startedAt = DateTime.tryParse(session.startedAt);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => TutorTranscriptScreen(
              sessionId: session.id,
              personaName: session.persona.name,
              subject: session.subject,
            ),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Subject icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _iconForSubject(session.subject),
                  color: color,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),

              // Session info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            session.persona.name,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (startedAt != null)
                          Text(
                            _formatTime(startedAt),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          _iconForSubject(session.subject),
                          size: 14,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          session.subject,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${session.durationMinutes} min',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(
                          Icons.message_outlined,
                          size: 14,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${session.messageCount}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    if (session.topic != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        session.topic!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right,
                size: 20,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatTime(DateTime dt) {
    final hour = dt.hour == 0
        ? 12
        : dt.hour > 12
            ? dt.hour - 12
            : dt.hour;
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${dt.minute.toString().padLeft(2, '0')} $period';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

class _PaginationControls extends StatelessWidget {
  const _PaginationControls({
    required this.currentPage,
    required this.totalPages,
    required this.onPageChanged,
  });

  final int currentPage;
  final int totalPages;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            onPressed:
                currentPage > 1 ? () => onPageChanged(currentPage - 1) : null,
            icon: const Icon(Icons.chevron_left),
            iconSize: 20,
          ),
          Text(
            'Page $currentPage of $totalPages',
            style: theme.textTheme.bodySmall,
          ),
          IconButton(
            onPressed: currentPage < totalPages
                ? () => onPageChanged(currentPage + 1)
                : null,
            icon: const Icon(Icons.chevron_right),
            iconSize: 20,
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY / ERROR STATES
// ═══════════════════════════════════════════════════════════════════════════════

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.childName});

  final String childName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color:
                    theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.chat_bubble_outline,
                size: 40,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No Sessions Yet',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$childName hasn\'t had any tutor sessions yet.\n'
              'Sessions will appear here once they start learning.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          Text(
            'Failed to load sessions',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
