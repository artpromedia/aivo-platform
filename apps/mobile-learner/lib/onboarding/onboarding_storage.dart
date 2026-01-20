/// Onboarding Storage
///
/// Secure storage for onboarding completion status.
library;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Storage service for onboarding data.
class OnboardingStorage {
  OnboardingStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
        );

  final FlutterSecureStorage _storage;

  static const _completedKey = 'onboarding_completed';
  static const _profileNameKey = 'onboarding_profile_name';
  static const _avatarIdKey = 'onboarding_avatar_id';
  static const _gradeLevelKey = 'onboarding_grade_level';
  static const _preferencesKey = 'onboarding_preferences';

  /// Check if onboarding has been completed.
  Future<bool> isCompleted() async {
    final value = await _storage.read(key: _completedKey);
    return value == 'true';
  }

  /// Mark onboarding as completed for a learner.
  Future<void> markCompleted(String learnerId) async {
    await _storage.write(key: _getKeyForLearner(_completedKey, learnerId), value: 'true');
    // Also write to the generic key for quick checks
    await _storage.write(key: _completedKey, value: 'true');
  }

  /// Check if onboarding is completed for a specific learner.
  Future<bool> isCompletedForLearner(String learnerId) async {
    final value = await _storage.read(key: _getKeyForLearner(_completedKey, learnerId));
    return value == 'true';
  }

  /// Save profile name during onboarding.
  Future<void> saveProfileName(String learnerId, String name) async {
    await _storage.write(key: _getKeyForLearner(_profileNameKey, learnerId), value: name);
  }

  /// Get saved profile name.
  Future<String?> getProfileName(String learnerId) async {
    return _storage.read(key: _getKeyForLearner(_profileNameKey, learnerId));
  }

  /// Save avatar ID during onboarding.
  Future<void> saveAvatarId(String learnerId, String avatarId) async {
    await _storage.write(key: _getKeyForLearner(_avatarIdKey, learnerId), value: avatarId);
  }

  /// Get saved avatar ID.
  Future<String?> getAvatarId(String learnerId) async {
    return _storage.read(key: _getKeyForLearner(_avatarIdKey, learnerId));
  }

  /// Save grade level during onboarding.
  Future<void> saveGradeLevel(String learnerId, int gradeLevel) async {
    await _storage.write(
      key: _getKeyForLearner(_gradeLevelKey, learnerId),
      value: gradeLevel.toString(),
    );
  }

  /// Get saved grade level.
  Future<int?> getGradeLevel(String learnerId) async {
    final value = await _storage.read(key: _getKeyForLearner(_gradeLevelKey, learnerId));
    return value != null ? int.tryParse(value) : null;
  }

  /// Clear onboarding data for a learner (for testing or reset).
  Future<void> clearForLearner(String learnerId) async {
    await _storage.delete(key: _getKeyForLearner(_completedKey, learnerId));
    await _storage.delete(key: _getKeyForLearner(_profileNameKey, learnerId));
    await _storage.delete(key: _getKeyForLearner(_avatarIdKey, learnerId));
    await _storage.delete(key: _getKeyForLearner(_gradeLevelKey, learnerId));
    await _storage.delete(key: _getKeyForLearner(_preferencesKey, learnerId));
  }

  /// Clear all onboarding data.
  Future<void> clearAll() async {
    await _storage.delete(key: _completedKey);
    // Note: Learner-specific keys will remain, but the generic completion
    // flag being cleared will trigger re-onboarding
  }

  String _getKeyForLearner(String key, String learnerId) => '${key}_$learnerId';
}
