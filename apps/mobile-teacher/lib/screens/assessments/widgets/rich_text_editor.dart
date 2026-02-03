/// Rich Text Editor Widget
///
/// A rich text editor for question prompts with formatting support.
library;

import 'package:flutter/material.dart';

/// Rich text editor for question prompts
class RichTextEditor extends StatefulWidget {
  const RichTextEditor({
    required this.value,
    required this.onChanged,
    this.label = 'Question Text',
    this.hint = 'Enter your question...',
    this.minLines = 3,
    this.maxLines = 10,
    this.showFormatting = true,
    this.showMathSupport = true,
    this.enabled = true,
    super.key,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final String label;
  final String hint;
  final int minLines;
  final int maxLines;
  final bool showFormatting;
  final bool showMathSupport;
  final bool enabled;

  @override
  State<RichTextEditor> createState() => _RichTextEditorState();
}

class _RichTextEditorState extends State<RichTextEditor> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  bool _showPreview = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _focusNode = FocusNode();
    _controller.addListener(_onTextChanged);
  }

  @override
  void didUpdateWidget(RichTextEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && _controller.text != widget.value) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    widget.onChanged(_controller.text);
  }

  void _insertFormatting(String prefix, String suffix) {
    final selection = _controller.selection;
    final text = _controller.text;

    if (selection.isValid && selection.start != selection.end) {
      // Wrap selected text
      final selectedText = text.substring(selection.start, selection.end);
      final newText =
          text.replaceRange(selection.start, selection.end, '$prefix$selectedText$suffix');
      _controller.text = newText;
      _controller.selection = TextSelection.collapsed(
        offset: selection.start + prefix.length + selectedText.length + suffix.length,
      );
    } else {
      // Insert at cursor
      final cursorPos = selection.baseOffset;
      final newText = text.substring(0, cursorPos) +
          '$prefix$suffix' +
          text.substring(cursorPos);
      _controller.text = newText;
      _controller.selection = TextSelection.collapsed(
        offset: cursorPos + prefix.length,
      );
    }
    _focusNode.requestFocus();
  }

  void _insertMath() {
    _showMathDialog(context);
  }

  Future<void> _showMathDialog(BuildContext context) async {
    final mathController = TextEditingController();
    
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.functions),
            SizedBox(width: 8),
            Text('Insert Math Expression'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter LaTeX math expression:',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: mathController,
              decoration: const InputDecoration(
                hintText: r'e.g., x^2 + y^2 = z^2',
                border: OutlineInputBorder(),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MathShortcut(label: 'Fraction', symbol: r'\frac{a}{b}', onTap: () {
                  mathController.text += r'\frac{a}{b}';
                }),
                _MathShortcut(label: 'Square root', symbol: r'\sqrt{x}', onTap: () {
                  mathController.text += r'\sqrt{x}';
                }),
                _MathShortcut(label: 'Power', symbol: r'^2', onTap: () {
                  mathController.text += '^2';
                }),
                _MathShortcut(label: 'Subscript', symbol: r'_n', onTap: () {
                  mathController.text += '_n';
                }),
                _MathShortcut(label: 'Sum', symbol: r'\sum', onTap: () {
                  mathController.text += r'\sum_{i=1}^{n}';
                }),
                _MathShortcut(label: 'Integral', symbol: r'\int', onTap: () {
                  mathController.text += r'\int_{a}^{b}';
                }),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, mathController.text),
            child: const Text('Insert'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      _insertFormatting(r'$', r'$');
      // Insert the math expression between the $ signs
      final cursorPos = _controller.selection.baseOffset;
      final text = _controller.text;
      _controller.text = text.substring(0, cursorPos) + result + text.substring(cursorPos);
      _controller.selection = TextSelection.collapsed(
        offset: cursorPos + result.length,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(Icons.edit_note, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  widget.label,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (widget.showFormatting)
                  IconButton(
                    icon: Icon(
                      _showPreview ? Icons.edit : Icons.preview,
                      size: 20,
                    ),
                    onPressed: () => setState(() => _showPreview = !_showPreview),
                    tooltip: _showPreview ? 'Edit' : 'Preview',
                  ),
              ],
            ),
          ),

          // Formatting toolbar
          if (widget.showFormatting && !_showPreview)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FormatButton(
                      icon: Icons.format_bold,
                      tooltip: 'Bold',
                      onPressed: widget.enabled
                          ? () => _insertFormatting('**', '**')
                          : null,
                    ),
                    _FormatButton(
                      icon: Icons.format_italic,
                      tooltip: 'Italic',
                      onPressed: widget.enabled
                          ? () => _insertFormatting('*', '*')
                          : null,
                    ),
                    _FormatButton(
                      icon: Icons.format_underlined,
                      tooltip: 'Underline',
                      onPressed: widget.enabled
                          ? () => _insertFormatting('__', '__')
                          : null,
                    ),
                    const VerticalDivider(width: 16, thickness: 1),
                    _FormatButton(
                      icon: Icons.code,
                      tooltip: 'Code',
                      onPressed: widget.enabled
                          ? () => _insertFormatting('`', '`')
                          : null,
                    ),
                    _FormatButton(
                      icon: Icons.format_list_bulleted,
                      tooltip: 'Bullet list',
                      onPressed: widget.enabled
                          ? () => _insertFormatting('\n- ', '')
                          : null,
                    ),
                    _FormatButton(
                      icon: Icons.format_list_numbered,
                      tooltip: 'Numbered list',
                      onPressed: widget.enabled
                          ? () => _insertFormatting('\n1. ', '')
                          : null,
                    ),
                    if (widget.showMathSupport) ...[
                      const VerticalDivider(width: 16, thickness: 1),
                      _FormatButton(
                        icon: Icons.functions,
                        tooltip: 'Insert math',
                        onPressed: widget.enabled ? _insertMath : null,
                      ),
                    ],
                  ],
                ),
              ),
            ),

          // Editor / Preview
          Padding(
            padding: const EdgeInsets.all(16),
            child: _showPreview
                ? _buildPreview(theme)
                : Semantics(
                    label: 'Question text editor',
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      enabled: widget.enabled,
                      minLines: widget.minLines,
                      maxLines: widget.maxLines,
                      decoration: InputDecoration(
                        hintText: widget.hint,
                        border: const OutlineInputBorder(),
                        alignLabelWithHint: true,
                      ),
                    ),
                  ),
          ),

          // Character count
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(
              '${_controller.text.length} characters',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreview(ThemeData theme) {
    // Simple markdown-like rendering
    String text = _controller.text;
    
    // Replace bold markers
    text = text.replaceAllMapped(
      RegExp(r'\*\*(.*?)\*\*'),
      (match) => '【${match.group(1)}】', // Placeholder for bold
    );
    
    // Replace italic markers
    text = text.replaceAllMapped(
      RegExp(r'\*(.*?)\*'),
      (match) => '『${match.group(1)}』', // Placeholder for italic
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      constraints: BoxConstraints(
        minHeight: widget.minLines * 24.0,
      ),
      child: Text(
        text.isEmpty ? '(No content to preview)' : text,
        style: theme.textTheme.bodyLarge?.copyWith(
          fontStyle: text.isEmpty ? FontStyle.italic : null,
          color: text.isEmpty ? theme.colorScheme.onSurfaceVariant : null,
        ),
      ),
    );
  }
}

class _FormatButton extends StatelessWidget {
  const _FormatButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: IconButton(
        icon: Icon(icon, size: 20),
        onPressed: onPressed,
        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
        padding: EdgeInsets.zero,
      ),
    );
  }
}

class _MathShortcut extends StatelessWidget {
  const _MathShortcut({
    required this.label,
    required this.symbol,
    required this.onTap,
  });

  final String label;
  final String symbol;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
    );
  }
}
