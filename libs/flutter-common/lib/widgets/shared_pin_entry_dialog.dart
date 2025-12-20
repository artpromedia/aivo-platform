import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';
import '../shared_device/shared_device.dart';

/// Dialog for entering a learner's PIN on shared devices.
///
/// Shows the learner's name and a PIN entry field.
/// Provides feedback on incorrect attempts and lockout.
class SharedPinEntryDialog extends StatefulWidget {
  final RosterLearner learner;
  final SharedDeviceService service;
  final void Function(SharedDeviceSession session) onSuccess;
  final VoidCallback onCancel;
  final VoidCallback? onForgotPin;

  const SharedPinEntryDialog({
    super.key,
    required this.learner,
    required this.service,
    required this.onSuccess,
    required this.onCancel,
    this.onForgotPin,
  });

  @override
  State<SharedPinEntryDialog> createState() => _SharedPinEntryDialogState();
}

class _SharedPinEntryDialogState extends State<SharedPinEntryDialog> {
  final _pinController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isLoading = false;
  String? _error;
  bool _obscurePin = true;

  @override
  void initState() {
    super.initState();
    // Auto-focus the PIN field
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _pinController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _submitPin() async {
    final pin = _pinController.text.trim();
    if (pin.isEmpty) {
      setState(() => _error = 'Please enter your PIN');
      return;
    }

    if (pin.length < 4) {
      setState(() => _error = 'PIN must be at least 4 digits');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final session = await widget.service.startSession(
        widget.learner.learnerId,
        pin,
      );
      widget.onSuccess(session);
    } on SharedDeviceException catch (e) {
      setState(() => _error = e.message);
      _pinController.clear();
      _focusNode.requestFocus();
    } catch (e) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;
    final learner = widget.learner;

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header with learner info
              Row(
                children: [
                  _buildAvatar(learner, colors),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back!',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                        Text(
                          learner.displayName,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: _isLoading ? null : widget.onCancel,
                    tooltip: 'Cancel',
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // PIN entry
              Text(
                'Enter your PIN',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pinController,
                focusNode: _focusNode,
                decoration: InputDecoration(
                  hintText: '••••',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePin ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () => setState(() => _obscurePin = !_obscurePin),
                    tooltip: _obscurePin ? 'Show PIN' : 'Hide PIN',
                  ),
                  border: const OutlineInputBorder(),
                  errorText: _error,
                  errorMaxLines: 2,
                ),
                obscureText: _obscurePin,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                style: theme.textTheme.headlineSmall?.copyWith(
                  letterSpacing: 8,
                ),
                textAlign: TextAlign.center,
                onSubmitted: (_) => _submitPin(),
              ),
              const SizedBox(height: 24),

              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Forgot PIN link
                  if (widget.onForgotPin != null)
                    TextButton(
                      onPressed: _isLoading ? null : widget.onForgotPin,
                      child: const Text('Forgot PIN?'),
                    )
                  else
                    const SizedBox.shrink(),

                  // Submit button
                  FilledButton.icon(
                    onPressed: _isLoading ? null : _submitPin,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.login),
                    label: Text(_isLoading ? 'Signing in...' : 'Sign In'),
                  ),
                ],
              ),

              // Help text
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 14,
                    color: colors.textSecondary,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'If you forgot your PIN, ask your teacher',
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
    );
  }

  Widget _buildAvatar(RosterLearner learner, AivoColors colors) {
    final initials = _getInitials(learner.displayName);

    if (learner.avatarUrl != null) {
      return CircleAvatar(
        radius: 28,
        backgroundImage: NetworkImage(learner.avatarUrl!),
        onBackgroundImageError: (_, __) {},
        child: Text(initials),
      );
    }

    // Generate consistent color from learner ID
    final colorIndex = learner.learnerId.hashCode % _avatarColors.length;
    final bgColor = _avatarColors[colorIndex];

    return CircleAvatar(
      radius: 28,
      backgroundColor: bgColor,
      child: Text(
        initials,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  static List<Color> get _avatarColors => AivoBrand.avatarColors;
}

/// Show the PIN entry dialog and return the result.
///
/// Returns the session on success, null on cancel.
Future<SharedDeviceSession?> showSharedPinEntryDialog({
  required BuildContext context,
  required RosterLearner learner,
  required SharedDeviceService service,
  VoidCallback? onForgotPin,
}) async {
  return showDialog<SharedDeviceSession>(
    context: context,
    barrierDismissible: false,
    builder: (context) => SharedPinEntryDialog(
      learner: learner,
      service: service,
      onSuccess: (session) => Navigator.of(context).pop(session),
      onCancel: () => Navigator.of(context).pop(null),
      onForgotPin: onForgotPin,
    ),
  );
}
