/// AI Transparency Provider
///
/// State management for AI transparency dashboard and conversation viewing.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/ai_transparency.dart';

/// State for AI transparency data.
class AITransparencyState {
  const AITransparencyState({
    this.stats,
    this.studentActivities = const [],
    this.recentConversations = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
    this.selectedFilter = AITransparencyFilter.all,
  });

  final AIUsageStats? stats;
  final List<StudentAIActivity> studentActivities;
  final List<AIConversation> recentConversations;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;
  final AITransparencyFilter selectedFilter;

  AITransparencyState copyWith({
    AIUsageStats? stats,
    List<StudentAIActivity>? studentActivities,
    List<AIConversation>? recentConversations,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
    AITransparencyFilter? selectedFilter,
  }) {
    return AITransparencyState(
      stats: stats ?? this.stats,
      studentActivities: studentActivities ?? this.studentActivities,
      recentConversations: recentConversations ?? this.recentConversations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      selectedFilter: selectedFilter ?? this.selectedFilter,
    );
  }
}

/// Filter options for AI transparency view.
enum AITransparencyFilter {
  all,
  activeNow,
  flagged,
  needsReview,
  tutoring,
  homework,
  writing,
}

/// Notifier for AI transparency state.
class AITransparencyNotifier extends StateNotifier<AITransparencyState> {
  AITransparencyNotifier(this._classId) : super(const AITransparencyState()) {
    loadData();
  }

  final String _classId;

  Future<void> loadData() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // In production, this would fetch from the API
      // For now, using mock data to demonstrate the UI
      await Future.delayed(const Duration(milliseconds: 500));

      final mockStats = AIUsageStats(
        totalConversations: 127,
        totalMessages: 1842,
        averageSessionDuration: const Duration(minutes: 8, seconds: 30),
        byInteractionType: {
          AIInteractionType.tutoring: 45,
          AIInteractionType.homework: 38,
          AIInteractionType.writing: 22,
          AIInteractionType.focusBreak: 15,
          AIInteractionType.socialEmotional: 7,
        },
        bySubject: {
          'Math': 52,
          'Reading': 35,
          'Science': 22,
          'Writing': 18,
        },
        flaggedCount: 2,
        reviewCount: 3,
        activeNow: 4,
        lastUpdated: DateTime.now(),
      );

      final mockActivities = [
        StudentAIActivity(
          studentId: 'student-1',
          studentName: 'Emma Watson',
          lastActiveAt: DateTime.now().subtract(const Duration(minutes: 2)),
          conversationCount: 12,
          messageCount: 156,
          currentTopic: 'Fractions Practice',
          sentiment: 'positive',
          isActiveNow: true,
        ),
        StudentAIActivity(
          studentId: 'student-2',
          studentName: 'James Chen',
          lastActiveAt: DateTime.now().subtract(const Duration(minutes: 5)),
          conversationCount: 8,
          messageCount: 94,
          currentTopic: 'Essay Writing',
          sentiment: 'neutral',
          isActiveNow: true,
        ),
        StudentAIActivity(
          studentId: 'student-3',
          studentName: 'Olivia Brown',
          lastActiveAt: DateTime.now().subtract(const Duration(minutes: 15)),
          conversationCount: 15,
          messageCount: 203,
          sentiment: 'positive',
          flagCount: 1,
        ),
        StudentAIActivity(
          studentId: 'student-4',
          studentName: 'Michael Smith',
          lastActiveAt: DateTime.now().subtract(const Duration(hours: 1)),
          conversationCount: 6,
          messageCount: 78,
          sentiment: 'frustrated',
          flagCount: 1,
        ),
        StudentAIActivity(
          studentId: 'student-5',
          studentName: 'Sarah Johnson',
          lastActiveAt: DateTime.now().subtract(const Duration(hours: 2)),
          conversationCount: 10,
          messageCount: 134,
          sentiment: 'positive',
          isActiveNow: true,
        ),
        StudentAIActivity(
          studentId: 'student-6',
          studentName: 'Alex Martinez',
          lastActiveAt: DateTime.now().subtract(const Duration(hours: 3)),
          conversationCount: 4,
          messageCount: 52,
          sentiment: 'neutral',
          isActiveNow: true,
        ),
      ];

