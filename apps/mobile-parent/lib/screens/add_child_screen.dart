import 'package:flutter/material.dart';

class AddChildScreen extends StatelessWidget {
  const AddChildScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Child')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(decoration: const InputDecoration(labelText: 'Child name')),
            const SizedBox(height: 12),
            TextField(decoration: const InputDecoration(labelText: 'Grade')),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Child added (placeholder)')),
                );
                Navigator.of(context).maybePop();
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }
}
