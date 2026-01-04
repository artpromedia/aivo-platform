/// Writing editor widget with scaffolding support
library;

import 'dart:async';
import 'package:flutter/material.dart';
import '../writing_models.dart';
import '../writing_service.dart';

/// Writing editor with guided scaffolding and real-time metrics
class WritingEditorWidget extends StatefulWidget {
  final WritingPrompt prompt;
  final WritingSession? initialSession;
  final WritingService? service;
  final bool showMetrics;
  final bool showWordBank;
  final bool enableAutoSave;
  final Duration autoSaveInterval;
  final void Function(WritingSession session)? onSave;
  final void Function(WritingSession session)? onSubmit;

  const WritingEditorWidget({
    super.key,
    required this.prompt,
    this.initialSession,
    this.service,
    this.showMetrics = true,
    this.showWordBank = true,
    this.enableAutoSave = true,
    this.autoSaveInterval = const Duration(seconds: 30),
    this.onSave,
    this.onSubmit,
  });

  @override
  State<WritingEditorWidget> createState() => _WritingEditorWidgetState();
}

class _WritingEditorWidgetState extends State<WritingEditorWidget> {
  late TextEditingController _controller;
  late Map<String, TextEditingController> _scaffoldControllers;
  late WritingSession _session;
  Timer? _autoSaveTimer;
  Timer? _metricsTimer;
  WritingMetrics _metrics = const WritingMetrics();
  List<WordBankItem> _wordBank = [];
  bool _isSubmitting = false;
  bool _showScaffolds = true;
  final Stopwatch _writingTime = Stopwatch();
  DateTime? _lastKeyPress;
  int _pauseCount = 0;
  Duration _totalPauseTime = Duration.zero;

  @override
  void initState() {
    super.initState();
    _initSession();
    _loadWordBank();
    _writingTime.start();

    if (widget.enableAutoSave) {
      _autoSaveTimer = Timer.periodic(widget.autoSaveInterval, (_) => _save());
    }

    _metricsTimer = Timer.periodic(const Duration(seconds: 2), (_) => _updateMetrics());
  }

  void _initSession() {
    _session = widget.initialSession ?? WritingSession(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      promptId: widget.prompt.id,
      studentId: '',
      startedAt: DateTime.now(),
      metrics: const WritingMetrics(),
    );

    _controller = TextEditingController(text: _session.content);
    _controller.addListener(_onTextChanged);

    _scaffoldControllers = {};
    if (widget.prompt.scaffolds != null) {
      for (final scaffold in widget.prompt.scaffolds!) {
        _scaffoldControllers[scaffold.id] = TextEditingController(
          text: _session.scaffoldResponses[scaffold.id] ?? '',
        );
      }
    }
  }

  void _loadWordBank() async {
    if (widget.prompt.vocabularyWords != null) {
      setState(() {
        _wordBank = widget.prompt.vocabularyWords!.map((w) => WordBankItem(word: w)).toList();
      });
    }
  }

  void _onTextChanged() {
    final now = DateTime.now();
    if (_lastKeyPress != null) {
      final pauseTime = now.difference(_lastKeyPress!);
      if (pauseTime > const Duration(seconds: 5)) {
        _pauseCount++;
        _totalPauseTime += pauseTime;
      }
    }
    _lastKeyPress = now;

    // Check for used vocabulary words
    final text = _controller.text.toLowerCase();
    setState(() {
      _wordBank = _wordBank.map((item) {
        return item.copyWith(isUsed: text.contains(item.word.toLowerCase()));
      }).toList();
    });
  }

  void _updateMetrics() {
    final text = _getFullText();
    if (widget.service != null) {
      setState(() {
        _metrics = widget.service!.analyzeText(text).copyWith(
          writingTime: _writingTime.elapsed,
          pauseCount: _pauseCount,
          totalPauseTime: _totalPauseTime,
        );
      });
    }
  }

  String _getFullText() {
    if (widget.prompt.scaffolds != null && widget.prompt.scaffolds!.isNotEmpty) {
      return _scaffoldControllers.entries.map((e) => e.value.text).join('\n\n');
    }
    return _controller.text;
  }

  void _save() {
    final scaffoldResponses = <String, String>{};
    for (final entry in _scaffoldControllers.entries) {
      scaffoldResponses[entry.key] = entry.value.text;
    }

    _session = _session.copyWith(
      content: _controller.text,
      scaffoldResponses: scaffoldResponses,
      metrics: _metrics,
    );

    widget.onSave?.call(_session);
    widget.service?.saveProgress(_session);
  }

  void _submit() async {
    if (_isSubmitting) return;

    setState(() {
      _isSubmitting = true;
    });

    _save();
    _writingTime.stop();

    final submittedSession = _session.copyWith(
      submittedAt: DateTime.now(),
    );

    widget.onSubmit?.call(submittedSession);

    setState(() {
      _isSubmitting = false;
    });
  }

