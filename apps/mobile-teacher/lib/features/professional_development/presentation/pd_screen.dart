/// Professional Development Screen
///
/// Comprehensive PD tracking and learning including:
/// - Course catalog with various topics
/// - Progress tracking for certifications
/// - Learning paths and recommendations
/// - PD hours tracking
/// - Certificate management
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Note: We use local definitions for PDCourse and Certification
// to have the exact properties needed by this screen

/// PD Course status
enum PDCourseStatus {
  notStarted('Not Started'),
  inProgress('In Progress'),
  completed('Completed');

  const PDCourseStatus(this.label);
  final String label;
}

/// PD Topic categories
enum PDTopic {
  instruction('Instructional Strategies', Icons.school),
  technology('Technology Integration', Icons.computer),
  sel('Social-Emotional Learning', Icons.favorite),
  assessment('Assessment & Data', Icons.analytics),
  differentiation('Differentiation', Icons.tune),
  classroom('Classroom Management', Icons.meeting_room),
  specialEd('Special Education', Icons.accessibility),
  leadership('Teacher Leadership', Icons.leaderboard);

  const PDTopic(this.label, this.icon);
  final String label;
  final IconData icon;
}

/// Professional development course for this screen
class PDCourse {
  final String id;
  final String title;
  final String description;
  final PDTopic topic;
  final double duration;  // Duration in hours
  final double progress;  // 0.0 to 1.0
  final List<String> modules;
  final String instructor;
  final double rating;
  final int enrolledCount;

  const PDCourse({
    required this.id,
    required this.title,
    required this.description,
    required this.topic,
    required this.duration,
    this.progress = 0.0,
    this.modules = const [],
    required this.instructor,
    this.rating = 0.0,
    this.enrolledCount = 0,
  });
}

/// Certification for this screen
class Certification {
  final String id;
  final String name;
  final DateTime issuedDate;
  final DateTime expiresDate;
  final String status;
  final String? credentialUrl;

  const Certification({
    required this.id,
    required this.name,
    required this.issuedDate,
    required this.expiresDate,
    required this.status,
    this.credentialUrl,
  });
}

/// Professional Development Screen
class ProfessionalDevelopmentScreen extends ConsumerStatefulWidget {
  const ProfessionalDevelopmentScreen({
    super.key,
    required this.teacherId,
  });

  final String teacherId;

  @override
  ConsumerState<ProfessionalDevelopmentScreen> createState() =>
      _ProfessionalDevelopmentScreenState();
}