      state = state.copyWith(
        stats: mockStats,
        studentActivities: mockActivities,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      debugPrint('[AITransparencyProvider] Error loading data: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void setFilter(AITransparencyFilter filter) {
    state = state.copyWith(selectedFilter: filter);
  }

  List<StudentAIActivity> get filteredActivities {
    final activities = state.studentActivities;
    switch (state.selectedFilter) {
      case AITransparencyFilter.all:
        return activities;
      case AITransparencyFilter.activeNow:
        return activities.where((a) => a.isActiveNow).toList();
      case AITransparencyFilter.flagged:
        return activities.where((a) => a.flagCount > 0).toList();
      case AITransparencyFilter.needsReview:
        return activities.where((a) => a.flagCount > 0 || a.sentiment == 'frustrated').toList();
      case AITransparencyFilter.tutoring:
      case AITransparencyFilter.homework:
      case AITransparencyFilter.writing:
        return activities; // Would filter by interaction type in production
    }
  }
}

/// Provider for AI transparency data by class.
final aiTransparencyProvider =
    StateNotifierProvider.family<AITransparencyNotifier, AITransparencyState, String>(
  (ref, classId) => AITransparencyNotifier(classId),
);

/// State for student AI conversations.
class StudentAIConversationsState {
  const StudentAIConversationsState({
    this.conversations = const [],
    this.isLoading = false,
    this.error,
    this.selectedConversation,
  });

  final List<AIConversation> conversations;
  final bool isLoading;
  final String? error;
  final AIConversation? selectedConversation;

  StudentAIConversationsState copyWith({
    List<AIConversation>? conversations,
    bool? isLoading,
    String? error,
    AIConversation? selectedConversation,
  }) {
    return StudentAIConversationsState(
      conversations: conversations ?? this.conversations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedConversation: selectedConversation ?? this.selectedConversation,
    );
  }
}

/// Notifier for student AI conversations.
class StudentAIConversationsNotifier extends StateNotifier<StudentAIConversationsState> {
  StudentAIConversationsNotifier(this._studentId) : super(const StudentAIConversationsState()) {
    loadConversations();
  }

  final String _studentId;

  Future<void> loadConversations() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // In production, this would fetch from the API
      await Future.delayed(const Duration(milliseconds: 500));

      final now = DateTime.now();
      final mockConversations = [
        AIConversation(
          id: 'conv-1',
          studentId: _studentId,
          studentName: 'Student',
          startedAt: now.subtract(const Duration(hours: 1)),
          endedAt: now.subtract(const Duration(minutes: 45)),
          interactionType: AIInteractionType.tutoring,
          subject: 'Math',
          topic: 'Fractions',
          summary: 'Practiced adding fractions with different denominators. Made good progress.',
          sentiment: 'positive',
          duration: const Duration(minutes: 15),
          messages: _generateMockMessages('conv-1', 'Math tutoring'),
        ),
        AIConversation(
          id: 'conv-2',
          studentId: _studentId,
          studentName: 'Student',
          startedAt: now.subtract(const Duration(hours: 3)),
          endedAt: now.subtract(const Duration(hours: 2, minutes: 40)),
          interactionType: AIInteractionType.homework,
          subject: 'Reading',
          topic: 'Comprehension Questions',
          summary: 'Worked through reading comprehension questions for chapter 5.',
          sentiment: 'neutral',
          duration: const Duration(minutes: 20),
          messages: _generateMockMessages('conv-2', 'Reading homework'),
        ),
        AIConversation(
          id: 'conv-3',
          studentId: _studentId,
          studentName: 'Student',
          startedAt: now.subtract(const Duration(days: 1)),
          endedAt: now.subtract(const Duration(days: 1)).add(const Duration(minutes: 10)),
          interactionType: AIInteractionType.writing,
          subject: 'Writing',
          topic: 'Story Planning',
          summary: 'Brainstormed ideas for creative writing assignment.',
          sentiment: 'positive',
          duration: const Duration(minutes: 10),
          flagStatus: AIFlagStatus.review,
          flagReason: 'Student expressed frustration with assignment',
          messages: _generateMockMessages('conv-3', 'Writing help'),
        ),
        AIConversation(
          id: 'conv-4',
          studentId: _studentId,
          studentName: 'Student',
          startedAt: now.subtract(const Duration(days: 2)),
          endedAt: now.subtract(const Duration(days: 2)).add(const Duration(minutes: 5)),
          interactionType: AIInteractionType.focusBreak,
          topic: 'Breathing Exercise',
          summary: 'Completed a calming breathing exercise during focus break.',
          sentiment: 'positive',
          duration: const Duration(minutes: 5),
          messages: _generateMockMessages('conv-4', 'Focus break'),
        ),
      ];

