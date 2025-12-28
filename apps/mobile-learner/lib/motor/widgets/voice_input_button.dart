/// Voice Input Button - ND-3.3
///
/// Provides voice input as an alternative to typing/touch.
/// Uses speech-to-text with visual feedback and motor-friendly controls.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import '../motor_profile_provider.dart';

/// A voice input button that provides speech-to-text functionality
class VoiceInputButton extends StatefulWidget {
  final void Function(String text)? onResult;
  final void Function(String partialText)? onPartialResult;
  final VoidCallback? onListeningStarted;
  final VoidCallback? onListeningStopped;
  final void Function(String error)? onError;
  final String? locale;
  final Widget? child;
  final Color? activeColor;
  final Color? inactiveColor;

  const VoiceInputButton({
    super.key,
    this.onResult,
    this.onPartialResult,
    this.onListeningStarted,
    this.onListeningStopped,
    this.onError,
    this.locale,
    this.child,
    this.activeColor,
    this.inactiveColor,
  });

  @override
  State<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends State<VoiceInputButton>
    with SingleTickerProviderStateMixin {
  final SpeechToText _speech = SpeechToText();
  bool _isListening = false;
  bool _speechEnabled = false;
  String _partialResult = '';
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    try {
      _speechEnabled = await _speech.initialize(
        onError: (error) {
          widget.onError?.call(error.errorMsg);
          _stopListening();
        },
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            if (_isListening) {
              _stopListening();
            }
          }
        },
      );
      if (mounted) setState(() {});
    } catch (e) {
      widget.onError?.call('Failed to initialize speech recognition: $e');
    }
  }

  @override
  void dispose() {
    _speech.stop();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!_speechEnabled) {
      widget.onError?.call('Speech recognition not available');
      return;
    }

    setState(() {
      _isListening = true;
      _partialResult = '';
    });
    _pulseController.repeat(reverse: true);
    widget.onListeningStarted?.call();
    HapticFeedback.mediumImpact();

    await _speech.listen(
      onResult: _onSpeechResult,
      localeId: widget.locale,
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      partialResults: true,
      listenMode: ListenMode.dictation,
    );
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    setState(() {
      _partialResult = result.recognizedWords;
    });
    
    if (result.finalResult) {
      widget.onResult?.call(result.recognizedWords);
    } else {
      widget.onPartialResult?.call(result.recognizedWords);
    }
  }

  Future<void> _stopListening() async {
    await _speech.stop();
    setState(() {
      _isListening = false;
    });
    _pulseController.stop();
    _pulseController.reset();
    widget.onListeningStopped?.call();
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final baseSize = 56.0 * multiplier;
        final holdEnabled = motorProfile.holdToActivateEnabled;

        final activeColor = widget.activeColor ?? Colors.red;
        final inactiveColor = widget.inactiveColor ?? Theme.of(context).primaryColor;

        if (widget.child != null) {
          return GestureDetector(
            onTap: holdEnabled ? null : _toggleListening,
            onLongPress: holdEnabled ? _startListening : null,
            onLongPressEnd: holdEnabled ? (_) => _stopListening() : null,
            child: widget.child,
          );
        }

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Partial result display
            if (_partialResult.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _partialResult,
                  style: TextStyle(
                    fontSize: (14 * multiplier).toDouble(),
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),

            // Voice button with pulse animation
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final scale = _isListening
                    ? 1.0 + (_pulseController.value * 0.15)
                    : 1.0;

                return Transform.scale(
                  scale: scale,
                  child: GestureDetector(
                    onTap: holdEnabled ? null : _toggleListening,
                    onLongPress: holdEnabled ? _startListening : null,
                    onLongPressEnd: holdEnabled ? (_) => _stopListening() : null,
                    child: Container(
                      width: baseSize,
                      height: baseSize,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isListening ? activeColor : inactiveColor,
                        boxShadow: _isListening
                            ? [
                                BoxShadow(
                                  color: activeColor.withOpacity(0.4),
                                  blurRadius: 20,
                                  spreadRadius: 5,
                                ),
                              ]
                            : [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                      ),
                      child: Icon(
                        _isListening ? Icons.mic : Icons.mic_none,
                        color: Colors.white,
                        size: (28 * multiplier).toDouble(),
                      ),
                    ),
                  ),
                );
              },
            ),

            // Status text
            if (_isListening)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  holdEnabled ? 'Release to stop' : 'Tap to stop',
                  style: TextStyle(
                    fontSize: (12 * multiplier).toDouble(),
                    color: Colors.grey.shade600,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  void _toggleListening() {
    if (_isListening) {
      _stopListening();
    } else {
      _startListening();
    }
  }
}

/// A text field with integrated voice input
class VoiceTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? hintText;
  final String? labelText;
  final void Function(String)? onChanged;
  final void Function(String)? onSubmitted;
  final int? maxLines;
  final bool enabled;
  final FocusNode? focusNode;
  final TextInputType? keyboardType;

  const VoiceTextField({
    super.key,
    this.controller,
    this.hintText,
    this.labelText,
    this.onChanged,
    this.onSubmitted,
    this.maxLines = 1,
    this.enabled = true,
    this.focusNode,
    this.keyboardType,
  });

  @override
  State<VoiceTextField> createState() => _VoiceTextFieldState();
}

