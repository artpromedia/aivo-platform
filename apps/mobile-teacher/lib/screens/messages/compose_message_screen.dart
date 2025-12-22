/// Compose Message Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen for composing a new message.
class ComposeMessageScreen extends ConsumerStatefulWidget {
  const ComposeMessageScreen({super.key, this.studentId});

  final String? studentId;

  @override
  ConsumerState<ComposeMessageScreen> createState() => _ComposeMessageScreenState();
}

class _ComposeMessageScreenState extends ConsumerState<ComposeMessageScreen> {
  final _messageController = TextEditingController();
  String? _selectedRecipient;
  MessageTemplate? _selectedTemplate;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final templatesAsync = ref.watch(messageTemplatesProvider);
    final studentsState = ref.watch(studentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Message'),
        actions: [
          TextButton(
            onPressed: _messageController.text.isNotEmpty ? _sendMessage : null,
            child: const Text('Send'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Recipient picker
          Padding(
            padding: const EdgeInsets.all(16),
            child: DropdownButtonFormField<String?>(
              initialValue: _selectedRecipient,
              decoration: const InputDecoration(
                labelText: 'To',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
              items: studentsState.students.map((student) => DropdownMenuItem(
                value: student.id,
                child: Text('${student.firstName} ${student.lastName}\'s Parent'),
              )).toList(),
              onChanged: (v) => setState(() => _selectedRecipient = v),
            ),
          ),

          // Templates
          templatesAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (templates) => SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: templates.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final template = templates[index];
                  return ActionChip(
                    label: Text(template.name),
                    onPressed: () => _applyTemplate(template),
                  );
                },
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Message input
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _messageController,
                decoration: const InputDecoration(
                  hintText: 'Write your message...',
                  border: InputBorder.none,
                ),
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                onChanged: (_) => setState(() {}),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _applyTemplate(MessageTemplate template) {
    // Simple variable replacement
    var content = template.content;
    
    if (template.variables.contains('studentName') && _selectedRecipient != null) {
      final students = ref.read(studentsProvider).students;
      final student = students.where((s) => s.id == _selectedRecipient).firstOrNull;
      if (student != null) {
        content = content.replaceAll('{{studentName}}', student.firstName);
      }
    }
    
    if (template.variables.contains('date')) {
      content = content.replaceAll('{{date}}', 'the scheduled date');
    }

    _messageController.text = content;
    setState(() => _selectedTemplate = template);
  }

  void _sendMessage() async {
    if (_selectedRecipient == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a recipient')),
      );
      return;
    }

    // In a real app, we'd create a conversation or get existing one
    // For now, using a placeholder conversation ID
    await ref.read(messagesProvider.notifier).sendMessage(
      SendMessageDto(
        conversationId: 'conv_${_selectedRecipient}',
        content: _messageController.text,
      ),
    );

    if (!mounted) return;
    context.pop();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Message sent')),
    );
  }
}
