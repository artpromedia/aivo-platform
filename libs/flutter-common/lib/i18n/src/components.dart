/// Translation components for AIVO Flutter apps
library;

import 'package:flutter/widgets.dart';
import 'types.dart';
import 'i18n.dart';
import 'i18n_provider.dart';
import 'formatters/date_formatter.dart';
import 'formatters/number_formatter.dart';

/// Translated text widget
class Tr extends StatelessWidget {
  const Tr(
    this.translationKey, {
    super.key,
    this.args,
    this.namespace = TranslationNamespace.common,
    this.count,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.softWrap,
  });

  final String translationKey;
  final Map<String, dynamic>? args;
  final TranslationNamespace namespace;
  final int? count;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool? softWrap;

  @override
  Widget build(BuildContext context) {
    final text = context.t(translationKey, args: args, namespace: namespace, count: count);
    
    return Text(
      text,
      style: style,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      softWrap: softWrap,
    );
  }
}

/// Formatted number widget
class FormattedNumber extends StatelessWidget {
  const FormattedNumber(
    this.value, {
    super.key,
    this.decimalDigits,
    this.style,
  });

  final num value;
  final int? decimalDigits;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Text(
      numberFormatter.format(value, decimalDigits: decimalDigits),
      style: style,
    );
  }
}

/// Formatted currency widget
class FormattedCurrency extends StatelessWidget {
  const FormattedCurrency(
    this.value, {
    super.key,
    this.currencyCode,
    this.compact = false,
    this.style,
  });

  final num value;
  final String? currencyCode;
  final bool compact;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final text = compact
        ? numberFormatter.formatCurrencyCompact(value, currencyCode: currencyCode)
        : numberFormatter.formatCurrency(value, currencyCode: currencyCode);
    
    return Text(text, style: style);
  }
}

/// Formatted date widget
class FormattedDate extends StatelessWidget {
  const FormattedDate(
    this.date, {
    super.key,
    this.formatStyle = DateFormatStyle.medium,
    this.style,
  });

  final DateTime date;
  final DateFormatStyle formatStyle;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Text(
      dateFormatter.format(date, style: formatStyle),
      style: style,
    );
  }
}

/// Formatted date time widget
class FormattedDateTime extends StatelessWidget {
  const FormattedDateTime(
    this.date, {
    super.key,
    this.dateStyle = DateFormatStyle.medium,
    this.timeStyle = TimeFormatStyle.short,
    this.style,
  });

  final DateTime date;
  final DateFormatStyle dateStyle;
  final TimeFormatStyle timeStyle;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Text(
      dateFormatter.formatDateTime(date, dateStyle: dateStyle, timeStyle: timeStyle),
      style: style,
    );
  }
}

/// Namespace loader widget
/// Pre-loads translation namespaces before rendering children
class NamespaceLoader extends StatefulWidget {
  const NamespaceLoader({
    super.key,
    required this.namespaces,
    required this.child,
    this.loadingBuilder,
  });

  final List<TranslationNamespace> namespaces;
  final Widget child;
  final WidgetBuilder? loadingBuilder;

  @override
  State<NamespaceLoader> createState() => _NamespaceLoaderState();
}

class _NamespaceLoaderState extends State<NamespaceLoader> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNamespaces();
  }

  Future<void> _loadNamespaces() async {
    for (final ns in widget.namespaces) {
      await i18n.loadNamespace(ns);
    }
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return widget.loadingBuilder?.call(context) ?? const SizedBox.shrink();
    }
    return widget.child;
  }
}

/// Locale selector dropdown
class LocaleDropdown extends StatelessWidget {
  const LocaleDropdown({
    super.key,
    this.showFlags = true,
    this.showNativeNames = true,
    this.onChanged,
    this.decoration,
  });

  final bool showFlags;
  final bool showNativeNames;
  final ValueChanged<SupportedLocale>? onChanged;
  final InputDecoration? decoration;

  @override
  Widget build(BuildContext context) {
    final currentLocale = i18n.currentLocale;
    
    return DropdownButtonFormField<SupportedLocale>(
      value: currentLocale,
      decoration: decoration ?? const InputDecoration(
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      items: SupportedLocale.values.map((locale) {
        final label = showNativeNames ? locale.nativeName : locale.englishName;
        
        return DropdownMenuItem(
          value: locale,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showFlags) ...[
                Text(_getFlagEmoji(locale)),
                const SizedBox(width: 8),
              ],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          ),
        );
      }).toList(),
      onChanged: (locale) async {
        if (locale != null) {
          await i18n.changeLocale(locale);
          onChanged?.call(locale);
        }
      },
    );
  }

  String _getFlagEmoji(SupportedLocale locale) {
    // Map locale to country code for flag emoji
    const flags = {
      'en': '🇺🇸',
      'en-US': '🇺🇸',
      'en-GB': '🇬🇧',
      'es': '🇪🇸',
      'es-MX': '🇲🇽',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'ar': '🇸🇦',
      'he': '🇮🇱',
      'zh-CN': '🇨🇳',
      'zh-TW': '🇹🇼',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
    };
    return flags[locale.code] ?? '🌐';
  }
}
