/// Community Support Resource Models
library;

/// Expert Q&A entry
class ExpertQA {
  final String id;
  final String question;
  final String answer;
  final String expertName;
  final String expertTitle;
  final List<String> tags;
  final DateTime answeredAt;
  final int helpfulCount;

  const ExpertQA({
    required this.id,
    required this.question,
    required this.answer,
    required this.expertName,
    required this.expertTitle,
    this.tags = const [],
    required this.answeredAt,
    this.helpfulCount = 0,
  });

  factory ExpertQA.fromJson(Map<String, dynamic> json) {
    return ExpertQA(
      id: json['id'] as String,
      question: json['question'] as String,
      answer: json['answer'] as String,
      expertName: json['expertName'] as String,
      expertTitle: json['expertTitle'] as String,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      answeredAt: DateTime.parse(json['answeredAt'] as String),
      helpfulCount: json['helpfulCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'question': question,
      'answer': answer,
      'expertName': expertName,
      'expertTitle': expertTitle,
      'tags': tags,
      'answeredAt': answeredAt.toIso8601String(),
      'helpfulCount': helpfulCount,
    };
  }
}

/// Support group
class SupportGroup {
  final String id;
  final String name;
  final String description;
  final String category;
  final int memberCount;
  final String? imageUrl;
  final bool isJoined;
  final DateTime? nextMeetingAt;
  final String? meetingLink;
  final List<String> topics;

  const SupportGroup({
    required this.id,
    required this.name,
    required this.description,
    this.category = '',
    this.memberCount = 0,
    this.imageUrl,
    this.isJoined = false,
    this.nextMeetingAt,
    this.meetingLink,
    this.topics = const [],
  });

  factory SupportGroup.fromJson(Map<String, dynamic> json) {
    return SupportGroup(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      category: json['category'] as String? ?? '',
      memberCount: json['memberCount'] as int? ?? 0,
      imageUrl: json['imageUrl'] as String?,
      isJoined: json['isJoined'] as bool? ?? false,
      nextMeetingAt: json['nextMeetingAt'] != null
          ? DateTime.parse(json['nextMeetingAt'] as String)
          : null,
      meetingLink: json['meetingLink'] as String?,
      topics: (json['topics'] as List?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'memberCount': memberCount,
      'imageUrl': imageUrl,
      'isJoined': isJoined,
      'nextMeetingAt': nextMeetingAt?.toIso8601String(),
      'meetingLink': meetingLink,
      'topics': topics,
    };
  }
}

/// Forum post
class ForumPost {
  final String id;
  final String title;
  final String content;
  final String authorName;
  final String? authorAvatarUrl;
  final DateTime postedAt;
  final int replyCount;
  final int likeCount;
  final List<String> tags;
  final bool isLiked;
  final bool isPinned;
  final DateTime? createdAt;

  ForumPost({
    required this.id,
    required this.title,
    required this.content,
    required this.authorName,
    this.authorAvatarUrl,
    DateTime? postedAt,
    this.replyCount = 0,
    this.likeCount = 0,
    this.tags = const [],
    this.isLiked = false,
    this.isPinned = false,
    this.createdAt,
  }) : postedAt = postedAt ?? createdAt ?? DateTime.now();

  factory ForumPost.fromJson(Map<String, dynamic> json) {
    return ForumPost(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      authorName: json['authorName'] as String,
      authorAvatarUrl: json['authorAvatarUrl'] as String?,
      postedAt: DateTime.parse(json['postedAt'] as String),
      replyCount: json['replyCount'] as int? ?? 0,
      likeCount: json['likeCount'] as int? ?? 0,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      isLiked: json['isLiked'] as bool? ?? false,
      isPinned: json['isPinned'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'authorName': authorName,
      'authorAvatarUrl': authorAvatarUrl,
      'postedAt': postedAt.toIso8601String(),
      'replyCount': replyCount,
      'likeCount': likeCount,
      'tags': tags,
      'isLiked': isLiked,
      'isPinned': isPinned,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

/// Forum reply
class ForumReply {
  final String id;
  final String postId;
  final String content;
  final String authorName;
  final String? authorAvatarUrl;
  final DateTime postedAt;
  final int likeCount;
  final bool isLiked;
  final bool isAnswer;

  const ForumReply({
    required this.id,
    required this.postId,
    required this.content,
    required this.authorName,
    this.authorAvatarUrl,
    required this.postedAt,
    this.likeCount = 0,
    this.isLiked = false,
    this.isAnswer = false,
  });

  factory ForumReply.fromJson(Map<String, dynamic> json) {
    return ForumReply(
      id: json['id'] as String,
      postId: json['postId'] as String,
      content: json['content'] as String,
      authorName: json['authorName'] as String,
      authorAvatarUrl: json['authorAvatarUrl'] as String?,
      postedAt: DateTime.parse(json['postedAt'] as String),
      likeCount: json['likeCount'] as int? ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
      isAnswer: json['isAnswer'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'postId': postId,
      'content': content,
      'authorName': authorName,
      'authorAvatarUrl': authorAvatarUrl,
      'postedAt': postedAt.toIso8601String(),
      'likeCount': likeCount,
      'isLiked': isLiked,
      'isAnswer': isAnswer,
    };
  }
}
