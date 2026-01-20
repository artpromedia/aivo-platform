/// Resource Library Models
library;

/// Resource category
enum ResourceCategory {
  guide('Guides', 'guides'),
  video('Videos', 'videos'),
  article('Articles', 'articles'),
  tool('Tools', 'tools'),
  webinar('Webinars', 'webinars');

  const ResourceCategory(this.label, this.value);
  final String label;
  final String value;
}

/// Resource item
class Resource {
  final String id;
  final String title;
  final String description;
  final ResourceCategory category;
  final String? thumbnailUrl;
  final String? contentUrl;
  final int durationMinutes;
  final List<String> tags;
  final DateTime publishedAt;
  final bool isFavorite;
  final bool isNew;

  const Resource({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    this.thumbnailUrl,
    this.contentUrl,
    this.durationMinutes = 0,
    this.tags = const [],
    required this.publishedAt,
    this.isFavorite = false,
    this.isNew = false,
  });

  factory Resource.fromJson(Map<String, dynamic> json) {
    return Resource(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: ResourceCategory.values.firstWhere(
        (c) => c.value == json['category'],
        orElse: () => ResourceCategory.article,
      ),
      thumbnailUrl: json['thumbnailUrl'] as String?,
      contentUrl: json['contentUrl'] as String?,
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      publishedAt: DateTime.parse(json['publishedAt'] as String),
      isFavorite: json['isFavorite'] as bool? ?? false,
      isNew: json['isNew'] as bool? ?? false,
    );
  }
}

/// Video resource
class VideoResource extends Resource {
  final String videoUrl;
  final int? watchedSeconds;
  final bool hasTranscript;

  const VideoResource({
    required super.id,
    required super.title,
    required super.description,
    super.thumbnailUrl,
    required this.videoUrl,
    super.durationMinutes,
    super.tags,
    required super.publishedAt,
    super.isFavorite,
    super.isNew,
    this.watchedSeconds,
    this.hasTranscript = false,
  }) : super(
          category: ResourceCategory.video,
          contentUrl: videoUrl,
        );

  double get watchProgress =>
      watchedSeconds != null && durationMinutes > 0
          ? watchedSeconds! / (durationMinutes * 60)
          : 0;
}

/// Guide resource
class GuideResource extends Resource {
  final List<GuideSection> sections;
  final int readTimeMinutes;

  const GuideResource({
    required super.id,
    required super.title,
    required super.description,
    super.thumbnailUrl,
    super.contentUrl,
    super.tags,
    required super.publishedAt,
    super.isFavorite,
    super.isNew,
    this.sections = const [],
    this.readTimeMinutes = 5,
  }) : super(
          category: ResourceCategory.guide,
          durationMinutes: readTimeMinutes,
        );
}

/// Guide section
class GuideSection {
  final String id;
  final String title;
  final String content;
  final List<String> tips;

  const GuideSection({
    required this.id,
    required this.title,
    required this.content,
    this.tips = const [],
  });
}

/// Expert Q&A item for community support
class ExpertQA {
  final String id;
  final String question;
  final String answer;
  final String expertName;
  final String expertTitle;
  final String? expertImageUrl;
  final List<String> tags;
  final DateTime answeredAt;
  final int helpfulCount;

  const ExpertQA({
    required this.id,
    required this.question,
    required this.answer,
    required this.expertName,
    required this.expertTitle,
    this.expertImageUrl,
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
      expertImageUrl: json['expertImageUrl'] as String?,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      answeredAt: DateTime.parse(json['answeredAt'] as String),
      helpfulCount: json['helpfulCount'] as int? ?? 0,
    );
  }
}

/// Support group
class SupportGroup {
  final String id;
  final String name;
  final String description;
  final int memberCount;
  final String? imageUrl;
  final List<String> topics;
  final bool isJoined;
  final DateTime? nextMeetingAt;

  const SupportGroup({
    required this.id,
    required this.name,
    required this.description,
    required this.memberCount,
    this.imageUrl,
    this.topics = const [],
    this.isJoined = false,
    this.nextMeetingAt,
  });

  factory SupportGroup.fromJson(Map<String, dynamic> json) {
    return SupportGroup(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      memberCount: json['memberCount'] as int,
      imageUrl: json['imageUrl'] as String?,
      topics: (json['topics'] as List?)?.cast<String>() ?? [],
      isJoined: json['isJoined'] as bool? ?? false,
      nextMeetingAt: json['nextMeetingAt'] != null
          ? DateTime.parse(json['nextMeetingAt'] as String)
          : null,
    );
  }
}

/// Forum post
class ForumPost {
  final String id;
  final String title;
  final String content;
  final String authorName;
  final String? authorImageUrl;
  final DateTime createdAt;
  final int replyCount;
  final int likeCount;
  final List<String> tags;
  final bool isLiked;

  const ForumPost({
    required this.id,
    required this.title,
    required this.content,
    required this.authorName,
    this.authorImageUrl,
    required this.createdAt,
    this.replyCount = 0,
    this.likeCount = 0,
    this.tags = const [],
    this.isLiked = false,
  });

  factory ForumPost.fromJson(Map<String, dynamic> json) {
    return ForumPost(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      authorName: json['authorName'] as String,
      authorImageUrl: json['authorImageUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      replyCount: json['replyCount'] as int? ?? 0,
      likeCount: json['likeCount'] as int? ?? 0,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      isLiked: json['isLiked'] as bool? ?? false,
    );
  }
}
