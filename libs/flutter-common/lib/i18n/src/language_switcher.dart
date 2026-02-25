/// Language Switcher Widget for AIVO Flutter apps
///
/// A Material Design language picker with multiple presentation styles.
/// Integrates with AivoI18n for automatic locale detection and persistence.
library;

import 'package:flutter/material.dart';
import 'i18n.dart';
import 'i18n_provider.dart';
import 'types.dart';

/// The set of locales to show in the switcher (primary UI locales only)
const _uiLocales = [
  SupportedLocale.en,
  SupportedLocale.es,
  SupportedLocale.fr,
  SupportedLocale.de,
  SupportedLocale.pt,
  SupportedLocale.ar,
  SupportedLocale.zhCN,
  SupportedLocale.ja,
  SupportedLocale.ko,
  SupportedLocale.hi,
];

const Map<SupportedLocale, String> _flagEmojis = {
  SupportedLocale.en: '🇺🇸',
  SupportedLocale.es: '🇪🇸',
  SupportedLocale.fr: '🇫🇷',
  SupportedLocale.de: '🇩🇪',
  SupportedLocale.pt: '🇧🇷',
  SupportedLocale.ar: '🇸🇦',
  SupportedLocale.zhCN: '🇨🇳',
  SupportedLocale.ja: '🇯🇵',
  SupportedLocale.ko: '🇰🇷',
  SupportedLocale.hi: '🇮🇳',
};

/// Presentation style for the language switcher
enum LanguageSwitcherStyle {
  /// Compact icon button that opens a popup menu
  compact,

  /// Dropdown button with the current locale name
  dropdown,

  /// Bottom sheet with all locales as a list
  bottomSheet,
}

/// Language Switcher Widget
///
/// Shows a language picker that integrates with AivoI18n.
///
/// ```dart
/// LanguageSwitcher(
///   style: LanguageSwitcherStyle.compact,
///   showFlags: true,
/// )
/// ```
class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({
    super.key,
    this.style = LanguageSwitcherStyle.compact,
    this.showFlags = true,
    this.showNativeNames = true,
    this.onLocaleChanged,
    this.locales,
  });

  /// The presentation style
  final LanguageSwitcherStyle style;

  /// Whether to show flag emojis
  final bool showFlags;

  /// Whether to show native language names
  final bool showNativeNames;

  /// Called after the locale is changed
  final ValueChanged<SupportedLocale>? onLocaleChanged;

  /// Override the list of locales to show (defaults to all UI locales)
  final List<SupportedLocale>? locales;

  List<SupportedLocale> get _locales => locales ?? _uiLocales;

  @override
  Widget build(BuildContext context) {
    return switch (style) {
      LanguageSwitcherStyle.compact => _CompactSwitcher(
          locales: _locales,
          showFlags: showFlags,
          showNativeNames: showNativeNames,
          onLocaleChanged: onLocaleChanged,
        ),
      LanguageSwitcherStyle.dropdown => _DropdownSwitcher(
          locales: _locales,
          showFlags: showFlags,
          showNativeNames: showNativeNames,
          onLocaleChanged: onLocaleChanged,
        ),
      LanguageSwitcherStyle.bottomSheet => _BottomSheetSwitcher(
          locales: _locales,
          showFlags: showFlags,
          showNativeNames: showNativeNames,
          onLocaleChanged: onLocaleChanged,
        ),
    };
  }
}

/// Compact icon button that opens a popup menu
class _CompactSwitcher extends StatelessWidget {
  const _CompactSwitcher({
    required this.locales,
    required this.showFlags,
    required this.showNativeNames,
    this.onLocaleChanged,
  });

  final List<SupportedLocale> locales;
  final bool showFlags;
  final bool showNativeNames;
  final ValueChanged<SupportedLocale>? onLocaleChanged;

