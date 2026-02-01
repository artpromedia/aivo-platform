/// Aivo Drawer Widget
///
/// Consistent drawer/sidebar styling across apps with grade-band awareness.
/// Aligned with web sidebar component styling.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// Drawer item configuration.
class AivoDrawerItem {
  const AivoDrawerItem({
    required this.icon,
    required this.label,
    this.onTap,
    this.trailing,
    this.badge,
    this.badgeColor,
    this.children,
  });

  /// Leading icon.
  final IconData icon;

  /// Label text.
  final String label;

  /// Callback when tapped.
  final VoidCallback? onTap;

  /// Optional trailing widget.
  final Widget? trailing;

  /// Badge count or text.
  final String? badge;

  /// Badge background color.
  final Color? badgeColor;

  /// Child items for expandable sections.
  final List<AivoDrawerItem>? children;
}

/// Profile section configuration for drawer header.
class AivoDrawerProfile {
  const AivoDrawerProfile({
    required this.name,
    this.email,
    this.avatarUrl,
    this.initials,
    this.onTap,
  });

  /// User's display name.
  final String name;

  /// User's email.
  final String? email;

  /// Avatar image URL.
  final String? avatarUrl;

  /// Fallback initials for avatar.
  final String? initials;

  /// Callback when profile section is tapped.
  final VoidCallback? onTap;
}

/// Section divider for drawer.
class AivoDrawerSection {
  const AivoDrawerSection({
    this.title,
    required this.items,
  });

  /// Optional section title.
  final String? title;

  /// Items in this section.
  final List<AivoDrawerItem> items;
}

/// Aivo-styled Navigation Drawer.
///
/// Web reference: apps/web-teacher/src/components/layout/sidebar.tsx
/// - Width: 256px (w-64) expanded, 64px (w-16) collapsed
/// - Item height: 40px (py-2)
/// - Item padding: 12px horizontal (px-3)
/// - Border radius: 8px (rounded-lg)
class AivoDrawer extends StatelessWidget {
  const AivoDrawer({
    super.key,
    this.profile,
    required this.sections,
    this.bottomSection,
    this.selectedIndex,
    this.onItemSelected,
    this.gradeBand,
    this.width = 280,
    this.showLogo = true,
    this.logoWidget,
  });

  /// Profile section at the top.
  final AivoDrawerProfile? profile;

  /// Main navigation sections.
  final List<AivoDrawerSection> sections;

  /// Bottom section (settings, help, etc.).
  final AivoDrawerSection? bottomSection;

  /// Currently selected item index (flattened).
  final int? selectedIndex;

  /// Called when an item is selected.
  final ValueChanged<int>? onItemSelected;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Drawer width.
  final double width;

  /// Whether to show the logo header.
  final bool showLogo;

  /// Custom logo widget.
  final Widget? logoWidget;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Drawer(
      width: width,
      backgroundColor: colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      child: Column(
        children: [
          // Logo header
          if (showLogo)
            _LogoHeader(
              logoWidget: logoWidget,
              gradeBand: gradeBand,
            ),

          // Profile section
          if (profile != null)
            _ProfileSection(
              profile: profile!,
              gradeBand: gradeBand,
            ),

          // Main navigation sections
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                ..._buildSections(context),
              ],
            ),
          ),

          // Bottom section
          if (bottomSection != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: _buildSection(
                context,
                bottomSection!,
                _countItemsBefore(sections),
              ),
            ),
          ],

          // Safe area padding at bottom
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  List<Widget> _buildSections(BuildContext context) {
    final widgets = <Widget>[];
    var itemIndex = 0;

    for (var i = 0; i < sections.length; i++) {
      final section = sections[i];

      if (i > 0) {
        widgets.add(const Divider(height: 16));
      }

      widgets.add(_buildSection(context, section, itemIndex));
      itemIndex += _countItems(section.items);
    }

    return widgets;
  }

  Widget _buildSection(
    BuildContext context,
    AivoDrawerSection section,
    int startIndex,
  ) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section title
        if (section.title != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text(
              section.title!.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),

        // Items
        ..._buildItems(context, section.items, startIndex),
      ],
    );
  }

  List<Widget> _buildItems(
    BuildContext context,
    List<AivoDrawerItem> items,
    int startIndex,
  ) {
    final widgets = <Widget>[];
    var currentIndex = startIndex;

    for (final item in items) {
      widgets.add(
        _DrawerItemWidget(
          item: item,
          isSelected: selectedIndex == currentIndex,
          onTap: () {
            item.onTap?.call();
            onItemSelected?.call(currentIndex);
          },
          gradeBand: gradeBand,
        ),
      );
      currentIndex++;

      // Note: Children would need separate handling for nested navigation
    }

    return widgets;
  }

  int _countItems(List<AivoDrawerItem> items) {
    return items.length;
  }

  int _countItemsBefore(List<AivoDrawerSection> sections) {
    var count = 0;
    for (final section in sections) {
      count += _countItems(section.items);
    }
    return count;
  }
}

class _LogoHeader extends StatelessWidget {
  const _LogoHeader({
    this.logoWidget,
    this.gradeBand,
  });

