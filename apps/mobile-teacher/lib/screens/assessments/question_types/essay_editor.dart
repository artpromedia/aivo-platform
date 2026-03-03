/// Essay Editor
///
/// Editor widget for essay questions.
/// Provides options for word limits and rubric guidelines.
library;

import 'package:flutter/material.dart';

/// Editor for essay questions
class EssayEditor extends StatelessWidget {
  const EssayEditor({
    required this.hint,
    required this.onHintChanged,
    this.minWords,
    this.maxWords,
    this.onMinWordsChanged,
    this.onMaxWordsChanged,
    super.key,
  });

  final String hint;
  final ValueChanged<String> onHintChanged;
  final int? minWords;
  final int? maxWords;
  final ValueChanged<int?>? onMinWordsChanged;
  final ValueChanged<int?>? onMaxWordsChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.article,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Essay Response Settings',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Essay questions are manually graded. Configure guidelines for students.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),

            // Writing prompt / guidance
            TextFormField(
              initialValue: hint,
              decoration: const InputDecoration(
                labelText: 'Writing Guidance (Optional)',
                hintText: 'Provide hints or guidance for students...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 3,
              onChanged: onHintChanged,
            ),
            const SizedBox(height: 16),

            // Word limits (if callbacks provided)
            if (onMinWordsChanged != null || onMaxWordsChanged != null) ...[
              Text(
                'Word Limits',
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (onMinWordsChanged != null)
                    Expanded(
                      child: TextFormField(
                        initialValue: minWords?.toString(),
                        decoration: const InputDecoration(
                          labelText: 'Minimum Words',
                          hintText: 'e.g., 100',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          onMinWordsChanged!(int.tryParse(value));
                        },
                      ),
                    ),
                  if (onMinWordsChanged != null && onMaxWordsChanged != null)
                    const SizedBox(width: 16),
                  if (onMaxWordsChanged != null)
                    Expanded(
                      child: TextFormField(
                        initialValue: maxWords?.toString(),
                        decoration: const InputDecoration(
                          labelText: 'Maximum Words',
                          hintText: 'e.g., 500',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          onMaxWordsChanged!(int.tryParse(value));
                        },
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],

            // Grading info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue[700]),
                      const SizedBox(width: 8),
                      Text(
                        'About Essay Grading',
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: Colors.blue[700],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Essay responses require manual grading. After students submit, '
                    'you can:\n\n'
                    '• Review each response individually\n'
                    '• Provide written feedback\n'
                    '• Assign points based on a rubric\n'
                    '• Use AI assistance for grading suggestions',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.blue[800],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Rubric suggestion
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lightbulb_outline, color: Colors.amber[700]),
                      const SizedBox(width: 8),
                      Text(
                        'Rubric Suggestion',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const _RubricRow(
                    label: 'Excellent',
                    points: '100%',
                    description: 'Comprehensive, well-organized, insightful',
                  ),
                  const SizedBox(height: 8),
                  const _RubricRow(
                    label: 'Good',
                    points: '80%',
                    description: 'Solid understanding, minor gaps',
                  ),
                  const SizedBox(height: 8),
                  const _RubricRow(
                    label: 'Satisfactory',
                    points: '60%',
                    description: 'Basic understanding, some issues',
                  ),
                  const SizedBox(height: 8),
                  const _RubricRow(
                    label: 'Needs Work',
                    points: '40%',
                    description: 'Limited understanding, major gaps',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RubricRow extends StatelessWidget {
  const _RubricRow({
    required this.label,
    required this.points,
    required this.description,
  });

  final String label;
  final String points;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
        SizedBox(
          width: 50,
          child: Text(
            points,
            style: TextStyle(
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            description,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }
}
