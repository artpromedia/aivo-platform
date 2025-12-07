import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../pin/pin_controller.dart';
import '../pin/pin_state.dart';
import '../learner/theme_loader.dart';

class PinEntryScreen extends ConsumerStatefulWidget {
  const PinEntryScreen({super.key});

  @override
  ConsumerState<PinEntryScreen> createState() => _PinEntryScreenState();
}

class _PinEntryScreenState extends ConsumerState<PinEntryScreen> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pin = _controller.text.trim();
    if (pin.length < 4 || pin.length > 6) {
      setState(() => _error = 'Enter a 4–6 digit PIN');
      return;
    }
    setState(() => _error = null);
    await ref.read(pinControllerProvider.notifier).validatePin(pin);
    final state = ref.read(pinControllerProvider);
    if (state.status == PinStatus.unauthenticated && state.error != null) {
      setState(() => _error = state.error);
    }
    if (state.isAuthenticated) {
      final learnerId = state.learnerId!;
      await loadAndApplyLearnerTheme(ref, learnerId);
      if (mounted) context.go('/plan');
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    final pinState = ref.watch(pinControllerProvider);
    final isLoading = pinState.status == PinStatus.loading;

    return Scaffold(
      appBar: AppBar(title: Text(strings.pinEntry)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Enter your learner PIN', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              decoration: const InputDecoration(labelText: '4–6 digit PIN'),
              keyboardType: TextInputType.number,
              maxLength: 6,
              obscureText: true,
              onSubmitted: (_) => _submit(),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: isLoading ? null : _submit,
              child: isLoading
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Unlock'),
            ),
          ],
        ),
      ),
    );
  }
}
