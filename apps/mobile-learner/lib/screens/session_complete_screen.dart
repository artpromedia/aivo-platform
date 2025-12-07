import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

class SessionCompleteScreen extends StatelessWidget {
  const SessionCompleteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    return Scaffold(
      appBar: AppBar(title: Text(strings.sessionComplete)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.celebration, size: 64, color: Colors.amber),
            const SizedBox(height: 16),
            Text('Great job!', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('You finished today\'s plan.', style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/pin'),
              child: const Text('Back to PIN'),
            ),
          ],
        ),
      ),
    );
  }
}
