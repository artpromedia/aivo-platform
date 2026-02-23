/// IEP Upload Screen
///
/// Allows parents to:
/// - Upload IEP documents
/// - View uploaded IEPs
/// - Compare IEP changes over time
/// - Track IEP goals progress
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/environment.dart';
import '../data/iep_api_service.dart';

/// IEP Document
class IEPDocument {
  final String id;
  final String fileName;
  final DateTime uploadedAt;
  final DateTime iepDate;
  final IEPStatus status;
  final List<IEPGoal> goals;
  final String? notes;

  const IEPDocument({
    required this.id,
    required this.fileName,
    required this.uploadedAt,
    required this.iepDate,
    required this.status,
    this.goals = const [],
    this.notes,
  });
}

/// IEP Status
enum IEPStatus {
  processing('Processing', AivoBrand.warning),
  active('Active', AivoBrand.success),
  expired('Expired', AivoBrand.gray),
  draft('Draft', Colors.blue);

  const IEPStatus(this.label, this.color);
  final String label;
  final Color color;
}

/// IEP Goal
class IEPGoal {
  final String id;
  final String area;
  final String description;
  final String objective;
  final int progressPercent;
  final DateTime? targetDate;

  const IEPGoal({
    required this.id,
    required this.area,
    required this.description,
    required this.objective,
    required this.progressPercent,
    this.targetDate,
  });
}

/// IEP Upload Screen
class IEPUploadScreen extends ConsumerStatefulWidget {
  const IEPUploadScreen({
    super.key,
    required this.childId,
    required this.childName,
  });

  final String childId;
  final String childName;

  @override
  ConsumerState<IEPUploadScreen> createState() => _IEPUploadScreenState();
}

class _IEPUploadScreenState extends ConsumerState<IEPUploadScreen> {
  bool _isLoading = true;
  bool _isUploading = false;
  List<IEPDocument> _documents = [];
  // ignore: unused_field
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    if (EnvironmentConfig.useMockServices) {
      // Fallback to mock data only in development with mocks enabled
      await Future.delayed(const Duration(milliseconds: 500));
      setState(() {
        _documents = _getMockDocuments();
        _isLoading = false;
      });
      return;
    }

