/// Word Prediction Widget
///
/// Assists learners with writing by:
/// - Predicting next words based on context
/// - Offering spelling suggestions
/// - Providing sentence starters
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/environment.dart';
import '../../../pin/pin_storage.dart';
import '../reading_tools_models.dart';
import '../reading_tools_service.dart';

/// Word Prediction Widget
class WordPredictionWidget extends ConsumerStatefulWidget {
  const WordPredictionWidget({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<WordPredictionWidget> createState() =>
      _WordPredictionWidgetState();
}

class _WordPredictionWidgetState extends ConsumerState<WordPredictionWidget> {
  final TextEditingController _textController = TextEditingController();
  List<WordPrediction> _predictions = [];
  bool _isLoadingPredictions = false;
  ReadingToolsService? _readingToolsService;
  String _cachedToken = '';

  // Sentence starters for different contexts
  final List<Map<String, dynamic>> _sentenceStarters = [
    {
      'category': 'Opinion',
      'icon': Icons.lightbulb,
      'color': Colors.amber,
      'starters': [
        'I think that...',
        'In my opinion...',
        'I believe...',
        'From my perspective...',
      ],
    },
    {
      'category': 'Narrative',
      'icon': Icons.auto_stories,
      'color': Colors.purple,
      'starters': [
        'Once upon a time...',
        'One day...',
        'It all started when...',
        'In the beginning...',
      ],
    },
    {
      'category': 'Compare',
      'icon': Icons.compare_arrows,
      'color': Colors.blue,
      'starters': [
        'Similarly...',
        'On the other hand...',
        'In contrast...',
        'Both... and...',
      ],
    },
    {
      'category': 'Explain',
      'icon': Icons.school,
      'color': AivoBrand.success,
      'starters': [
        'For example...',
        'This means that...',
        'As a result...',
        'The reason is...',
      ],
    },
    {
      'category': 'Conclude',
      'icon': Icons.flag,
      'color': AivoBrand.error,
      'starters': [
        'In conclusion...',
        'To sum up...',
        'Finally...',
        'Overall...',
      ],
    },
  ];

  @override
  void initState() {
    super.initState();
    _initializeService();
    _textController.addListener(_onTextChanged);
  }

  Future<void> _initializeService() async {
    // Get auth token from storage for API calls
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';
    
    _readingToolsService = ReadingToolsService(
      baseUrl: EnvironmentConfig.readingToolsBaseUrl,
      learnerId: widget.learnerId,
      getAuthToken: () => _cachedToken,
    );
  }

  @override
  void dispose() {
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    _generatePredictions();
  }

  Future<void> _generatePredictions() async {
    final text = _textController.text;
    if (text.isEmpty) {
      setState(() => _predictions = []);
      return;
    }

    setState(() => _isLoadingPredictions = true);

    // Use mock predictions in development mode when explicitly enabled
    if (EnvironmentConfig.useReadingMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      final words = text.split(RegExp(r'\s+'));
      final lastWord = words.isNotEmpty ? words.last.toLowerCase() : '';
      final mockPredictions = _getMockPredictions(lastWord, text);
      setState(() {
        _predictions = mockPredictions;
        _isLoadingPredictions = false;
      });
      return;
    }

    // Call real AI prediction service
    try {
      if (_readingToolsService == null) return;
      final predictions = await _readingToolsService!.getWordPredictions(text);
      if (mounted) {
        setState(() {
          _predictions = predictions;
          _isLoadingPredictions = false;
        });
      }
    } catch (e) {
      // Fallback to mock on error to maintain UX
      debugPrint('Word prediction error, falling back to mock: $e');
      final words = text.split(RegExp(r'\s+'));
      final lastWord = words.isNotEmpty ? words.last.toLowerCase() : '';
      final mockPredictions = _getMockPredictions(lastWord, text);
      if (mounted) {
        setState(() {
          _predictions = mockPredictions;
          _isLoadingPredictions = false;
        });
      }
    }
  }

  List<WordPrediction> _getMockPredictions(String lastWord, String context) {
    // Simple mock prediction logic
    final Map<String, List<String>> predictionMap = {
      'the': ['quick', 'big', 'small', 'happy', 'important'],
      'a': ['great', 'new', 'good', 'simple', 'complex'],
      'is': ['very', 'not', 'always', 'often', 'usually'],
      'to': ['be', 'go', 'see', 'do', 'make'],
      'i': ['think', 'believe', 'want', 'need', 'feel'],
      'because': ['it', 'the', 'this', 'that', 'they'],
      'and': ['the', 'then', 'also', 'so', 'but'],
    };

    final suggestions = predictionMap[lastWord] ??
        ['the', 'and', 'is', 'to', 'a'];

    return suggestions.map((word) {
      return WordPrediction(
        word: word,
        confidence: 0.9 - (suggestions.indexOf(word) * 0.1),
      );
    }).toList();
  }

  void _insertPrediction(String word) {
    final text = _textController.text;
    final newText = text.isEmpty ? word : '$text $word';
    _textController.text = newText;
    _textController.selection = TextSelection.collapsed(offset: newText.length);
  }

  void _insertStarter(String starter) {
    _textController.text = starter;
    _textController.selection =
        TextSelection.collapsed(offset: starter.length);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Writing area
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.edit_note, color: colorScheme.primary),
                            const SizedBox(width: 8),
                            Text(
                              'Write with Help',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _textController,
                          maxLines: 8,
                          decoration: InputDecoration(
                            hintText: 'Start typing here...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Word count
                        Text(
                          '${_textController.text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length} words',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Word Predictions
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.auto_awesome, color: colorScheme.primary),
                            const SizedBox(width: 8),
                            Text(
                              'Word Suggestions',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (_isLoadingPredictions) ...[
                              const SizedBox(width: 8),
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_predictions.isEmpty)
                          Text(
                            'Start typing to see word suggestions',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          )
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _predictions.map((prediction) {
                              return ActionChip(
                                label: Text(prediction.word),
                                avatar: CircleAvatar(
                                  radius: 10,
                                  backgroundColor: colorScheme.primaryContainer,
                                  child: Text(
                                    '${(prediction.confidence * 100).round()}',
                                    style: const TextStyle(fontSize: 8),
                                  ),
                                ),
                                onPressed: () => _insertPrediction(prediction.word),
                              );
                            }).toList(),
                          ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Sentence Starters
                Text(
                  'Sentence Starters',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),

                ..._sentenceStarters.map((category) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ExpansionTile(
                      leading: CircleAvatar(
                        backgroundColor:
                            (category['color'] as Color).withValues(alpha: 0.2),
                        child: Icon(
                          category['icon'] as IconData,
                          color: category['color'] as Color,
                          size: 20,
                        ),
                      ),
                      title: Text(
                        category['category'] as String,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children:
                                (category['starters'] as List<String>).map((starter) {
                              return ActionChip(
                                label: Text(starter),
                                onPressed: () => _insertStarter(starter),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),

        // Bottom action bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            border: Border(
              top: BorderSide(color: colorScheme.outlineVariant),
            ),
          ),
          child: Row(
            children: [
              OutlinedButton.icon(
                onPressed: () => _textController.clear(),
                icon: const Icon(Icons.clear),
                label: const Text('Clear'),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: _textController.text.isNotEmpty ? () {} : null,
                icon: const Icon(Icons.check),
                label: const Text('Done'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
