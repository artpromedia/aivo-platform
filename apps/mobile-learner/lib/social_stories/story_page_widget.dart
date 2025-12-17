/// Story Page Widget - ND-1.2
///
/// Widget for displaying a single page of a social story with
/// visual, text, and interactive elements.

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'social_story_models.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// STORY PAGE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Widget that displays a single page of a social story
class StoryPageWidget extends StatelessWidget {
  const StoryPageWidget({
    super.key,
    required this.page,
    this.preferences,
    this.onInteraction,
    this.highlightedSentenceIndex,
    this.isCurrentlyReading = false,
  });

  final StoryPage page;
  final LearnerStoryPreferences? preferences;
  final void Function(StoryInteraction interaction, Map<String, dynamic> data)?
      onInteraction;
  final int? highlightedSentenceIndex;
  final bool isCurrentlyReading;

  @override
  Widget build(BuildContext context) {
    final backgroundColor = page.backgroundColor != null
        ? _parseColor(page.backgroundColor!)
        : Theme.of(context).scaffoldBackgroundColor;

    final isHighContrast = preferences?.highContrast ?? false;
    final isLargeText = preferences?.largeText ?? false;

    return Container(
      color: isHighContrast ? Colors.black : backgroundColor,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              // Visual
              if (page.visual != null)
                Expanded(
                  flex: 2,
                  child: _buildVisual(context, page.visual!),
                ),

              const SizedBox(height: 24),

              // Text content
              Expanded(
                flex: 3,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (int i = 0; i < page.sentences.length; i++)
                        _SentenceWidget(
                          sentence: page.sentences[i],
                          isHighlighted: highlightedSentenceIndex == i,
                          isHighContrast: isHighContrast,
                          isLargeText: isLargeText,
                        ),
                    ],
                  ),
                ),
              ),

              // Interactions
              if (page.interactions.isNotEmpty) ...[
                const SizedBox(height: 16),
                _buildInteractions(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVisual(BuildContext context, StoryVisual visual) {
    Widget imageWidget;

    if (visual.url.endsWith('.svg')) {
      imageWidget = SvgPicture.asset(
        visual.url,
        fit: BoxFit.contain,
        semanticsLabel: visual.altText,
      );
    } else {
      imageWidget = Image.asset(
        visual.url,
        fit: BoxFit.contain,
        semanticLabel: visual.altText,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Colors.grey[200],
            child: const Center(
              child: Icon(Icons.image_not_supported, size: 64),
            ),
          );
        },
      );
    }

    return Semantics(
      label: visual.altText,
      image: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: imageWidget,
      ),
    );
  }

  Widget _buildInteractions(BuildContext context) {
    return Column(
      children: [
        for (final interaction in page.interactions)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _InteractionWidget(
              interaction: interaction,
              onComplete: (data) {
                onInteraction?.call(interaction, data);
              },
            ),
          ),
      ],
    );
  }

  Color _parseColor(String colorString) {
    if (colorString.startsWith('#')) {
      final hex = colorString.substring(1);
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      } else if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
    }
    return Colors.white;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

class _SentenceWidget extends StatelessWidget {
  const _SentenceWidget({
    required this.sentence,
    this.isHighlighted = false,
    this.isHighContrast = false,
    this.isLargeText = false,
  });

  final StorySentence sentence;
  final bool isHighlighted;
  final bool isHighContrast;
  final bool isLargeText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Base font size with large text option
    final baseFontSize = isLargeText ? 24.0 : 18.0;

    // Style based on sentence type
    final textStyle = _getStyleForType(theme, baseFontSize);

