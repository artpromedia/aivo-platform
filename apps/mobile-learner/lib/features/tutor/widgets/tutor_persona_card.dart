/// Tutor Persona Card Widget
///
/// Card widget used in the tutor home screen for persona selection.
/// Displays the persona's avatar, name, subject, and description
/// with a tap callback to start a session.
library;

import 'package:flutter/material.dart';

import '../models/tutor_models.dart';

/// Card widget displaying a tutor persona for selection.
class TutorPersonaCard extends StatelessWidget {
  /// The tutor persona to display.
  final TutorPersona persona;

  /// Called when the card is tapped.
  final VoidCallback onTap;

  const TutorPersonaCard({
    super.key,
    required this.persona,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label: '${persona.name}, ${persona.subject.label} tutor. '
          '${persona.description}',
      enabled: persona.isAvailable,
      child: Opacity(
        opacity: persona.isAvailable ? 1.0 : 0.5,
        child: Card(
          clipBehavior: Clip.antiAlias,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: InkWell(
            onTap: persona.isAvailable ? onTap : null,
            borderRadius: BorderRadius.circular(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar area with subject color background
                Expanded(
                  flex: 3,
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          persona.subject.color.withOpacity(0.8),
                          persona.subject.color.withOpacity(0.4),
                        ],
                      ),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Avatar placeholder
                        _buildAvatar(theme),

                        // Subject badge
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  persona.subject.icon,
                                  size: 12,
                                  color: persona.subject.color,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  persona.subject.label,
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: persona.subject.color,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Unavailable overlay
                        if (!persona.isAvailable)
                          Positioned.fill(
                            child: Container(
                              color: Colors.black.withOpacity(0.3),
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.6),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Coming Soon',
                                    style:
                                        theme.textTheme.labelSmall?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                // Info area
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Persona name
                        Text(
                          persona.name,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),

                        const SizedBox(height: 4),

                        // Description
                        Expanded(
                          child: Text(
                            persona.description,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              height: 1.3,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(ThemeData theme) {
    // If a network avatar URL is available, load it.
    if (persona.avatarUrl != null && persona.avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 32,
        backgroundImage: NetworkImage(persona.avatarUrl!),
        onBackgroundImageError: (_, __) {},
        child: Icon(
          persona.subject.icon,
          size: 28,
          color: Colors.white,
        ),
      );
    }

    // Fallback placeholder avatar.
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withOpacity(0.3),
        border: Border.all(
          color: Colors.white.withOpacity(0.5),
          width: 2,
        ),
      ),
      child: Icon(
        Icons.face_rounded,
        size: 36,
        color: Colors.white,
      ),
    );
  }
}
