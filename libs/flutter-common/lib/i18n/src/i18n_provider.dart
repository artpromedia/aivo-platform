/// I18n Provider for Flutter widget tree
library;

import 'package:flutter/widgets.dart';
import 'types.dart';
import 'types.dart' as types;
import 'i18n.dart';

/// InheritedWidget to provide i18n context
class I18nProvider extends StatefulWidget {
  const I18nProvider({
    super.key,
    required this.child,
    this.initialLocale,
    this.namespaces = const [TranslationNamespace.common],
    this.onLocaleChange,
  });

  final Widget child;
  final SupportedLocale? initialLocale;
  final List<TranslationNamespace> namespaces;
  final LocaleChangeCallback? onLocaleChange;

  @override
  State<I18nProvider> createState() => _I18nProviderState();

  /// Get i18n from context
  static AivoI18n of(BuildContext context) {
    final inherited = context.dependOnInheritedWidgetOfExactType<_I18nInherited>();
    assert(inherited != null, 'I18nProvider not found in widget tree');
    return inherited!.i18n;
  }

  /// Get locale from context
  static SupportedLocale localeOf(BuildContext context) {
    return of(context).currentLocale;
  }

  /// Get direction from context
  static TextDirection directionOf(BuildContext context) {
    return of(context).direction == types.TextDirection.rtl 
        ? TextDirection.rtl 
        : TextDirection.ltr;
  }

  /// Check if locale is RTL
  static bool isRTL(BuildContext context) {
    return of(context).isRTL;
  }
}

class _I18nProviderState extends State<I18nProvider> {
  late AivoI18n _i18n;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _i18n = AivoI18n.instance;
    _initI18n();
  }

  Future<void> _initI18n() async {
    await _i18n.init(
      locale: widget.initialLocale,
      namespaces: widget.namespaces,
    );

    _i18n.addListener(_onLocaleChange);

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _onLocaleChange(SupportedLocale locale) {
    widget.onLocaleChange?.call(locale);
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _i18n.removeListener(_onLocaleChange);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox.shrink();
    }

    return _I18nInherited(
      i18n: _i18n,
      locale: _i18n.currentLocale,
      child: Directionality(
        textDirection: _i18n.isRTL ? TextDirection.rtl : TextDirection.ltr,
        child: widget.child,
      ),
    );
  }
}

class _I18nInherited extends InheritedWidget {
  const _I18nInherited({
    required this.i18n,
    required this.locale,
    required super.child,
  });

  final AivoI18n i18n;
  final SupportedLocale locale;

  @override
  bool updateShouldNotify(_I18nInherited oldWidget) {
    return locale != oldWidget.locale;
  }
}

/// Extension for BuildContext to access i18n
extension I18nContextExtension on BuildContext {
  /// Get i18n instance
  AivoI18n get i18n => I18nProvider.of(this);

  /// Translate key
  String t(
    String key, {
    Map<String, dynamic>? args,
    TranslationNamespace namespace = TranslationNamespace.common,
    int? count,
  }) {
    return i18n.t(key, args: args, namespace: namespace, count: count);
  }

  /// Get current locale
  SupportedLocale get locale => I18nProvider.localeOf(this);

  /// Get text direction
  TextDirection get textDirection => I18nProvider.directionOf(this);

  /// Check if RTL
  bool get isRTL => I18nProvider.isRTL(this);
}

/// Stateless widget mixin for i18n
mixin I18nMixin<T extends StatelessWidget> on StatelessWidget {
  /// Get i18n from context
  AivoI18n getI18n(BuildContext context) => I18nProvider.of(context);

  /// Translate
  String tr(BuildContext context, String key, {Map<String, dynamic>? args}) {
    return getI18n(context).t(key, args: args);
  }
}

/// Stateful widget mixin for i18n
mixin I18nStateMixin<T extends StatefulWidget> on State<T> {
  /// Get i18n instance
  AivoI18n get i18n => I18nProvider.of(context);

  /// Translate
  String tr(String key, {Map<String, dynamic>? args, int? count}) {
    return i18n.t(key, args: args, count: count);
  }

  /// Get current locale
  SupportedLocale get locale => i18n.currentLocale;

  /// Check if RTL
  bool get isRTL => i18n.isRTL;
}