  final Widget? logoWidget;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant,
            width: 1,
          ),
        ),
      ),
      child: logoWidget ??
          Row(
            children: [
              // Logo icon
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(AivoBrand.radiusSm),
                ),
                child: Center(
                  child: Text(
                    'A',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: colorScheme.onPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Logo text
              Text(
                AivoBrand.brandName,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    required this.profile,
    this.gradeBand,
  });

  final AivoDrawerProfile profile;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      onTap: profile.onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: colorScheme.outlineVariant,
              width: 1,
            ),
          ),
        ),
        child: Row(
          children: [
            // Avatar
            _Avatar(
              url: profile.avatarUrl,
              initials: profile.initials ?? _getInitials(profile.name),
            ),
            const SizedBox(width: 12),
            // Name and email
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (profile.email != null)
                    Text(
                      profile.email!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            // Chevron if tappable
            if (profile.onTap != null)
              Icon(
                Icons.chevron_right,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({
    this.url,
    required this.initials,
  });

  final String? url;
  final String initials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (url != null) {
      return CircleAvatar(
        radius: 20,
        backgroundImage: NetworkImage(url!),
        backgroundColor: colorScheme.primaryContainer,
      );
    }

    return CircleAvatar(
      radius: 20,
      backgroundColor: colorScheme.primaryContainer,
      child: Text(
        initials,
        style: theme.textTheme.titleSmall?.copyWith(
          color: colorScheme.onPrimaryContainer,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DrawerItemWidget extends StatelessWidget {
  const _DrawerItemWidget({
    required this.item,
    required this.isSelected,
    required this.onTap,
    this.gradeBand,
  });

  final AivoDrawerItem item;
  final bool isSelected;
  final VoidCallback onTap;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Get dimensions based on grade band
    final (itemHeight, iconSize, padding) = _getDimensions();

    // Colors
    final bgColor = isSelected
        ? colorScheme.primaryContainer.withValues(alpha: 0.5)
        : Colors.transparent;
    final fgColor = isSelected
        ? colorScheme.primary
        : colorScheme.onSurface;

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 1,
      ),
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(AivoBrand.radiusSm),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AivoBrand.radiusSm),
          child: Container(
            height: itemHeight,
            padding: EdgeInsets.symmetric(horizontal: padding),
            child: Row(
              children: [
                // Icon
                Icon(
                  item.icon,
                  size: iconSize,
                  color: fgColor,
                ),
                const SizedBox(width: 12),
                // Label
                Expanded(
                  child: Text(
                    item.label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: fgColor,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Badge
                if (item.badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    constraints: const BoxConstraints(minWidth: 20),
                    decoration: BoxDecoration(
                      color: item.badgeColor ?? colorScheme.error,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      item.badge!,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onError,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                // Trailing widget
                if (item.trailing != null) item.trailing!,
              ],
            ),
          ),
        ),
      ),
    );
  }

  (double height, double iconSize, double padding) _getDimensions() {
    return switch (gradeBand) {
      AivoGradeBand.k5 => (52.0, 24.0, 16.0),
      AivoGradeBand.g6_8 => (44.0, 22.0, 12.0),
      AivoGradeBand.g9_12 => (40.0, 20.0, 12.0),
      null => (44.0, 22.0, 12.0),
    };
  }
}

/// Mini/collapsed drawer variant.
class AivoMiniDrawer extends StatelessWidget {
  const AivoMiniDrawer({
    super.key,
    required this.items,
    this.selectedIndex,
    this.onItemSelected,
    this.gradeBand,
    this.showLabels = false,
  });

  /// Navigation items (icons only).
  final List<AivoDrawerItem> items;

  /// Currently selected index.
  final int? selectedIndex;

  /// Called when an item is selected.
  final ValueChanged<int>? onItemSelected;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Whether to show labels on hover/tooltip.
  final bool showLabels;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: 72,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(
          right: BorderSide(
            color: colorScheme.outlineVariant,
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          // Logo
          Container(
            height: 64,
            alignment: Alignment.center,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.primary,
                borderRadius: BorderRadius.circular(AivoBrand.radiusSm),
              ),
              child: Center(
                child: Text(
                  'A',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: colorScheme.onPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),

          const Divider(height: 1),

          // Items
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                final isSelected = selectedIndex == index;

                return Tooltip(
                  message: item.label,
                  preferBelow: false,
                  waitDuration: const Duration(milliseconds: 300),
                  child: _MiniDrawerItem(
                    item: item,
                    isSelected: isSelected,
                    onTap: () {
                      item.onTap?.call();
                      onItemSelected?.call(index);
                    },
                    gradeBand: gradeBand,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniDrawerItem extends StatelessWidget {
  const _MiniDrawerItem({
    required this.item,
    required this.isSelected,
    required this.onTap,
    this.gradeBand,
  });

  final AivoDrawerItem item;
  final bool isSelected;
  final VoidCallback onTap;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final bgColor = isSelected
        ? colorScheme.primaryContainer.withValues(alpha: 0.5)
        : Colors.transparent;
    final fgColor = isSelected ? colorScheme.primary : colorScheme.onSurface;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(AivoBrand.radiusSm),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AivoBrand.radiusSm),
          child: Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  item.icon,
                  size: 24,
                  color: fgColor,
                ),
                if (item.badge != null)
                  Positioned(
                    right: -8,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 1,
                      ),
                      constraints: const BoxConstraints(minWidth: 16),
                      decoration: BoxDecoration(
                        color: item.badgeColor ?? colorScheme.error,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.badge!,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.onError,
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
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
}
