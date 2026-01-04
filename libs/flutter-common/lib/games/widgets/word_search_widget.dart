/// Word search game widget
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../game_models.dart';

/// Word search puzzle widget with touch/drag selection
class WordSearchWidget extends StatefulWidget {
  final WordSearchPuzzle puzzle;
  final bool soundEnabled;
  final bool hapticEnabled;
  final void Function(String word)? onWordFound;
  final void Function(List<FoundWord> words, GameResult? result)? onComplete;

  const WordSearchWidget({
    super.key,
    required this.puzzle,
    this.soundEnabled = true,
    this.hapticEnabled = true,
    this.onWordFound,
    this.onComplete,
  });

  @override
  State<WordSearchWidget> createState() => _WordSearchWidgetState();
}

class _WordSearchWidgetState extends State<WordSearchWidget> {
  late List<List<bool>> _selectedCells;
  late List<FoundWord> _foundWords;
  List<Offset> _currentSelection = [];
  Offset? _dragStart;
  final Stopwatch _stopwatch = Stopwatch();

  @override
  void initState() {
    super.initState();
    _selectedCells = List.generate(
      widget.puzzle.rows,
      (_) => List.filled(widget.puzzle.cols, false),
    );
    _foundWords = List.from(widget.puzzle.foundWords);
    _stopwatch.start();
  }

  @override
  void dispose() {
    _stopwatch.stop();
    super.dispose();
  }

  void _onPanStart(DragStartDetails details, int row, int col) {
    setState(() {
      _dragStart = Offset(col.toDouble(), row.toDouble());
      _currentSelection = [_dragStart!];
    });
  }

  void _onPanUpdate(DragUpdateDetails details, BoxConstraints constraints) {
    if (_dragStart == null) return;

    final cellWidth = constraints.maxWidth / widget.puzzle.cols;
    final cellHeight = constraints.maxHeight / widget.puzzle.rows;

    final localPosition = details.localPosition;
    final col = (localPosition.dx / cellWidth).floor().clamp(0, widget.puzzle.cols - 1);
    final row = (localPosition.dy / cellHeight).floor().clamp(0, widget.puzzle.rows - 1);
    final currentCell = Offset(col.toDouble(), row.toDouble());

    // Calculate direction from start
    final dx = col - _dragStart!.dx.toInt();
    final dy = row - _dragStart!.dy.toInt();

    // Validate direction (only horizontal, vertical, or diagonal)
    final isValidDirection = dx == 0 || dy == 0 || dx.abs() == dy.abs();

    if (isValidDirection) {
      // Build selection line
      final newSelection = <Offset>[];
      final steps = (dx.abs() > dy.abs() ? dx.abs() : dy.abs()) + 1;
      final stepX = dx == 0 ? 0 : (dx > 0 ? 1 : -1);
      final stepY = dy == 0 ? 0 : (dy > 0 ? 1 : -1);

      for (var i = 0; i < steps; i++) {
        newSelection.add(Offset(
          _dragStart!.dx + i * stepX,
          _dragStart!.dy + i * stepY,
        ));
      }

      setState(() {
        _currentSelection = newSelection;
      });
    }
  }

