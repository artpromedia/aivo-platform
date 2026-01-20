/// Comprehension Aids Widget
///
/// Helps learners understand text through:
/// - Reading strategies (before, during, after)
/// - Graphic organizers
/// - Comprehension questions
/// - Text annotation tools
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Reading strategy type
enum ReadingStrategy {
  before('Before Reading', Icons.play_arrow, Colors.blue),
  during('During Reading', Icons.menu_book, AivoBrand.success),
  after('After Reading', Icons.check_circle, Colors.purple);

  const ReadingStrategy(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;
}

/// Comprehension Aids Widget
class ComprehensionAidsWidget extends ConsumerStatefulWidget {
  const ComprehensionAidsWidget({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<ComprehensionAidsWidget> createState() =>
      _ComprehensionAidsWidgetState();
}

class _ComprehensionAidsWidgetState
    extends ConsumerState<ComprehensionAidsWidget> {
  ReadingStrategy _selectedStrategy = ReadingStrategy.before;

  // Reading strategies
  final Map<ReadingStrategy, List<Map<String, dynamic>>> _strategies = {
    ReadingStrategy.before: [
      {
        'title': 'Preview the Text',
        'description':
            'Look at titles, headings, pictures, and bold words before reading.',
        'icon': Icons.preview,
        'steps': [
          'Read the title - what do you think this will be about?',
          'Look at any pictures or diagrams',
          'Read the headings and subheadings',
          'Notice any bold or highlighted words',
        ],
      },
      {
        'title': 'Activate Prior Knowledge',
        'description': 'Think about what you already know about this topic.',
        'icon': Icons.psychology,
        'steps': [
          'What do I already know about this topic?',
          'Have I read something similar before?',
          'What questions do I have?',
        ],
      },
      {
        'title': 'Set a Purpose',
        'description': 'Decide why you are reading and what you want to learn.',
        'icon': Icons.flag,
        'steps': [
          'Why am I reading this?',
          'What do I want to find out?',
          'What should I look for?',
        ],
      },
    ],
    ReadingStrategy.during: [
      {
        'title': 'Monitor Comprehension',
        'description': 'Check if you understand as you read.',
        'icon': Icons.fact_check,
        'steps': [
          'Does this make sense?',
          'Can I picture what\'s happening?',
          'What are the main ideas so far?',
          'If confused, re-read the section',
        ],
      },
      {
        'title': 'Make Connections',
        'description': 'Connect what you read to your own life and knowledge.',
        'icon': Icons.link,
        'steps': [
          'Text-to-Self: Does this remind me of something?',
          'Text-to-Text: Is this like another book I\'ve read?',
          'Text-to-World: How does this connect to the real world?',
        ],
      },
      {
        'title': 'Ask Questions',
        'description': 'Ask yourself questions as you read.',
        'icon': Icons.help_outline,
        'steps': [
          'Who, what, when, where, why, how?',
          'What will happen next?',
          'Why did the author write this?',
        ],
      },
      {
        'title': 'Visualize',
        'description': 'Create pictures in your mind.',
        'icon': Icons.image,
        'steps': [
          'Picture the characters and setting',
          'Imagine the action happening',
          'Draw a quick sketch if it helps',
        ],
      },
    ],
    ReadingStrategy.after: [
      {
        'title': 'Summarize',
        'description': 'Tell the main ideas in your own words.',
        'icon': Icons.summarize,
        'steps': [
          'What were the main ideas?',
          'What happened in the beginning, middle, end?',
          'What was most important?',
        ],
      },
      {
        'title': 'Reflect',
        'description': 'Think about what you learned.',
        'icon': Icons.lightbulb,
        'steps': [
          'What did I learn?',
          'Was my prediction correct?',
          'What surprised me?',
          'Do I have new questions?',
        ],
      },
      {
        'title': 'Evaluate',
        'description': 'Form an opinion about what you read.',
        'icon': Icons.star,
        'steps': [
          'Did I like this? Why or why not?',
          'Was the information reliable?',
          'Would I recommend this?',
        ],
      },
    ],
  };

  // Graphic organizers
  final List<Map<String, dynamic>> _graphicOrganizers = [
    {
      'name': 'Story Map',
      'description': 'Organize story elements',
      'icon': Icons.map,
      'color': Colors.blue,
      'elements': ['Characters', 'Setting', 'Problem', 'Events', 'Solution'],
    },
    {
      'name': 'Venn Diagram',
      'description': 'Compare and contrast',
      'icon': Icons.compare,
      'color': AivoBrand.success,
      'elements': ['Different', 'Same', 'Different'],
    },
    {
      'name': 'Main Idea Web',
      'description': 'Find main ideas and details',
      'icon': Icons.hub,
      'color': Colors.purple,
      'elements': ['Main Idea', 'Detail 1', 'Detail 2', 'Detail 3'],
    },
    {
      'name': 'Cause & Effect',
      'description': 'Show relationships',
      'icon': Icons.arrow_forward,
      'color': AivoBrand.warning,
      'elements': ['Cause', 'Effect'],
    },
    {
      'name': 'Timeline',
      'description': 'Order events',
      'icon': Icons.timeline,
      'color': AivoBrand.error,
      'elements': ['First', 'Next', 'Then', 'Finally'],
    },
    {
      'name': 'KWL Chart',
      'description': 'Track learning',
      'icon': Icons.table_chart,
      'color': Colors.teal,
      'elements': ['Know', 'Want to Know', 'Learned'],
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Reading Strategies Section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.psychology, color: colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Reading Strategies',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Use these strategies to understand what you read better',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          // Strategy tabs
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedButton<ReadingStrategy>(
              segments: ReadingStrategy.values.map((strategy) {
                return ButtonSegment(
                  value: strategy,
                  icon: Icon(strategy.icon),
                  label: Text(strategy.label),
                );
              }).toList(),
              selected: {_selectedStrategy},
              onSelectionChanged: (selected) {
                setState(() => _selectedStrategy = selected.first);
              },
            ),
          ),

          const SizedBox(height: 16),

          // Strategy cards
          ...(_strategies[_selectedStrategy] ?? []).map((strategy) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Card(
                child: ExpansionTile(
                  leading: CircleAvatar(
                    backgroundColor: _selectedStrategy.color.withOpacity(0.2),
                    child: Icon(
                      strategy['icon'] as IconData,
                      color: _selectedStrategy.color,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    strategy['title'] as String,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    strategy['description'] as String,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(),
                          const SizedBox(height: 8),
                          Text(
                            'Steps:',
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...(strategy['steps'] as List<String>)
                              .asMap()
                              .entries
                              .map((entry) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 12,
                                    backgroundColor:
                                        _selectedStrategy.color.withOpacity(0.2),
                                    child: Text(
                                      '${entry.key + 1}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: _selectedStrategy.color,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      entry.value,
                                      style: theme.textTheme.bodyMedium,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),

          const SizedBox(height: 24),

          // Graphic Organizers Section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.grid_view, color: colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Graphic Organizers',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Visual tools to organize your thoughts',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Graphic organizer grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: _graphicOrganizers.length,
            itemBuilder: (context, index) {
              final organizer = _graphicOrganizers[index];
              return Card(
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _showOrganizerDialog(context, organizer),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          backgroundColor:
                              (organizer['color'] as Color).withOpacity(0.2),
                          child: Icon(
                            organizer['icon'] as IconData,
                            color: organizer['color'] as Color,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          organizer['name'] as String,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          organizer['description'] as String,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 24),

          // Quick comprehension check
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              color: colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.quiz,
                          color: colorScheme.onPrimaryContainer,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Quick Check',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Paste any text to generate comprehension questions!',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () => _showComprehensionCheckDialog(context),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Start Quick Check'),
                      style: FilledButton.styleFrom(
                        backgroundColor: colorScheme.primary,
                        foregroundColor: colorScheme.onPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  void _showOrganizerDialog(BuildContext context, Map<String, dynamic> organizer) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
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
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Header
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor:
                            (organizer['color'] as Color).withOpacity(0.2),
                        child: Icon(
                          organizer['icon'] as IconData,
                          color: organizer['color'] as Color,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              organizer['name'] as String,
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              organizer['description'] as String,
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
                // Content
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'Fill in each section:',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...(organizer['elements'] as List<String>).map((element) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: TextField(
                            maxLines: 3,
                            decoration: InputDecoration(
                              labelText: element,
                              border: const OutlineInputBorder(),
                              alignLabelWithHint: true,
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                // Actions
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Organizer saved!')),
                            );
                          },
                          child: const Text('Save'),
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

  void _showComprehensionCheckDialog(BuildContext context) {
    final textController = TextEditingController();

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
              'Quick Comprehension Check',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Paste text below to generate questions',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: textController,
              maxLines: 8,
              decoration: const InputDecoration(
                hintText: 'Paste your reading text here...',
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
                    // Generate questions
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Generating questions...')),
                    );
                  },
                  child: const Text('Generate Questions'),
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
