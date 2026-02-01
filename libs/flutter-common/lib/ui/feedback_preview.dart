/// Feedback Components Preview Gallery
///
/// Interactive demonstration of all feedback components:
/// - Dialog/Modal
/// - Snackbar/Toast
/// - Loading states
/// - Alert banners
/// - Empty states
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';
import 'aivo_alert_banner.dart';
import 'aivo_dialog.dart';
import 'aivo_empty_state.dart';
import 'aivo_loading.dart';
import 'aivo_snackbar.dart';

/// Preview gallery for feedback components.
class FeedbackPreview extends StatelessWidget {
  const FeedbackPreview({super.key, this.gradeBand});

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feedback Components'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionHeader(title: 'Dialogs'),
          _DialogDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Snackbars & Toasts'),
          _SnackbarDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Loading States'),
          _LoadingDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Alert Banners'),
          _AlertDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Empty States'),
          _EmptyStateDemo(gradeBand: gradeBand),
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 2,
            width: 48,
            color: theme.colorScheme.primary,
          ),
        ],
      ),
    );
  }
}

class _DialogDemo extends StatelessWidget {
  const _DialogDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FilledButton(
          onPressed: () => _showBasicDialog(context),
          child: const Text('Basic Dialog'),
        ),
        FilledButton(
          onPressed: () => _showConfirmDialog(context),
          child: const Text('Confirm Dialog'),
        ),
        FilledButton(
          onPressed: () => _showAlertDialog(context),
          child: const Text('Alert Dialogs'),
        ),
        FilledButton(
          onPressed: () => _showBottomSheet(context),
          child: const Text('Bottom Sheet'),
        ),
      ],
    );
  }

  void _showBasicDialog(BuildContext context) {
    AivoDialog.show(
      context,
      gradeBand: gradeBand,
      title: 'Basic Dialog',
      description: 'This is a basic dialog with header, content, and footer.',
      child: const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Text(
          'Dialog content goes here. This can be any widget including forms, '
          'lists, or custom content.',
        ),
      ),
      footer: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _showConfirmDialog(BuildContext context) {
    AivoConfirmDialog.show(
      context,
      gradeBand: gradeBand,
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed with this action?',
      confirmLabel: 'Proceed',
      onConfirm: () {
        AivoSnackbar.showSuccess(context, 'Action confirmed!');
      },
    );
  }

  void _showAlertDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Alert Dialog Variants',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            for (final variant in AivoAlertVariant.values) ...[
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  AivoAlertDialog.show(
                    context,
                    gradeBand: gradeBand,
                    variant: variant,
                    title: '${variant.name.toUpperCase()} Alert',
                    message: 'This is a ${variant.name} alert dialog.',
                  );
                },
                child: Text(variant.name),
              ),
              const SizedBox(height: 8),
            ],
          ],
        ),
      ),
    );
  }

  void _showBottomSheet(BuildContext context) {
    AivoBottomSheet.show(
      context,
      gradeBand: gradeBand,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Bottom Sheet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'This is a modal bottom sheet with a drag handle.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SnackbarDemo extends StatelessWidget {
  const _SnackbarDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Snackbar Variants:'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: () => AivoSnackbar.show(
                context,
                message: 'This is a neutral snackbar',
                gradeBand: gradeBand,
              ),
              child: const Text('Neutral'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AivoBrand.success,
              ),
              onPressed: () => AivoSnackbar.showSuccess(
                context,
                'Action completed successfully!',
                gradeBand: gradeBand,
              ),
              child: const Text('Success'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AivoBrand.warning,
                foregroundColor: Colors.black87,
              ),
              onPressed: () => AivoSnackbar.showWarning(
                context,
                'Please review before proceeding',
                gradeBand: gradeBand,
              ),
              child: const Text('Warning'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
              onPressed: () => AivoSnackbar.showError(
                context,
                'An error occurred',
                gradeBand: gradeBand,
              ),
              child: const Text('Error'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AivoBrand.info,
              ),
              onPressed: () => AivoSnackbar.showInfo(
                context,
                'Here\'s some helpful information',
                gradeBand: gradeBand,
              ),
              child: const Text('Info'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text('With action:'),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () => AivoSnackbar.show(
            context,
            message: 'Item deleted',
            actionLabel: 'Undo',
            onAction: () {
              AivoSnackbar.showSuccess(context, 'Item restored');
            },
            gradeBand: gradeBand,
          ),
          child: const Text('Snackbar with Action'),
        ),
        const SizedBox(height: 16),
        const Text('Overlay Toast (independent of Scaffold):'),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () {
            AivoToastController.instance.show(
              context,
              AivoToastConfig(
                message: 'This is an overlay toast',
                title: 'Toast Title',
                variant: AivoToastVariant.success,
                showCloseButton: true,
                gradeBand: gradeBand,
              ),
            );
          },
          child: const Text('Show Overlay Toast'),
        ),
      ],
    );
  }
}

class _LoadingDemo extends StatefulWidget {
  const _LoadingDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  State<_LoadingDemo> createState() => _LoadingDemoState();
}

