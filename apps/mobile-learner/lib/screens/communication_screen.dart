import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../communication/models.dart';
import '../communication/communication_service.dart';

// Providers
final communicationServiceProvider = Provider<CommunicationService>((ref) {
  return CommunicationService();
});

final aacBoardsProvider = FutureProvider<List<AACBoard>>((ref) async {
  final service = ref.read(communicationServiceProvider);
  return service.getAACBoards('user123');
});

final visualSchedulesProvider = FutureProvider<List<VisualSchedule>>((ref) async {
  final service = ref.read(communicationServiceProvider);
  return service.getSchedules('user123');
});

final choiceBoardsProvider = FutureProvider<List<ChoiceBoard>>((ref) async {
  final service = ref.read(communicationServiceProvider);
  return service.getChoiceBoards('user123');
});

final communicationTemplatesProvider = FutureProvider<List<CommunicationTemplate>>((ref) async {
  final service = ref.read(communicationServiceProvider);
  return service.getTemplates('user123');
});

class CommunicationScreen extends ConsumerStatefulWidget {
  const CommunicationScreen({super.key});

  @override
  ConsumerState<CommunicationScreen> createState() => _CommunicationScreenState();
}

class _CommunicationScreenState extends ConsumerState<CommunicationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Communication Tools'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.grid_on), text: 'AAC Board'),
            Tab(icon: Icon(Icons.calendar_today), text: 'Schedule'),
            Tab(icon: Icon(Icons.category), text: 'Choices'),
            Tab(icon: Icon(Icons.message), text: 'Templates'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          AACBoardTab(),
          VisualScheduleTab(),
          ChoiceBoardsTab(),
          CommunicationTemplatesTab(),
        ],
      ),
    );
  }
}

// AAC Board Tab
class AACBoardTab extends ConsumerStatefulWidget {
  const AACBoardTab({super.key});

  @override
  ConsumerState<AACBoardTab> createState() => _AACBoardTabState();
}

class _AACBoardTabState extends ConsumerState<AACBoardTab> {
  AACBoard? _selectedBoard;
  final List<String> _messageSymbols = [];
  final TextEditingController _nameController = TextEditingController();
  bool _showCreateForm = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final boardsAsync = ref.watch(aacBoardsProvider);

