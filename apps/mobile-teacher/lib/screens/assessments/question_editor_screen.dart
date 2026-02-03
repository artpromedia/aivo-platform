/// Question Editor Screen
///
/// Add or edit a question with type-specific editing UI.
/// Supports all question types: multiple choice, true/false, short answer,
/// essay, fill-in-blank, matching, ordering, and numeric.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../models/assessment.dart';
import 'question_types/multiple_choice_editor.dart';
import 'question_types/true_false_editor.dart';
import 'question_types/short_answer_editor.dart';
import 'question_types/essay_editor.dart';
import 'question_types/matching_editor.dart';
import 'question_types/fill_in_blank_editor.dart';

/// Screen for creating/editing a question
class QuestionEditorScreen extends ConsumerStatefulWidget {
  const QuestionEditorScreen({
    this.question,
    required this.questionType,
    required this.questionIndex,
    super.key,
  });

  final Question? question;
  final QuestionType questionType;
  final int questionIndex;

  bool get isEditing => question != null;

  @override
  ConsumerState<QuestionEditorScreen> createState() =>
      _QuestionEditorScreenState();
}

class _QuestionEditorScreenState extends ConsumerState<QuestionEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _questionTextController = TextEditingController();
  final _hintController = TextEditingController();
  final _explanationController = TextEditingController();

  late QuestionType _selectedType;
  late int _points;
  late Difficulty _difficulty;
  bool _hasChanges = false;

  // Type-specific data
  List<QuestionOption> _options = [];
  List<MatchingPair> _matchingPairs = [];
  List<FillBlankSlot> _fillBlankSlots = [];
  List<String> _acceptedAnswers = [];
  dynamic _correctAnswer; // For true/false, short answer, numeric

  @override
  void initState() {
    super.initState();
    _initializeFromQuestion();
  }

  void _initializeFromQuestion() {
    final q = widget.question;
    if (q != null) {
      _questionTextController.text = q.stem;
      _hintController.text = q.hint ?? '';
      _explanationController.text = q.explanation ?? '';
      _selectedType = q.type;
      _points = q.points;
      _difficulty = q.difficulty;
      _options = List.from(q.options ?? []);
      _matchingPairs = List.from(q.pairs ?? []);
      _fillBlankSlots = List.from(q.blanks ?? []);
      _acceptedAnswers = q.correctAnswer is List
          ? List<String>.from(q.correctAnswer as List)
          : [];
      _correctAnswer = q.correctAnswer;
    } else {
      _selectedType = widget.questionType;
      _points = 1;
      _difficulty = Difficulty.medium;
      _initializeTypeDefaults();
    }
  }

  void _initializeTypeDefaults() {
    switch (_selectedType) {
      case QuestionType.multipleChoice:
      case QuestionType.multipleSelect:
        _options = [
          QuestionOption(id: const Uuid().v4(), text: '', isCorrect: false),
          QuestionOption(id: const Uuid().v4(), text: '', isCorrect: false),
        ];
        break;
      case QuestionType.trueFalse:
        _correctAnswer = true;
        break;
      case QuestionType.matching:
        _matchingPairs = [
          MatchingPair(id: const Uuid().v4(), left: '', right: ''),
        ];
        break;
      case QuestionType.fillBlank:
        _fillBlankSlots = [];
        break;
      case QuestionType.numeric:
        _correctAnswer = null;
        break;
      default:
        break;
    }
  }

  @override
  void dispose() {
    _questionTextController.dispose();
    _hintController.dispose();
    _explanationController.dispose();
    super.dispose();
  }

  void _markChanged() {
    if (!_hasChanges) {
      setState(() => _hasChanges = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () => _onWillPop(),
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing
              ? 'Edit Question ${widget.questionIndex + 1}'
              : 'Add Question'),
          actions: [
            if (_hasChanges)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Unsaved',
                      style: TextStyle(
                        color: Colors.orange,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _saveQuestion,
              tooltip: 'Save',
            ),
          ],
        ),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Question type selector
                _buildTypeSelector(context),
                const SizedBox(height: 16),

                // Question text
                _buildQuestionTextCard(context),
                const SizedBox(height: 16),

                // Type-specific editor
                _buildTypeSpecificEditor(context),
                const SizedBox(height: 16),

                // Settings card
                _buildSettingsCard(context),
                const SizedBox(height: 16),

                // Optional fields
                _buildOptionalFieldsCard(context),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _saveQuestion,
          icon: const Icon(Icons.save),
          label: const Text('Save Question'),
        ),
      ),
    );
  }

  Widget _buildTypeSelector(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Question Type',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: QuestionType.values.map((type) {
                  final isSelected = _selectedType == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      avatar: Icon(
                        _getQuestionTypeIcon(type),
                        size: 18,
                        color: isSelected ? Colors.white : null,
                      ),
                      label: Text(type.label),
                      selected: isSelected,
                      onSelected: widget.isEditing
                          ? null // Can't change type when editing
                          : (selected) {
                              if (selected) {
                                setState(() {
                                  _selectedType = type;
                                  _initializeTypeDefaults();
                                });
                                _markChanged();
                              }
                            },
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionTextCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.help_outline,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Question',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _questionTextController,
              decoration: const InputDecoration(
                labelText: 'Question Text *',
                hintText: 'Enter your question...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 3,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a question';
                }
                return null;
              },
              onChanged: (_) => _markChanged(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeSpecificEditor(BuildContext context) {
    switch (_selectedType) {
      case QuestionType.multipleChoice:
        return MultipleChoiceEditor(
          options: _options,
          allowMultiple: false,
          onOptionsChanged: (options) {
            setState(() => _options = options);
            _markChanged();
          },
        );
      case QuestionType.multipleSelect:
        return MultipleChoiceEditor(
          options: _options,
          allowMultiple: true,
          onOptionsChanged: (options) {
            setState(() => _options = options);
            _markChanged();
          },
        );
      case QuestionType.trueFalse:
        return TrueFalseEditor(
          correctAnswer: _correctAnswer == true,
          onAnswerChanged: (value) {
            setState(() => _correctAnswer = value);
            _markChanged();
          },
        );
      case QuestionType.shortAnswer:
        return ShortAnswerEditor(
          acceptedAnswers: _acceptedAnswers,
          onAnswersChanged: (answers) {
            setState(() => _acceptedAnswers = answers);
            _markChanged();
          },
        );
      case QuestionType.essay:
        return EssayEditor(
          hint: _hintController.text,
          onHintChanged: (hint) {
            _hintController.text = hint;
            _markChanged();
          },
        );
      case QuestionType.fillBlank:
        return FillInBlankEditor(
          questionText: _questionTextController.text,
          slots: _fillBlankSlots,
          onTextChanged: (text) {
            _questionTextController.text = text;
            _markChanged();
          },
          onSlotsChanged: (slots) {
            setState(() => _fillBlankSlots = slots);
            _markChanged();
          },
        );
      case QuestionType.matching:
        return MatchingEditor(
          pairs: _matchingPairs,
          onPairsChanged: (pairs) {
            setState(() => _matchingPairs = pairs);
            _markChanged();
          },
        );
      case QuestionType.ordering:
        return _buildOrderingEditor(context);
      case QuestionType.numeric:
        return _buildNumericEditor(context);
    }
  }

  Widget _buildOrderingEditor(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.format_list_numbered,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Items to Order',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Add items in the correct order. Students will need to arrange them.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
            const SizedBox(height: 16),
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _options.length,
              onReorder: (oldIndex, newIndex) {
                setState(() {
                  if (newIndex > oldIndex) newIndex--;
                  final item = _options.removeAt(oldIndex);
                  _options.insert(newIndex, item);
                });
                _markChanged();
              },
              itemBuilder: (context, index) {
                return Padding(
                  key: ValueKey(_options[index].id),
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        child: Text('${index + 1}'),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          initialValue: _options[index].text,
                          decoration: InputDecoration(
                            hintText: 'Item ${index + 1}',
                            border: const OutlineInputBorder(),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                          onChanged: (value) {
                            _options[index] = _options[index].copyWith(text: value);
                            _markChanged();
                          },
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: _options.length > 2
                            ? () {
                                setState(() => _options.removeAt(index));
                                _markChanged();
                              }
                            : null,
                      ),
                      const Icon(Icons.drag_handle),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () {
                setState(() {
                  _options.add(QuestionOption(
                    id: const Uuid().v4(),
                    text: '',
                    isCorrect: true,
                  ));
                });
                _markChanged();
              },
              icon: const Icon(Icons.add),
              label: const Text('Add Item'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNumericEditor(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.numbers,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Numeric Answer',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    initialValue: _correctAnswer?.toString() ?? '',
                    decoration: const InputDecoration(
                      labelText: 'Correct Answer *',
                      hintText: 'e.g., 42',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Invalid number';
                      }
                      return null;
                    },
                    onChanged: (value) {
                      _correctAnswer = double.tryParse(value);
                      _markChanged();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.settings,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Question Settings',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Points
            Row(
              children: [
                const Text('Points: '),
                const SizedBox(width: 8),
                Expanded(
                  child: Slider(
                    value: _points.toDouble(),
                    min: 1,
                    max: 10,
                    divisions: 9,
                    label: _points.toString(),
                    onChanged: (value) {
                      setState(() => _points = value.round());
                      _markChanged();
                    },
                  ),
                ),
                SizedBox(
                  width: 50,
                  child: Text(
                    _points.toString(),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Difficulty
            Row(
              children: [
                const Text('Difficulty: '),
                const SizedBox(width: 8),
                SegmentedButton<Difficulty>(
                  segments: Difficulty.values.map((d) {
                    return ButtonSegment(
                      value: d,
                      label: Text(d.name[0].toUpperCase() + d.name.substring(1)),
                    );
                  }).toList(),
                  selected: {_difficulty},
                  onSelectionChanged: (selection) {
                    setState(() => _difficulty = selection.first);
                    _markChanged();
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptionalFieldsCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.more_horiz,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Optional Fields',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Hint
            TextFormField(
              controller: _hintController,
              decoration: const InputDecoration(
                labelText: 'Hint (shown to students)',
                hintText: 'Optional hint...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              onChanged: (_) => _markChanged(),
            ),
            const SizedBox(height: 16),

            // Explanation
            TextFormField(
              controller: _explanationController,
              decoration: const InputDecoration(
                labelText: 'Explanation (shown after answer)',
                hintText: 'Explain the correct answer...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              onChanged: (_) => _markChanged(),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _onWillPop() async {
    if (!_hasChanges) return true;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard Changes?'),
        content: const Text('You have unsaved changes. Are you sure you want to go back?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Discard'),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  void _saveQuestion() {
    if (!_formKey.currentState!.validate()) return;

    // Validate type-specific requirements
    final validationError = _validateTypeSpecific();
    if (validationError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(validationError),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final question = Question(
      id: widget.question?.id ?? const Uuid().v4(),
      stem: _questionTextController.text,
      type: _selectedType,
      points: _points,
      difficulty: _difficulty,
      hint: _hintController.text.isEmpty ? null : _hintController.text,
      explanation: _explanationController.text.isEmpty
          ? null
          : _explanationController.text,
      options: _options.isEmpty ? null : _options,
      pairs: _matchingPairs.isEmpty ? null : _matchingPairs,
      blanks: _fillBlankSlots.isEmpty ? null : _fillBlankSlots,
      correctAnswer: _getCorrectAnswer(),
    );

    Navigator.pop(context, question);
  }

  dynamic _getCorrectAnswer() {
    switch (_selectedType) {
      case QuestionType.trueFalse:
        return _correctAnswer;
      case QuestionType.shortAnswer:
      case QuestionType.essay:
        return _acceptedAnswers.isNotEmpty ? _acceptedAnswers : null;
      case QuestionType.numeric:
        return _correctAnswer;
      default:
        return null;
    }
  }

  String? _validateTypeSpecific() {
    switch (_selectedType) {
      case QuestionType.multipleChoice:
        if (_options.where((o) => o.text.isNotEmpty).length < 2) {
          return 'Please add at least 2 options';
        }
        if (!_options.any((o) => o.isCorrect)) {
          return 'Please mark a correct answer';
        }
        break;
      case QuestionType.multipleSelect:
        if (_options.where((o) => o.text.isNotEmpty).length < 2) {
          return 'Please add at least 2 options';
        }
        if (!_options.any((o) => o.isCorrect)) {
          return 'Please mark at least one correct answer';
        }
        break;
      case QuestionType.shortAnswer:
        if (_acceptedAnswers.isEmpty ||
            _acceptedAnswers.every((a) => a.isEmpty)) {
          return 'Please add at least one accepted answer';
        }
        break;
      case QuestionType.matching:
        if (_matchingPairs.length < 2) {
          return 'Please add at least 2 matching pairs';
        }
        if (_matchingPairs.any((p) => p.left.isEmpty || p.right.isEmpty)) {
          return 'Please fill in all matching pairs';
        }
        break;
      case QuestionType.ordering:
        if (_options.where((o) => o.text.isNotEmpty).length < 2) {
          return 'Please add at least 2 items to order';
        }
        break;
      case QuestionType.numeric:
        if (_correctAnswer == null) {
          return 'Please enter the correct numeric answer';
        }
        break;
      default:
        break;
    }
    return null;
  }

  IconData _getQuestionTypeIcon(QuestionType type) {
    switch (type) {
      case QuestionType.multipleChoice:
        return Icons.radio_button_checked;
      case QuestionType.multipleSelect:
        return Icons.check_box;
      case QuestionType.trueFalse:
        return Icons.thumbs_up_down;
      case QuestionType.shortAnswer:
        return Icons.short_text;
      case QuestionType.essay:
        return Icons.article;
      case QuestionType.fillBlank:
        return Icons.space_bar;
      case QuestionType.matching:
        return Icons.compare_arrows;
      case QuestionType.ordering:
        return Icons.format_list_numbered;
      case QuestionType.numeric:
        return Icons.numbers;
    }
  }
}
