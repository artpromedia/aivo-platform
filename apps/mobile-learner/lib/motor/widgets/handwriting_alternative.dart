/// Handwriting Alternative Widget - ND-3.3
///
/// Provides alternatives to handwriting for learners with motor challenges.
/// Includes predictive text, word banks, and symbol pickers.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that provides handwriting alternatives
class HandwritingAlternative extends StatefulWidget {
  final TextEditingController? controller;
  final void Function(String)? onTextChanged;
  final void Function(String)? onSubmit;
  final String? hintText;
  final List<String>? wordBank;
  final bool showPredictions;

  const HandwritingAlternative({
    super.key,
    this.controller,
    this.onTextChanged,
    this.onSubmit,
    this.hintText,
    this.wordBank,
    this.showPredictions = true,
  });

  @override
  State<HandwritingAlternative> createState() => _HandwritingAlternativeState();
}

class _HandwritingAlternativeState extends State<HandwritingAlternative> {
  late TextEditingController _controller;
  final FocusNode _focusNode = FocusNode();
  List<String> _predictions = [];
  bool _showWordBank = false;

  // Common word predictions (simplified - would use ML in production)
  static const List<String> _commonWords = [
    'the', 'and', 'is', 'it', 'to', 'of', 'a', 'in', 'that', 'have',
    'I', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  ];

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
    _controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    if (widget.controller == null) {
      _controller.dispose();
    }
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    widget.onTextChanged?.call(_controller.text);
    _updatePredictions();
  }

  void _updatePredictions() {
    final text = _controller.text;
    if (text.isEmpty) {
      setState(() => _predictions = []);
      return;
    }

    // Get last word being typed
    final words = text.split(' ');
    final lastWord = words.last.toLowerCase();

    if (lastWord.isEmpty) {
      setState(() => _predictions = []);
      return;
    }

    // Find matching predictions
    final matches = _commonWords
        .where((w) => w.toLowerCase().startsWith(lastWord))
        .take(5)
        .toList();

    // Add word bank matches if available
    if (widget.wordBank != null) {
      final bankMatches = widget.wordBank!
          .where((w) => w.toLowerCase().startsWith(lastWord))
          .take(3);
      matches.addAll(bankMatches);
    }

    setState(() => _predictions = matches.toSet().take(5).toList());
  }

  void _selectPrediction(String word) {
    final text = _controller.text;
    final words = text.split(' ');

    if (words.isNotEmpty) {
      words.removeLast();
    }
    words.add(word);

    final newText = '${words.join(' ')} ';
    _controller.text = newText;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: newText.length),
    );

    HapticFeedback.selectionClick();
    setState(() => _predictions = []);
  }

  void _insertFromWordBank(String word) {
    final text = _controller.text;
    final newText = text.isEmpty ? '$word ' : '$text $word ';
    _controller.text = newText;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: newText.length),
    );

    HapticFeedback.selectionClick();
    setState(() => _showWordBank = false);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonHeight = 48.0 * multiplier;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Text input area
            TextField(
              controller: _controller,
              focusNode: _focusNode,
              maxLines: 3,
              style: TextStyle(fontSize: (16 * multiplier).toDouble()),
              decoration: InputDecoration(
                hintText: widget.hintText ?? 'Type or select words...',
                contentPadding: EdgeInsets.all((16 * multiplier).toDouble()),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular((8 * multiplier).toDouble()),
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.send),
                  iconSize: (24 * multiplier).toDouble(),
                  onPressed: () {
                    widget.onSubmit?.call(_controller.text);
                    HapticFeedback.mediumImpact();
                  },
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Predictions bar
            if (widget.showPredictions && _predictions.isNotEmpty)
              SizedBox(
                height: buttonHeight,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _predictions.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    return _PredictionChip(
                      word: _predictions[index],
                      onTap: () => _selectPrediction(_predictions[index]),
                      height: buttonHeight,
                    );
                  },
                ),
              ),

            const SizedBox(height: 8),

            // Quick actions row
            Row(
              children: [
                // Word bank toggle
                if (widget.wordBank != null && widget.wordBank!.isNotEmpty)
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.library_books,
                      label: 'Word Bank',
                      onTap: () =>
                          setState(() => _showWordBank = !_showWordBank),
                      isActive: _showWordBank,
                      height: buttonHeight,
                    ),
                  ),

                const SizedBox(width: 8),

                // Common symbols
                Expanded(
                  child: _ActionButton(
                    icon: Icons.emoji_symbols,
                    label: 'Symbols',
                    onTap: () => _showSymbolPicker(context, multiplier),
                    height: buttonHeight,
                  ),
                ),

                const SizedBox(width: 8),

                // Quick punctuation
                Expanded(
                  child: _ActionButton(
                    icon: Icons.more_horiz,
                    label: 'Punctuation',
                    onTap: () => _showPunctuationPicker(context, multiplier),
                    height: buttonHeight,
                  ),
                ),
              ],
            ),

            // Word bank panel
            if (_showWordBank && widget.wordBank != null)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: EdgeInsets.all((12 * multiplier).toDouble()),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: widget.wordBank!
                      .map((word) => _WordBankChip(
                            word: word,
                            onTap: () => _insertFromWordBank(word),
                            multiplier: multiplier,
                          ))
                      .toList(),
                ),
              ),
          ],
        );
      },
    );
  }

  void _showSymbolPicker(BuildContext context, double multiplier) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SymbolPicker(
        onSymbolSelected: (symbol) {
          _controller.text += symbol;
          _controller.selection = TextSelection.fromPosition(
            TextPosition(offset: _controller.text.length),
          );
          Navigator.pop(context);
          HapticFeedback.selectionClick();
        },
      ),
    );
  }

  void _showPunctuationPicker(BuildContext context, double multiplier) {
    showModalBottomSheet(
      context: context,
      builder: (context) => PunctuationPicker(
        onPunctuationSelected: (punctuation) {
          // Smart punctuation insertion
          var text = _controller.text;
          if (text.isNotEmpty && text.endsWith(' ')) {
            text = text.trimRight();
          }
          _controller.text = '$text$punctuation ';
          _controller.selection = TextSelection.fromPosition(
            TextPosition(offset: _controller.text.length),
          );
          Navigator.pop(context);
          HapticFeedback.selectionClick();
        },
      ),
    );
  }
}

