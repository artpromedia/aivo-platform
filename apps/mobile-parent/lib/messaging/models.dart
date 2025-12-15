/// Messaging Models
///
/// Data models for contextual messaging (Messaging 2.0).

import 'package:flutter/foundation.dart';

/// Context types for linking threads to entities
enum ContextType {
  learner,
  actionPlan,
  task,
  careNote,
  meeting,
  session,
  goal,
  classContext,
}

/// Extension for context type display
extension ContextTypeExt on ContextType {
  String get displayName {
    switch (this) {
      case ContextType.learner:
        return 'Care Team';
      case ContextType.actionPlan:
        return 'Action Plan';
      case ContextType.task:
        return 'Task';
      case ContextType.careNote:
        return 'Care Note';
      case ContextType.meeting:
        return 'Meeting';
      case ContextType.session:
        return 'Session';
      case ContextType.goal:
        return 'Goal';
      case ContextType.classContext:
        return 'Class';
    }
  }

  String get icon {
    switch (this) {
      case ContextType.learner:
        return '👨‍👩‍👧';
      case ContextType.actionPlan:
        return '📋';
      case ContextType.task:
        return '✅';
      case ContextType.careNote:
        return '📝';
      case ContextType.meeting:
        return '🗓️';
      case ContextType.session:
        return '💬';
      case ContextType.goal:
        return '🎯';
      case ContextType.classContext:
        return '🏫';
    }
  }
}

/// Conversation participant
@immutable
class ConversationParticipant {
  final String id;
  final String name;
  final String? avatarUrl;
  final String role;
  final bool isOnline;
  final DateTime? lastSeenAt;

  const ConversationParticipant({
    required this.id,
    required this.name,
    this.avatarUrl,
    required this.role,
    this.isOnline = false,
    this.lastSeenAt,
  });

  factory ConversationParticipant.fromJson(Map<String, dynamic> json) {
    return ConversationParticipant(
      id: json['id'] as String,
      name: json['name'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String,
      isOnline: json['isOnline'] as bool? ?? false,
      lastSeenAt: json['lastSeenAt'] != null
          ? DateTime.parse(json['lastSeenAt'] as String)
          : null,
    );
  }
}

/// Thread context information
@immutable
class ThreadContext {
  final ContextType type;
  final String? contextId;
  final String? learnerId;
  final String? learnerName;
  final String? actionPlanId;
  final String? actionPlanTitle;
  final String? meetingId;
  final String? meetingTitle;

  const ThreadContext({
    required this.type,
    this.contextId,
    this.learnerId,
    this.learnerName,
    this.actionPlanId,
    this.actionPlanTitle,
    this.meetingId,
    this.meetingTitle,
  });

  factory ThreadContext.learner({
    required String learnerId,
    required String learnerName,
  }) {
    return ThreadContext(
      type: ContextType.learner,
      learnerId: learnerId,
      learnerName: learnerName,
    );
  }

  factory ThreadContext.actionPlan({
    required String actionPlanId,
    required String actionPlanTitle,
    required String learnerId,
    String? learnerName,
  }) {
    return ThreadContext(
      type: ContextType.actionPlan,
      contextId: actionPlanId,
      actionPlanId: actionPlanId,
      actionPlanTitle: actionPlanTitle,
      learnerId: learnerId,
      learnerName: learnerName,
    );
  }

  factory ThreadContext.meeting({
    required String meetingId,
    required String meetingTitle,
    required String learnerId,
    String? learnerName,
  }) {
    return ThreadContext(
      type: ContextType.meeting,
      contextId: meetingId,
      meetingId: meetingId,
      meetingTitle: meetingTitle,
      learnerId: learnerId,
      learnerName: learnerName,
    );
  }

  factory ThreadContext.fromJson(Map<String, dynamic> json) {
    return ThreadContext(
      type: ContextType.values.firstWhere(
        (e) => e.name == json['contextType'],
        orElse: () => ContextType.learner,
      ),
      contextId: json['contextId'] as String?,
      learnerId: json['contextLearnerId'] as String?,
      learnerName: json['contextLearnerName'] as String?,
      actionPlanId: json['contextActionPlanId'] as String?,
      actionPlanTitle: json['contextActionPlanTitle'] as String?,
      meetingId: json['contextMeetingId'] as String?,
      meetingTitle: json['contextMeetingTitle'] as String?,
    );
  }