    // Build rich text with emphasis
    final textSpans = _buildTextSpans(sentence.text, textStyle);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isHighlighted
            ? (isHighContrast ? Colors.yellow : Colors.yellow.shade100)
            : (isHighContrast ? Colors.grey[900] : Colors.white),
        borderRadius: BorderRadius.circular(12),
        border: isHighlighted
            ? Border.all(color: Colors.orange, width: 3)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sentence type indicator
          _SentenceTypeIndicator(
            type: sentence.type,
            isHighContrast: isHighContrast,
          ),
          const SizedBox(width: 12),
          // Text
          Expanded(
            child: RichText(
              text: TextSpan(
                children: textSpans,
                style: textStyle.copyWith(
                  color: isHighContrast ? Colors.white : Colors.black87,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  TextStyle _getStyleForType(ThemeData theme, double fontSize) {
    switch (sentence.type) {
      case SentenceType.directive:
        return TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          height: 1.5,
        );
      case SentenceType.affirmative:
        return TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w500,
          fontStyle: FontStyle.italic,
          height: 1.5,
        );
      case SentenceType.perspective:
        return TextStyle(
          fontSize: fontSize,
          color: Colors.indigo[700],
          height: 1.5,
        );
      case SentenceType.cooperative:
        return TextStyle(
          fontSize: fontSize,
          color: Colors.teal[700],
          height: 1.5,
        );
      default:
        return TextStyle(
          fontSize: fontSize,
          height: 1.5,
        );
    }
  }

  List<TextSpan> _buildTextSpans(String text, TextStyle baseStyle) {
    if (sentence.emphasisWords.isEmpty) {
      return [TextSpan(text: text)];
    }

    final spans = <TextSpan>[];
    var currentIndex = 0;

    for (final word in sentence.emphasisWords) {
      final wordLower = word.toLowerCase();
      final textLower = text.toLowerCase();
      final start = textLower.indexOf(wordLower, currentIndex);

      if (start != -1) {
        // Add text before the emphasis word
        if (start > currentIndex) {
          spans.add(TextSpan(text: text.substring(currentIndex, start)));
        }

        // Add the emphasized word
        spans.add(TextSpan(
          text: text.substring(start, start + word.length),
          style: baseStyle.copyWith(
            fontWeight: FontWeight.bold,
            backgroundColor: Colors.yellow.shade200,
          ),
        ));

        currentIndex = start + word.length;
      }
    }

    // Add remaining text
    if (currentIndex < text.length) {
      spans.add(TextSpan(text: text.substring(currentIndex)));
    }

    return spans;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE TYPE INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

class _SentenceTypeIndicator extends StatelessWidget {
  const _SentenceTypeIndicator({
    required this.type,
    this.isHighContrast = false,
  });

  final SentenceType type;
  final bool isHighContrast;

  @override
  Widget build(BuildContext context) {
    final (icon, color, tooltip) = _getTypeConfig();

    return Tooltip(
      message: tooltip,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: isHighContrast ? color : color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 18,
          color: isHighContrast ? Colors.black : color,
        ),
      ),
    );
  }

  (IconData, Color, String) _getTypeConfig() {
    switch (type) {
      case SentenceType.descriptive:
        return (Icons.info_outline, Colors.blue, 'Describes the situation');
      case SentenceType.perspective:
        return (Icons.psychology, Colors.purple, 'Shows how others feel');
      case SentenceType.directive:
        return (Icons.directions, Colors.green, 'Suggests what to do');
      case SentenceType.affirmative:
        return (Icons.thumb_up, Colors.orange, 'Positive encouragement');
      case SentenceType.cooperative:
        return (Icons.people, Colors.teal, 'Who can help');
      case SentenceType.control:
        return (Icons.edit, Colors.indigo, 'My own thought');
      case SentenceType.partial:
        return (Icons.more_horiz, Colors.grey, 'Complete the thought');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTION WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

class _InteractionWidget extends StatefulWidget {
  const _InteractionWidget({
    required this.interaction,
    required this.onComplete,
  });

  final StoryInteraction interaction;
  final void Function(Map<String, dynamic> data) onComplete;

  @override
  State<_InteractionWidget> createState() => _InteractionWidgetState();
}

class _InteractionWidgetState extends State<_InteractionWidget> {
  bool _completed = false;

  @override
  Widget build(BuildContext context) {
    switch (widget.interaction.type) {
      case 'PRACTICE':
        return _buildPracticeInteraction();
      case 'EMOTION_CHECK':
        return _buildEmotionCheckInteraction();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildPracticeInteraction() {
    final action = widget.interaction.config['action'] as String?;
    
    if (action == 'breathing_exercise') {
      return _BreathingExerciseWidget(
        count: (widget.interaction.config['count'] as int?) ?? 3,
        onComplete: () {
          setState(() => _completed = true);
          widget.onComplete({'completed': true});
        },
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildEmotionCheckInteraction() {
    if (_completed) {
      return Card(
        color: Colors.green[50],
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text('Thanks for sharing!'),
            ],
          ),
        ),
      );
    }

    final emotions = ['😊 Good', '😐 Okay', '😟 Worried', '😢 Sad'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              widget.interaction.config['question'] as String? ??
                  'How are you feeling?',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: emotions.map((emotion) {
                return ElevatedButton(
                  onPressed: () {
                    setState(() => _completed = true);
                    widget.onComplete({'emotion': emotion});
                  },
                  child: Text(emotion),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BREATHING EXERCISE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

class _BreathingExerciseWidget extends StatefulWidget {
  const _BreathingExerciseWidget({
    required this.count,
    required this.onComplete,
  });

  final int count;
  final VoidCallback onComplete;

  @override
  State<_BreathingExerciseWidget> createState() =>
      _BreathingExerciseWidgetState();
}

class _BreathingExerciseWidgetState extends State<_BreathingExerciseWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  int _currentBreath = 0;
  bool _isInhaling = true;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.5).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() => _isInhaling = false);
        _controller.reverse();
      } else if (status == AnimationStatus.dismissed) {
        setState(() {
          _currentBreath++;
          _isInhaling = true;
        });

        if (_currentBreath >= widget.count) {
          setState(() => _completed = true);
          widget.onComplete();
        } else {
          _controller.forward();
        }
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _startBreathing() {
    setState(() {
      _currentBreath = 0;
      _isInhaling = true;
      _completed = false;
    });
    _controller.forward();
  }

  @override
  Widget build(BuildContext context) {
    if (_completed) {
      return Card(
        color: Colors.green[50],
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 48),
              const SizedBox(height: 8),
              Text(
                'Great job! You completed ${widget.count} breaths.',
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    if (!_controller.isAnimating && _currentBreath == 0) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(
                'Let\'s take ${widget.count} deep breaths together',
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _startBreathing,
                icon: const Icon(Icons.air),
                label: const Text('Start Breathing'),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              'Breath ${_currentBreath + 1} of ${widget.count}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            AnimatedBuilder(
              animation: _scaleAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _scaleAnimation.value,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isInhaling
                          ? Colors.blue.shade200
                          : Colors.green.shade200,
                    ),
                    child: Center(
                      child: Icon(
                        _isInhaling ? Icons.arrow_upward : Icons.arrow_downward,
                        size: 48,
                        color: Colors.white,
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            Text(
              _isInhaling ? 'Breathe in...' : 'Breathe out...',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ],
        ),
      ),
    );
  }
}
