/// Tutor History Screen
///
/// Displays a list of past tutoring sessions with subject, persona,
/// duration, and date. Tapping a session expands to show the full
/// message history from that session.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:intl/intl.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_session_provider.dart';
import '../widgets/tutor_chat_bubble.dart';

/// Screen showing the learner's past tutoring session history.
class TutorHistoryScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const TutorHistoryScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<TutorHistoryScreen> createState() =>
      _TutorHistoryScreenState();
}

class _TutorHistoryScreenState extends ConsumerState<TutorHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(tutorHistoryProvider.notifier).loadHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final historyState = ref.watch(tutorHistoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Session History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(tutorHistoryProvider.notifier).refresh();
            },
          ),
        ],
      ),
      body: _buildBody(context, historyState),
    );
  }

  Widget _buildBody(BuildContext context, TutorHistoryState historyState) {
    final theme = Theme.of(context);

    switch (historyState) {
      case TutorHistoryLoading():
        return const Center(child: CircularProgressIndicator());

      case TutorHistoryError():
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline_rounded,
                  size: 64,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Could not load history',
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  historyState.message,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    ref.read(tutorHistoryProvider.notifier).refresh();
                  },
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try Again'),
                ),
              ],
            ),
          ),
        );

      case TutorHistoryLoaded():
        return _buildSessionList(context, theme, historyState.sessions);
    }
  }

  Widget _buildSessionList(
    BuildContext context,
    ThemeData theme,
    List<TutorSession> sessions,
  ) {
    if (sessions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.chat_bubble_outline_rounded,
                size: 64,
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
              ),
              const SizedBox(height: 16),
              Text(
                'No sessions yet',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Start a tutoring session to see your history here.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(tutorHistoryProvider.notifier).refresh();
      },
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: sessions.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final session = sessions[index];
          return _SessionHistoryCard(
            session: session,
            onTap: () => _showSessionDetail(context, session),
          );
        },
      ),
    );
  }

  void _showSessionDetail(BuildContext context, TutorSession session) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _SessionDetailScreen(session: session),
      ),
    );
  }
}

// ============================================================================
// SESSION HISTORY CARD
// ============================================================================

class _SessionHistoryCard extends StatelessWidget {
  final TutorSession session;
  final VoidCallback onTap;

  const _SessionHistoryCard({
    required this.session,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('MMM d, yyyy');
    final timeFormat = DateFormat('h:mm a');

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Subject icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: session.subject.backgroundColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  session.subject.icon,
                  color: session.subject.color,
                  size: 24,
                ),
              ),

              const SizedBox(width: 16),

              // Session info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Subject and status
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            session.topic ?? session.subject.label,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        _buildStatusBadge(theme, session.status),
                      ],
                    ),

                    const SizedBox(height: 4),

                    // Date and time
                    Text(
                      '${dateFormat.format(session.createdAt)} at '
                      '${timeFormat.format(session.createdAt)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AivoBrand.gray.shade600,
                      ),
                    ),

                    const SizedBox(height: 4),

                    // Duration and message count
                    Row(
                      children: [
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: AivoBrand.gray.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          session.formattedDuration,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AivoBrand.gray.shade600,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 14,
                          color: AivoBrand.gray.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${session.messageCount} messages',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AivoBrand.gray.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              Icon(
                Icons.chevron_right_rounded,
                color: AivoBrand.gray.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(ThemeData theme, SessionStatus status) {
    Color badgeColor;
    switch (status) {
      case SessionStatus.active:
        badgeColor = Colors.green;
      case SessionStatus.paused:
        badgeColor = Colors.orange;
      case SessionStatus.completed:
        badgeColor = Colors.blue;
      case SessionStatus.expired:
        badgeColor = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: badgeColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ============================================================================
// SESSION DETAIL SCREEN
// ============================================================================

/// Displays the full message history for a completed session.
class _SessionDetailScreen extends ConsumerStatefulWidget {
  final TutorSession session;

  const _SessionDetailScreen({required this.session});

  @override
  ConsumerState<_SessionDetailScreen> createState() =>
      _SessionDetailScreenState();
}

class _SessionDetailScreenState extends ConsumerState<_SessionDetailScreen> {
  List<TutorMessage>? _messages;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(tutorApiServiceProvider);
      final messages = await service.getMessages(
        sessionId: widget.session.id,
      );
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('MMMM d, yyyy');

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.session.topic ?? widget.session.subject.label),
      ),
      body: Column(
        children: [
          // Session info header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: widget.session.subject.backgroundColor.withOpacity(0.5),
            ),
            child: Row(
              children: [
                Icon(
                  widget.session.subject.icon,
                  color: widget.session.subject.color,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dateFormat.format(widget.session.createdAt),
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${widget.session.formattedDuration} '
                        '- ${widget.session.messageCount} messages',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AivoBrand.gray.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Messages
          Expanded(
            child: _buildMessageContent(theme),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageContent(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline_rounded,
                size: 48,
                color: theme.colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text('Could not load messages'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _loadMessages,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_messages == null || _messages!.isEmpty) {
      return Center(
        child: Text(
          'No messages in this session.',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _messages!.length,
      itemBuilder: (context, index) {
        final message = _messages![index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: TutorChatBubble(
            message: message,
            personaName: widget.session.subject.label,
          ),
        );
      },
    );
  }
}