  /// Display label for the context
  String get displayLabel {
    switch (type) {
      case ContextType.learner:
        return learnerName != null ? "$learnerName's Care Team" : 'Care Team';
      case ContextType.actionPlan:
        return actionPlanTitle ?? 'Action Plan';
      case ContextType.meeting:
        return meetingTitle ?? 'Meeting';
      default:
        return type.displayName;
    }
  }
}

/// Conversation/Thread model with context support
@immutable
class Conversation {
  final String id;
  final String name;
  final String? description;
  final String? avatarUrl;
  final ConversationType type;
  final ThreadContext? context;
  final List<ConversationParticipant> participants;
  final int unreadCount;
  final String? lastMessagePreview;
  final DateTime? lastMessageAt;
  final DateTime createdAt;
  final bool isArchived;
  final bool isMuted;

  const Conversation({
    required this.id,
    required this.name,
    this.description,
    this.avatarUrl,
    required this.type,
    this.context,
    required this.participants,
    this.unreadCount = 0,
    this.lastMessagePreview,
    this.lastMessageAt,
    required this.createdAt,
    this.isArchived = false,
    this.isMuted = false,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      type: ConversationType.values.firstWhere(
        (e) => e.name.toUpperCase() == json['type'],
        orElse: () => ConversationType.group,
      ),
      context: json['contextType'] != null
          ? ThreadContext.fromJson(json)
          : null,
      participants: (json['participants'] as List<dynamic>?)
              ?.map((p) => ConversationParticipant.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      unreadCount: json['unreadCount'] as int? ?? 0,
      lastMessagePreview: json['lastMessagePreview'] as String?,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isArchived: json['isArchived'] as bool? ?? false,
      isMuted: json['isMuted'] as bool? ?? false,
    );
  }

  /// Whether this is a contextual thread
  bool get hasContext => context != null;

  /// Get context badge for display
  String? get contextBadge => context?.type.displayName;
}

/// Conversation type
enum ConversationType {
  direct,
  group,
  thread,
}

/// Message model
@immutable
class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String? senderAvatarUrl;
  final MessageType type;
  final String content;
  final Map<String, dynamic>? metadata;
  final String? replyToId;
  final Message? replyTo;
  final DateTime createdAt;
  final DateTime? editedAt;
  final bool isRead;
  final List<MessageReaction>? reactions;

  const Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    this.senderAvatarUrl,
    required this.type,
    required this.content,
    this.metadata,
    this.replyToId,
    this.replyTo,
    required this.createdAt,
    this.editedAt,
    this.isRead = false,
    this.reactions,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String,
      senderAvatarUrl: json['senderAvatarUrl'] as String?,
      type: MessageType.values.firstWhere(
        (e) => e.name.toUpperCase() == json['type'],
        orElse: () => MessageType.text,
      ),
      content: json['content'] as String,
      metadata: json['metadata'] as Map<String, dynamic>?,
      replyToId: json['replyToId'] as String?,
      replyTo: json['replyTo'] != null
          ? Message.fromJson(json['replyTo'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      editedAt: json['editedAt'] != null
          ? DateTime.parse(json['editedAt'] as String)
          : null,
      isRead: json['isRead'] as bool? ?? false,
      reactions: (json['reactions'] as List<dynamic>?)
          ?.map((r) => MessageReaction.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Check if message is from current user
  bool isFromUser(String userId) => senderId == userId;
}

/// Message types
enum MessageType {
  text,
  image,
  file,
  audio,
  system,
}

/// Message reaction
@immutable
class MessageReaction {
  final String emoji;
  final String userId;
  final String userName;
  final DateTime createdAt;

  const MessageReaction({
    required this.emoji,
    required this.userId,
    required this.userName,
    required this.createdAt,
  });

  factory MessageReaction.fromJson(Map<String, dynamic> json) {
    return MessageReaction(
      emoji: json['emoji'] as String,
      userId: json['userId'] as String,
      userName: json['userName'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Thread summary for a learner
@immutable
class LearnerThreadSummary {
  final String learnerId;
  final String learnerName;
  final int totalThreads;
  final int unreadCount;
  final List<ThreadTypeSummary> byType;

  const LearnerThreadSummary({
    required this.learnerId,
    required this.learnerName,
    required this.totalThreads,
    required this.unreadCount,
    required this.byType,
  });

  factory LearnerThreadSummary.fromJson(Map<String, dynamic> json) {
    return LearnerThreadSummary(
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String,
      totalThreads: json['totalThreads'] as int,
      unreadCount: json['unreadCount'] as int,
      byType: (json['byType'] as List<dynamic>)
          .map((t) => ThreadTypeSummary.fromJson(t as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Summary of threads by type
@immutable
class ThreadTypeSummary {
  final ContextType type;
  final int count;
  final int unreadCount;

  const ThreadTypeSummary({
    required this.type,
    required this.count,
    required this.unreadCount,
  });

  factory ThreadTypeSummary.fromJson(Map<String, dynamic> json) {
    return ThreadTypeSummary(
      type: ContextType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => ContextType.learner,
      ),
      count: json['count'] as int,
      unreadCount: json['unreadCount'] as int,
    );
  }
}