class _VoiceTextFieldState extends State<VoiceTextField> {
  late TextEditingController _controller;
  // ignore: unused_field
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  void _handleVoiceResult(String text) {
    final currentText = _controller.text;
    final newText = currentText.isEmpty ? text : '$currentText $text';
    _controller.text = newText;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: newText.length),
    );
    widget.onChanged?.call(newText);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final voiceEnabled = motorProfile.voiceInputEnabled;
        final multiplier = motorProfile.touchTargetMultiplier;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                focusNode: widget.focusNode,
                enabled: widget.enabled,
                maxLines: widget.maxLines,
                keyboardType: widget.keyboardType,
                onChanged: widget.onChanged,
                onSubmitted: widget.onSubmitted,
                style: TextStyle(fontSize: (16 * multiplier).toDouble()),
                decoration: InputDecoration(
                  hintText: widget.hintText,
                  labelText: widget.labelText,
                  contentPadding: EdgeInsets.all((16 * multiplier).toDouble()),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular((8 * multiplier).toDouble()),
                  ),
                ),
              ),
            ),
            if (voiceEnabled) ...[
              const SizedBox(width: 8),
              SizedBox(
                width: (48 * multiplier).toDouble(),
                height: (48 * multiplier).toDouble(),
                child: VoiceInputButton(
                  onResult: _handleVoiceResult,
                  onListeningStarted: () => setState(() => _isListening = true),
                  onListeningStopped: () => setState(() => _isListening = false),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

/// Voice command listener for hands-free navigation
class VoiceCommandListener extends StatefulWidget {
  final Widget child;
  final Map<String, VoidCallback> commands;
  final void Function(String command)? onUnrecognizedCommand;
  final bool enabled;
  final bool autoStart;

  const VoiceCommandListener({
    super.key,
    required this.child,
    required this.commands,
    this.onUnrecognizedCommand,
    this.enabled = true,
    this.autoStart = false,
  });

  @override
  State<VoiceCommandListener> createState() => _VoiceCommandListenerState();
}

class _VoiceCommandListenerState extends State<VoiceCommandListener> {
  final SpeechToText _speech = SpeechToText();
  bool _isListening = false;
  bool _speechEnabled = false;

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    try {
      _speechEnabled = await _speech.initialize(
        onError: (error) => _stopListening(),
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            if (_isListening && widget.autoStart) {
              // Restart listening for continuous command mode
              Future.delayed(const Duration(milliseconds: 500), _startListening);
            } else {
              _stopListening();
            }
          }
        },
      );
      if (mounted) {
        setState(() {});
        if (widget.autoStart && _speechEnabled) {
          _startListening();
        }
      }
    } catch (e) {
      debugPrint('Failed to initialize speech: $e');
    }
  }

  @override
  void dispose() {
    _speech.stop();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!_speechEnabled || _isListening) return;

    setState(() => _isListening = true);

    await _speech.listen(
      onResult: (result) {
        if (result.finalResult) {
          _processCommand(result.recognizedWords);
        }
      },
      listenFor: const Duration(seconds: 10),
      pauseFor: const Duration(seconds: 2),
      partialResults: false,
      listenMode: ListenMode.confirmation,
    );
  }

  Future<void> _stopListening() async {
    await _speech.stop();
    if (mounted) {
      setState(() => _isListening = false);
    }
  }

  void _processCommand(String spokenText) {
    final normalizedText = spokenText.toLowerCase().trim();

    // Find matching command
    for (final entry in widget.commands.entries) {
      if (normalizedText.contains(entry.key.toLowerCase())) {
        entry.value.call();
        HapticFeedback.mediumImpact();
        return;
      }
    }

    // No match found
    widget.onUnrecognizedCommand?.call(normalizedText);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) {
      return widget.child;
    }

    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        if (!motorProfile.voiceInputEnabled) {
          return widget.child;
        }

        return Stack(
          children: [
            widget.child,

            // Voice command indicator
            if (_isListening)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.mic, color: Colors.white, size: 16),
                      SizedBox(width: 4),
                      Text(
                        'Listening...',
                        style: TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Voice input feedback overlay
class VoiceInputFeedback extends StatelessWidget {
  final bool isListening;
  final String? partialResult;
  final double? volume;
  final VoidCallback? onCancel;

  const VoiceInputFeedback({
    super.key,
    required this.isListening,
    this.partialResult,
    this.volume,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    if (!isListening) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 5,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Volume indicator
          _VolumeIndicator(volume: volume ?? 0),
          const SizedBox(height: 16),

          // Status
          const Text(
            'Listening...',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),

          // Partial result
          if (partialResult != null && partialResult!.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                partialResult!,
                style: const TextStyle(
                  fontSize: 16,
                  fontStyle: FontStyle.italic,
                ),
                textAlign: TextAlign.center,
              ),
            ),

          const SizedBox(height: 16),

          // Cancel button
          if (onCancel != null)
            TextButton.icon(
              onPressed: onCancel,
              icon: const Icon(Icons.close),
              label: const Text('Cancel'),
            ),
        ],
      ),
    );
  }
}

class _VolumeIndicator extends StatelessWidget {
  final double volume;

  const _VolumeIndicator({required this.volume});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(5, (index) {
        final threshold = (index + 1) * 0.2;
        final isActive = volume >= threshold;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 100),
          width: 8,
          height: 20 + (index * 8).toDouble(),
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: BoxDecoration(
            color: isActive ? Colors.green : Colors.grey.shade300,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

/// Voice input commands help dialog
class VoiceCommandsHelp extends StatelessWidget {
  final Map<String, String> commands;

  const VoiceCommandsHelp({
    super.key,
    required this.commands,
  });

  static void show(BuildContext context, Map<String, String> commands) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Voice Commands'),
        content: VoiceCommandsHelp(commands: commands),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Say any of these commands:',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ...commands.entries.map((entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '"${entry.key}"',
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        entry.value,
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
