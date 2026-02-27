/// Tutor Home Screen
///
/// Subject picker screen displaying a grid of available tutor personas.
/// Each persona is shown as a card with avatar, name, and subject.
/// Tapping a persona navigates to the tutor session screen.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_session_provider.dart';
import '../widgets/tutor_persona_card.dart';
import 'tutor_session_screen.dart';
import 'tutor_history_screen.dart';

/// Main entry screen for the AI tutor feature.
///
/// Displays available tutor personas in a grid layout, allowing the learner
/// to pick a subject and start a new tutoring session.
class TutorHomeScreen extends ConsumerWidget {
  final String learnerId;

  const TutorHomeScreen({
    super.key,
    required this.learnerId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final personasState = ref.watch(tutorPersonasProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Tutor'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Session History',
            onPressed: () => _navigateToHistory(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(tutorPersonasProvider.notifier).loadPersonas();
            },
          ),
        ],
      ),
      body: _buildBody(context, ref, personasState),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    TutorPersonasState personasState,
  ) {
    switch (personasState) {
      case TutorPersonasLoading():
        return const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading tutors...'),
            ],
          ),
        );

      case TutorPersonasError():
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline_rounded,
                  size: 64,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Could not load tutors',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  personasState.message,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    ref.read(tutorPersonasProvider.notifier).loadPersonas();
                  },
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try Again'),
                ),
              ],
            ),
          ),
        );

      case TutorPersonasLoaded():
        return _buildPersonasList(context, ref, personasState.personas);
    }
  }

  Widget _buildPersonasList(
    BuildContext context,
    WidgetRef ref,
    List<TutorPersona> personas,
  ) {
    final theme = Theme.of(context);

    if (personas.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.school_rounded,
                size: 64,
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
              ),
              const SizedBox(height: 16),
              Text(
                'No tutors available',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Check back later for new tutors.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(tutorPersonasProvider.notifier).loadPersonas();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'Choose your tutor',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Pick a subject and start learning with your AI tutor',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AivoBrand.gray.shade600,
              ),
            ),
            const SizedBox(height: 24),

            // Persona grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.75,
              ),
              itemCount: personas.length,
              itemBuilder: (context, index) {
                final persona = personas[index];
                return TutorPersonaCard(
                  persona: persona,
                  onTap: () => _startSession(context, ref, persona),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _startSession(
    BuildContext context,
    WidgetRef ref,
    TutorPersona persona,
  ) {
    ref.read(tutorSessionProvider.notifier).startSession(persona: persona);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TutorSessionScreen(
          persona: persona,
        ),
      ),
    );
  }

  void _navigateToHistory(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TutorHistoryScreen(learnerId: learnerId),
      ),
    );
  }
}
