import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:image_picker/image_picker.dart';

/// Entry screen for the Homework Helper feature.
/// Shows a friendly intro explaining the feature and options to start.
class HomeworkHelperIntroScreen extends ConsumerStatefulWidget {
  const HomeworkHelperIntroScreen({super.key, required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<HomeworkHelperIntroScreen> createState() => _HomeworkHelperIntroScreenState();
}

class _HomeworkHelperIntroScreenState extends ConsumerState<HomeworkHelperIntroScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isPickingImage = false;

  Future<void> _pickImage(ImageSource source) async {
    if (_isPickingImage) return;

    setState(() => _isPickingImage = true);

    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null && mounted) {
        // Navigate to the homework input screen with the image path
        context.push('/homework/input', extra: {
          'learnerId': widget.learnerId,
          'imagePath': image.path,
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              source == ImageSource.camera
                  ? 'Could not access the camera. Please check permissions.'
                  : 'Could not access photos. Please check permissions.',
            ),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isPickingImage = false);
      }
    }
  }

  void _showImageSourcePicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Add a photo of your homework',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Take a photo'),
                subtitle: const Text('Use your camera to capture the question'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from gallery'),
                subtitle: const Text('Select an existing photo'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = ref.watch(gradeBandProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Back button
              Align(
                alignment: Alignment.topLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.pop(),
                  tooltip: 'Go back',
                ),
              ),

              const Spacer(flex: 1),

              // Hero illustration
              _buildIllustration(theme, gradeBand),

              const SizedBox(height: 32),

              // Title
              Text(
                'Homework Helper',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Description (grade-band appropriate)
              Text(
                _descriptionForGrade(gradeBand),
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 8),

              // Disclaimer (no direct answers)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'I\'ll guide you through each step - you\'ll do the thinking!',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(flex: 2),

              // Action buttons
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => context.push('/homework/input', extra: widget.learnerId),
                  icon: const Icon(Icons.edit_note),
                  label: const Text('Type or paste your question'),
                ),
              ),

              const SizedBox(height: 12),

              // Camera/image option
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isPickingImage ? null : _showImageSourcePicker,
                  icon: _isPickingImage
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.camera_alt_outlined),
                  label: Text(_isPickingImage ? 'Processing...' : 'Take a picture'),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIllustration(ThemeData theme, AivoGradeBand gradeBand) {
    // Grade-band appropriate icon/illustration
    final iconData = switch (gradeBand) {
      AivoGradeBand.k5 => Icons.auto_stories, // Book for younger
      AivoGradeBand.g6_8 => Icons.school, // School for middle
      AivoGradeBand.g9_12 => Icons.psychology, // Brain for older
    };

    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        shape: BoxShape.circle,
      ),
      child: Icon(
        iconData,
        size: 60,
        color: theme.colorScheme.primary,
      ),
    );
  }

  String _descriptionForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Stuck on your homework? I can help you figure it out step by step. Let\'s learn together!',
      AivoGradeBand.g6_8 => 'Need help with an assignment? I\'ll break it down into steps and guide you through the problem.',
      AivoGradeBand.g9_12 => 'Need homework assistance? I\'ll provide scaffolded guidance to help you work through the problem methodically.',
    };
  }
}
