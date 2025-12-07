import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';

class ParentDashboardScreen extends ConsumerWidget {
  const ParentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = LocalStrings.en;
    final authState = ref.watch(authControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(strings.parentDashboard),
        actions: [
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome, parent!', style: Theme.of(context).textTheme.headlineSmall),
            if (authState.status == AuthStatus.authenticated)
              Text('Tenant: ${authState.tenantId}', style: Theme.of(context).textTheme.bodySmall),
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
