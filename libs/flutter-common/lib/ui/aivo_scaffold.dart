/// Aivo Scaffold Widget
///
/// App shell with consistent layout patterns.
library;

import 'package:flutter/material.dart';

/// Standard app scaffold with Aivo styling.
class AivoScaffold extends StatelessWidget {
  const AivoScaffold({
    super.key,
    required this.body,
    this.title,
    this.titleWidget,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.drawer,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.backgroundColor,
    this.centerTitle,
    this.extendBodyBehindAppBar = false,
    this.appBarElevation,
  });

  final Widget body;
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final Widget? drawer;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  final Color? backgroundColor;
  final bool? centerTitle;
  final bool extendBodyBehindAppBar;
  final double? appBarElevation;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      extendBodyBehindAppBar: extendBodyBehindAppBar,
      appBar: title != null || titleWidget != null || actions != null
          ? AppBar(
              title: titleWidget ?? (title != null ? Text(title!) : null),
              actions: actions,
              leading: leading,
              automaticallyImplyLeading: automaticallyImplyLeading,
              centerTitle: centerTitle,
              elevation: appBarElevation,
            )
          : null,
      body: body,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      drawer: drawer,
    );
  }
}

/// Scaffold with safe area and optional scroll view.
class AivoPageScaffold extends StatelessWidget {
  const AivoPageScaffold({
    super.key,
    required this.child,
    this.title,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.padding = const EdgeInsets.all(16),
    this.scrollable = true,
    this.useSafeArea = true,
    this.leading,
  });

  final Widget child;
  final String? title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final EdgeInsetsGeometry padding;
  final bool scrollable;
  final bool useSafeArea;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    Widget content = Padding(
      padding: padding,
      child: child,
    );

    if (scrollable) {
      content = SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: content,
      );
    }

    if (useSafeArea) {
      content = SafeArea(child: content);
    }

    return AivoScaffold(
      title: title,
      actions: actions,
      leading: leading,
      body: content,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}

/// Bottom sheet scaffold for modal content.
class AivoBottomSheet extends StatelessWidget {
  const AivoBottomSheet({
    super.key,
    required this.child,
    this.title,
    this.actions,
    this.showDragHandle = true,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final String? title;
  final List<Widget>? actions;
  final bool showDragHandle;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDragHandle)
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 32,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          if (title != null || actions != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (title != null)
                    Expanded(
                      child: Text(
                        title!,
                        style: theme.textTheme.titleLarge,
                      ),
                    ),
                  if (actions != null) ...actions!,
                ],
              ),
            ),
          Flexible(
            child: SingleChildScrollView(
              padding: padding,
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}
