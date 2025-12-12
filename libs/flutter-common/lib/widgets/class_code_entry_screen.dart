import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n/local_strings.dart';
import '../theme/aivo_theme.dart';
import '../shared_device/shared_device.dart';

/// Screen for entering a class code on shared devices.
///
/// This is the entry point for shared/kiosk mode:
/// 1. Teacher displays class code on projector
/// 2. Learner enters code on shared device
/// 3. Device fetches roster for that classroom
class ClassCodeEntryScreen extends StatefulWidget {
  final SharedDeviceService service;
  final void Function(ClassroomRoster roster) onRosterLoaded;
  final VoidCallback? onScanQR;

  const ClassCodeEntryScreen({
    super.key,
    required this.service,
    required this.onRosterLoaded,
    this.onScanQR,
  });

  @override
  State<ClassCodeEntryScreen> createState() => _ClassCodeEntryScreenState();
}

class _ClassCodeEntryScreenState extends State<ClassCodeEntryScreen> {
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submitCode() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final roster = await widget.service.validateClassCode(_codeController.text);
      widget.onRosterLoaded(roster);
    } on SharedDeviceException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // ignore: unused_local_variable
    final strings = LocalStrings.en;
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Logo / icon
                    Icon(
                      Icons.class_outlined,
                      size: 80,
                      color: colors.primary,
                    ),
                    const SizedBox(height: 24),

                    // Title
                    Text(
                      'Join Your Class',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),

                    // Subtitle
                    Text(
                      'Enter the code shown by your teacher',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: colors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),

                    // Code input field
                    TextFormField(
                      controller: _codeController,
                      decoration: InputDecoration(
                        labelText: 'Class Code',
                        hintText: 'e.g., ABC123',
                        prefixIcon: const Icon(Icons.vpn_key_outlined),
                        border: const OutlineInputBorder(),
                        filled: true,
                        errorText: _error,
                      ),
                      textCapitalization: TextCapitalization.characters,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
                        UpperCaseTextFormatter(),
                        LengthLimitingTextInputFormatter(8),
                      ],
                      style: theme.textTheme.headlineSmall?.copyWith(
                        letterSpacing: 4,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter a class code';
                        }
                        if (value.length < 4) {
                          return 'Code should be at least 4 characters';
                        }
                        return null;
                      },
                      onFieldSubmitted: (_) => _submitCode(),
                    ),
                    const SizedBox(height: 24),

                    // Submit button
                    FilledButton.icon(
                      onPressed: _isLoading ? null : _submitCode,
                      icon: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.arrow_forward),
                      label: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          _isLoading ? 'Joining...' : 'Join Class',
                          style: const TextStyle(fontSize: 18),
                        ),
                      ),
                    ),

                    // QR scan option (if available)
                    if (widget.onScanQR != null) ...[
                      const SizedBox(height: 24),
                      const Row(
                        children: [
                          Expanded(child: Divider()),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16),
                            child: Text('or'),
                          ),
                          Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: 24),
                      OutlinedButton.icon(
                        onPressed: _isLoading ? null : widget.onScanQR,
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Text('Scan Class QR Code'),
                        ),
                      ),
                    ],

                    const SizedBox(height: 48),

                    // Help text
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 16,
                          color: colors.textSecondary,
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Ask your teacher for the class code',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Text formatter that converts input to uppercase
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}
