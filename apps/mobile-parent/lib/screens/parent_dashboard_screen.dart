import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../learners/learner_service.dart';

class ParentDashboardScreen extends ConsumerWidget {
  const ParentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = LocalStrings.en;
    final authState = ref.watch(authControllerProvider);
    final learnersAsync = authState.tenantId == null
        ? const AsyncValue<List<Learner>>.data([])
        : ref.watch(childrenProvider(authState.tenantId!));
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
            const SizedBox(height: 20),
            Text('Preview learner themes', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            learnersAsync.when(
              data: (learners) {
                if (learners.isEmpty) {
                  return const Text('No learners linked yet');
                }
                return Column(
                  children: learners
                      .map(
                        (learner) {
                          final band = bandFromGrade(learner.grade);
                          final label = _bandLabel(band);
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Theme(
                              data: themeForBand(band),
                              child: Builder(
                                builder: (previewContext) => Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: Theme.of(previewContext).colorScheme.primary,
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            '${learner.name} • Grade ${learner.grade ?? '—'}',
                                            style: Theme.of(previewContext)
                                                .textTheme
                                                .labelLarge
                                                ?.copyWith(color: Theme.of(previewContext).colorScheme.onPrimary),
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            Chip(
                                              label: Text(label),
                                              backgroundColor: Theme.of(previewContext)
                                                  .colorScheme
                                                  .primary
                                                  .withOpacity(0.12),
                                              labelStyle: TextStyle(
                                                color: Theme.of(previewContext).colorScheme.primary,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text('Themed preview',
                                                style: Theme.of(previewContext).textTheme.titleMedium),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Chip(label: const Text('Chip')),
                                            const SizedBox(width: 8),
                                            FilledButton(
                                              onPressed: () {},
                                              child: const Text('Start'),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      )
                      .toList(),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Unable to load learners: $err'),
            ),
          ],
        ),
      ),
    );
  }
}

String _bandLabel(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return 'K–5 theme';
    case AivoGradeBand.g6_8:
      return '6–8 theme';
    case AivoGradeBand.g9_12:
      return '9–12 theme';
  }
}