  @override
  Widget build(BuildContext context) {
    final currentLocale = i18n.currentLocale;
    final theme = Theme.of(context);

    return PopupMenuButton<SupportedLocale>(
      tooltip: 'Change language',
      onSelected: (locale) async {
        await i18n.changeLocale(locale);
        onLocaleChanged?.call(locale);
      },
      itemBuilder: (context) => locales.map((locale) {
        final isSelected = locale == currentLocale;
        return PopupMenuItem<SupportedLocale>(
          value: locale,
          child: Row(
            children: [
              if (showFlags) ...[
                Text(
                  _flagEmojis[locale] ?? '🌐',
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      showNativeNames ? locale.nativeName : locale.englishName,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurface,
                      ),
                    ),
                    if (showNativeNames)
                      Text(
                        locale.englishName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
            ],
          ),
        );
      }).toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: theme.colorScheme.outline.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _flagEmojis[currentLocale] ?? '🌐',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(width: 4),
            Text(
              currentLocale.code.toUpperCase().split('-').first,
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 2),
            Icon(
              Icons.expand_more,
              size: 16,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ],
        ),
      ),
    );
  }
}

/// Dropdown button
class _DropdownSwitcher extends StatelessWidget {
  const _DropdownSwitcher({
    required this.locales,
    required this.showFlags,
    required this.showNativeNames,
    this.onLocaleChanged,
  });

  final List<SupportedLocale> locales;
  final bool showFlags;
  final bool showNativeNames;
  final ValueChanged<SupportedLocale>? onLocaleChanged;

  @override
  Widget build(BuildContext context) {
    final currentLocale = i18n.currentLocale;
    final theme = Theme.of(context);

    return DropdownButton<SupportedLocale>(
      value: currentLocale,
      underline: const SizedBox.shrink(),
      borderRadius: BorderRadius.circular(12),
      items: locales.map((locale) {
        return DropdownMenuItem(
          value: locale,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showFlags) ...[
                Text(
                  _flagEmojis[locale] ?? '🌐',
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(width: 8),
              ],
              Text(
                showNativeNames ? locale.nativeName : locale.englishName,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        );
      }).toList(),
      onChanged: (locale) async {
        if (locale != null) {
          await i18n.changeLocale(locale);
          onLocaleChanged?.call(locale);
        }
      },
    );
  }
}

/// Bottom sheet trigger
class _BottomSheetSwitcher extends StatelessWidget {
  const _BottomSheetSwitcher({
    required this.locales,
    required this.showFlags,
    required this.showNativeNames,
    this.onLocaleChanged,
  });

  final List<SupportedLocale> locales;
  final bool showFlags;
  final bool showNativeNames;
  final ValueChanged<SupportedLocale>? onLocaleChanged;

  @override
  Widget build(BuildContext context) {
    final currentLocale = i18n.currentLocale;
    final theme = Theme.of(context);

    return OutlinedButton.icon(
      onPressed: () => _showLanguageSheet(context),
      icon: Text(
        _flagEmojis[currentLocale] ?? '🌐',
        style: const TextStyle(fontSize: 18),
      ),
      label: Text(
        showNativeNames ? currentLocale.nativeName : currentLocale.englishName,
      ),
    );
  }

  void _showLanguageSheet(BuildContext context) {
    final currentLocale = i18n.currentLocale;
    final theme = Theme.of(context);

    showModalBottomSheet<SupportedLocale>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Choose Language',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: locales.length,
                  itemBuilder: (context, index) {
                    final locale = locales[index];
                    final isSelected = locale == currentLocale;

                    return ListTile(
                      leading: showFlags
                          ? Text(
                              _flagEmojis[locale] ?? '🌐',
                              style: const TextStyle(fontSize: 24),
                            )
                          : null,
                      title: Text(
                        showNativeNames
                            ? locale.nativeName
                            : locale.englishName,
                        style: TextStyle(
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      subtitle: showNativeNames
                          ? Text(locale.englishName)
                          : null,
                      trailing: isSelected
                          ? Icon(
                              Icons.check_circle,
                              color: theme.colorScheme.primary,
                            )
                          : null,
                      selected: isSelected,
                      onTap: () async {
                        await i18n.changeLocale(locale);
                        onLocaleChanged?.call(locale);
                        if (context.mounted) {
                          Navigator.pop(context);
                        }
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}