  void _onPanEnd(DragEndDetails details) {
    if (_currentSelection.length < 2) {
      setState(() {
        _currentSelection = [];
        _dragStart = null;
      });
      return;
    }

    // Check if selection matches a word
    final word = _getSelectedWord();
    final matchedWord = widget.puzzle.words.firstWhere(
      (w) => w.word.toUpperCase() == word || w.word.toUpperCase() == _reverseString(word),
      orElse: () => HiddenWord(word: '', startRow: 0, startCol: 0, endRow: 0, endCol: 0),
    );

    if (matchedWord.word.isNotEmpty && !_isWordAlreadyFound(matchedWord.word)) {
      if (widget.hapticEnabled) {
        HapticFeedback.mediumImpact();
      }

      final foundWord = FoundWord(
        word: matchedWord.word,
        cells: List.from(_currentSelection),
        foundAt: DateTime.now(),
      );

      setState(() {
        _foundWords.add(foundWord);
        // Mark cells as permanently selected
        for (final cell in _currentSelection) {
          _selectedCells[cell.dy.toInt()][cell.dx.toInt()] = true;
        }
      });

      widget.onWordFound?.call(matchedWord.word);

      // Check if all words are found
      if (_foundWords.length == widget.puzzle.words.length) {
        _stopwatch.stop();
        final result = GameResult(
          gameId: 'wordsearch',
          sessionId: DateTime.now().millisecondsSinceEpoch.toString(),
          finalScore: _foundWords.length * 100,
          maxScore: widget.puzzle.words.length * 100,
          totalTime: _stopwatch.elapsed,
          accuracy: 1.0,
          starsEarned: 3,
        );
        widget.onComplete?.call(_foundWords, result);
      }
    }

    setState(() {
      _currentSelection = [];
      _dragStart = null;
    });
  }

  String _getSelectedWord() {
    return _currentSelection.map((cell) {
      return widget.puzzle.grid[cell.dy.toInt()][cell.dx.toInt()];
    }).join();
  }

  String _reverseString(String s) {
    return s.split('').reversed.join();
  }

  bool _isWordAlreadyFound(String word) {
    return _foundWords.any((fw) => fw.word.toUpperCase() == word.toUpperCase());
  }

  bool _isCellInSelection(int row, int col) {
    return _currentSelection.any((cell) => cell.dx.toInt() == col && cell.dy.toInt() == row);
  }

  Color? _getFoundWordColor(int row, int col) {
    for (var i = 0; i < _foundWords.length; i++) {
      final word = _foundWords[i];
      if (word.cells.any((cell) => cell.dx.toInt() == col && cell.dy.toInt() == row)) {
        final colors = [
          Colors.green[200],
          Colors.blue[200],
          Colors.purple[200],
          Colors.orange[200],
          Colors.pink[200],
          Colors.teal[200],
        ];
        return colors[i % colors.length];
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Word list
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: widget.puzzle.words.map((word) {
              final isFound = _isWordAlreadyFound(word.word);
              return Chip(
                label: Text(
                  word.word,
                  style: TextStyle(
                    decoration: isFound ? TextDecoration.lineThrough : null,
                    color: isFound ? Colors.grey : null,
                    fontWeight: isFound ? FontWeight.normal : FontWeight.bold,
                  ),
                ),
                backgroundColor: isFound ? Colors.green[100] : null,
                avatar: isFound
                    ? const Icon(Icons.check, size: 16, color: Colors.green)
                    : null,
              );
            }).toList(),
          ),
        ),

        // Puzzle grid
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return GestureDetector(
                  onPanUpdate: (details) => _onPanUpdate(details, constraints),
                  onPanEnd: _onPanEnd,
                  child: AspectRatio(
                    aspectRatio: widget.puzzle.cols / widget.puzzle.rows,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: GridView.builder(
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: widget.puzzle.cols,
                        ),
                        itemCount: widget.puzzle.rows * widget.puzzle.cols,
                        itemBuilder: (context, index) {
                          final row = index ~/ widget.puzzle.cols;
                          final col = index % widget.puzzle.cols;
                          final letter = widget.puzzle.grid[row][col];
                          final isInCurrentSelection = _isCellInSelection(row, col);
                          final foundColor = _getFoundWordColor(row, col);

                          return GestureDetector(
                            onPanStart: (details) => _onPanStart(details, row, col),
                            child: Container(
                              decoration: BoxDecoration(
                                color: isInCurrentSelection
                                    ? Colors.yellow[200]
                                    : foundColor,
                                border: Border.all(
                                  color: Colors.grey[300]!,
                                  width: 0.5,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  letter.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: foundColor != null
                                        ? Colors.grey[700]
                                        : Colors.black,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // Progress
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: LinearProgressIndicator(
            value: _foundWords.length / widget.puzzle.words.length,
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation(Colors.green),
          ),
        ),
      ],
    );
  }
}