class _PredictionChip extends StatelessWidget {
  final String word;
  final VoidCallback onTap;
  final double height;

  const _PredictionChip({
    required this.word,
    required this.onTap,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.blue.shade50,
      borderRadius: BorderRadius.circular(height / 2),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(height / 2),
        child: Container(
          height: height,
          padding: EdgeInsets.symmetric(horizontal: height * 0.4),
          alignment: Alignment.center,
          child: Text(
            word,
            style: TextStyle(
              color: Colors.blue.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isActive;
  final double height;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isActive = false,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isActive ? Colors.blue.shade100 : Colors.grey.shade200,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: isActive ? Colors.blue : Colors.grey.shade700),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: isActive ? Colors.blue : Colors.grey.shade700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WordBankChip extends StatelessWidget {
  final String word;
  final VoidCallback onTap;
  final double multiplier;

  const _WordBankChip({
    required this.word,
    required this.onTap,
    required this.multiplier,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: 16 * multiplier,
            vertical: 12 * multiplier,
          ),
          child: Text(
            word,
            style: TextStyle(fontSize: 14 * multiplier),
          ),
        ),
      ),
    );
  }
}

/// Symbol picker for math and special characters
class SymbolPicker extends StatelessWidget {
  final void Function(String) onSymbolSelected;

  const SymbolPicker({
    super.key,
    required this.onSymbolSelected,
  });

  static const List<SymbolCategory> categories = [
    SymbolCategory('Math', ['+', '-', '×', '÷', '=', '≠', '<', '>', '≤', '≥', '±', '√', 'π', '∞']),
    SymbolCategory('Fractions', ['½', '⅓', '¼', '⅕', '⅔', '¾', '⅖', '⅗']),
    SymbolCategory('Arrows', ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇔']),
    SymbolCategory('Greek', ['α', 'β', 'γ', 'δ', 'θ', 'λ', 'μ', 'σ', 'Σ', 'Ω']),
    SymbolCategory('Currency', ['\$', '€', '£', '¥', '₹', '¢']),
    SymbolCategory('Other', ['°', '%', '©', '®', '™', '§', '¶', '†']),
  ];

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonSize = 48.0 * multiplier;

        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Symbol',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final category = categories[index];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          category.name,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: category.symbols
                              .map((symbol) => _SymbolButton(
                                    symbol: symbol,
                                    size: buttonSize,
                                    onTap: () => onSymbolSelected(symbol),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 16),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class SymbolCategory {
  final String name;
  final List<String> symbols;

  const SymbolCategory(this.name, this.symbols);
}

class _SymbolButton extends StatelessWidget {
  final String symbol;
  final double size;
  final VoidCallback onTap;

  const _SymbolButton({
    required this.symbol,
    required this.size,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.grey.shade200,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: size,
          height: size,
          child: Center(
            child: Text(
              symbol,
              style: TextStyle(fontSize: size * 0.5),
            ),
          ),
        ),
      ),
    );
  }
}

/// Punctuation picker with large touch targets
class PunctuationPicker extends StatelessWidget {
  final void Function(String) onPunctuationSelected;

  const PunctuationPicker({
    super.key,
    required this.onPunctuationSelected,
  });

  static const List<String> punctuation = [
    '.', ',', '!', '?', ';', ':', "'", '"',
    '(', ')', '-', '/', '@', '#', '&', '*',
  ];

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonSize = 56.0 * multiplier;

        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Punctuation',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: punctuation
                    .map((p) => _SymbolButton(
                          symbol: p,
                          size: buttonSize,
                          onTap: () => onPunctuationSelected(p),
                        ))
                    .toList(),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Multiple choice answer selector (alternative to writing)
class MultipleChoiceSelector extends StatelessWidget {
  final List<String> options;
  final int? selectedIndex;
  final void Function(int index)? onSelected;
  final bool allowMultiple;
  final Set<int>? selectedIndices;

  const MultipleChoiceSelector({
    super.key,
    required this.options,
    this.selectedIndex,
    this.onSelected,
    this.allowMultiple = false,
    this.selectedIndices,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final minHeight = 56.0 * multiplier;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: List.generate(options.length, (index) {
            final isSelected = allowMultiple
                ? (selectedIndices?.contains(index) ?? false)
                : selectedIndex == index;

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Material(
                color: isSelected ? Colors.blue.shade100 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: () {
                    onSelected?.call(index);
                    HapticFeedback.selectionClick();
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    constraints: BoxConstraints(minHeight: minHeight),
                    padding: EdgeInsets.all((16 * multiplier).toDouble()),
                    child: Row(
                      children: [
                        // Option letter
                        Container(
                          width: (32 * multiplier).toDouble(),
                          height: (32 * multiplier).toDouble(),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? Colors.blue : Colors.grey.shade400,
                          ),
                          child: Center(
                            child: Text(
                              String.fromCharCode(65 + index), // A, B, C, D...
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: (14 * multiplier).toDouble(),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: (12 * multiplier).toDouble()),

                        // Option text
                        Expanded(
                          child: Text(
                            options[index],
                            style: TextStyle(
                              fontSize: (16 * multiplier).toDouble(),
                              fontWeight:
                                  isSelected ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ),

                        // Check icon
                        if (isSelected)
                          Icon(
                            Icons.check_circle,
                            color: Colors.blue,
                            size: (24 * multiplier).toDouble(),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

/// Sentence builder using word tiles (drag-free alternative)
class SentenceBuilder extends StatefulWidget {
  final List<String> availableWords;
  final void Function(List<String>)? onSentenceChanged;
  final int? maxWords;

  const SentenceBuilder({
    super.key,
    required this.availableWords,
    this.onSentenceChanged,
    this.maxWords,
  });

  @override
  State<SentenceBuilder> createState() => _SentenceBuilderState();
}

class _SentenceBuilderState extends State<SentenceBuilder> {
  final List<String> _sentence = [];

  void _addWord(String word) {
    if (widget.maxWords != null && _sentence.length >= widget.maxWords!) {
      return;
    }
    setState(() => _sentence.add(word));
    widget.onSentenceChanged?.call(_sentence);
    HapticFeedback.selectionClick();
  }

  void _removeWord(int index) {
    setState(() => _sentence.removeAt(index));
    widget.onSentenceChanged?.call(_sentence);
    HapticFeedback.lightImpact();
  }

  void _clear() {
    setState(() => _sentence.clear());
    widget.onSentenceChanged?.call(_sentence);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final chipHeight = 44.0 * multiplier;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Sentence area
            Container(
              constraints: BoxConstraints(minHeight: (80 * multiplier).toDouble()),
              padding: EdgeInsets.all((12 * multiplier).toDouble()),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: _sentence.isEmpty
                  ? Center(
                      child: Text(
                        'Tap words below to build your sentence',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: (14 * multiplier).toDouble(),
                        ),
                      ),
                    )
                  : Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: List.generate(_sentence.length, (index) {
                        return _SentenceWord(
                          word: _sentence[index],
                          index: index,
                          onRemove: () => _removeWord(index),
                          height: chipHeight,
                        );
                      }),
                    ),
            ),

            // Clear button
            if (_sentence.isNotEmpty)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _clear,
                  icon: const Icon(Icons.clear_all, size: 18),
                  label: const Text('Clear'),
                ),
              ),

            SizedBox(height: 8 * multiplier),

            // Word bank
            const Text(
              'Available Words:',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            SizedBox(height: 8 * multiplier),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: widget.availableWords
                  .map((word) => _WordBankChip(
                        word: word,
                        onTap: () => _addWord(word),
                        multiplier: multiplier,
                      ))
                  .toList(),
            ),
          ],
        );
      },
    );
  }
}

class _SentenceWord extends StatelessWidget {
  final String word;
  final int index;
  final VoidCallback onRemove;
  final double height;

  const _SentenceWord({
    required this.word,
    required this.index,
    required this.onRemove,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.blue,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onRemove,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                word,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.close, color: Colors.white70, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