    try {
      // TODO: Obtain auth token from auth controller via Riverpod
      const authToken = '';
      final apiService = IepApiService(authToken: authToken);
      final docs = await apiService.getIepsForStudent(widget.childId);
      setState(() {
        _documents = docs;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Failed to load IEP documents: $e');
      setState(() {
        _errorMessage = 'Unable to load IEP documents. Please try again.';
        _isLoading = false;
      });
    }
  }

  List<IEPDocument> _getMockDocuments() {
    return [
      IEPDocument(
        id: '1',
        fileName: 'IEP_2024_Annual_Review.pdf',
        uploadedAt: DateTime.now().subtract(const Duration(days: 30)),
        iepDate: DateTime(2024, 1, 15),
        status: IEPStatus.active,
        goals: const [
          IEPGoal(id: 'g1', area: 'Reading', description: 'Improve reading fluency', objective: 'Read 100 words per minute with 95% accuracy', progressPercent: 75),
          IEPGoal(id: 'g2', area: 'Math', description: 'Master multiplication facts', objective: 'Complete multiplication facts 0-12 with 90% accuracy', progressPercent: 60),
          IEPGoal(id: 'g3', area: 'Writing', description: 'Improve written expression', objective: 'Write a 5-paragraph essay with proper structure', progressPercent: 45),
          IEPGoal(id: 'g4', area: 'Executive Function', description: 'Improve task completion', objective: 'Complete 80% of classroom assignments independently', progressPercent: 55),
        ],
      ),
      IEPDocument(
        id: '2',
        fileName: 'IEP_2023_Annual_Review.pdf',
        uploadedAt: DateTime.now().subtract(const Duration(days: 365)),
        iepDate: DateTime(2023, 1, 15),
        status: IEPStatus.expired,
        goals: const [
          IEPGoal(id: 'g5', area: 'Reading', description: 'Improve reading comprehension', objective: 'Answer comprehension questions with 80% accuracy', progressPercent: 100),
          IEPGoal(id: 'g6', area: 'Math', description: 'Master addition and subtraction', objective: 'Complete basic facts with 95% accuracy', progressPercent: 100),
        ],
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.childName}\'s IEP'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Upload card
                  Card(
                    color: colorScheme.primaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Icon(
                            Icons.upload_file,
                            size: 48,
                            color: colorScheme.onPrimaryContainer,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Upload IEP Document',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: colorScheme.onPrimaryContainer,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Upload your child\'s IEP to help AIVO personalize their learning experience.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onPrimaryContainer,
                            ),
                          ),
                          const SizedBox(height: 16),
                          FilledButton.icon(
                            onPressed: _isUploading ? null : _uploadDocument,
                            icon: _isUploading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.add),
                            label: Text(
                              _isUploading ? 'Uploading...' : 'Select Document',
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Supported formats: PDF, DOC, DOCX',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.onPrimaryContainer.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Active IEP Goals
                  if (_activeDocument != null) ...[
                    Text(
                      'Current IEP Goals',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._activeDocument!.goals.map((goal) => _IEPGoalCard(goal: goal)),
                    const SizedBox(height: 24),
                  ],

                  // Document history
                  Text(
                    'IEP Documents',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_documents.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.description_outlined,
                                size: 48,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No IEP documents uploaded',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    ..._documents.map((doc) => _IEPDocumentCard(
                          document: doc,
                          onView: () => _viewDocument(doc),
                          onCompare: _documents.length > 1
                              ? () => _compareDocuments(doc)
                              : null,
                        )),

                  const SizedBox(height: 24),

                  // Help section
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.help_outline, color: colorScheme.primary),
                              const SizedBox(width: 8),
                              Text(
                                'How AIVO Uses Your IEP',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildHelpItem(
                            Icons.auto_awesome,
                            'Personalized Learning',
                            'We adapt content to match your child\'s goals.',
                          ),
                          _buildHelpItem(
                            Icons.track_changes,
                            'Progress Tracking',
                            'Track progress towards IEP objectives.',
                          ),
                          _buildHelpItem(
                            Icons.people,
                            'Teacher Collaboration',
                            'Help teachers understand accommodations.',
                          ),
                          _buildHelpItem(
                            Icons.lock,
                            'Secure Storage',
                            'Your documents are encrypted and private.',
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  IEPDocument? get _activeDocument =>
      _documents.where((d) => d.status == IEPStatus.active).firstOrNull;

  Widget _buildHelpItem(IconData icon, String title, String description) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadDocument() async {
    setState(() => _isUploading = true);

    // Simulate file picker and upload
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _isUploading = false;
      _documents.insert(
        0,
        IEPDocument(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          fileName: 'IEP_2024_Update.pdf',
          uploadedAt: DateTime.now(),
          iepDate: DateTime.now(),
          status: IEPStatus.processing,
        ),
      );
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Document uploaded! Processing may take a few minutes.'),
        ),
      );
    }
  }

  void _viewDocument(IEPDocument document) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        expand: false,
        builder: (context, scrollController) {
          final theme = Theme.of(context);
          final colorScheme = theme.colorScheme;

          return Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(Icons.description, color: colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              document.fileName,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'IEP Date: ${_formatDate(document.iepDate)}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Goals section
                      Text(
                        'Goals',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (document.goals.isEmpty)
                        Text(
                          'No goals extracted yet.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        )
                      else
                        ...document.goals.map((goal) => _IEPGoalCard(goal: goal)),
                      const SizedBox(height: 24),

                      // Actions
                      FilledButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Downloading ${document.fileName}...')),
                          );
                        },
                        icon: const Icon(Icons.download),
                        label: const Text('Download Document'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          _showShareWithTeacherDialog(context, document);
                        },
                        icon: const Icon(Icons.share),
                        label: const Text('Share with Teacher'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _compareDocuments(IEPDocument document) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening IEP comparison view...')),
    );
  }

  void _showShareWithTeacherDialog(BuildContext context, IEPDocument document) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Share with Teacher'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Share "${document.fileName}" with your child\'s teacher?'),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Teacher\'s Email (optional)',
                hintText: 'teacher@school.edu',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            const TextField(
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Message (optional)',
                hintText: 'Add a note for the teacher...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('IEP shared with teacher successfully')),
              );
            },
            child: const Text('Share'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

class _IEPGoalCard extends StatelessWidget {
  const _IEPGoalCard({required this.goal});

  final IEPGoal goal;

  Color _getProgressColor(int percent) {
    if (percent >= 80) return AivoBrand.success;
    if (percent >= 50) return AivoBrand.warning;
    return AivoBrand.error;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final progressColor = _getProgressColor(goal.progressPercent);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    goal.area,
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '${goal.progressPercent}%',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: progressColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              goal.description,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              goal.objective,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: goal.progressPercent / 100,
                backgroundColor: progressColor.withOpacity(0.2),
                valueColor: AlwaysStoppedAnimation(progressColor),
                minHeight: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IEPDocumentCard extends StatelessWidget {
  const _IEPDocumentCard({
    required this.document,
    required this.onView,
    this.onCompare,
  });

  final IEPDocument document;
  final VoidCallback onView;
  final VoidCallback? onCompare;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onView,
        borderRadius: BorderRadius.circular(12),
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
                      Icons.description,
                      color: colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          document.fileName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'IEP Date: ${_formatDate(document.iepDate)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: document.status.color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      document.status.label,
                      style: TextStyle(
                        color: document.status.color,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(
                    'Uploaded ${_formatDate(document.uploadedAt)}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '• ${document.goals.length} goals',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  if (onCompare != null)
                    TextButton.icon(
                      onPressed: onCompare,
                      icon: const Icon(Icons.compare_arrows, size: 16),
                      label: const Text('Compare'),
                    ),
                ],
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