class _ProfessionalDevelopmentScreenState
    extends ConsumerState<ProfessionalDevelopmentScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<PDCourse> _courses = [];
  List<Certification> _certifications = [];
  List<PDCourse> _inProgressCourses = [];
  List<PDCourse> _recommendedCourses = [];
  double _totalPDHours = 0;
  final double _requiredPDHours = 30;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _courses = _getMockCourses();
      _certifications = _getMockCertifications();
      _inProgressCourses = _courses.where((c) => c.progress > 0 && c.progress < 1).toList();
      _recommendedCourses = _courses.where((c) => c.progress == 0).take(3).toList();
      _totalPDHours = 18.5;
      _isLoading = false;
    });
  }

  List<PDCourse> _getMockCourses() {
    return [
      const PDCourse(
        id: 'pd1',
        title: 'Differentiated Instruction Strategies',
        description: 'Learn effective strategies for differentiating instruction to meet diverse learner needs.',
        topic: PDTopic.differentiation,
        duration: 4.0,
        progress: 0.75,
        modules: [
          'Understanding Differentiation',
          'Assessing Student Readiness',
          'Tiered Activities',
          'Flexible Grouping',
          'Choice Boards',
        ],
        instructor: 'Dr. Sarah Mitchell',
        rating: 4.8,
        enrolledCount: 1250,
      ),
      const PDCourse(
        id: 'pd2',
        title: 'Technology Tools for the Classroom',
        description: 'Explore essential technology tools to enhance teaching and learning.',
        topic: PDTopic.technology,
        duration: 3.0,
        progress: 0.3,
        modules: [
          'Digital Assessment Tools',
          'Interactive Presentations',
          'Collaboration Platforms',
          'Student Response Systems',
        ],
        instructor: 'Michael Chen',
        rating: 4.6,
        enrolledCount: 890,
      ),
      const PDCourse(
        id: 'pd3',
        title: 'Building SEL in Your Classroom',
        description: 'Integrate social-emotional learning throughout your daily instruction.',
        topic: PDTopic.sel,
        duration: 5.0,
        progress: 1.0,
        modules: [
          'SEL Foundations',
          'Self-Awareness Activities',
          'Relationship Skills',
          'Responsible Decision Making',
          'Creating a Safe Space',
          'Assessment of SEL',
        ],
        instructor: 'Dr. Maria Garcia',
        rating: 4.9,
        enrolledCount: 2100,
      ),
      const PDCourse(
        id: 'pd4',
        title: 'Data-Driven Instruction',
        description: 'Use assessment data to inform and improve instructional decisions.',
        topic: PDTopic.assessment,
        duration: 4.0,
        progress: 0,
        modules: [
          'Types of Assessment Data',
          'Analyzing Student Work',
          'Action Planning',
          'Progress Monitoring',
        ],
        instructor: 'James Wilson',
        rating: 4.5,
        enrolledCount: 750,
      ),
      const PDCourse(
        id: 'pd5',
        title: 'Supporting Students with IEPs',
        description: 'Best practices for implementing IEP accommodations and modifications.',
        topic: PDTopic.specialEd,
        duration: 6.0,
        progress: 0,
        modules: [
          'Understanding IEPs',
          'Accommodations vs Modifications',
          'Co-Teaching Models',
          'Assistive Technology',
          'Progress Monitoring',
          'Collaboration with Specialists',
        ],
        instructor: 'Dr. Emily Roberts',
        rating: 4.7,
        enrolledCount: 1500,
      ),
      const PDCourse(
        id: 'pd6',
        title: 'Positive Classroom Management',
        description: 'Create a positive learning environment through proactive management strategies.',
        topic: PDTopic.classroom,
        duration: 3.5,
        progress: 0,
        modules: [
          'Setting Expectations',
          'Building Relationships',
          'Proactive Strategies',
          'Responding to Behavior',
        ],
        instructor: 'Amanda Thompson',
        rating: 4.8,
        enrolledCount: 1800,
      ),
    ];
  }

  List<Certification> _getMockCertifications() {
    return [
      Certification(
        id: 'cert1',
        name: 'Differentiated Instruction Specialist',
        issuedDate: DateTime.now().subtract(const Duration(days: 30)),
        expiresDate: DateTime.now().add(const Duration(days: 335)),
        status: 'active',
        credentialUrl: 'https://example.com/cert/123',
      ),
      Certification(
        id: 'cert2',
        name: 'SEL Integration Certificate',
        issuedDate: DateTime.now().subtract(const Duration(days: 15)),
        expiresDate: DateTime.now().add(const Duration(days: 350)),
        status: 'active',
        credentialUrl: 'https://example.com/cert/456',
      ),
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Theme available for future customization
    Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Professional Development'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.home), text: 'Dashboard'),
            Tab(icon: Icon(Icons.library_books), text: 'Courses'),
            Tab(icon: Icon(Icons.emoji_events), text: 'Certificates'),
            Tab(icon: Icon(Icons.route), text: 'Learning Paths'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildDashboardTab(context),
                _buildCoursesTab(context),
                _buildCertificatesTab(context),
                _buildLearningPathsTab(context),
              ],
            ),
    );
  }

  Widget _buildDashboardTab(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // PD Hours Progress
        _buildPDHoursCard(context),
        const SizedBox(height: 16),

        // Continue Learning
        if (_inProgressCourses.isNotEmpty) ...[
          Text('Continue Learning', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          ..._inProgressCourses.map((course) => _CourseCard(
                course: course,
                onTap: () => _openCourse(context, course),
              )),
          const SizedBox(height: 16),
        ],

        // Recommended for You
        Text('Recommended for You', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        ..._recommendedCourses.map((course) => _CourseCard(
              course: course,
              onTap: () => _openCourse(context, course),
            )),
        const SizedBox(height: 16),

        // Recent Certificates
        if (_certifications.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Certificates', style: theme.textTheme.titleMedium),
              TextButton(
                onPressed: () => _tabController.animateTo(2),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ..._certifications.take(2).map((cert) => _CertificateCard(
                certification: cert,
                onTap: () => _viewCertificate(context, cert),
              )),
        ],
      ],
    );
  }

  Widget _buildPDHoursCard(BuildContext context) {
    final theme = Theme.of(context);
    final progress = _totalPDHours / _requiredPDHours;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.schedule, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('PD Hours Progress', style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_totalPDHours.toStringAsFixed(1)} / $_requiredPDHours hours',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${(_requiredPDHours - _totalPDHours).toStringAsFixed(1)} hours remaining',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  width: 80,
                  height: 80,
                  child: Stack(
                    children: [
                      CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 8,
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                      ),
                      Center(
                        child: Text(
                          '${(progress * 100).toStringAsFixed(0)}%',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: progress,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
            const SizedBox(height: 8),
            Text(
              'Due by end of school year',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoursesTab(BuildContext context) {
    // Theme available for styling
    Theme.of(context);

    return Column(
      children: [
        // Topic filters
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              FilterChip(
                label: const Text('All'),
                selected: true,
                onSelected: (_) {},
              ),
              const SizedBox(width: 8),
              ...PDTopic.values.take(5).map((topic) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      avatar: Icon(topic.icon, size: 16),
                      label: Text(topic.label),
                      selected: false,
                      onSelected: (_) {},
                    ),
                  )),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _courses.length,
            itemBuilder: (context, index) {
              final course = _courses[index];
              return _CourseCard(
                course: course,
                onTap: () => _openCourse(context, course),
                showFullDetails: true,
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCertificatesTab(BuildContext context) {
    final theme = Theme.of(context);

    if (_certifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.emoji_events_outlined,
              size: 64,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No certificates yet',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Complete courses to earn certificates',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => _tabController.animateTo(1),
              child: const Text('Browse Courses'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _certifications.length,
      itemBuilder: (context, index) {
        final cert = _certifications[index];
        return _CertificateCard(
          certification: cert,
          onTap: () => _viewCertificate(context, cert),
          showFullDetails: true,
        );
      },
    );
  }

  Widget _buildLearningPathsTab(BuildContext context) {
    // Theme available for styling
    Theme.of(context);

    final learningPaths = [
      _LearningPath(
        'Inclusive Classroom Expert',
        'Master strategies for supporting all learners',
        [
          'Differentiated Instruction Strategies',
          'Supporting Students with IEPs',
          'Universal Design for Learning',
        ],
        0.4,
        Icons.diversity_3,
      ),
      _LearningPath(
        'Technology Champion',
        'Become proficient in educational technology',
        [
          'Technology Tools for the Classroom',
          'Digital Assessment Mastery',
          'Blended Learning Design',
        ],
        0.15,
        Icons.computer,
      ),
      _LearningPath(
        'SEL Leader',
        'Build expertise in social-emotional learning',
        [
          'Building SEL in Your Classroom',
          'Trauma-Informed Practices',
          'Restorative Practices',
        ],
        0.33,
        Icons.favorite,
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: learningPaths.length,
      itemBuilder: (context, index) {
        final path = learningPaths[index];
        return _LearningPathCard(
          learningPath: path,
          onTap: () => _openLearningPath(context, path),
        );
      },
    );
  }

  void _openCourse(BuildContext context, PDCourse course) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _CourseDetailScreen(course: course),
      ),
    );
  }

  void _viewCertificate(BuildContext context, Certification cert) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.verified, color: AivoBrand.success),
            const SizedBox(width: 8),
            Expanded(child: Text(cert.name)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Issued: ${_formatDate(cert.issuedDate)}'),
            Text('Expires: ${_formatDate(cert.expiresDate)}'),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: AivoBrand.success),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  const Icon(Icons.emoji_events, size: 48, color: Colors.amber),
                  const SizedBox(height: 8),
                  Text(
                    cert.name,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  const Text('Certificate of Completion'),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Downloading certificate...')),
              );
            },
            icon: const Icon(Icons.download),
            label: const Text('Download'),
          ),
        ],
      ),
    );
  }

  void _openLearningPath(BuildContext context, _LearningPath path) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                children: [
                  Icon(path.icon, size: 32, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          path.name,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          path.description,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.outline,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              LinearProgressIndicator(value: path.progress),
              const SizedBox(height: 8),
              Text('${(path.progress * 100).toStringAsFixed(0)}% complete'),
              const SizedBox(height: 24),
              Text(
                'Courses in this path:',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...path.courses.asMap().entries.map((entry) {
                final index = entry.key;
                final courseName = entry.value;
                final isCompleted = index < (path.progress * path.courses.length).floor();
                final isCurrent = index == (path.progress * path.courses.length).floor();

                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isCompleted
                        ? AivoBrand.success
                        : isCurrent
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: isCompleted
                        ? const Icon(Icons.check, color: Colors.white)
                        : Text('${index + 1}'),
                  ),
                  title: Text(courseName),
                  subtitle: Text(
                    isCompleted
                        ? 'Completed'
                        : isCurrent
                            ? 'In Progress'
                            : 'Not Started',
                  ),
                  trailing: isCurrent
                      ? FilledButton(
                          onPressed: () {},
                          child: const Text('Continue'),
                        )
                      : null,
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

/// Course Card Widget
class _CourseCard extends StatelessWidget {
  const _CourseCard({
    required this.course,
    required this.onTap,
    this.showFullDetails = false,
  });

  final PDCourse course;
  final VoidCallback onTap;
  final bool showFullDetails;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = course.progress == 0
        ? PDCourseStatus.notStarted
        : course.progress >= 1
            ? PDCourseStatus.completed
            : PDCourseStatus.inProgress;

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
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      course.topic.icon,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.title,
                          style: theme.textTheme.titleMedium,
                        ),
                        Text(
                          course.topic.label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(status: status),
                ],
              ),
              if (showFullDetails) ...[
                const SizedBox(height: 12),
                Text(
                  course.description,
                  style: theme.textTheme.bodyMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.schedule,
                      size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text(
                    '${course.duration} hours',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(width: 16),
                  const Icon(Icons.star, size: 16, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text(
                    course.rating.toStringAsFixed(1),
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.people,
                      size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text(
                    '${course.enrolledCount}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              if (course.progress > 0 && course.progress < 1) ...[
                const SizedBox(height: 12),
                LinearProgressIndicator(value: course.progress),
                const SizedBox(height: 4),
                Text(
                  '${(course.progress * 100).toStringAsFixed(0)}% complete',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Status Chip Widget
class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final PDCourseStatus status;

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case PDCourseStatus.completed:
        color = AivoBrand.success;
        break;
      case PDCourseStatus.inProgress:
        color = AivoBrand.warning;
        break;
      case PDCourseStatus.notStarted:
        color = AivoBrand.gray;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// Certificate Card Widget
class _CertificateCard extends StatelessWidget {
  const _CertificateCard({
    required this.certification,
    required this.onTap,
    this.showFullDetails = false,
  });

  final Certification certification;
  final VoidCallback onTap;
  final bool showFullDetails;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final daysUntilExpiry =
        certification.expiresDate.difference(DateTime.now()).inDays;
    final isExpiringSoon = daysUntilExpiry < 90;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.emoji_events, color: Colors.amber),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      certification.name,
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Issued: ${_formatDate(certification.issuedDate)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                    if (showFullDetails) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            isExpiringSoon
                                ? Icons.warning
                                : Icons.check_circle,
                            size: 14,
                            color: isExpiringSoon ? AivoBrand.warning : AivoBrand.success,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isExpiringSoon
                                ? 'Expires in $daysUntilExpiry days'
                                : 'Valid until ${_formatDate(certification.expiresDate)}',
                            style: TextStyle(
                              color: isExpiringSoon
                                  ? AivoBrand.warning
                                  : AivoBrand.success,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.verified,
                color: certification.status == 'active'
                    ? AivoBrand.success
                    : AivoBrand.gray,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

/// Learning Path Card Widget
class _LearningPathCard extends StatelessWidget {
  const _LearningPathCard({
    required this.learningPath,
    required this.onTap,
  });

  final _LearningPath learningPath;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      learningPath.icon,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          learningPath.name,
                          style: theme.textTheme.titleMedium,
                        ),
                        Text(
                          learningPath.description,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.book, size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text(
                    '${learningPath.courses.length} courses',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(value: learningPath.progress),
              const SizedBox(height: 4),
              Text(
                '${(learningPath.progress * 100).toStringAsFixed(0)}% complete',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Learning Path Model
class _LearningPath {
  final String name;
  final String description;
  final List<String> courses;
  final double progress;
  final IconData icon;

  _LearningPath(
    this.name,
    this.description,
    this.courses,
    this.progress,
    this.icon,
  );
}

/// Course Detail Screen
class _CourseDetailScreen extends StatelessWidget {
  const _CourseDetailScreen({required this.course});

  final PDCourse course;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = course.progress == 0
        ? PDCourseStatus.notStarted
        : course.progress >= 1
            ? PDCourseStatus.completed
            : PDCourseStatus.inProgress;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Course Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          course.topic.icon,
                          size: 32,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course.title,
                              style: theme.textTheme.titleLarge,
                            ),
                            Text(
                              course.topic.label,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.outline,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(course.description),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _InfoChip(
                        icon: Icons.schedule,
                        label: '${course.duration} hours',
                      ),
                      const SizedBox(width: 8),
                      _InfoChip(
                        icon: Icons.star,
                        label: course.rating.toStringAsFixed(1),
                        iconColor: Colors.amber,
                      ),
                      const SizedBox(width: 8),
                      _InfoChip(
                        icon: Icons.people,
                        label: '${course.enrolledCount} enrolled',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Progress
          if (course.progress > 0) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Your Progress',
                            style: theme.textTheme.titleMedium),
                        _StatusChip(status: status),
                      ],
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(value: course.progress),
                    const SizedBox(height: 8),
                    Text(
                      '${(course.progress * 100).toStringAsFixed(0)}% complete • ${(course.progress * course.modules.length).floor()}/${course.modules.length} modules',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Instructor
          Card(
            child: ListTile(
              leading: CircleAvatar(
                child: Text(course.instructor.substring(0, 1)),
              ),
              title: Text(course.instructor),
              subtitle: const Text('Course Instructor'),
            ),
          ),
          const SizedBox(height: 16),

          // Modules
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Course Modules', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  ...course.modules.asMap().entries.map((entry) {
                    final index = entry.key;
                    final module = entry.value;
                    final completedModules =
                        (course.progress * course.modules.length).floor();
                    final isCompleted = index < completedModules;
                    final isCurrent = index == completedModules;

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor: isCompleted
                            ? AivoBrand.success
                            : isCurrent
                                ? theme.colorScheme.primary
                                : theme.colorScheme.surfaceContainerHighest,
                        child: isCompleted
                            ? const Icon(Icons.check,
                                size: 16, color: Colors.white)
                            : Text(
                                '${index + 1}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isCurrent ? Colors.white : null,
                                ),
                              ),
                      ),
                      title: Text(module),
                      trailing: isCurrent
                          ? const Icon(Icons.play_circle, color: AivoBrand.success)
                          : null,
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    course.progress == 0
                        ? 'Starting course...'
                        : course.progress >= 1
                            ? 'Reviewing course...'
                            : 'Continuing course...',
                  ),
                ),
              );
            },
            icon: Icon(
              course.progress == 0
                  ? Icons.play_arrow
                  : course.progress >= 1
                      ? Icons.replay
                      : Icons.play_arrow,
            ),
            label: Text(
              course.progress == 0
                  ? 'Start Course'
                  : course.progress >= 1
                      ? 'Review Course'
                      : 'Continue',
            ),
          ),
        ),
      ),
    );
  }
}

/// Info Chip Widget
class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor ?? theme.colorScheme.outline),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
