import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

class ParentDashboardScreen extends StatelessWidget {
  const ParentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    return Scaffold(
      appBar: AppBar(title: Text(strings.parentDashboard)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome, parent!', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                title: const Text('Child Profiles'),
                subtitle: const Text('Manage learners linked to your account'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/add-child'),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              icon: const Icon(Icons.person_add_alt),
              label: Text(strings.addChild),
              onPressed: () => context.push('/add-child'),
            ),
          ],
        ),
      ),
    );
  }
}
