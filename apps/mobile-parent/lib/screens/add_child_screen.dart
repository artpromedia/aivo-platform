import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../baseline/baseline_controller.dart';
import '../learners/learner_service.dart';

/// Screen for adding a new child learner.
/// Flow: Enter details → (consent implied) → Create learner → Create baseline profile → Dashboard.
class AddChildScreen extends ConsumerStatefulWidget {
  const AddChildScreen({super.key});

  @override
  ConsumerState<AddChildScreen> createState() => _AddChildScreenState();
}

class _AddChildScreenState extends ConsumerState<AddChildScreen> {
  final _nameController = TextEditingController();
  final _gradeController = TextEditingController();
  bool _consentGranted = false;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _gradeController.dispose();
    super.dispose();
  }

  Future<void> _saveChild() async {
    final name = _nameController.text.trim();
    final gradeText = _gradeController.text.trim();

    // Validation
    if (name.isEmpty) {
      setState(() => _error = 'Please enter the child\'s name');
      return;
    }

    final grade = int.tryParse(gradeText);
    if (gradeText.isNotEmpty && (grade == null || grade < 0 || grade > 12)) {
      setState(() => _error = 'Please enter a valid grade (K=0, 1-12)');
      return;
    }

    if (!_consentGranted) {
      setState(() => _error = 'Please acknowledge the consent agreement');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final authState = ref.read(authControllerProvider);
    final tenantId = authState.tenantId;

    if (tenantId == null) {
      setState(() {
        _isLoading = false;
        _error = 'Session expired. Please log in again.';
      });
      return;
    }

    try {
      // Step 1: Create the learner (mock for now, would call learner-svc)
      final learnerId = 'learner-${DateTime.now().millisecondsSinceEpoch}';

      // Step 2: Create baseline profile for the learner
      final baselineController = ref.read(baselineControllerProvider.notifier);
      final profile = await baselineController.createProfile(
        tenantId: tenantId,
        learnerId: learnerId,
        grade: grade,
      );

      if (profile == null) {
        final baselineState = ref.read(baselineControllerProvider);
        setState(() {
          _isLoading = false;
          _error = baselineState.error ?? 'Failed to set up baseline assessment';
        });
        return;
      }

      // Invalidate children list to refresh
      ref.invalidate(childrenProvider(tenantId));

      if (mounted) {
        // Show success dialog with download instructions
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                const SizedBox(width: 12),
                Expanded(child: Text('$name Added!')),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Great! We\'ve set up $name\'s learning profile.',
                  style: theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.email_outlined, color: theme.colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'We sent you an email with instructions to download the AIVO Learner app on $name\'s device.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Next steps:',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                _buildStep('1', 'Check your email for download instructions'),
                _buildStep('2', 'Download AIVO Learner on $name\'s device'),
                _buildStep('3', '$name completes the baseline assessment'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Got it!'),
              ),
            ],
          ),
        );
        if (mounted) {
          context.pop();
        }
      }
    } catch (err) {
      setState(() {
        _isLoading = false;
        _error = 'An error occurred. Please try again.';
      });
    }
  }

  Widget _buildStep(String number, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Add Child')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Add a new learner',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Enter your child\'s information to set up their learning profile.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),

            // Name field
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Child\'s name',
                hintText: 'Enter first name',
                prefixIcon: Icon(Icons.person_outline),
              ),
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),

            // Grade field
            TextField(
              controller: _gradeController,
              decoration: const InputDecoration(
                labelText: 'Grade level',
                hintText: '0 for Kindergarten, 1-12',
                prefixIcon: Icon(Icons.school_outlined),
              ),
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
            ),
            const SizedBox(height: 24),

            // Consent checkbox
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.verified_user_outlined,
                          color: theme.colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Consent Agreement',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'By adding this child, you consent to:\n'
                      '• Aivo collecting learning data to personalize education\n'
                      '• A baseline assessment to understand your child\'s needs\n'
                      '• Regular progress tracking and reporting',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    CheckboxListTile(
                      value: _consentGranted,
                      onChanged: (value) {
                        setState(() => _consentGranted = value ?? false);
                      },
                      title: const Text('I understand and agree'),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Error message
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Card(
                  color: theme.colorScheme.errorContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: theme.colorScheme.onErrorContainer,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: theme.colorScheme.onErrorContainer,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // Save button
            FilledButton(
              onPressed: _isLoading ? null : _saveChild,
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 56), // Large hit target
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save & Set Up Baseline'),
            ),
            const SizedBox(height: 12),

            // Cancel button
            OutlinedButton(
              onPressed: _isLoading ? null : () => context.pop(),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 56),
              ),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }
}
