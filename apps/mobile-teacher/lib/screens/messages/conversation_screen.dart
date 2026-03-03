/// Conversation Detail Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen showing message conversation.
class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _imagePicker = ImagePicker();

  final List<XFile> _pendingAttachments = [];
  // ignore: unused_field - reserved for future file upload status UI
  final bool _isUploadingAttachment = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Pick photo from gallery
  Future<void> _pickPhoto() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null && mounted) {
        setState(() {
          _pendingAttachments.add(image);
        });
        _showAttachmentPreview(image);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image: $e')),
        );
      }
    }
  }

  /// Capture photo using camera
  Future<void> _captureFromCamera() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null && mounted) {
        setState(() {
          _pendingAttachments.add(image);
        });
        _showAttachmentPreview(image);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to capture image: $e')),
        );
      }
    }
  }

  /// Pick document using file picker
  Future<void> _pickDocument() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'rtf'],
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty && mounted) {
        final file = result.files.first;
        if (file.path != null) {
          final xFile = XFile(file.path!);
          setState(() {
            _pendingAttachments.add(xFile);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Document attached: ${file.name}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick document: $e')),
        );
      }
    }
  }

  /// Show preview of selected attachment
  void _showAttachmentPreview(XFile file) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.attachment, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Attached: ${file.name}',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () {
                setState(() {
                  _pendingAttachments.remove(file);
                });
                ScaffoldMessenger.of(context).hideCurrentSnackBar();
              },
            ),
          ],
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  /// Remove a pending attachment
  void _removeAttachment(XFile file) {
    setState(() {
      _pendingAttachments.remove(file);
    });
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(conversationMessagesProvider(widget.conversationId));
    final state = ref.watch(messagesProvider);
    final conversation = state.conversations
        .where((c) => c.id == widget.conversationId)
        .firstOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Text(conversation?.participantNames.join(', ') ?? 'Conversation'),
      ),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (messages) => _MessageList(
                messages: messages,
                scrollController: _scrollController,
              ),
            ),
          ),
          _MessageInput(
            controller: _messageController,
            onSend: _sendMessage,
            onPickPhoto: _pickPhoto,
            onCaptureCamera: _captureFromCamera,
            onPickDocument: _pickDocument,
            pendingAttachments: _pendingAttachments,
            onRemoveAttachment: _removeAttachment,
          ),
        ],
      ),
    );
  }

  void _sendMessage() {
    if (_messageController.text.isEmpty) return;

    ref.read(messagesProvider.notifier).sendMessage(
      SendMessageDto(
        conversationId: widget.conversationId,
        content: _messageController.text,
      ),
    );

    _messageController.clear();
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({
    required this.messages,
    required this.scrollController,
  });

  final List<Message> messages;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty) {
      return const Center(child: Text('No messages yet'));
    }

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final showDate = index == 0 ||
            !_isSameDay(messages[index - 1].createdAt, message.createdAt);

        return Column(
          children: [
            if (showDate)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  _formatDate(message.createdAt),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            _MessageBubble(message: message),
          ],
        );
      },
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    if (_isSameDay(date, now)) return 'Today';
    if (_isSameDay(date, now.subtract(const Duration(days: 1)))) return 'Yesterday';
    return DateFormat('MMMM d, y').format(date);
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final Message message;

  @override
  Widget build(BuildContext context) {
    final isTeacher = message.isFromTeacher;

    return Align(
      alignment: isTeacher ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isTeacher ? Colors.blue : AivoBrand.gray[200],
          borderRadius: BorderRadius.circular(20).copyWith(
            bottomRight: isTeacher ? const Radius.circular(4) : null,
            bottomLeft: !isTeacher ? const Radius.circular(4) : null,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: TextStyle(
                color: isTeacher ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('h:mm a').format(message.createdAt),
              style: TextStyle(
                fontSize: 10,
                color: isTeacher ? Colors.white70 : AivoBrand.gray,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageInput extends StatelessWidget {
  const _MessageInput({
    required this.controller,
    required this.onSend,
    required this.onPickPhoto,
    required this.onCaptureCamera,
    required this.onPickDocument,
    required this.pendingAttachments,
    required this.onRemoveAttachment,
  });

  final TextEditingController controller;
  final VoidCallback onSend;
  final VoidCallback onPickPhoto;
  final VoidCallback onCaptureCamera;
  final VoidCallback onPickDocument;
  final List<XFile> pendingAttachments;
  final void Function(XFile) onRemoveAttachment;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Show pending attachments
            if (pendingAttachments.isNotEmpty)
              SizedBox(
                height: 60,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.only(bottom: 8),
                  itemCount: pendingAttachments.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final file = pendingAttachments[index];
                    final isImage = file.name.toLowerCase().endsWith('.jpg') ||
                        file.name.toLowerCase().endsWith('.jpeg') ||
                        file.name.toLowerCase().endsWith('.png') ||
                        file.name.toLowerCase().endsWith('.gif');
                    return Stack(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: AivoBrand.gray[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            isImage ? Icons.image : Icons.insert_drive_file,
                            color: AivoBrand.gray[600],
                          ),
                        ),
                        Positioned(
                          top: -4,
                          right: -4,
                          child: GestureDetector(
                            onTap: () => onRemoveAttachment(file),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: AivoBrand.error,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.close,
                                size: 14,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.attach_file),
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      builder: (sheetContext) => SafeArea(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ListTile(
                              leading: const Icon(Icons.photo_library),
                              title: const Text('Photo Library'),
                              onTap: () {
                                Navigator.pop(sheetContext);
                                onPickPhoto();
                              },
                            ),
                            ListTile(
                              leading: const Icon(Icons.camera_alt),
                              title: const Text('Camera'),
                              onTap: () {
                                Navigator.pop(sheetContext);
                                onCaptureCamera();
                              },
                            ),
                            ListTile(
                              leading: const Icon(Icons.insert_drive_file),
                              title: const Text('Document'),
                              onTap: () {
                                Navigator.pop(sheetContext);
                                onPickDocument();
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                Expanded(
                  child: TextField(
                    controller: controller,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => onSend(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Colors.blue,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    onPressed: onSend,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