    return boardsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (boards) {
        if (_showCreateForm) {
          return _buildCreateForm();
        }

        if (_selectedBoard == null && boards.isNotEmpty) {
          _selectedBoard = boards.first;
        }

        return Column(
          children: [
            // Board Selector
            Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButton<AACBoard>(
                      value: _selectedBoard,
                      isExpanded: true,
                      hint: const Text('Select Board'),
                      items: boards.map((board) {
                        return DropdownMenuItem(
                          value: board,
                          child: Text(board.name),
                        );
                      }).toList(),
                      onChanged: (board) {
                        setState(() {
                          _selectedBoard = board;
                          _messageSymbols.clear();
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () {
                      setState(() {
                        _showCreateForm = true;
                      });
                    },
                  ),
                ],
              ),
            ),

            if (_selectedBoard != null) ...[
              // Message Display
              Container(
                padding: const EdgeInsets.all(16),
                color: Theme.of(context).colorScheme.primaryContainer,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Message',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _messageSymbols.isEmpty
                            ? 'Tap symbols to build a message'
                            : _messageSymbols.join(' '),
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton.icon(
                          onPressed: _messageSymbols.isEmpty
                              ? null
                              : () {
                                  setState(() {
                                    _messageSymbols.clear();
                                  });
                                },
                          icon: const Icon(Icons.clear),
                          label: const Text('Clear'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton.icon(
                          onPressed: _messageSymbols.isEmpty
                              ? null
                              : () async {
                                  await _saveMessage();
                                },
                          icon: const Icon(Icons.send),
                          label: const Text('Send'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Symbol Grid
              Expanded(
                child: _buildSymbolGrid(_selectedBoard!),
              ),
            ] else
              const Expanded(
                child: Center(
                  child: Text('No boards available. Create one to get started.'),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildSymbolGrid(AACBoard board) {
    final gridSize = _getGridSize(board.layout);
    final symbols = board.symbols;

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: gridSize,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemCount: symbols.length,
      itemBuilder: (context, index) {
        final symbol = symbols[index];
        return _buildSymbolCard(symbol);
      },
    );
  }

  Widget _buildSymbolCard(AACSymbol symbol) {
    return InkWell(
      onTap: () {
        setState(() {
          _messageSymbols.add(symbol.label);
        });
      },
      child: Container(
        decoration: BoxDecoration(
          color: _parseColor(symbol.backgroundColor),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Theme.of(context).colorScheme.outline,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (symbol.imageUrl != null)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Icon(
                    Icons.image,
                    size: 48,
                    color: _parseColor(symbol.textColor),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                symbol.label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _parseColor(symbol.textColor),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateForm() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create New AAC Board',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Board Name',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              FilledButton(
                onPressed: () async {
                  await _createBoard();
                },
                child: const Text('Create'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  setState(() {
                    _showCreateForm = false;
                    _nameController.clear();
                  });
                },
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  int _getGridSize(AACBoardLayout layout) {
    switch (layout) {
      case AACBoardLayout.grid2x2:
        return 2;
      case AACBoardLayout.grid3x3:
        return 3;
      case AACBoardLayout.grid4x4:
        return 4;
      case AACBoardLayout.grid5x5:
        return 5;
      default:
        return 3;
    }
  }

  Color _parseColor(String hexColor) {
    try {
      return Color(int.parse(hexColor.replaceFirst('#', '0xFF')));
    } catch (e) {
      return Colors.white;
    }
  }

  Future<void> _createBoard() async {
    if (_nameController.text.isEmpty) return;

    try {
      final service = ref.read(communicationServiceProvider);
      await service.createAACBoard(
        userId: 'user123',
        name: _nameController.text,
        layout: AACBoardLayout.grid3x3,
      );
      ref.invalidate(aacBoardsProvider);
      setState(() {
        _showCreateForm = false;
        _nameController.clear();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create board: $e')),
        );
      }
    }
  }

  Future<void> _saveMessage() async {
    if (_selectedBoard == null || _messageSymbols.isEmpty) return;

    try {
      final service = ref.read(communicationServiceProvider);
      await service.createMessage(
        userId: 'user123',
        boardId: _selectedBoard!.id,
        symbolIds: [],
        text: _messageSymbols.join(' '),
      );
      setState(() {
        _messageSymbols.clear();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Message sent!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    }
  }
}

// Visual Schedule Tab
class VisualScheduleTab extends ConsumerStatefulWidget {
  const VisualScheduleTab({super.key});

  @override
  ConsumerState<VisualScheduleTab> createState() => _VisualScheduleTabState();
}

class _VisualScheduleTabState extends ConsumerState<VisualScheduleTab> {
  VisualSchedule? _selectedSchedule;
  final TextEditingController _nameController = TextEditingController();
  bool _showCreateForm = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final schedulesAsync = ref.watch(visualSchedulesProvider);

    return schedulesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (schedules) {
        if (_showCreateForm) {
          return _buildCreateForm();
        }

        if (_selectedSchedule == null && schedules.isNotEmpty) {
          _selectedSchedule = schedules.first;
        }

        return Column(
          children: [
            // Schedule Selector
            Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButton<VisualSchedule>(
                      value: _selectedSchedule,
                      isExpanded: true,
                      hint: const Text('Select Schedule'),
                      items: schedules.map((schedule) {
                        return DropdownMenuItem(
                          value: schedule,
                          child: Text('${schedule.name} - ${schedule.date}'),
                        );
                      }).toList(),
                      onChanged: (schedule) {
                        setState(() {
                          _selectedSchedule = schedule;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () {
                      setState(() {
                        _showCreateForm = true;
                      });
                    },
                  ),
                ],
              ),
            ),

            if (_selectedSchedule != null) ...[
              // Progress Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Progress',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          '${_getCompletedCount(_selectedSchedule!)}/${_selectedSchedule!.activities.length} completed',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: _getProgress(_selectedSchedule!),
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    ),
                  ],
                ),
              ),

              // Activities List
              Expanded(
                child: _buildActivitiesList(_selectedSchedule!),
              ),
            ] else
              const Expanded(
                child: Center(
                  child: Text('No schedules available. Create one to get started.'),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildActivitiesList(VisualSchedule schedule) {
    final activities = schedule.activities;

    if (activities.isEmpty) {
      return const Center(
        child: Text('No activities in this schedule'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: activities.length,
      itemBuilder: (context, index) {
        final activity = activities[index];
        return _buildActivityCard(activity, schedule.id);
      },
    );
  }

  Widget _buildActivityCard(ScheduleActivity activity, String scheduleId) {
    final isCompleted = activity.isCompleted;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Checkbox(
          value: isCompleted,
          onChanged: (value) async {
            await _toggleActivity(scheduleId, activity.id);
          },
        ),
        title: Text(
          activity.name,
          style: TextStyle(
            decoration: isCompleted ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${activity.time} • ${activity.duration} min'),
            const SizedBox(height: 4),
            Chip(
              label: Text(activity.category),
              labelStyle: const TextStyle(fontSize: 12),
              padding: EdgeInsets.zero,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ],
        ),
        trailing: Icon(
          isCompleted ? Icons.check_circle : Icons.circle_outlined,
          color: isCompleted
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.outline,
        ),
      ),
    );
  }

  Widget _buildCreateForm() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create New Schedule',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Schedule Name',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              FilledButton(
                onPressed: () async {
                  await _createSchedule();
                },
                child: const Text('Create'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  setState(() {
                    _showCreateForm = false;
                    _nameController.clear();
                  });
                },
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  int _getCompletedCount(VisualSchedule schedule) {
    return schedule.activities.where((a) => a.isCompleted).length;
  }

  double _getProgress(VisualSchedule schedule) {
    if (schedule.activities.isEmpty) return 0;
    return _getCompletedCount(schedule) / schedule.activities.length;
  }

  Future<void> _createSchedule() async {
    if (_nameController.text.isEmpty) return;

    try {
      final service = ref.read(communicationServiceProvider);
      final now = DateTime.now();
      await service.createSchedule(
        userId: 'user123',
        name: _nameController.text,
        date: '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
      );
      ref.invalidate(visualSchedulesProvider);
      setState(() {
        _showCreateForm = false;
        _nameController.clear();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create schedule: $e')),
        );
      }
    }
  }

  Future<void> _toggleActivity(String scheduleId, String activityId) async {
    try {
      final service = ref.read(communicationServiceProvider);
      await service.completeActivity(scheduleId, activityId);
      ref.invalidate(visualSchedulesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update activity: $e')),
        );
      }
    }
  }
}

// Choice Boards Tab
class ChoiceBoardsTab extends ConsumerStatefulWidget {
  const ChoiceBoardsTab({super.key});

  @override
  ConsumerState<ChoiceBoardsTab> createState() => _ChoiceBoardsTabState();
}

class _ChoiceBoardsTabState extends ConsumerState<ChoiceBoardsTab> {
  ChoiceBoard? _selectedBoard;
  final List<String> _selectedChoices = [];
  final TextEditingController _nameController = TextEditingController();
  bool _showCreateForm = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final boardsAsync = ref.watch(choiceBoardsProvider);

    return boardsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (boards) {
        if (_showCreateForm) {
          return _buildCreateForm();
        }

        if (_selectedBoard == null && boards.isNotEmpty) {
          _selectedBoard = boards.first;
        }

        return Column(
          children: [
            // Board Selector
            Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButton<ChoiceBoard>(
                      value: _selectedBoard,
                      isExpanded: true,
                      hint: const Text('Select Choice Board'),
                      items: boards.map((board) {
                        return DropdownMenuItem(
                          value: board,
                          child: Text(board.name),
                        );
                      }).toList(),
                      onChanged: (board) {
                        setState(() {
                          _selectedBoard = board;
                          _selectedChoices.clear();
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () {
                      setState(() {
                        _showCreateForm = true;
                      });
                    },
                  ),
                ],
              ),
            ),

            if (_selectedBoard != null) ...[
              // Selection Display
              if (_selectedChoices.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Theme.of(context).colorScheme.primaryContainer,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Selected: ${_selectedChoices.join(", ")}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _selectedChoices.clear();
                              });
                            },
                            child: const Text('Clear'),
                          ),
                          const SizedBox(width: 8),
                          FilledButton(
                            onPressed: () async {
                              await _saveSelection();
                            },
                            child: const Text('Confirm'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              // Choices Grid
              Expanded(
                child: _buildChoicesGrid(_selectedBoard!),
              ),
            ] else
              const Expanded(
                child: Center(
                  child: Text('No choice boards available. Create one to get started.'),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildChoicesGrid(ChoiceBoard board) {
    final choices = board.choices;

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.2,
      ),
      itemCount: choices.length,
      itemBuilder: (context, index) {
        final choice = choices[index];
        final isSelected = _selectedChoices.contains(choice.label);
        return _buildChoiceCard(choice, isSelected);
      },
    );
  }

  Widget _buildChoiceCard(Choice choice, bool isSelected) {
    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            _selectedChoices.remove(choice.label);
          } else {
            if (!_selectedBoard!.allowMultiple) {
              _selectedChoices.clear();
            }
            if (_selectedChoices.length < _selectedBoard!.maxSelections) {
              _selectedChoices.add(choice.label);
            }
          }
        });
      },
      child: Container(
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primaryContainer
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.outline,
            width: isSelected ? 3 : 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.category,
              size: 48,
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                choice.label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: isSelected
                          ? Theme.of(context).colorScheme.onPrimaryContainer
                          : null,
                    ),
              ),
            ),
            if (choice.timesSelected > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${choice.timesSelected}×',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateForm() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create New Choice Board',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Board Name',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              FilledButton(
                onPressed: () async {
                  await _createBoard();
                },
                child: const Text('Create'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  setState(() {
                    _showCreateForm = false;
                    _nameController.clear();
                  });
                },
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _createBoard() async {
    if (_nameController.text.isEmpty) return;

    try {
      final service = ref.read(communicationServiceProvider);
      await service.createChoiceBoard(
        userId: 'user123',
        name: _nameController.text,
        type: ChoiceBoardType.custom,
      );
      ref.invalidate(choiceBoardsProvider);
      setState(() {
        _showCreateForm = false;
        _nameController.clear();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create board: $e')),
        );
      }
    }
  }

  Future<void> _saveSelection() async {
    if (_selectedBoard == null || _selectedChoices.isEmpty) return;

    try {
      final service = ref.read(communicationServiceProvider);
      await service.recordSelection(
        userId: 'user123',
        boardId: _selectedBoard!.id,
        choiceIds: [],
      );
      setState(() {
        _selectedChoices.clear();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selection saved!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save selection: $e')),
        );
      }
    }
  }
}

// Communication Templates Tab
class CommunicationTemplatesTab extends ConsumerStatefulWidget {
  const CommunicationTemplatesTab({super.key});

  @override
  ConsumerState<CommunicationTemplatesTab> createState() =>
      _CommunicationTemplatesTabState();
}

class _CommunicationTemplatesTabState
    extends ConsumerState<CommunicationTemplatesTab> {
  CommunicationTemplate? _selectedTemplate;
  final Map<String, String> _fieldValues = {};
  TemplateCategory? _filterCategory;

  @override
  Widget build(BuildContext context) {
    final templatesAsync = ref.watch(communicationTemplatesProvider);

    return templatesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (templates) {
        final filteredTemplates = _filterCategory != null
            ? templates.where((t) => t.category == _filterCategory).toList()
            : templates;

        if (_selectedTemplate != null) {
          return _buildTemplateComposer(_selectedTemplate!);
        }

        return Column(
          children: [
            // Category Filter
            Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All'),
                      selected: _filterCategory == null,
                      onSelected: (selected) {
                        setState(() {
                          _filterCategory = null;
                        });
                      },
                    ),
                    const SizedBox(width: 8),
                    ...TemplateCategory.values.map((category) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(category.name),
                          selected: _filterCategory == category,
                          onSelected: (selected) {
                            setState(() {
                              _filterCategory = selected ? category : null;
                            });
                          },
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),

            // Templates List
            Expanded(
              child: filteredTemplates.isEmpty
                  ? const Center(
                      child: Text('No templates available'),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filteredTemplates.length,
                      itemBuilder: (context, index) {
                        final template = filteredTemplates[index];
                        return _buildTemplateCard(template);
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTemplateCard(CommunicationTemplate template) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          child: Icon(_getCategoryIcon(template.category)),
        ),
        title: Text(template.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(template.template),
            const SizedBox(height: 4),
            Row(
              children: [
                Chip(
                  label: Text(template.category.name),
                  labelStyle: const TextStyle(fontSize: 12),
                  padding: EdgeInsets.zero,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                if (template.timesUsed > 0) ...[
                  const SizedBox(width: 8),
                  Text(
                    'Used ${template.timesUsed}×',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward),
        onTap: () {
          setState(() {
            _selectedTemplate = template;
            _fieldValues.clear();
          });
        },
      ),
    );
  }

  Widget _buildTemplateComposer(CommunicationTemplate template) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  setState(() {
                    _selectedTemplate = null;
                    _fieldValues.clear();
                  });
                },
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      template.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      template.category.name,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Form Fields
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ...template.fields.map((field) => _buildField(field)),
              const SizedBox(height: 16),
              // Preview
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Preview',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _composeMessage(template),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () async {
                  await _sendMessage(template);
                },
                icon: const Icon(Icons.send),
                label: const Text('Send Message'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildField(TemplateField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: field.type == 'dropdown'
          ? DropdownButtonFormField<String>(
              decoration: InputDecoration(
                labelText: field.label,
                border: const OutlineInputBorder(),
              ),
              initialValue: _fieldValues[field.id],
              items: field.options.map((option) {
                return DropdownMenuItem(
                  value: option,
                  child: Text(option),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _fieldValues[field.id] = value ?? '';
                });
              },
            )
          : TextField(
              decoration: InputDecoration(
                labelText: field.label,
                border: const OutlineInputBorder(),
              ),
              onChanged: (value) {
                setState(() {
                  _fieldValues[field.id] = value;
                });
              },
            ),
    );
  }

  String _composeMessage(CommunicationTemplate template) {
    String message = template.template;
    template.fields.forEach((field) {
      final value = _fieldValues[field.id] ?? field.defaultValue ?? '';
      message = message.replaceAll('{${field.id}}', value);
    });
    return message;
  }

  IconData _getCategoryIcon(TemplateCategory category) {
    switch (category) {
      case TemplateCategory.greeting:
        return Icons.waving_hand;
      case TemplateCategory.request:
        return Icons.help;
      case TemplateCategory.question:
        return Icons.question_answer;
      case TemplateCategory.feeling:
        return Icons.mood;
      case TemplateCategory.emergency:
        return Icons.warning;
      case TemplateCategory.social:
        return Icons.people;
      default:
        return Icons.message;
    }
  }

  Future<void> _sendMessage(CommunicationTemplate template) async {
    try {
      final service = ref.read(communicationServiceProvider);
      await service.composeMessage(
        userId: 'user123',
        templateId: template.id,
        fieldValues: _fieldValues,
      );
      setState(() {
        _selectedTemplate = null;
        _fieldValues.clear();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Message sent!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    }
  }
}
