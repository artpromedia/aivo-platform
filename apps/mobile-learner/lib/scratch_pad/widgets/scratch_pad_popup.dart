/// Scratch Pad Popup Widget
///
/// A popup/modal that displays the scratch pad for solving
/// math problems during activities and assessments.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/stroke_data.dart';
import '../services/scratch_pad_service.dart';
import 'scratch_pad_canvas.dart';

/// Shows scratch pad as a modal bottom sheet
Future<String?> showScratchPadSheet({
  required BuildContext context,
  required ScratchPadService service,
  String? activityId,
  String? questionId,
  String? questionText,
  String? expectedAnswer,
}) async {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => ScratchPadSheet(
      service: service,
      activityId: activityId,
      questionId: questionId,
      questionText: questionText,
      expectedAnswer: expectedAnswer,
    ),
  );
}

/// Shows scratch pad as a full-screen dialog
Future<String?> showScratchPadDialog({
  required BuildContext context,
  required ScratchPadService service,
  String? activityId,
  String? questionId,
  String? questionText,
  String? expectedAnswer,
}) async {
  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    builder: (context) => ScratchPadDialog(
      service: service,
      activityId: activityId,
      questionId: questionId,
      questionText: questionText,
      expectedAnswer: expectedAnswer,
    ),
  );
}

/// Scratch pad as a bottom sheet
class ScratchPadSheet extends StatefulWidget {
  final ScratchPadService service;
  final String? activityId;
  final String? questionId;
  final String? questionText;
  final String? expectedAnswer;

  const ScratchPadSheet({
    super.key,
    required this.service,
    this.activityId,
    this.questionId,
    this.questionText,
    this.expectedAnswer,
  });

  @override
  State<ScratchPadSheet> createState() => _ScratchPadSheetState();
}

class _ScratchPadSheetState extends State<ScratchPadSheet> {
  final GlobalKey<ScratchPadCanvasState> _canvasKey = GlobalKey();
  MathRecognitionResult? _result;

  void _onRecognized(MathRecognitionResult result) {
    setState(() {
      _result = result;
    });
  }

  void _onSubmit(String answer) {
    Navigator.of(context).pop(answer);
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final screenWidth = mediaQuery.size.width;
    final screenHeight = mediaQuery.size.height;

    return Container(
      height: screenHeight * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.draw, color: Colors.blue),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Scratch Pad',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (widget.questionText != null)
                        Text(
                          widget.questionText!,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Canvas
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ScratchPadCanvas(
                key: _canvasKey,
                width: screenWidth - 32,
                height: screenHeight * 0.4,
                service: widget.service,
                activityId: widget.activityId,
                questionId: widget.questionId,
                onRecognized: _onRecognized,
                onAnswerSubmit: _onSubmit,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Scratch pad as a full-screen dialog
class ScratchPadDialog extends StatefulWidget {
  final ScratchPadService service;
  final String? activityId;
  final String? questionId;
  final String? questionText;
  final String? expectedAnswer;

  const ScratchPadDialog({
    super.key,
    required this.service,
    this.activityId,
    this.questionId,
    this.questionText,
    this.expectedAnswer,
  });

  @override
  State<ScratchPadDialog> createState() => _ScratchPadDialogState();
}

class _ScratchPadDialogState extends State<ScratchPadDialog> {
  final GlobalKey<ScratchPadCanvasState> _canvasKey = GlobalKey();
  MathRecognitionResult? _result;

  void _onRecognized(MathRecognitionResult result) {
    setState(() {
      _result = result;
    });
  }

  void _onSubmit(String answer) {
    Navigator.of(context).pop(answer);
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final isLandscape = mediaQuery.orientation == Orientation.landscape;

    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        constraints: BoxConstraints(
          maxWidth: 600,
          maxHeight: mediaQuery.size.height * 0.9,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.calculate, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Show Your Work',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (widget.questionText != null)
                          Text(
                            widget.questionText!,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Close',
                  ),
                ],
              ),
            ),

            // Canvas
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: ScratchPadCanvas(
                  key: _canvasKey,
                  width: isLandscape ? 500 : 350,
                  height: isLandscape ? 250 : 300,
                  service: widget.service,
                  activityId: widget.activityId,
                  questionId: widget.questionId,
                  onRecognized: _onRecognized,
                  onAnswerSubmit: _onSubmit,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Inline scratch pad widget for embedding in activities
class InlineScratchPad extends StatefulWidget {
  final ScratchPadService service;
  final String? activityId;
  final String? questionId;
  final bool expanded;
  final void Function(String answer)? onAnswerSubmit;
  final void Function(bool expanded)? onExpandedChanged;

  const InlineScratchPad({
    super.key,
    required this.service,
    this.activityId,
    this.questionId,
    this.expanded = false,
    this.onAnswerSubmit,
    this.onExpandedChanged,
  });

  @override
  State<InlineScratchPad> createState() => _InlineScratchPadState();
}

class _InlineScratchPadState extends State<InlineScratchPad>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _heightAnimation;
  bool _isExpanded = false;
  MathRecognitionResult? _result;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.expanded;
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _heightAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );

    if (_isExpanded) {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
    widget.onExpandedChanged?.call(_isExpanded);
    HapticFeedback.selectionClick();
  }

  void _onRecognized(MathRecognitionResult result) {
    setState(() {
      _result = result;
    });
  }

  void _onSubmit(String answer) {
    widget.onAnswerSubmit?.call(answer);
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Toggle header
          InkWell(
            onTap: _toggleExpanded,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Icon(
                    Icons.draw,
                    color: _isExpanded ? Colors.blue : Colors.grey.shade600,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _isExpanded ? 'Scratch Pad' : 'Show your work',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: _isExpanded ? Colors.blue : Colors.grey.shade700,
                      ),
                    ),
                  ),
                  Icon(
                    _isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: Colors.grey.shade600,
                  ),
                ],
              ),
            ),
          ),

          // Expandable canvas
          SizeTransition(
            sizeFactor: _heightAnimation,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: ScratchPadCanvas(
                width: MediaQuery.of(context).size.width - 56,
                height: 250,
                showToolbar: true,
                showRecognitionResult: true,
                service: widget.service,
                activityId: widget.activityId,
                questionId: widget.questionId,
                onRecognized: _onRecognized,
                onAnswerSubmit: _onSubmit,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Floating action button to open scratch pad
class ScratchPadFAB extends StatelessWidget {
  final ScratchPadService service;
  final String? activityId;
  final String? questionId;
  final String? questionText;
  final void Function(String answer)? onAnswerSubmit;
  final bool mini;

  const ScratchPadFAB({
    super.key,
    required this.service,
    this.activityId,
    this.questionId,
    this.questionText,
    this.onAnswerSubmit,
    this.mini = false,
  });

  Future<void> _openScratchPad(BuildContext context) async {
    final answer = await showScratchPadSheet(
      context: context,
      service: service,
      activityId: activityId,
      questionId: questionId,
      questionText: questionText,
    );

    if (answer != null) {
      onAnswerSubmit?.call(answer);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      mini: mini,
      onPressed: () => _openScratchPad(context),
      tooltip: 'Open Scratch Pad',
      backgroundColor: Colors.blue,
      child: const Icon(Icons.draw, color: Colors.white),
    );
  }
}
