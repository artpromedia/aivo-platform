/// Assessment Settings Sheet
///
/// A bottom sheet for configuring all assessment settings.
library;

import 'package:flutter/material.dart';

/// Assessment visibility options
enum AssessmentVisibility {
  draft,
  published,
  scheduled,
  archived,
}

/// Assessment settings model
class AssessmentSettings {
  const AssessmentSettings({
    this.title = '',
    this.description = '',
    this.instructions = '',
    this.visibility = AssessmentVisibility.draft,
    this.timeLimitMinutes,
    this.dueDate,
    this.availableFrom,
    this.availableUntil,
    this.shuffleQuestions = false,
    this.shuffleOptions = false,
    this.showResults = true,
    this.showCorrectAnswers = true,
    this.showPointsPerQuestion = true,
    this.allowLateSubmission = false,
    this.latePenaltyPercent = 0,
    this.maxAttempts = 1,
    this.requireLockdownBrowser = false,
    this.passingScore,
    this.category,
    this.tags = const [],
  });

  final String title;
  final String description;
  final String instructions;
  final AssessmentVisibility visibility;
  final int? timeLimitMinutes;
  final DateTime? dueDate;
  final DateTime? availableFrom;
  final DateTime? availableUntil;
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final bool showResults;
  final bool showCorrectAnswers;
  final bool showPointsPerQuestion;
  final bool allowLateSubmission;
  final int latePenaltyPercent;
  final int maxAttempts;
  final bool requireLockdownBrowser;
  final int? passingScore;
  final String? category;
  final List<String> tags;

  AssessmentSettings copyWith({
    String? title,
    String? description,
    String? instructions,
    AssessmentVisibility? visibility,
    int? timeLimitMinutes,
    DateTime? dueDate,
    DateTime? availableFrom,
    DateTime? availableUntil,
    bool? shuffleQuestions,
    bool? shuffleOptions,
    bool? showResults,
    bool? showCorrectAnswers,
    bool? showPointsPerQuestion,
    bool? allowLateSubmission,
    int? latePenaltyPercent,
    int? maxAttempts,
    bool? requireLockdownBrowser,
    int? passingScore,
    String? category,
    List<String>? tags,
  }) {
    return AssessmentSettings(
      title: title ?? this.title,
      description: description ?? this.description,
      instructions: instructions ?? this.instructions,
      visibility: visibility ?? this.visibility,
      timeLimitMinutes: timeLimitMinutes ?? this.timeLimitMinutes,
      dueDate: dueDate ?? this.dueDate,
      availableFrom: availableFrom ?? this.availableFrom,
      availableUntil: availableUntil ?? this.availableUntil,
      shuffleQuestions: shuffleQuestions ?? this.shuffleQuestions,
      shuffleOptions: shuffleOptions ?? this.shuffleOptions,
      showResults: showResults ?? this.showResults,
      showCorrectAnswers: showCorrectAnswers ?? this.showCorrectAnswers,
      showPointsPerQuestion: showPointsPerQuestion ?? this.showPointsPerQuestion,
      allowLateSubmission: allowLateSubmission ?? this.allowLateSubmission,
      latePenaltyPercent: latePenaltyPercent ?? this.latePenaltyPercent,
      maxAttempts: maxAttempts ?? this.maxAttempts,
      requireLockdownBrowser: requireLockdownBrowser ?? this.requireLockdownBrowser,
      passingScore: passingScore ?? this.passingScore,
      category: category ?? this.category,
      tags: tags ?? this.tags,
    );
  }
}

/// Shows assessment settings bottom sheet
Future<AssessmentSettings?> showAssessmentSettingsSheet(
  BuildContext context, {
  required AssessmentSettings settings,
}) {
  return showModalBottomSheet<AssessmentSettings>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => AssessmentSettingsSheet(settings: settings),
  );
}

/// Assessment settings bottom sheet widget
class AssessmentSettingsSheet extends StatefulWidget {
  const AssessmentSettingsSheet({
    required this.settings,
    super.key,
  });

  final AssessmentSettings settings;

  @override
  State<AssessmentSettingsSheet> createState() => _AssessmentSettingsSheetState();
}

class _AssessmentSettingsSheetState extends State<AssessmentSettingsSheet> {
  late AssessmentSettings _settings;
  int _currentSection = 0;

  final _sections = const [
    'Basic Info',
    'Schedule',
    'Display',
    'Security',
    'Organization',
  ];