  void _insertWord(String word) {
    final text = _controller.text;
    final selection = _controller.selection;
    final newText = text.replaceRange(selection.start, selection.end, '$word ');
    _controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: selection.start + word.length + 1),
    );
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    _metricsTimer?.cancel();
    _controller.dispose();
    for (final controller in _scaffoldControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Prompt
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.prompt.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                widget.prompt.prompt,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (widget.prompt.minWords != null || widget.prompt.maxWords != null) ...[
                const SizedBox(height: 8),
                Text(
                  _getWordCountRequirement(),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.7),
                  ),
                ),
              ],
            ],
          ),
        ),

        // Metrics bar
        if (widget.showMetrics)
          _buildMetricsBar(),

        // Editor
        Expanded(
          child: Row(
            children: [
              // Main writing area
              Expanded(
                flex: 3,
                child: _buildEditor(),
              ),

              // Word bank sidebar
              if (widget.showWordBank && _wordBank.isNotEmpty)
                SizedBox(
                  width: 200,
                  child: _buildWordBank(),
                ),
            ],
          ),
        ),

        // Action bar
        _buildActionBar(),
      ],
    );
  }

  String _getWordCountRequirement() {
    if (widget.prompt.minWords != null && widget.prompt.maxWords != null) {
      return 'Write ${widget.prompt.minWords}-${widget.prompt.maxWords} words';
    } else if (widget.prompt.minWords != null) {
      return 'Write at least ${widget.prompt.minWords} words';
    } else if (widget.prompt.maxWords != null) {
      return 'Write up to ${widget.prompt.maxWords} words';
    }
    return '';
  }

  Widget _buildMetricsBar() {
    final meetsMinWords = widget.prompt.minWords == null ||
        _metrics.wordCount >= widget.prompt.minWords!;
    final meetsMaxWords = widget.prompt.maxWords == null ||
        _metrics.wordCount <= widget.prompt.maxWords!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildMetricItem(
            Icons.text_fields,
            'Words',
            '${_metrics.wordCount}',
            color: meetsMinWords && meetsMaxWords ? Colors.green : Colors.orange,
          ),
          _buildMetricItem(
            Icons.format_list_numbered,
            'Sentences',
            '${_metrics.sentenceCount}',
          ),
          _buildMetricItem(
            Icons.timer,
            'Time',
            _formatDuration(_metrics.writingTime),
          ),
          _buildMetricItem(
            Icons.stars,
            'Unique',
            '${_metrics.uniqueWords}',
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(IconData icon, String label, String value, {Color? color}) {
    return Column(
      children: [
        Icon(icon, size: 16, color: color ?? Colors.grey[600]),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey[600]),
        ),
      ],
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes}:${seconds.toString().padLeft(2, '0')}';
  }

  Widget _buildEditor() {
    if (widget.prompt.scaffolds != null && widget.prompt.scaffolds!.isNotEmpty) {
      return _buildScaffoldedEditor();
    }
    return _buildFreeEditor();
  }

  Widget _buildScaffoldedEditor() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Toggle scaffolds
        Row(
          children: [
            Switch(
              value: _showScaffolds,
              onChanged: (value) => setState(() => _showScaffolds = value),
            ),
            Text(_showScaffolds ? 'Guided mode' : 'Free write mode'),
          ],
        ),
        const SizedBox(height: 16),

        if (_showScaffolds)
          ...widget.prompt.scaffolds!.map((scaffold) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  scaffold.label,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _scaffoldControllers[scaffold.id],
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: scaffold.placeholder,
                    border: const OutlineInputBorder(),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                ),
              ],
            ),
          ))
        else
          _buildFreeEditor(),
      ],
    );
  }

  Widget _buildFreeEditor() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _controller,
        maxLines: null,
        expands: true,
        textAlignVertical: TextAlignVertical.top,
        decoration: const InputDecoration(
          hintText: 'Start writing here...',
          border: OutlineInputBorder(),
          filled: true,
          fillColor: Colors.white,
        ),
        style: const TextStyle(fontSize: 16, height: 1.5),
      ),
    );
  }

  Widget _buildWordBank() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(left: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              'Word Bank',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: _wordBank.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => _insertWord(item.word),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: item.isUsed ? Colors.green[100] : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: item.isUsed ? Colors.green : Colors.grey[300]!,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (item.isUsed)
                              const Icon(Icons.check, size: 14, color: Colors.green),
                            const SizedBox(width: 4),
                            Text(
                              item.word,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                decoration: item.isUsed
                                    ? TextDecoration.lineThrough
                                    : null,
                              ),
                            ),
                          ],
                        ),
                        if (item.definition != null)
                          Text(
                            item.definition!,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[600],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              )).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBar() {
    final meetsRequirements = (widget.prompt.minWords == null ||
        _metrics.wordCount >= widget.prompt.minWords!);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          OutlinedButton.icon(
            onPressed: _save,
            icon: const Icon(Icons.save),
            label: const Text('Save Draft'),
          ),
          const SizedBox(width: 12),
          ElevatedButton.icon(
            onPressed: meetsRequirements && !_isSubmitting ? _submit : null,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
            label: Text(_isSubmitting ? 'Submitting...' : 'Submit'),
          ),
        ],
      ),
    );
  }
}
