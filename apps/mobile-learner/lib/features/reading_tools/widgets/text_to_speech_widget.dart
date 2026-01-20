/// Text-to-Speech Widget
///
/// Allows learners to:
/// - Paste or type text to be read aloud
/// - Select from different voices
/// - Adjust reading speed and pitch
/// - Enable text highlighting as it's read
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../reading_tools_models.dart';

/// TTS State
class TTSState {
  final String text;
  final TTSSettings settings;
  final List<TTSVoice> voices;
  final bool isPlaying;
  final bool isPaused;
  final int currentWordIndex;
  final bool isLoading;
  final String? error;

  const TTSState({
    this.text = '',
    required this.settings,
    this.voices = const [],
    this.isPlaying = false,
    this.isPaused = false,
    this.currentWordIndex = -1,
    this.isLoading = true,
    this.error,
  });

  TTSState copyWith({
    String? text,
    TTSSettings? settings,
    List<TTSVoice>? voices,
    bool? isPlaying,
    bool? isPaused,
    int? currentWordIndex,
    bool? isLoading,
    String? error,
  }) {
    return TTSState(
      text: text ?? this.text,
      settings: settings ?? this.settings,
      voices: voices ?? this.voices,
      isPlaying: isPlaying ?? this.isPlaying,
      isPaused: isPaused ?? this.isPaused,
      currentWordIndex: currentWordIndex ?? this.currentWordIndex,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  List<String> get words => text.split(RegExp(r'\s+'));
}

/// Text-to-Speech Widget
class TextToSpeechWidget extends ConsumerStatefulWidget {
  const TextToSpeechWidget({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<TextToSpeechWidget> createState() => _TextToSpeechWidgetState();
}

class _TextToSpeechWidgetState extends ConsumerState<TextToSpeechWidget> {
  final FlutterTts _flutterTts = FlutterTts();
  final TextEditingController _textController = TextEditingController();

  TTSSettings _settings = const TTSSettings(learnerId: '', voiceId: 'default');
  List<Map<String, String>> _systemVoices = [];
  bool _isPlaying = false;
  bool _isPaused = false;
  int _currentWordIndex = -1;
  bool _isLoading = true;

  static const String _sampleText =
      'Welcome to text-to-speech! This tool helps you listen to text being read aloud. '
      'You can adjust the voice, speed, and other settings to make it work best for you.';

  @override
  void initState() {
    super.initState();
    _textController.text = _sampleText;
    _initTts();
  }

  @override
  void dispose() {
    _flutterTts.stop();
    _textController.dispose();
    super.dispose();
  }

  Future<void> _initTts() async {
    await _flutterTts.setSharedInstance(true);

    // Get available voices
    final voices = await _flutterTts.getVoices;
    if (voices != null) {
      _systemVoices = List<Map<String, String>>.from(
        voices.map((v) => Map<String, String>.from(v as Map)),
      );
    }

    // Set up callbacks
    _flutterTts.setStartHandler(() {
      setState(() {
        _isPlaying = true;
        _isPaused = false;
      });
    });

    _flutterTts.setCompletionHandler(() {
      setState(() {
        _isPlaying = false;
        _isPaused = false;
        _currentWordIndex = -1;
      });
    });

    _flutterTts.setPauseHandler(() {
      setState(() => _isPaused = true);
    });

    _flutterTts.setContinueHandler(() {
      setState(() => _isPaused = false);
    });

    _flutterTts.setProgressHandler((text, start, end, word) {
      if (_settings.highlightText) {
        final words = _textController.text.split(RegExp(r'\s+'));
        final textBefore = _textController.text.substring(0, start);
        final wordIndex = textBefore.split(RegExp(r'\s+')).length - 1;
        setState(() => _currentWordIndex = wordIndex);
      }
    });

    // Apply default settings
    await _applySettings();

    setState(() => _isLoading = false);
  }

  Future<void> _applySettings() async {
    await _flutterTts.setSpeechRate(_settings.rate);
    await _flutterTts.setPitch(_settings.pitch);
    await _flutterTts.setVolume(_settings.volume);
  }

  Future<void> _speak() async {
    if (_textController.text.trim().isEmpty) return;

    await _applySettings();
    await _flutterTts.speak(_textController.text);
  }

  Future<void> _pause() async {
    await _flutterTts.pause();
  }

  Future<void> _resume() async {
    // Flutter TTS doesn't have native resume, so we restart
    // In production, we'd track position and restart from there
    await _speak();
  }

  Future<void> _stop() async {
    await _flutterTts.stop();
    setState(() {
      _isPlaying = false;
      _isPaused = false;
      _currentWordIndex = -1;
    });
  }

  void _updateSetting(TTSSettings Function(TTSSettings) update) {
    setState(() {
      _settings = update(_settings);
    });
    _applySettings();
  }

  Widget _buildHighlightedText() {
    if (!_settings.highlightText || _currentWordIndex == -1) {
      return Text(
        _textController.text,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6),
      );
    }

    final words = _textController.text.split(RegExp(r'\s+'));
    return RichText(
      text: TextSpan(
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6),
        children: words.asMap().entries.map((entry) {
          final isHighlighted = entry.key == _currentWordIndex;
          return TextSpan(
            text: '${entry.value}${entry.key < words.length - 1 ? ' ' : ''}',
            style: TextStyle(
              backgroundColor: isHighlighted ? Colors.yellow.shade200 : null,
              fontWeight: isHighlighted ? FontWeight.bold : null,
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading text-to-speech...'),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Text Input Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Text to Read',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _textController,
                    maxLines: 8,
                    enabled: !_isPlaying,
                    decoration: InputDecoration(
                      hintText: 'Paste or type text here...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: _isPlaying
                          ? colorScheme.surfaceContainerHighest
                          : colorScheme.surface,
                    ),
                  ),

                  // Highlighted Preview
                  if (_isPlaying && _settings.highlightText) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Reading Preview:',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildHighlightedText(),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // Playback Controls
                  Row(
                    children: [
                      if (_isPlaying) ...[
                        if (_isPaused)
                          FilledButton.icon(
                            onPressed: _resume,
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Resume'),
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.green,
                            ),
                          )
                        else
                          FilledButton.icon(
                            onPressed: _pause,
                            icon: const Icon(Icons.pause),
                            label: const Text('Pause'),
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.orange,
                            ),
                          ),
                        const SizedBox(width: 8),
                        FilledButton.icon(
                          onPressed: _stop,
                          icon: const Icon(Icons.stop),
                          label: const Text('Stop'),
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.red,
                          ),
                        ),
                      ] else
                        FilledButton.icon(
                          onPressed: _textController.text.trim().isNotEmpty
                              ? _speak
                              : null,
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Start Reading'),
                        ),
                      const Spacer(),
                      TextButton(
                        onPressed: _isPlaying
                            ? null
                            : () => _textController.text = _sampleText,
                        child: const Text('Load Sample'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Voice Settings Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Voice Settings',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Voice Selection
                  if (_systemVoices.isNotEmpty) ...[
                    Text(
                      'Voice',
                      style: theme.textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _settings.voiceId,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: 'default',
                          child: Text('Default Voice'),
                        ),
                        ..._systemVoices.take(10).map((voice) {
                          final name = voice['name'] ?? 'Unknown';
                          final locale = voice['locale'] ?? '';
                          return DropdownMenuItem(
                            value: name,
                            child: Text('$name ($locale)'),
                          );
                        }),
                      ],
                      onChanged: _isPlaying
                          ? null
                          : (value) {
                              if (value != null) {
                                _updateSetting((s) => s.copyWith(voiceId: value));
                              }
                            },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Speed Slider
                  Text(
                    'Speed: ${_settings.rate.toStringAsFixed(1)}x',
                    style: theme.textTheme.labelLarge,
                  ),
                  Slider(
                    value: _settings.rate,
                    min: 0.5,
                    max: 2.0,
                    divisions: 15,
                    onChanged: _isPlaying
                        ? null
                        : (value) {
                            _updateSetting((s) => s.copyWith(rate: value));
                          },
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Slow', style: theme.textTheme.bodySmall),
                      Text('Normal', style: theme.textTheme.bodySmall),
                      Text('Fast', style: theme.textTheme.bodySmall),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Pitch Slider
                  Text(
                    'Pitch: ${_settings.pitch.toStringAsFixed(1)}',
                    style: theme.textTheme.labelLarge,
                  ),
                  Slider(
                    value: _settings.pitch,
                    min: 0.5,
                    max: 2.0,
                    divisions: 15,
                    onChanged: _isPlaying
                        ? null
                        : (value) {
                            _updateSetting((s) => s.copyWith(pitch: value));
                          },
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Low', style: theme.textTheme.bodySmall),
                      Text('Normal', style: theme.textTheme.bodySmall),
                      Text('High', style: theme.textTheme.bodySmall),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Volume Slider
                  Text(
                    'Volume: ${(_settings.volume * 100).round()}%',
                    style: theme.textTheme.labelLarge,
                  ),
                  Slider(
                    value: _settings.volume,
                    min: 0.0,
                    max: 1.0,
                    divisions: 10,
                    onChanged: (value) {
                      _updateSetting((s) => s.copyWith(volume: value));
                    },
                  ),
                  const SizedBox(height: 16),

                  // Options
                  const Divider(),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    title: const Text('Highlight text as it\'s read'),
                    value: _settings.highlightText,
                    onChanged: (value) {
                      _updateSetting((s) => s.copyWith(highlightText: value));
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                  SwitchListTile(
                    title: const Text('Auto-scroll to current word'),
                    value: _settings.autoScroll,
                    onChanged: (value) {
                      _updateSetting((s) => s.copyWith(autoScroll: value));
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
