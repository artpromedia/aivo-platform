import 'package:flutter/material.dart';

import '../in_app_notification_service.dart';

/// Widget for displaying notification badge on icons
class NotificationBadge extends StatelessWidget {
  final InAppNotificationService service;
  final Widget child;
  final Color? badgeColor;
  final Color? textColor;
  final bool showZero;
  final int? max;

  const NotificationBadge({
    super.key,
    required this.service,
    required this.child,
    this.badgeColor,
    this.textColor,
    this.showZero = false,
    this.max = 99,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<int>(
      stream: service.unreadCount,
      initialData: service.currentUnreadCount,
      builder: (context, snapshot) {
        final count = snapshot.data ?? 0;
        final displayCount = max != null && count > max! ? '$max+' : '$count';

        if (count == 0 && !showZero) {
          return child;
        }

        return Stack(
          clipBehavior: Clip.none,
          children: [
            child,
            Positioned(
              right: -4,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeColor ?? Theme.of(context).colorScheme.error,
                  borderRadius: BorderRadius.circular(10),
                ),
                constraints: const BoxConstraints(
                  minWidth: 18,
                  minHeight: 18,
                ),
                child: Text(
                  displayCount,
                  style: TextStyle(
                    color: textColor ?? Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Widget for displaying notification list
class NotificationList extends StatelessWidget {
  final InAppNotificationService service;
  final void Function(InAppNotification)? onNotificationTap;
  final void Function(InAppNotification)? onDismiss;
  final Widget? emptyWidget;
  final Widget? loadingWidget;
  final Widget? errorWidget;

  const NotificationList({
    super.key,
    required this.service,
    this.onNotificationTap,
    this.onDismiss,
    this.emptyWidget,
    this.loadingWidget,
    this.errorWidget,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<InAppNotification>>(
      stream: service.notifications,
      initialData: service.currentNotifications,
      builder: (context, notificationsSnapshot) {
        return StreamBuilder<bool>(
          stream: service.isLoading,
          initialData: false,
          builder: (context, loadingSnapshot) {
            return StreamBuilder<String?>(
              stream: service.error,
              initialData: null,
              builder: (context, errorSnapshot) {
                final notifications = notificationsSnapshot.data ?? [];
                final isLoading = loadingSnapshot.data ?? false;
                final error = errorSnapshot.data;

                if (isLoading && notifications.isEmpty) {
                  return loadingWidget ??
                      const Center(child: CircularProgressIndicator());
                }

                if (error != null && notifications.isEmpty) {
                  return errorWidget ??
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48),
                            const SizedBox(height: 16),
                            Text(error),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: service.refresh,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      );
                }

                if (notifications.isEmpty) {
                  return emptyWidget ??
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.notifications_none,
                              size: 64,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No notifications',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "You're all caught up!",
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      );
                }

                return RefreshIndicator(
                  onRefresh: service.refresh,
                  child: ListView.builder(
                    itemCount: notifications.length + 1,
                    itemBuilder: (context, index) {
                      if (index == notifications.length) {
                        // Load more trigger
                        return _LoadMoreWidget(
                          service: service,
                          isLoading: isLoading,
                        );
                      }

                      final notification = notifications[index];
                      return _NotificationTile(
                        notification: notification,
                        onTap: () {
                          if (!notification.isRead) {
                            service.markAsRead(notification.id);
                          }
                          onNotificationTap?.call(notification);
                        },
                        onDismiss: onDismiss != null
                            ? () {
                                service.dismiss(notification.id);
                                onDismiss?.call(notification);
                              }
                            : null,
                      );
                    },
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class _LoadMoreWidget extends StatelessWidget {
  final InAppNotificationService service;
  final bool isLoading;

  const _LoadMoreWidget({
    required this.service,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Center(
        child: isLoading
            ? const CircularProgressIndicator()
            : TextButton(
                onPressed: service.loadMore,
                child: const Text('Load more'),
              ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final InAppNotification notification;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  const _NotificationTile({
    required this.notification,
    this.onTap,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dismissible(
      key: Key(notification.id),
      direction: onDismiss != null
          ? DismissDirection.endToStart
          : DismissDirection.none,
      onDismissed: (_) => onDismiss?.call(),
      background: Container(
        color: theme.colorScheme.error,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: Material(
        color: notification.isRead
            ? Colors.transparent
            : theme.colorScheme.primaryContainer.withOpacity(0.3),
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(
                left: notification.priority == 'URGENT' || notification.priority == 'HIGH'
                    ? BorderSide(
                        color: notification.priority == 'URGENT'
                            ? theme.colorScheme.error
                            : Colors.orange,
                        width: 4,
                      )
                    : BorderSide.none,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: notification.isRead
                        ? theme.colorScheme.surfaceContainerHighest
                        : theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Icon(
                    _getIconForType(notification.type),
                    size: 20,
                    color: _getColorForType(notification.type, theme),
                  ),
                ),
                const SizedBox(width: 12),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: notification.isRead
                                    ? FontWeight.normal
                                    : FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (!notification.isRead)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.body,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatTimeAgo(notification.createdAt),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'ACHIEVEMENT':
        return Icons.emoji_events;
      case 'SESSION_SUMMARY':
        return Icons.auto_stories;
      case 'REMINDER':
        return Icons.alarm;
      case 'GOAL_UPDATE':
        return Icons.track_changes;
      case 'MESSAGE':
        return Icons.message;
      case 'CONSENT_REQUEST':
        return Icons.how_to_reg;
      case 'ALERT':
        return Icons.warning;
      case 'SYSTEM':
        return Icons.settings;
      default:
        return Icons.notifications;
    }
  }

  Color _getColorForType(String type, ThemeData theme) {
    switch (type) {
      case 'ACHIEVEMENT':
        return Colors.amber;
      case 'SESSION_SUMMARY':
        return Colors.green;
      case 'REMINDER':
        return theme.colorScheme.primary;
      case 'GOAL_UPDATE':
        return Colors.purple;
      case 'MESSAGE':
        return Colors.blue;
      case 'CONSENT_REQUEST':
        return Colors.blue;
      case 'ALERT':
        return theme.colorScheme.error;
      case 'SYSTEM':
        return Colors.grey;
      default:
        return theme.colorScheme.primary;
    }
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 7) {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
