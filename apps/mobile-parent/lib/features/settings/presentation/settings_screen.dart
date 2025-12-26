import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../l10n/app_localizations.dart';
import '../providers/settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settingsTitle),
      ),
      body: settings.when(
        data: (data) => ListView(
          children: [
            // Profile Section
            _buildSection(
              context: context,
              title: l10n.profile,
              children: [
                ListTile(
                  leading: CircleAvatar(
                    radius: 24,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Text(
                      data.initials,
                      style: TextStyle(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(data.fullName),
                  subtitle: Text(data.email),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showEditProfileSheet(context, ref, data),
                ),
              ],
            ),

            // Language Section
            _buildSection(
              context: context,
              title: l10n.language,
              children: [
                ListTile(
                  leading: const Icon(Icons.language),
                  title: Text(l10n.appLanguage),
                  subtitle: Text(_getLanguageName(data.locale)),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showLanguageSelector(context, ref, data.locale),
                ),
              ],
            ),

            // Notifications Section
            _buildSection(
              context: context,
              title: l10n.notifications,
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_outlined),
                  title: Text(l10n.pushNotifications),
                  value: data.pushEnabled,
                  onChanged: (value) => _updateSetting(ref, 'pushEnabled', value),
                ),
                const Divider(height: 1, indent: 56),
                SwitchListTile(
                  secondary: const Icon(Icons.email_outlined),
                  title: Text(l10n.emailNotifications),
                  value: data.emailEnabled,
                  onChanged: (value) => _updateSetting(ref, 'emailEnabled', value),
                ),
                const Divider(height: 1, indent: 56),
                SwitchListTile(
                  secondary: const Icon(Icons.summarize_outlined),
                  title: Text(l10n.weeklyDigest),
                  subtitle: Text(l10n.weeklyDigestDesc),
                  value: data.weeklyDigestEnabled,
                  onChanged: (value) => _updateSetting(ref, 'weeklyDigestEnabled', value),
                ),
              ],
            ),

            // Privacy Section
            _buildSection(
              context: context,
              title: l10n.privacy,
              children: [
                ListTile(
                  leading: const Icon(Icons.security),
                  title: Text(l10n.manageConsent),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/consent'),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.lock_outline),
                  title: Text(l10n.changePassword),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showChangePasswordDialog(context, ref),
                ),
              ],
            ),

            // Theme Section
            _buildSection(
              context: context,
              title: l10n.appearance,
              children: [
                ListTile(
                  leading: const Icon(Icons.palette_outlined),
                  title: Text(l10n.theme),
                  subtitle: Text(_getThemeName(data.themeMode, l10n)),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showThemeSelector(context, ref, data.themeMode),
                ),
              ],
            ),

            // About Section
            _buildSection(
              context: context,
              title: l10n.about,
              children: [
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: Text(l10n.version),
                  subtitle: const Text('0.1.0'),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: Text(l10n.termsOfService),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () {
                    // Open terms URL
                  },
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.policy_outlined),
                  title: Text(l10n.privacyPolicy),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () {
                    // Open privacy URL
                  },
                ),
              ],
            ),

            // Logout
            Padding(
              padding: const EdgeInsets.all(16),
              child: OutlinedButton.icon(
                onPressed: () => _confirmLogout(context, ref),
                style: OutlinedButton.styleFrom(
                  foregroundColor: theme.colorScheme.error,
                ),
                icon: const Icon(Icons.logout),
                label: Text(l10n.logout),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildSection({
    required BuildContext context,
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ),
        ...children,
      ],
    );
  }

  String _getLanguageName(String locale) {
    const languages = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'pt': 'Português',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'ar': 'العربية',
      'hi': 'हिन्दी',
    };
    return languages[locale] ?? 'English';
  }

  String _getThemeName(String mode, AppLocalizations l10n) {
    switch (mode) {
      case 'light':
        return l10n.themeLight;
      case 'dark':
        return l10n.themeDark;
      default:
        return l10n.themeSystem;
    }
  }

  void _showLanguageSelector(BuildContext context, WidgetRef ref, String current) {
    const languages = [
      ('en', 'English'),
      ('es', 'Español'),
      ('fr', 'Français'),
      ('de', 'Deutsch'),
      ('pt', 'Português'),
      ('zh', '中文'),
      ('ja', '日本語'),
      ('ko', '한국어'),
      ('ar', 'العربية'),
      ('hi', 'हिन्दी'),
    ];

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            Text(
              'Select Language',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ...languages.map((lang) => RadioListTile<String>(
                  title: Text(lang.$2),
                  value: lang.$1,
                  groupValue: current,
                  onChanged: (value) {
                    if (value != null) {
                      _updateSetting(ref, 'locale', value);
                      Navigator.pop(context);
                    }
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showThemeSelector(BuildContext context, WidgetRef ref, String current) {
    final l10n = AppLocalizations.of(context)!;

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            Text(
              l10n.theme,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            RadioListTile<String>(
              title: Text(l10n.themeSystem),
              value: 'system',
              groupValue: current,
              onChanged: (value) {
                _updateSetting(ref, 'themeMode', value);
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: Text(l10n.themeLight),
              value: 'light',
              groupValue: current,
              onChanged: (value) {
                _updateSetting(ref, 'themeMode', value);
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: Text(l10n.themeDark),
              value: 'dark',
              groupValue: current,
              onChanged: (value) {
                _updateSetting(ref, 'themeMode', value);
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showEditProfileSheet(BuildContext context, WidgetRef ref, AppSettings settings) {
    final firstNameController = TextEditingController(text: settings.firstName);
    final lastNameController = TextEditingController(text: settings.lastName);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Edit Profile',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: firstNameController,
              decoration: const InputDecoration(
                labelText: 'First Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: lastNameController,
              decoration: const InputDecoration(
                labelText: 'Last Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                ref.read(updateProfileProvider(
                  firstName: firstNameController.text,
                  lastName: lastNameController.text,
                ).future);
                ref.invalidate(settingsProvider);
                Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context, WidgetRef ref) {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Current Password',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: newController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'New Password',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: confirmController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm Password',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (newController.text == confirmController.text) {
                ref.read(changePasswordProvider(
                  currentPassword: currentController.text,
                  newPassword: newController.text,
                ).future);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Password changed successfully')),
                );
              }
            },
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(logoutProvider.future);
              context.go('/auth/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  void _updateSetting(WidgetRef ref, String key, dynamic value) {
    ref.read(updateSettingProvider(key: key, value: value).future);
    ref.invalidate(settingsProvider);
  }
}