class _LoadingDemoState extends State<_LoadingDemo> {
  bool _isLoading = false;
  double _progress = 0.5;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Spinners
        const Text('Spinners:'),
        const SizedBox(height: 12),
        Row(
          children: [
            Column(
              children: [
                AivoSpinner.small(),
                const SizedBox(height: 4),
                Text('Small', style: theme.textTheme.labelSmall),
              ],
            ),
            const SizedBox(width: 24),
            Column(
              children: [
                AivoSpinner.medium(),
                const SizedBox(height: 4),
                Text('Medium', style: theme.textTheme.labelSmall),
              ],
            ),
            const SizedBox(width: 24),
            Column(
              children: [
                AivoSpinner.large(),
                const SizedBox(height: 4),
                Text('Large', style: theme.textTheme.labelSmall),
              ],
            ),
          ],
        ),
        const SizedBox(height: 24),
        // Progress indicators
        const Text('Progress Indicators:'),
        const SizedBox(height: 12),
        AivoLinearProgress(
          value: _progress,
          gradeBand: widget.gradeBand,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            const Text('Progress: '),
            Expanded(
              child: Slider(
                value: _progress,
                onChanged: (v) => setState(() => _progress = v),
              ),
            ),
            AivoCircularProgress(
              value: _progress,
              showPercentage: true,
              size: 56,
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text('Indeterminate:'),
        const SizedBox(height: 8),
        const AivoLinearProgress(),
        const SizedBox(height: 24),
        // Skeletons
        const Text('Skeleton Loaders:'),
        const SizedBox(height: 12),
        Row(
          children: [
            AivoSkeleton.circle(size: 48, gradeBand: widget.gradeBand),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AivoSkeleton(
                    width: 120,
                    height: 14,
                    gradeBand: widget.gradeBand,
                  ),
                  const SizedBox(height: 8),
                  AivoSkeleton(height: 12, gradeBand: widget.gradeBand),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        AivoCardSkeleton(gradeBand: widget.gradeBand),
        const SizedBox(height: 16),
        AivoListItemSkeleton(gradeBand: widget.gradeBand),
        AivoListItemSkeleton(gradeBand: widget.gradeBand),
        const SizedBox(height: 24),
        // Loading overlay
        const Text('Loading Overlay:'),
        const SizedBox(height: 12),
        SizedBox(
          height: 150,
          child: AivoLoadingOverlay(
            isLoading: _isLoading,
            message: 'Loading...',
            gradeBand: widget.gradeBand,
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text('Content behind overlay'),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () {
            setState(() => _isLoading = true);
            Future.delayed(const Duration(seconds: 2), () {
              if (mounted) setState(() => _isLoading = false);
            });
          },
          child: const Text('Toggle Loading'),
        ),
      ],
    );
  }
}

class _AlertDemo extends StatelessWidget {
  const _AlertDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AivoAlertBanner.info(
          title: 'Information',
          description: 'This is an informational alert banner.',
          gradeBand: gradeBand,
        ),
        const SizedBox(height: 12),
        AivoAlertBanner.success(
          title: 'Success',
          description: 'Operation completed successfully.',
          gradeBand: gradeBand,
        ),
        const SizedBox(height: 12),
        AivoAlertBanner.warning(
          title: 'Warning',
          description: 'Please review this carefully before proceeding.',
          gradeBand: gradeBand,
        ),
        const SizedBox(height: 12),
        AivoAlertBanner.error(
          title: 'Error',
          description: 'Something went wrong. Please try again.',
          onDismiss: () {},
          gradeBand: gradeBand,
        ),
        const SizedBox(height: 12),
        AivoAlertBanner(
          title: 'With Action',
          description: 'Alert with an action button.',
          variant: AivoAlertBannerVariant.info,
          action: TextButton(
            onPressed: () {},
            child: const Text('Learn more'),
          ),
          gradeBand: gradeBand,
        ),
        const SizedBox(height: 16),
        const Text('Inline Alerts:'),
        const SizedBox(height: 8),
        const AivoInlineAlert(
          message: 'This field is required',
          variant: AivoAlertBannerVariant.error,
        ),
        const AivoInlineAlert(
          message: 'Changes saved automatically',
          variant: AivoAlertBannerVariant.success,
        ),
      ],
    );
  }
}

class _EmptyStateDemo extends StatelessWidget {
  const _EmptyStateDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 250,
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: AivoEmptyState.noData(
            description: 'Start by creating your first item.',
            actionLabel: 'Create Item',
            onAction: () {},
            gradeBand: gradeBand,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          height: 200,
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: AivoEmptyState.noResults(
            onAction: () {},
            gradeBand: gradeBand,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          height: 200,
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: AivoEmptyState.error(
            onAction: () {},
            gradeBand: gradeBand,
          ),
        ),
        const SizedBox(height: 16),
        const Text('Inline Empty State:'),
        const SizedBox(height: 8),
        const AivoInlineEmptyState(
          message: 'No items to display',
          icon: Icons.inbox_outlined,
        ),
        const SizedBox(height: 16),
        const Text('Placeholder:'),
        const SizedBox(height: 8),
        AivoPlaceholder(
          label: 'Feature Coming Soon',
          icon: Icons.construction_outlined,
          height: 120,
          gradeBand: gradeBand,
        ),
      ],
    );
  }
}
