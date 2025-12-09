import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../subscription/subscription_controller.dart';
import '../subscription/subscription_models.dart';

/// Screen for setting up payment method and starting trial.
class PaymentSetupScreen extends ConsumerStatefulWidget {
  const PaymentSetupScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<PaymentSetupScreen> createState() => _PaymentSetupScreenState();
}

class _PaymentSetupScreenState extends ConsumerState<PaymentSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cardNumberController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvcController = TextEditingController();
  final _nameController = TextEditingController();
  
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvcController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final subscriptionState = ref.watch(subscriptionControllerProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final selectedModules = subscriptionState.selectedPremiumModules;
    final plan = subscriptionState.premiumPlan;
    final trialEndDate = DateTime.now().add(const Duration(days: 30));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Setup'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'Start Your Free Trial',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Add a payment method to start your 30-day free trial. You won\'t be charged today.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),

            // Selected modules summary
            _SelectedModulesSummary(
              selectedModules: selectedModules,
              plan: plan,
              trialEndDate: trialEndDate,
              theme: theme,
              colorScheme: colorScheme,
            ),
            const SizedBox(height: 24),

            // Payment form
            Text(
              'Payment Method',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            // Card input form
            // Note: In production, use Stripe's CardField widget from flutter_stripe package
            // This is a simplified form for demonstration
            _CardInputForm(
              formKey: _formKey,
              cardNumberController: _cardNumberController,
              expiryController: _expiryController,
              cvcController: _cvcController,
              nameController: _nameController,
              theme: theme,
              colorScheme: colorScheme,
            ),
            const SizedBox(height: 16),

            // Security note
            Row(
              children: [
                Icon(Icons.lock, size: 16, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Your payment info is encrypted and secure. Powered by Stripe.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Error message
            if (_errorMessage != null || subscriptionState.error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: colorScheme.onErrorContainer),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage ?? subscriptionState.error!,
                        style: TextStyle(color: colorScheme.onErrorContainer),
                      ),
                    ),
                  ],
                ),
              ),

            // CTA Button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: (_isProcessing || subscriptionState.isLoading)
                    ? null
                    : _startTrial,
                child: _isProcessing || subscriptionState.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Start 30-Day Free Trial'),
              ),
            ),
            const SizedBox(height: 12),

            // Terms
            Center(
              child: Text(
                'By starting your trial, you agree to our Terms of Service and Privacy Policy.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                'You\'ll be charged ${plan?.priceDisplay ?? '\$14.99/month'} after the trial ends unless you cancel.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _startTrial() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final controller = ref.read(subscriptionControllerProvider.notifier);

      // In production: Use Stripe SDK to create payment method
      // stripe.createPaymentMethod(params) -> returns pm_xxx
      // For now, simulate with a mock payment method ID
      final paymentMethodId = 'pm_mock_${DateTime.now().millisecondsSinceEpoch}';

      // Attach payment method
      final attached = await controller.attachPaymentMethod(paymentMethodId);
      if (!attached) {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Failed to attach payment method. Please try again.';
        });
        return;
      }

      // Start subscription with 30-day trial
      final subscriptionState = ref.read(subscriptionControllerProvider);
      final planSku = subscriptionState.premiumPlan?.sku ?? 'PARENT_PREMIUM_MONTHLY';
      
      final result = await controller.startSubscription(
        planSku: planSku,
        trialDays: 30,
        metadata: {
          'learnerId': widget.learnerId,
          'learnerName': widget.learnerName,
          'selectedModules': subscriptionState.selectedPremiumModules
              .map((m) => m.code)
              .toList(),
        },
      );

      if (result != null && mounted) {
        // Success! Show confirmation and navigate
        _showSuccessDialog();
      } else {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Failed to start subscription. Please try again.';
        });
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _errorMessage = 'An error occurred: $e';
      });
    }
  }

  void _showSuccessDialog() {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final trialEndDate = DateTime.now().add(const Duration(days: 30));
    final formattedDate = '${trialEndDate.month}/${trialEndDate.day}/${trialEndDate.year}';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: Icon(
          Icons.celebration,
          size: 48,
          color: colorScheme.primary,
        ),
        title: const Text('Trial Started!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${widget.learnerName}\'s premium learning journey begins now!',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer.withOpacity(0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.calendar_today, size: 16, color: colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Trial ends: $formattedDate',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/dashboard');
            },
            child: const Text('Start Learning'),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

class _SelectedModulesSummary extends StatelessWidget {
  const _SelectedModulesSummary({
    required this.selectedModules,
    required this.plan,
    required this.trialEndDate,
    required this.theme,
    required this.colorScheme,
  });

  final Set<PremiumModule> selectedModules;
  final Plan? plan;
  final DateTime trialEndDate;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    final formattedDate = '${trialEndDate.month}/${trialEndDate.day}/${trialEndDate.year}';

    return Card(
      elevation: 0,
      color: colorScheme.primaryContainer.withOpacity(0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your Trial Includes',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            // Basic modules
            Row(
              children: [
                Icon(Icons.check_circle, size: 18, color: colorScheme.primary),
                const SizedBox(width: 8),
                const Text('Basic: ELA + Math'),
                const Spacer(),
                Text('Included', style: TextStyle(color: colorScheme.primary)),
              ],
            ),
            const SizedBox(height: 8),

            // Premium modules
            ...selectedModules.map((module) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle, size: 18, color: colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(module.displayName),
                    ],
                  ),
                )),

            const Divider(height: 24),

            // Trial info
            Row(
              children: [
                Icon(Icons.calendar_today, size: 18, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('30-day free trial'),
                      Text(
                        'Trial ends $formattedDate',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Price after trial
            Row(
              children: [
                Icon(Icons.payments, size: 18, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Text('Then ${plan?.priceDisplay ?? '\$14.99/month'}'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CardInputForm extends StatelessWidget {
  const _CardInputForm({
    required this.formKey,
    required this.cardNumberController,
    required this.expiryController,
    required this.cvcController,
    required this.nameController,
    required this.theme,
    required this.colorScheme,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController cardNumberController;
  final TextEditingController expiryController;
  final TextEditingController cvcController;
  final TextEditingController nameController;
  final ThemeData theme;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    // Note: In production, replace this with Stripe's CardField widget
    // from the flutter_stripe package for PCI compliance
    return Form(
      key: formKey,
      child: Column(
        children: [
          // Card number
          TextFormField(
            controller: cardNumberController,
            decoration: const InputDecoration(
              labelText: 'Card Number',
              hintText: '4242 4242 4242 4242',
              prefixIcon: Icon(Icons.credit_card),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              _CardNumberFormatter(),
            ],
            validator: (value) {
              if (value == null || value.replaceAll(' ', '').length < 16) {
                return 'Please enter a valid card number';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Expiry and CVC row
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: expiryController,
                  decoration: const InputDecoration(
                    labelText: 'Expiry',
                    hintText: 'MM/YY',
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    _ExpiryFormatter(),
                  ],
                  validator: (value) {
                    if (value == null || value.length < 5) {
                      return 'Invalid';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextFormField(
                  controller: cvcController,
                  decoration: const InputDecoration(
                    labelText: 'CVC',
                    hintText: '123',
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.length < 3) {
                      return 'Invalid';
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Cardholder name
          TextFormField(
            controller: nameController,
            decoration: const InputDecoration(
              labelText: 'Cardholder Name',
              hintText: 'John Doe',
              prefixIcon: Icon(Icons.person),
            ),
            textCapitalization: TextCapitalization.words,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter the cardholder name';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INPUT FORMATTERS
// ══════════════════════════════════════════════════════════════════════════════

class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(' ', '');
    if (text.length > 16) {
      return oldValue;
    }

    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      if ((i + 1) % 4 == 0 && i + 1 != text.length) {
        buffer.write(' ');
      }
    }

    return TextEditingValue(
      text: buffer.toString(),
      selection: TextSelection.collapsed(offset: buffer.length),
    );
  }
}

class _ExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll('/', '');
    if (text.length > 4) {
      return oldValue;
    }

    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      if (i == 1 && text.length > 2) {
        buffer.write('/');
      }
    }

    return TextEditingValue(
      text: buffer.toString(),
      selection: TextSelection.collapsed(offset: buffer.length),
    );
  }
}
