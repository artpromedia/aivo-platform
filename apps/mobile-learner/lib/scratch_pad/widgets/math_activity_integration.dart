/// Math Activity Integration
///
/// Provides widgets to integrate the scratch pad with
/// math activities and assessments.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/stroke_data.dart';
import '../services/scratch_pad_service.dart';
import 'scratch_pad_canvas.dart';
import 'scratch_pad_popup.dart';

/// A math question widget with integrated scratch pad
class MathQuestionWithScratchPad extends StatefulWidget {
  final String questionText;
  final String? questionImage;
  final String? expectedAnswer;
  final ScratchPadService service;
  final String activityId;
  final String questionId;
  final void Function(String answer, bool isCorrect)? onAnswer;
  final bool showHint;
  final String? hint;
  final MathQuestionType questionType;

  const MathQuestionWithScratchPad({
    super.key,
    required this.questionText,
    this.questionImage,
    this.expectedAnswer,
    required this.service,
    required this.activityId,
    required this.questionId,
    this.onAnswer,
    this.showHint = true,
    this.hint,
    this.questionType = MathQuestionType.freeResponse,
  });

  @override
  State<MathQuestionWithScratchPad> createState() => _MathQuestionWithScratchPadState();
}

class _MathQuestionWithScratchPadState extends State<MathQuestionWithScratchPad> {
  final TextEditingController _answerController = TextEditingController();
  final GlobalKey<ScratchPadCanvasState> _scratchPadKey = GlobalKey();
  bool _showScratchPad = false;
  MathRecognitionResult? _recognition;
  bool _isSubmitted = false;
  bool? _isCorrect;
  String? _feedback;

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  void _toggleScratchPad() {
    setState(() {
      _showScratchPad = !_showScratchPad;
    });
    HapticFeedback.selectionClick();
  }

  void _onRecognized(MathRecognitionResult result) {
    setState(() {
      _recognition = result;
      // Auto-fill answer field with recognized text
      if (result.confidence > 0.7) {
        _answerController.text = result.recognizedText;
      }
    });
  }

  void _useRecognizedAnswer() {
    if (_recognition != null) {
      setState(() {
        _answerController.text = _recognition!.recognizedText;
      });
      HapticFeedback.selectionClick();
    }
  }

  Future<void> _submitAnswer() async {
    if (_answerController.text.isEmpty) return;

    setState(() {
      _isSubmitted = true;
    });

    // Validate answer
    if (widget.expectedAnswer != null) {
      final result = await widget.service.submitAnswer(
        sessionId: '', // Would be from session
        answer: _answerController.text,
        canvasState: CanvasState(), // Would get from canvas
        questionId: widget.questionId,
      );

      if (result != null) {
        setState(() {
          _isCorrect = result.isCorrect;
          _feedback = result.feedback;
        });
      }
    }

    widget.onAnswer?.call(_answerController.text, _isCorrect ?? false);
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question
          _buildQuestion(),

          const SizedBox(height: 16),

          // Scratch pad toggle
          _buildScratchPadToggle(),

          // Scratch pad (expandable)
          if (_showScratchPad) ...[
            const SizedBox(height: 12),
            _buildScratchPad(),
          ],

          const SizedBox(height: 16),

          // Answer input
          _buildAnswerInput(),

          // Feedback
          if (_isSubmitted && _feedback != null) ...[
            const SizedBox(height: 12),
            _buildFeedback(),
          ],
        ],
      ),
    );
  }

  Widget _buildQuestion() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.calculate,
                color: Colors.blue.shade700,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Math Problem',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          widget.questionText,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        if (widget.questionImage != null) ...[
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              widget.questionImage!,
              height: 150,
              fit: BoxFit.contain,
            ),
          ),
        ],
        if (widget.showHint && widget.hint != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.lightbulb_outline, size: 16, color: Colors.amber.shade700),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.hint!,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.amber.shade900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildScratchPadToggle() {
    return InkWell(
      onTap: _toggleScratchPad,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: _showScratchPad ? Colors.blue.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: _showScratchPad ? Colors.blue.shade200 : Colors.grey.shade300,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.draw,
              size: 20,
              color: _showScratchPad ? Colors.blue : Colors.grey.shade700,
            ),
            const SizedBox(width: 8),
            Text(
              _showScratchPad ? 'Hide scratch pad' : 'Show your work',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: _showScratchPad ? Colors.blue : Colors.grey.shade700,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              _showScratchPad ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              size: 20,
              color: _showScratchPad ? Colors.blue : Colors.grey.shade700,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScratchPad() {
    return Column(
      children: [
        ScratchPadCanvas(
          key: _scratchPadKey,
          width: MediaQuery.of(context).size.width - 64,
          height: 200,
          service: widget.service,
          activityId: widget.activityId,
          questionId: widget.questionId,
          onRecognized: _onRecognized,
          showRecognitionResult: true,
        ),
        if (_recognition != null && _recognition!.confidence > 0.5) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _useRecognizedAnswer,
            icon: const Icon(Icons.arrow_downward, size: 16),
            label: Text('Use "${_recognition!.recognizedText}" as answer'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.blue,
              side: const BorderSide(color: Colors.blue),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAnswerInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Your Answer:',
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _answerController,
                enabled: !_isSubmitted,
                keyboardType: TextInputType.text,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                ),
                decoration: InputDecoration(
                  hintText: 'Enter your answer',
                  hintStyle: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.normal,
                    color: Colors.grey.shade400,
                  ),
                  filled: true,
                  fillColor: _isSubmitted
                      ? (_isCorrect == true
                          ? Colors.green.shade50
                          : Colors.red.shade50)
                      : Colors.grey.shade100,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                  suffixIcon: _isSubmitted
                      ? Icon(
                          _isCorrect == true ? Icons.check_circle : Icons.cancel,
                          color: _isCorrect == true ? Colors.green : Colors.red,
                        )
                      : null,
                ),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton(
              onPressed: _isSubmitted ? null : _submitAnswer,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                backgroundColor: Colors.blue,
              ),
              child: Text(_isSubmitted ? 'Submitted' : 'Submit'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFeedback() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _isCorrect == true ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _isCorrect == true ? Colors.green.shade200 : Colors.red.shade200,
        ),
      ),
      child: Row(
        children: [
          Icon(
            _isCorrect == true ? Icons.celebration : Icons.info_outline,
            color: _isCorrect == true ? Colors.green : Colors.red,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _feedback!,
              style: TextStyle(
                color: _isCorrect == true
                    ? Colors.green.shade800
                    : Colors.red.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Type of math question
enum MathQuestionType {
  freeResponse,
  multipleChoice,
  fillInBlank,
  matching,
}

/// Wrapper to add scratch pad FAB to any math activity screen
class MathActivityWithScratchPad extends StatelessWidget {
  final Widget child;
  final ScratchPadService service;
  final String activityId;
  final String? currentQuestionId;
  final String? currentQuestionText;
  final void Function(String answer)? onScratchPadAnswer;

  const MathActivityWithScratchPad({
    super.key,
    required this.child,
    required this.service,
    required this.activityId,
    this.currentQuestionId,
    this.currentQuestionText,
    this.onScratchPadAnswer,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      floatingActionButton: ScratchPadFAB(
        service: service,
        activityId: activityId,
        questionId: currentQuestionId,
        questionText: currentQuestionText,
        onAnswerSubmit: onScratchPadAnswer,
      ),
    );
  }
}