      state = state.copyWith(
        conversations: mockConversations,
        isLoading: false,
      );
    } catch (e) {
      debugPrint('[StudentAIConversations] Error loading: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  List<AIMessage> _generateMockMessages(String convId, String context) {
    final now = DateTime.now();
    return [
      AIMessage(
        id: '$convId-msg-1',
        conversationId: convId,
        role: 'student',
        content: 'Hi, I need help with my $context assignment.',
        timestamp: now.subtract(const Duration(minutes: 15)),
      ),
      AIMessage(
        id: '$convId-msg-2',
        conversationId: convId,
        role: 'assistant',
        content: 'Of course! I\'d be happy to help you with $context. What specific part would you like to work on?',
        timestamp: now.subtract(const Duration(minutes: 14)),
      ),
      AIMessage(
        id: '$convId-msg-3',
        conversationId: convId,
        role: 'student',
        content: 'I\'m having trouble understanding how to do the first problem.',
        timestamp: now.subtract(const Duration(minutes: 13)),
      ),
      AIMessage(
        id: '$convId-msg-4',
        conversationId: convId,
        role: 'assistant',
        content: 'Let\'s break it down step by step. First, let\'s look at what the problem is asking us to find...',
        timestamp: now.subtract(const Duration(minutes: 12)),
      ),
      AIMessage(
        id: '$convId-msg-5',
        conversationId: convId,
        role: 'student',
        content: 'Oh, I think I understand now! Let me try.',
        timestamp: now.subtract(const Duration(minutes: 10)),
      ),
      AIMessage(
        id: '$convId-msg-6',
        conversationId: convId,
        role: 'assistant',
        content: 'Great job! You\'re on the right track. Keep going!',
        timestamp: now.subtract(const Duration(minutes: 9)),
      ),
    ];
  }

  void selectConversation(AIConversation conversation) {
    state = state.copyWith(selectedConversation: conversation);
  }

  void clearSelection() {
    state = StudentAIConversationsState(
      conversations: state.conversations,
      isLoading: state.isLoading,
      error: state.error,
    );
  }

  Future<void> flagConversation(String conversationId, String reason) async {
    // In production, this would call the API
    final updated = state.conversations.map((c) {
      if (c.id == conversationId) {
        return AIConversation(
          id: c.id,
          studentId: c.studentId,
          studentName: c.studentName,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
          messages: c.messages,
          interactionType: c.interactionType,
          subject: c.subject,
          topic: c.topic,
          flagStatus: AIFlagStatus.flagged,
          flagReason: reason,
          summary: c.summary,
          sentiment: c.sentiment,
          duration: c.duration,
        );
      }
      return c;
    }).toList();

    state = state.copyWith(conversations: updated);
  }

  Future<void> addTeacherNote(String conversationId, String note) async {
    // In production, this would call the API
    final updated = state.conversations.map((c) {
      if (c.id == conversationId) {
        return AIConversation(
          id: c.id,
          studentId: c.studentId,
          studentName: c.studentName,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
          messages: c.messages,
          interactionType: c.interactionType,
          subject: c.subject,
          topic: c.topic,
          flagStatus: c.flagStatus,
          flagReason: c.flagReason,
          teacherNotes: note,
          summary: c.summary,
          sentiment: c.sentiment,
          duration: c.duration,
        );
      }
      return c;
    }).toList();

    state = state.copyWith(conversations: updated);
  }
}

/// Provider for student AI conversations.
final studentAIConversationsProvider = StateNotifierProvider.family<
    StudentAIConversationsNotifier, StudentAIConversationsState, String>(
  (ref, studentId) => StudentAIConversationsNotifier(studentId),
);
