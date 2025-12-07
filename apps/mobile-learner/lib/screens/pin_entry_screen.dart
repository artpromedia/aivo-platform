import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

class PinEntryScreen extends StatefulWidget {
  const PinEntryScreen({super.key});

  @override
  State<PinEntryScreen> createState() => _PinEntryScreenState();
}

class _PinEntryScreenState extends State<PinEntryScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    return Scaffold(
      appBar: AppBar(title: Text(strings.pinEntry)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _controller,
              decoration: const InputDecoration(labelText: '4-digit PIN'),
              keyboardType: TextInputType.number,
              maxLength: 4,
              obscureText: true,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => context.go('/plan'),
              child: const Text('Unlock'),
            ),
          ],
        ),
      ),
    );
  }
}
