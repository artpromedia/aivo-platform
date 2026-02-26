/// Tutor Persona Asset Registry
///
/// Maps persona slugs (as returned by the backend) to their corresponding
/// Rive animation files. Each persona has a dedicated `.riv` file containing
/// the artboard, state machine, and all emotion/animation states for that
/// character.
///
/// Asset paths are relative to the consuming app's `assets/rive/` directory.
/// Both mobile-learner and mobile-parent bundle the same set of `.riv` files
/// so this registry can be shared without modification.
library;

// =============================================================================
// TUTOR PERSONA ASSET
// =============================================================================

/// Registry and utilities for resolving persona slugs to Rive asset paths.
///
/// Usage:
/// ```dart
/// final assetPath = TutorPersonaAsset.assetPathFor('nova-math');
/// // => 'assets/rive/nova_math.riv'
/// ```
abstract final class TutorPersonaAsset {
  // ---------------------------------------------------------------------------
  // Asset directory
  // ---------------------------------------------------------------------------

  /// Base directory where Rive persona files are stored.
  static const String _assetDirectory = 'assets/rive';

  // ---------------------------------------------------------------------------
  // Persona slug -> filename mapping
  // ---------------------------------------------------------------------------

  /// Maps persona slugs (kebab-case, as returned by the API) to the
  /// corresponding Rive filename (without the directory prefix).
  ///
  /// When a new persona is added on the backend, a matching entry must be
  /// added here *and* the `.riv` file must be bundled in both mobile apps'
  /// `assets/rive/` directories.
  static const Map<String, String> _personaAssets = {
    // Math personas
    'nova-math': 'nova_math.riv',
    'nova-math-k2': 'nova_math_k2.riv',
    'nova-math-35': 'nova_math_35.riv',
    'nova-math-68': 'nova_math_68.riv',
    'nova-math-912': 'nova_math_912.riv',

    // ELA / Reading personas
    'sage-ela': 'sage_ela.riv',
    'sage-ela-k2': 'sage_ela_k2.riv',
    'sage-ela-35': 'sage_ela_35.riv',
    'sage-ela-68': 'sage_ela_68.riv',
    'sage-ela-912': 'sage_ela_912.riv',

    // Science personas
    'spark-science': 'spark_science.riv',
    'spark-science-k2': 'spark_science_k2.riv',
    'spark-science-35': 'spark_science_35.riv',
    'spark-science-68': 'spark_science_68.riv',
    'spark-science-912': 'spark_science_912.riv',

    // History personas
    'chrono-history': 'chrono_history.riv',
    'chrono-history-k2': 'chrono_history_k2.riv',
    'chrono-history-35': 'chrono_history_35.riv',
    'chrono-history-68': 'chrono_history_68.riv',
    'chrono-history-912': 'chrono_history_912.riv',

    // Coding personas
    'pixel-coding': 'pixel_coding.riv',
    'pixel-coding-k2': 'pixel_coding_k2.riv',
    'pixel-coding-35': 'pixel_coding_35.riv',
    'pixel-coding-68': 'pixel_coding_68.riv',
    'pixel-coding-912': 'pixel_coding_912.riv',

    // Social studies personas (legacy)
    'atlas-social': 'atlas_social.riv',
    'atlas-social-k2': 'atlas_social_k2.riv',
    'atlas-social-35': 'atlas_social_35.riv',
    'atlas-social-68': 'atlas_social_68.riv',
    'atlas-social-912': 'atlas_social_912.riv',

    // General / cross-subject persona
    'aivo-general': 'aivo_general.riv',
  };

  /// The filename used when no matching persona is found.
  static const String _defaultAssetFilename = 'aivo_general.riv';

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// All registered persona slugs.
  static Set<String> get registeredSlugs => _personaAssets.keys.toSet();

  /// Returns the full asset path for the given [personaSlug].
  ///
  /// If the slug is not found in the registry, the default fallback asset is
  /// returned instead.
  ///
  /// ```dart
  /// TutorPersonaAsset.assetPathFor('sage-ela');
  /// // => 'assets/rive/sage_ela.riv'
  ///
  /// TutorPersonaAsset.assetPathFor('unknown-persona');
  /// // => 'assets/rive/aivo_general.riv'
  /// ```
  static String assetPathFor(String personaSlug) {
    final filename = _personaAssets[personaSlug];
    if (filename != null) {
      return '$_assetDirectory/$filename';
    }
    return defaultAssetPath;
  }

  /// Whether the registry contains an entry for [personaSlug].
  static bool hasPersona(String personaSlug) =>
      _personaAssets.containsKey(personaSlug);

  /// The full asset path of the default / fallback persona Rive file.
  ///
  /// Used when:
  /// - The persona slug is `null` or empty.
  /// - The persona slug is not found in the registry.
  /// - The persona's `.riv` file fails to load at runtime.
  static String get defaultAssetPath =>
      '$_assetDirectory/$_defaultAssetFilename';

  /// Returns the Rive filename (without directory) for the given
  /// [personaSlug], or `null` if the slug is not registered.
  static String? filenameFor(String personaSlug) =>
      _personaAssets[personaSlug];

  /// Returns the full asset path, or the [defaultAssetPath] if [personaSlug]
  /// is `null` or empty.
  static String assetPathOrDefault(String? personaSlug) {
    if (personaSlug == null || personaSlug.isEmpty) {
      return defaultAssetPath;
    }
    return assetPathFor(personaSlug);
  }
}
