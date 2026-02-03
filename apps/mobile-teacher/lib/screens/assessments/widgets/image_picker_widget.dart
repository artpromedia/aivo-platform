/// Image Picker Widget for Assessments
///
/// A widget for adding images to questions and answers.
library;

import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:image_picker/image_picker.dart';

/// Model for an attached image
class QuestionImage {
  const QuestionImage({
    required this.id,
    this.url,
    this.localPath,
    this.bytes,
    this.altText,
    this.caption,
  });

  final String id;
  final String? url;
  final String? localPath;
  final Uint8List? bytes;
  final String? altText;
  final String? caption;

  bool get isLocal => bytes != null || localPath != null;
  bool get isRemote => url != null;
}

/// Widget for picking and displaying images in questions
class ImagePickerWidget extends StatelessWidget {
  const ImagePickerWidget({
    required this.images,
    required this.onImagesChanged,
    this.maxImages = 4,
    this.enabled = true,
    super.key,
  });

  final List<QuestionImage> images;
  final ValueChanged<List<QuestionImage>> onImagesChanged;
  final int maxImages;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(Icons.image_outlined, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Images',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  '${images.length}/$maxImages',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Images grid
            if (images.isEmpty)
              _EmptyImagePlaceholder(
                onAdd: enabled && images.length < maxImages
                    ? () => _pickImage(context)
                    : null,
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 1.2,
                ),
                itemCount: images.length + (images.length < maxImages ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == images.length) {
                    return _AddImageButton(
                      onTap: enabled ? () => _pickImage(context) : null,
                    );
                  }
                  return _ImageTile(
                    image: images[index],
                    enabled: enabled,
                    onEdit: () => _editImage(context, index),
                    onRemove: () => _removeImage(index),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(BuildContext context) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _ImageSourceSheet(),
    );

    if (source == null) return;

    final picker = ImagePicker();
    final XFile? pickedFile = await picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );

    if (pickedFile == null) return;

    final bytes = await pickedFile.readAsBytes();
    final newImage = QuestionImage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      localPath: pickedFile.path,
      bytes: bytes,
    );

    onImagesChanged([...images, newImage]);
  }

  void _removeImage(int index) {
    final newImages = List<QuestionImage>.from(images)..removeAt(index);
    onImagesChanged(newImages);
  }

  Future<void> _editImage(BuildContext context, int index) async {
    final image = images[index];
    final result = await showDialog<QuestionImage>(
      context: context,
      builder: (context) => _EditImageDialog(image: image),
    );

    if (result != null) {
      final newImages = List<QuestionImage>.from(images);
      newImages[index] = result;
      onImagesChanged(newImages);
    }
  }
}

class _EmptyImagePlaceholder extends StatelessWidget {
  const _EmptyImagePlaceholder({required this.onAdd});

  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onAdd,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          border: Border.all(
            color: theme.colorScheme.outlineVariant,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              Icons.add_photo_alternate_outlined,
              size: 48,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 8),
            Text(
              'Add images to your question',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Tap to add from camera or gallery',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddImageButton extends StatelessWidget {
  const _AddImageButton({required this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: theme.colorScheme.outlineVariant,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.add,
              size: 32,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 4),
            Text(
              'Add',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImageTile extends StatelessWidget {
  const _ImageTile({
    required this.image,
    required this.enabled,
    required this.onEdit,
    required this.onRemove,
  });

  final QuestionImage image;
  final bool enabled;
  final VoidCallback onEdit;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Image
          if (image.bytes != null)
            Image.memory(
              image.bytes!,
              fit: BoxFit.cover,
            )
          else if (image.url != null)
            Image.network(
              image.url!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _buildPlaceholder(theme),
            )
          else
            _buildPlaceholder(theme),

          // Gradient overlay
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.7),
                  ],
                ),
              ),
              child: image.caption != null
                  ? Text(
                      image.caption!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    )
                  : const SizedBox.shrink(),
            ),
          ),

          // Action buttons
          Positioned(
            top: 4,
            right: 4,
            child: Row(
              children: [
                _ActionButton(
                  icon: Icons.edit,
                  onTap: enabled ? onEdit : null,
                  tooltip: 'Edit',
                ),
                const SizedBox(width: 4),
                _ActionButton(
                  icon: Icons.close,
                  onTap: enabled ? onRemove : null,
                  tooltip: 'Remove',
                  color: Colors.red[400],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder(ThemeData theme) {
    return Container(
      color: theme.colorScheme.surfaceContainerHighest,
      child: Icon(
        Icons.broken_image_outlined,
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.onTap,
    required this.tooltip,
    this.color,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String tooltip;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: Icon(
              icon,
              size: 18,
              color: color ?? Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

class _ImageSourceSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Add Image',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.camera_alt,
                color: theme.colorScheme.onPrimaryContainer,
              ),
            ),
            title: const Text('Take Photo'),
            subtitle: const Text('Use camera to capture'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.photo_library,
                color: theme.colorScheme.onPrimaryContainer,
              ),
            ),
            title: const Text('Choose from Gallery'),
            subtitle: const Text('Select from device'),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _EditImageDialog extends StatefulWidget {
  const _EditImageDialog({required this.image});

  final QuestionImage image;

  @override
  State<_EditImageDialog> createState() => _EditImageDialogState();
}

class _EditImageDialogState extends State<_EditImageDialog> {
  late TextEditingController _altTextController;
  late TextEditingController _captionController;

  @override
  void initState() {
    super.initState();
    _altTextController = TextEditingController(text: widget.image.altText);
    _captionController = TextEditingController(text: widget.image.caption);
  }

  @override
  void dispose() {
    _altTextController.dispose();
    _captionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit Image'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Preview
          if (widget.image.bytes != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.memory(
                widget.image.bytes!,
                height: 120,
                fit: BoxFit.cover,
              ),
            )
          else if (widget.image.url != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                widget.image.url!,
                height: 120,
                fit: BoxFit.cover,
              ),
            ),
          const SizedBox(height: 16),

          // Alt text (accessibility)
          TextField(
            controller: _altTextController,
            decoration: const InputDecoration(
              labelText: 'Alt Text (Accessibility)',
              hintText: 'Describe the image for screen readers',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),

          // Caption
          TextField(
            controller: _captionController,
            decoration: const InputDecoration(
              labelText: 'Caption (Optional)',
              hintText: 'Add a caption below the image',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.pop(
              context,
              QuestionImage(
                id: widget.image.id,
                url: widget.image.url,
                localPath: widget.image.localPath,
                bytes: widget.image.bytes,
                altText: _altTextController.text.isEmpty
                    ? null
                    : _altTextController.text,
                caption: _captionController.text.isEmpty
                    ? null
                    : _captionController.text,
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
