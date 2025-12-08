import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../baseline/baseline_controller.dart';
import '../baseline/baseline_service.dart';
import '../learners/learner_service.dart';
import '../widgets/baseline_status_card.dart';

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
      body: RefreshIndicator(
        onRefresh: () async {
          if (authState.tenantId != null) {
            ref.invalidate(childrenProvider(authState.tenantId!));
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Welcome, parent!', style: Theme.of(context).textTheme.headlineSmall),
              if (authState.status == AuthStatus.authenticated)
                Text('Tenant: ${authState.tenantId}', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 16),

              // Add child button
              FilledButton.icon(
                icon: const Icon(Icons.person_add_alt),
                label: Text(strings.addChild),
                onPressed: () => context.push('/add-child'),
              ),
              const SizedBox(height: 24),

              // Baseline Status Section
              Text('Baseline Assessments', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'Track your children\'s assessment progress',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 16),

              learnersAsync.when(
                data: (learners) {
                  if (learners.isEmpty) {
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            Icon(
                              Icons.child_care,
                              size: 48,
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'No children added yet',
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Add a child to get started with their learning journey.',
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return _BaselineCardsList(learners: learners);
                },
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (err, _) => Card(
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: Theme.of(context).colorScheme.onErrorContainer),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Unable to load children: $err',
                            style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh),
                          onPressed: () {
                            if (authState.tenantId != null) {
                              ref.invalidate(childrenProvider(authState.tenantId!));
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BaselineCardsList extends ConsumerWidget {
  const _BaselineCardsList({required this.learners});

  final List<Learner> learners;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final baselineProfilesAsync = ref.watch(childrenBaselineProvider(learners));
    final baselineState = ref.watch(baselineControllerProvider);

    return baselineProfilesAsync.when(
      data: (profiles) {
        return Column(
          children: learners.map((learner) {
            final profile = profiles[learner.id] ?? baselineState.profileFor(learner.id);

            return BaselineStatusCard(
              learner: learner,
              profile: profile,
              isLoading: baselineState.isLoading,
              onStart: () => _startBaseline(context, ref, learner, profile),
              onResume: () => _resumeBaseline(context, learner, profile),
              onViewResults: () => _viewResults(context, learner, profile),
            );
          }).toList(),
        );
      },
      loading: () => Column(
        children: learners
            .map((l) => BaselineStatusCard(
                  learner: l,
                  profile: null,
                  isLoading: true,
                  onStart: () {},
                  onResume: () {},
                  onViewResults: () {},
                ))
            .toList(),
      ),
      error: (_, __) => Column(
        children: learners
            .map((l) => BaselineStatusCard(
                  learner: l,
                  profile: null,
                  onStart: () {},
                  onResume: () {},
                  onViewResults: () {},
                ))
            .toList(),
      ),
    );
  }

  Future<void> _startBaseline(
    BuildContext context,
    WidgetRef ref,
    Learner learner,
    BaselineProfile? profile,
  ) async {
    if (profile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please set up the baseline profile first.')),
      );
      return;
    }

    final controller = ref.read(baselineControllerProvider.notifier);
    final response = await controller.startBaseline(profile.id, learner.id);

    if (response != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Baseline started! ${learner.name} can now take the assessment on their device.',
          ),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      final error = ref.read(baselineControllerProvider).error;
      if (context.mounted && error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error), backgroundColor: Colors.red),
        );
        ref.read(baselineControllerProvider.notifier).clearError();
      }
    }
  }

  void _resumeBaseline(BuildContext context, Learner learner, BaselineProfile? profile) {
    if (profile == null) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${learner.name} can continue their assessment on the learner app.',
        ),
      ),
    );
  }

  void _viewResults(BuildContext context, Learner learner, BaselineProfile? profile) {
    if (profile == null) return;

    context.push(
      '/baseline-results/${profile.id}',
      extra: {
        'learnerId': learner.id,
        'learnerName': learner.name,
      },
    );
  }
}