  @override
  void initState() {
    super.initState();
    _settings = widget.settings;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text(
                        'Assessment Settings',
                        style: theme.textTheme.titleLarge,
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, _settings),
                        child: const Text('Save'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Section tabs
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _sections.length,
                itemBuilder: (context, index) {
                  final isSelected = index == _currentSection;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(_sections[index]),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _currentSection = index);
                        }
                      },
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),

            // Content
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                children: _buildSectionContent(),
              ),
            ),
          ],
        );
      },
    );
  }

  List<Widget> _buildSectionContent() {
    switch (_currentSection) {
      case 0:
        return _buildBasicInfoSection();
      case 1:
        return _buildScheduleSection();
      case 2:
        return _buildDisplaySection();
      case 3:
        return _buildSecuritySection();
      case 4:
        return _buildOrganizationSection();
      default:
        return [];
    }
  }

  List<Widget> _buildBasicInfoSection() {
    return [
      // Title
      TextField(
        decoration: const InputDecoration(
          labelText: 'Title *',
          hintText: 'Enter assessment title',
          border: OutlineInputBorder(),
        ),
        controller: TextEditingController(text: _settings.title),
        onChanged: (value) {
          _settings = _settings.copyWith(title: value);
        },
      ),
      const SizedBox(height: 16),

      // Description
      TextField(
        decoration: const InputDecoration(
          labelText: 'Description',
          hintText: 'Brief description of this assessment',
          border: OutlineInputBorder(),
        ),
        controller: TextEditingController(text: _settings.description),
        maxLines: 3,
        onChanged: (value) {
          _settings = _settings.copyWith(description: value);
        },
      ),
      const SizedBox(height: 16),

      // Instructions
      TextField(
        decoration: const InputDecoration(
          labelText: 'Instructions',
          hintText: 'Instructions shown to students before starting',
          border: OutlineInputBorder(),
        ),
        controller: TextEditingController(text: _settings.instructions),
        maxLines: 4,
        onChanged: (value) {
          _settings = _settings.copyWith(instructions: value);
        },
      ),
      const SizedBox(height: 16),

      // Time limit
      _SettingsCard(
        title: 'Time Limit',
        subtitle: _settings.timeLimitMinutes != null
            ? '${_settings.timeLimitMinutes} minutes'
            : 'No time limit',
        icon: Icons.timer,
        onTap: () async {
          final result = await _showTimeLimitPicker(context);
          if (result != null || result == -1) {
            setState(() {
              _settings = _settings.copyWith(
                timeLimitMinutes: result == -1 ? null : result,
              );
            });
          }
        },
      ),
      const SizedBox(height: 12),

      // Visibility
      _SettingsCard(
        title: 'Visibility',
        subtitle: _settings.visibility.name[0].toUpperCase() +
            _settings.visibility.name.substring(1),
        icon: Icons.visibility,
        onTap: () => _showVisibilityPicker(),
      ),
    ];
  }

  List<Widget> _buildScheduleSection() {
    return [
      // Available from
      _DateTimePickerCard(
        title: 'Available From',
        value: _settings.availableFrom,
        icon: Icons.calendar_today,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(availableFrom: value);
          });
        },
      ),
      const SizedBox(height: 12),

      // Available until
      _DateTimePickerCard(
        title: 'Available Until',
        value: _settings.availableUntil,
        icon: Icons.event_busy,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(availableUntil: value);
          });
        },
      ),
      const SizedBox(height: 12),

      // Due date
      _DateTimePickerCard(
        title: 'Due Date',
        value: _settings.dueDate,
        icon: Icons.assignment_late,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(dueDate: value);
          });
        },
      ),
      const SizedBox(height: 16),

      // Late submission
      SwitchListTile(
        title: const Text('Allow Late Submissions'),
        subtitle: const Text('Students can submit after due date'),
        value: _settings.allowLateSubmission,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(allowLateSubmission: value);
          });
        },
      ),

      if (_settings.allowLateSubmission) ...[
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Text('Late penalty:'),
              const Spacer(),
              SizedBox(
                width: 80,
                child: TextField(
                  decoration: const InputDecoration(
                    suffixText: '%',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  keyboardType: TextInputType.number,
                  controller: TextEditingController(
                    text: _settings.latePenaltyPercent.toString(),
                  ),
                  onChanged: (value) {
                    final penalty = int.tryParse(value) ?? 0;
                    _settings = _settings.copyWith(latePenaltyPercent: penalty.clamp(0, 100));
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    ];
  }

  List<Widget> _buildDisplaySection() {
    return [
      SwitchListTile(
        title: const Text('Shuffle Questions'),
        subtitle: const Text('Randomize question order for each student'),
        value: _settings.shuffleQuestions,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(shuffleQuestions: value);
          });
        },
      ),
      SwitchListTile(
        title: const Text('Shuffle Answer Options'),
        subtitle: const Text('Randomize multiple choice options'),
        value: _settings.shuffleOptions,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(shuffleOptions: value);
          });
        },
      ),
      const Divider(),
      SwitchListTile(
        title: const Text('Show Results'),
        subtitle: const Text('Show score after submission'),
        value: _settings.showResults,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(showResults: value);
          });
        },
      ),
      SwitchListTile(
        title: const Text('Show Correct Answers'),
        subtitle: const Text('Display correct answers after submission'),
        value: _settings.showCorrectAnswers,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(showCorrectAnswers: value);
          });
        },
      ),
      SwitchListTile(
        title: const Text('Show Points Per Question'),
        subtitle: const Text('Display point value for each question'),
        value: _settings.showPointsPerQuestion,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(showPointsPerQuestion: value);
          });
        },
      ),
    ];
  }

  List<Widget> _buildSecuritySection() {
    return [
      // Max attempts
      ListTile(
        leading: const Icon(Icons.replay),
        title: const Text('Maximum Attempts'),
        subtitle: Text(_settings.maxAttempts == 0
            ? 'Unlimited'
            : '${_settings.maxAttempts} attempt${_settings.maxAttempts > 1 ? 's' : ''}'),
        trailing: SizedBox(
          width: 100,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline),
                onPressed: _settings.maxAttempts > 0
                    ? () {
                        setState(() {
                          _settings = _settings.copyWith(
                            maxAttempts: _settings.maxAttempts - 1,
                          );
                        });
                      }
                    : null,
              ),
              Text('${_settings.maxAttempts == 0 ? '∞' : _settings.maxAttempts}'),
              IconButton(
                icon: const Icon(Icons.add_circle_outline),
                onPressed: () {
                  setState(() {
                    _settings = _settings.copyWith(
                      maxAttempts: _settings.maxAttempts + 1,
                    );
                  });
                },
              ),
            ],
          ),
        ),
      ),
      const Divider(),

      // Passing score
      ListTile(
        leading: const Icon(Icons.check_circle),
        title: const Text('Passing Score'),
        subtitle: Text(_settings.passingScore != null
            ? '${_settings.passingScore}%'
            : 'No passing score set'),
        trailing: SizedBox(
          width: 80,
          child: TextField(
            decoration: const InputDecoration(
              suffixText: '%',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            keyboardType: TextInputType.number,
            controller: TextEditingController(
              text: _settings.passingScore?.toString() ?? '',
            ),
            onChanged: (value) {
              final score = int.tryParse(value);
              _settings = _settings.copyWith(passingScore: score?.clamp(0, 100));
            },
          ),
        ),
      ),
      const Divider(),

      // Lockdown browser
      SwitchListTile(
        title: const Text('Require Lockdown Browser'),
        subtitle: const Text('Prevent switching apps during assessment'),
        secondary: const Icon(Icons.lock),
        value: _settings.requireLockdownBrowser,
        onChanged: (value) {
          setState(() {
            _settings = _settings.copyWith(requireLockdownBrowser: value);
          });
        },
      ),
    ];
  }

  List<Widget> _buildOrganizationSection() {
    return [
      // Category
      _SettingsCard(
        title: 'Category',
        subtitle: _settings.category ?? 'Uncategorized',
        icon: Icons.folder,
        onTap: () => _showCategoryPicker(),
      ),
      const SizedBox(height: 12),

      // Tags
      _SettingsCard(
        title: 'Tags',
        subtitle: _settings.tags.isEmpty
            ? 'No tags'
            : _settings.tags.join(', '),
        icon: Icons.label,
        onTap: () => _showTagsEditor(),
      ),
    ];
  }

  Future<int?> _showTimeLimitPicker(BuildContext context) async {
    final theme = Theme.of(context);
    final presets = [10, 15, 20, 30, 45, 60, 90, 120];

    return showModalBottomSheet<int?>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Time Limit',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.all_inclusive),
                title: const Text('No time limit'),
                trailing: _settings.timeLimitMinutes == null
                    ? Icon(Icons.check, color: theme.colorScheme.primary)
                    : null,
                onTap: () => Navigator.pop(context, -1),
              ),
              const Divider(),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: presets.map((minutes) {
                  final isSelected = minutes == _settings.timeLimitMinutes;
                  return ChoiceChip(
                    label: Text('$minutes min'),
                    selected: isSelected,
                    onSelected: (_) => Navigator.pop(context, minutes),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showVisibilityPicker() {
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Visibility',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              ...AssessmentVisibility.values.map((v) {
                final isSelected = v == _settings.visibility;
                String subtitle;
                IconData icon;
                switch (v) {
                  case AssessmentVisibility.draft:
                    subtitle = 'Not visible to students';
                    icon = Icons.edit_note;
                  case AssessmentVisibility.published:
                    subtitle = 'Available to students';
                    icon = Icons.public;
                  case AssessmentVisibility.scheduled:
                    subtitle = 'Will be available at scheduled time';
                    icon = Icons.schedule;
                  case AssessmentVisibility.archived:
                    subtitle = 'Hidden from active list';
                    icon = Icons.archive;
                }
                return ListTile(
                  leading: Icon(icon, color: isSelected ? theme.colorScheme.primary : null),
                  title: Text(v.name[0].toUpperCase() + v.name.substring(1)),
                  subtitle: Text(subtitle),
                  trailing: isSelected ? Icon(Icons.check, color: theme.colorScheme.primary) : null,
                  onTap: () {
                    setState(() {
                      _settings = _settings.copyWith(visibility: v);
                    });
                    Navigator.pop(context);
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  void _showCategoryPicker() {
    final categories = ['Quiz', 'Test', 'Exam', 'Homework', 'Practice', 'Survey'];
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Category',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: categories.map((c) {
                  final isSelected = c == _settings.category;
                  return ChoiceChip(
                    label: Text(c),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _settings = _settings.copyWith(category: selected ? c : null);
                      });
                      Navigator.pop(context);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showTagsEditor() {
    final controller = TextEditingController();
    final theme = Theme.of(context);
    var currentTags = List<String>.from(_settings.tags);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tags',
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: controller,
                          decoration: const InputDecoration(
                            hintText: 'Add a tag',
                            border: OutlineInputBorder(),
                          ),
                          onSubmitted: (value) {
                            if (value.isNotEmpty && !currentTags.contains(value)) {
                              setSheetState(() {
                                currentTags.add(value);
                              });
                              controller.clear();
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () {
                          if (controller.text.isNotEmpty &&
                              !currentTags.contains(controller.text)) {
                            setSheetState(() {
                              currentTags.add(controller.text);
                            });
                            controller.clear();
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (currentTags.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: currentTags.map((tag) {
                        return Chip(
                          label: Text(tag),
                          onDeleted: () {
                            setSheetState(() {
                              currentTags.remove(tag);
                            });
                          },
                        );
                      }).toList(),
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
                          setState(() {
                            _settings = _settings.copyWith(tags: currentTags);
                          });
                          Navigator.pop(context);
                        },
                        child: const Text('Save'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: ListTile(
        leading: Icon(icon, color: theme.colorScheme.primary),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _DateTimePickerCard extends StatelessWidget {
  const _DateTimePickerCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.onChanged,
  });

  final String title;
  final DateTime? value;
  final IconData icon;
  final ValueChanged<DateTime?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: ListTile(
        leading: Icon(icon, color: theme.colorScheme.primary),
        title: Text(title),
        subtitle: Text(
          value != null
              ? '${_formatDate(value!)} at ${_formatTime(value!)}'
              : 'Not set',
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (value != null)
              IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () => onChanged(null),
              ),
            const Icon(Icons.chevron_right),
          ],
        ),
        onTap: () async {
          final date = await showDatePicker(
            context: context,
            initialDate: value ?? DateTime.now(),
            firstDate: DateTime.now().subtract(const Duration(days: 365)),
            lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
          );
          if (date != null && context.mounted) {
            final time = await showTimePicker(
              context: context,
              initialTime: TimeOfDay.fromDateTime(value ?? DateTime.now()),
            );
            if (time != null) {
              onChanged(DateTime(
                date.year,
                date.month,
                date.day,
                time.hour,
                time.minute,
              ));
            }
          }
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : date.hour;
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${hour == 0 ? 12 : hour}:${date.minute.toString().padLeft(2, '0')} $period';
  }
}
