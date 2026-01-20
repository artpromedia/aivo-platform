/// Community Support Screen
///
/// Connects parents with:
/// - Expert Q&A
/// - Support groups
/// - Parent forums
/// - Community discussions
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/resource_models.dart';

/// Community section type
enum CommunitySection {
  expertQA('Expert Q&A', Icons.help_outline),
  groups('Support Groups', Icons.groups),
  forum('Parent Forum', Icons.forum);

  const CommunitySection(this.label, this.icon);
  final String label;
  final IconData icon;
}

/// Community Support Screen
class CommunitySupportScreen extends ConsumerStatefulWidget {
  const CommunitySupportScreen({super.key});

  @override
  ConsumerState<CommunitySupportScreen> createState() =>
      _CommunitySupportScreenState();
}

class _CommunitySupportScreenState extends ConsumerState<CommunitySupportScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;

  List<ExpertQA> _expertQAs = [];
  List<SupportGroup> _supportGroups = [];
  List<ForumPost> _forumPosts = [];

  // Mock data
  final List<ExpertQA> _mockExpertQAs = [
    ExpertQA(
      id: '1',
      question: 'How can I help my child who struggles with reading?',
      answer:
          'Reading difficulties can stem from various causes. Start by ensuring your child has a quiet, comfortable reading environment. Try reading together daily, even if just for 10-15 minutes. Use books at their level and let them choose topics they\'re interested in. If struggles persist, consider consulting with a reading specialist who can provide targeted strategies.',
      expertName: 'Dr. Sarah Mitchell',
      expertTitle: 'Reading Specialist',
      tags: ['reading', 'literacy', 'support'],
      answeredAt: DateTime.now().subtract(const Duration(days: 1)),
      helpfulCount: 45,
    ),
    ExpertQA(
      id: '2',
      question:
          'What are signs my child might benefit from executive function support?',
      answer:
          'Common signs include difficulty starting or completing tasks, trouble organizing materials, frequently losing things, difficulty following multi-step directions, and challenges with time management. If you notice these patterns consistently affecting schoolwork or daily life, AIVO\'s executive function tools can help. You can also discuss with your child\'s teacher for classroom observations.',
      expertName: 'Dr. James Wong',
      expertTitle: 'Child Psychologist',
      tags: ['executive function', 'ADHD', 'organization'],
      answeredAt: DateTime.now().subtract(const Duration(days: 3)),
      helpfulCount: 72,
    ),
    ExpertQA(
      id: '3',
      question: 'How do I talk to my child about their IEP?',
      answer:
          'Use age-appropriate language and focus on strengths. Explain that everyone learns differently, and the IEP helps teachers understand how they learn best. Involve your child in IEP meetings when appropriate, letting them share what helps them succeed. Frame accommodations as tools that help them show what they know, not as something that makes them different.',
      expertName: 'Maria Garcia',
      expertTitle: 'Special Education Advocate',
      tags: ['IEP', 'communication', 'self-advocacy'],
      answeredAt: DateTime.now().subtract(const Duration(days: 5)),
      helpfulCount: 89,
    ),
  ];

  final List<SupportGroup> _mockSupportGroups = [
    SupportGroup(
      id: '1',
      name: 'Parents of Kids with ADHD',
      description:
          'A supportive community for parents navigating ADHD challenges together.',
      memberCount: 1250,
      topics: ['ADHD', 'Executive Function', 'Medication', 'School Support'],
      isJoined: true,
      nextMeetingAt: DateTime.now().add(const Duration(days: 2)),
    ),
    SupportGroup(
      id: '2',
      name: 'Dyslexia Support Network',
      description:
          'Connect with other parents whose children have dyslexia or reading challenges.',
      memberCount: 890,
      topics: ['Dyslexia', 'Reading', 'Assistive Technology', 'IEP'],
      isJoined: false,
    ),
    SupportGroup(
      id: '3',
      name: 'Autism Parent Circle',
      description:
          'A safe space for parents of children on the autism spectrum to share experiences.',
      memberCount: 2100,
      topics: ['ASD', 'Social Skills', 'Sensory', 'Routines'],
      isJoined: false,
      nextMeetingAt: DateTime.now().add(const Duration(days: 5)),
    ),
    SupportGroup(
      id: '4',
      name: 'New to Special Education',
      description:
          'For parents just starting their special education journey. Get guidance and support.',
      memberCount: 560,
      topics: ['IEP', 'Evaluations', 'Rights', 'Getting Started'],
      isJoined: true,
    ),
  ];

  final List<ForumPost> _mockForumPosts = [
    ForumPost(
      id: '1',
      title: 'Tips for homework time that actually work?',
      content:
          'We\'ve been struggling with homework battles every night. Would love to hear what has worked for other families!',
      authorName: 'HomeworkHelp2024',
      createdAt: DateTime.now().subtract(const Duration(hours: 4)),
      replyCount: 23,
      likeCount: 45,
      tags: ['homework', 'tips', 'daily routines'],
    ),
    ForumPost(
      id: '2',
      title: 'IEP meeting next week - what should I prepare?',
      content:
          'First IEP meeting coming up and feeling nervous. What documents or questions should I bring?',
      authorName: 'NewIEPMom',
      createdAt: DateTime.now().subtract(const Duration(hours: 8)),
      replyCount: 15,
      likeCount: 32,
      tags: ['IEP', 'meetings', 'preparation'],
    ),
    ForumPost(
      id: '3',
      title: 'Success story: My son finally loves reading!',
      content:
          'After two years of struggle, my son picked up a book on his own yesterday and read for 30 minutes. Never thought I\'d see this day!',
      authorName: 'ProudMom123',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      replyCount: 52,
      likeCount: 178,
      tags: ['success', 'reading', 'celebration'],
      isLiked: true,
    ),
    ForumPost(
      id: '4',
      title: 'Recommendations for summer programs?',
      content:
          'Looking for summer programs that are inclusive and support kids with learning differences. Any suggestions?',
      authorName: 'SummerPlanning',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      replyCount: 31,
      likeCount: 28,
      tags: ['summer', 'programs', 'recommendations'],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: CommunitySection.values.length,
      vsync: this,
    );
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _expertQAs = _mockExpertQAs;
      _supportGroups = _mockSupportGroups;
      _forumPosts = _mockForumPosts;
      _isLoading = false;
    });
  }

  void _toggleGroupMembership(SupportGroup group) {
    final index = _supportGroups.indexWhere((g) => g.id == group.id);
    if (index == -1) return;

    final isJoining = !group.isJoined;

    setState(() {
      _supportGroups[index] = SupportGroup(
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: isJoining ? group.memberCount + 1 : group.memberCount - 1,
        topics: group.topics,
        isJoined: isJoining,
        nextMeetingAt: group.nextMeetingAt,
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isJoining
          ? 'Joined "${group.name}"'
          : 'Left "${group.name}"'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () => _toggleGroupMembership(_supportGroups[index]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Community Support'),
        bottom: TabBar(
          controller: _tabController,
          tabs: CommunitySection.values.map((section) {
            return Tab(
              icon: Icon(section.icon),
              text: section.label,
            );
          }).toList(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildExpertQATab(theme),
                _buildSupportGroupsTab(theme),
                _buildForumTab(theme),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAskExpertDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Ask a Question'),
      ),
    );
  }

  Widget _buildExpertQATab(ThemeData theme) {
    final colorScheme = theme.colorScheme;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _expertQAs.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Card(
              color: colorScheme.primaryContainer,
              margin: const EdgeInsets.only(bottom: 16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: colorScheme.primary,
                      child: Icon(
                        Icons.lightbulb,
                        color: colorScheme.onPrimary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Have a question?',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: colorScheme.onPrimaryContainer,
                            ),
                          ),
                          Text(
                            'Our experts answer questions weekly',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ],
                      ),
                    ),
                    FilledButton(
                      onPressed: () => _showAskExpertDialog(context),
                      child: const Text('Ask'),
                    ),
                  ],
                ),
              ),
            );
          }

          final qa = _expertQAs[index - 1];
          return _ExpertQACard(
            qa: qa,
            onTap: () => _showQADetails(context, qa),
          );
        },
      ),
    );
  }

  Widget _buildSupportGroupsTab(ThemeData theme) {
    // colorScheme available for styling
    final _ = theme.colorScheme;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _supportGroups.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Your Groups',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 100,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: _supportGroups
                          .where((g) => g.isJoined)
                          .map((group) => _JoinedGroupChip(group: group))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Discover Groups',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            );
          }

          final group = _supportGroups[index - 1];
          return _SupportGroupCard(
            group: group,
            onJoin: () => _toggleGroupMembership(group),
          );
        },
      ),
    );
  }

  Widget _buildForumTab(ThemeData theme) {
    // colorScheme available for styling
    final _ = theme.colorScheme;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _forumPosts.length,
        itemBuilder: (context, index) {
          final post = _forumPosts[index];
          return _ForumPostCard(
            post: post,
            onTap: () => _showPostDetails(context, post),
          );
        },
      ),
    );
  }

  void _showAskExpertDialog(BuildContext context) {
    final questionController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ask an Expert',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Our team of specialists will respond within 48 hours',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: questionController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Your Question',
                hintText: 'What would you like to ask our experts?',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Question submitted! Check back soon.'),
                      ),
                    );
                  },
                  child: const Text('Submit Question'),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showQADetails(BuildContext context, ExpertQA qa) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        expand: false,
        builder: (context, scrollController) {
          final theme = Theme.of(context);
          final colorScheme = theme.colorScheme;

          return Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(16),
              children: [
                Center(
                  child: Container(
                    width: 32,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  qa.question,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: colorScheme.primaryContainer,
                      child: Text(
                        qa.expertName[0],
                        style: TextStyle(color: colorScheme.onPrimaryContainer),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          qa.expertName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          qa.expertTitle,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                Text(qa.answer, style: theme.textTheme.bodyLarge),
                const SizedBox(height: 16),
                if (qa.tags.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    children: qa.tags
                        .map((tag) => Chip(label: Text(tag)))
                        .toList(),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Marked as helpful!')),
                        );
                      },
                      icon: const Icon(Icons.thumb_up_outlined),
                      label: Text('Helpful (${qa.helpfulCount})'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Opening share options...')),
                        );
                      },
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showPostDetails(BuildContext context, ForumPost post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        expand: false,
        builder: (context, scrollController) {
          final theme = Theme.of(context);
          final colorScheme = theme.colorScheme;

          return Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(16),
              children: [
                Center(
                  child: Container(
                    width: 32,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  post.title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: colorScheme.primaryContainer,
                      child: Text(
                        post.authorName[0],
                        style: TextStyle(
                          fontSize: 12,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      post.authorName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatTimeAgo(post.createdAt ?? post.postedAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(post.content, style: theme.textTheme.bodyLarge),
                const SizedBox(height: 16),
                if (post.tags.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    children: post.tags
                        .map((tag) => Chip(label: Text(tag)))
                        .toList(),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(post.isLiked ? 'Removed like' : 'Liked post!'),
                          ),
                        );
                      },
                      icon: Icon(
                        post.isLiked ? Icons.favorite : Icons.favorite_border,
                        color: post.isLiked ? AivoBrand.error : null,
                      ),
                      label: Text('${post.likeCount}'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        _showReplyDialog(context, post);
                      },
                      icon: const Icon(Icons.comment),
                      label: Text('${post.replyCount} replies'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  'Replies',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'View all ${post.replyCount} replies to join the discussion.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dateTime.day}/${dateTime.month}';
  }

  void _showReplyDialog(BuildContext context, ForumPost post) {
    final replyController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Reply to "${post.title}"',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: replyController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Your Reply',
                hintText: 'Share your thoughts...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Reply posted!')),
                    );
                  },
                  child: const Text('Post Reply'),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _ExpertQACard extends StatelessWidget {
  const _ExpertQACard({
    required this.qa,
    required this.onTap,
  });

  final ExpertQA qa;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.question_answer,
                    color: colorScheme.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      qa.question,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                qa.answer,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: colorScheme.primaryContainer,
                    child: Text(
                      qa.expertName[0],
                      style: TextStyle(
                        fontSize: 10,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          qa.expertName,
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          qa.expertTitle,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.thumb_up_outlined,
                    size: 14,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${qa.helpfulCount}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SupportGroupCard extends StatelessWidget {
  const _SupportGroupCard({
    required this.group,
    required this.onJoin,
  });

  final SupportGroup group;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: colorScheme.primaryContainer,
                  child: Icon(
                    Icons.groups,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.name,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${group.memberCount} members',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                if (group.isJoined)
                  const Chip(label: Text('Joined'))
                else
                  FilledButton(
                    onPressed: onJoin,
                    child: const Text('Join'),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              group.description,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: group.topics
                  .take(4)
                  .map((topic) => Chip(
                        label: Text(topic),
                        visualDensity: VisualDensity.compact,
                      ))
                  .toList(),
            ),
            if (group.nextMeetingAt != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.event,
                    size: 16,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Next meeting: ${_formatDate(group.nextMeetingAt!)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${days[date.weekday - 1]}, ${date.day}/${date.month}';
  }
}

class _JoinedGroupChip extends StatelessWidget {
  const _JoinedGroupChip({required this.group});

  final SupportGroup group;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      child: Card(
        color: colorScheme.primaryContainer,
        child: InkWell(
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Opening ${group.name}...')),
            );
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.groups,
                  color: colorScheme.onPrimaryContainer,
                ),
                const SizedBox(height: 8),
                Text(
                  group.name,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onPrimaryContainer,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ForumPostCard extends StatelessWidget {
  const _ForumPostCard({
    required this.post,
    required this.onTap,
  });

  final ForumPost post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: colorScheme.primaryContainer,
                    child: Text(
                      post.authorName[0],
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    post.authorName,
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatTimeAgo(post.createdAt ?? post.postedAt),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                post.title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                post.content,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    post.isLiked ? Icons.favorite : Icons.favorite_border,
                    size: 16,
                    color: post.isLiked ? AivoBrand.error : colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${post.likeCount}',
                    style: theme.textTheme.labelSmall,
                  ),
                  const SizedBox(width: 16),
                  Icon(
                    Icons.comment_outlined,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${post.replyCount}',
                    style: theme.textTheme.labelSmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${dateTime.day}/${dateTime.month}';
  }
}
