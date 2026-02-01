/// Navigation Preview Widget
///
/// Gallery widget showcasing all Aivo navigation components with
/// interactive demos for AppBar, BottomNav, Drawer, and TabBar variants.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_theme.dart';
import '../ui/aivo_app_bar.dart';
import '../ui/aivo_bottom_nav.dart';
import '../ui/aivo_drawer.dart';
import '../ui/aivo_tab_bar.dart';
import '../ui/aivo_transitions.dart';

/// Navigation component preview gallery.
class NavigationPreview extends StatefulWidget {
  const NavigationPreview({
    super.key,
    this.gradeBand,
  });

  /// Grade band for adaptive sizing.
  final AivoGradeBand? gradeBand;

  @override
  State<NavigationPreview> createState() => _NavigationPreviewState();
}

class _NavigationPreviewState extends State<NavigationPreview>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late TabController _scrollableTabController;
  int _bottomNavIndex = 0;
  int _appBarVariantIndex = 0;
  int _bottomNavVariantIndex = 0;
  int _tabBarVariantIndex = 0;
  bool _drawerExpanded = true;

  final _appBarVariants = AivoAppBarVariant.values;
  final _bottomNavVariants = AivoBottomNavVariant.values;
  final _tabBarVariants = AivoTabBarVariant.values;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _scrollableTabController = TabController(length: 8, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollableTabController.dispose();
    super.dispose();
  }

  AivoGradeBand get _gradeBand => widget.gradeBand ?? AivoGradeBand.g6_8;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Navigation Components'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionHeader(theme, 'AppBar Variants'),
          _buildAppBarSection(context),
          const SizedBox(height: 32),
          _buildSectionHeader(theme, 'Bottom Navigation Bar'),
          _buildBottomNavSection(context),
          const SizedBox(height: 32),
          _buildSectionHeader(theme, 'Drawer / Sidebar'),
          _buildDrawerSection(context),
          const SizedBox(height: 32),
          _buildSectionHeader(theme, 'Tab Bar Variants'),
          _buildTabBarSection(context),
          const SizedBox(height: 32),
          _buildSectionHeader(theme, 'Page Transitions'),
          _buildTransitionsSection(context),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: theme.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildVariantSelector<T>({
    required List<T> variants,
    required int selectedIndex,
    required ValueChanged<int> onChanged,
    required String Function(T) labelBuilder,
  }) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: variants.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final isSelected = index == selectedIndex;
          return FilterChip(
            selected: isSelected,
            label: Text(labelBuilder(variants[index])),
            onSelected: (_) => onChanged(index),
          );
        },
      ),
    );
  }

  // ----- AppBar Section -----

  Widget _buildAppBarSection(BuildContext context) {
    final variant = _appBarVariants[_appBarVariantIndex];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildVariantSelector(
          variants: _appBarVariants,
          selectedIndex: _appBarVariantIndex,
          onChanged: (index) => setState(() => _appBarVariantIndex = index),
          labelBuilder: (v) => v.name,
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).dividerColor,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              // AppBar preview
              AivoAppBar(
                title: 'Page Title',
                variant: variant,
                gradeBand: _gradeBand,
                leading: const AivoBackButton(),
                actions: [
                  AivoAppBarAction(
                    icon: Icons.search,
                    onPressed: () {},
                    gradeBand: _gradeBand,
                  ),
                  AivoAppBarAction(
                    icon: Icons.more_vert,
                    onPressed: () {},
                    gradeBand: _gradeBand,
                  ),
                ],
              ),
              // Placeholder content
              Container(
                height: 100,
                color: variant == AivoAppBarVariant.transparent
                    ? Theme.of(context).colorScheme.surfaceContainerHighest
                    : Theme.of(context).colorScheme.surface,
                alignment: Alignment.center,
                child: Text(
                  'Page Content',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Search AppBar preview
        Text(
          'Search AppBar',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).dividerColor),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: AivoSearchAppBar(
            hint: 'Search...',
            gradeBand: _gradeBand,
            onChanged: (value) {},
          ),
        ),
      ],
    );
  }

  // ----- Bottom Navigation Section -----

  Widget _buildBottomNavSection(BuildContext context) {
    final variant = _bottomNavVariants[_bottomNavVariantIndex];

    final items = [
      const AivoBottomNavItem(
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        label: 'Home',
      ),
      const AivoBottomNavItem(
        icon: Icons.explore_outlined,
        selectedIcon: Icons.explore,
        label: 'Explore',
      ),
      const AivoBottomNavItem(
        icon: Icons.notifications_outlined,
        selectedIcon: Icons.notifications,
        label: 'Alerts',
        badge: '3',
      ),
      const AivoBottomNavItem(
        icon: Icons.person_outline,
        selectedIcon: Icons.person,
        label: 'Profile',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildVariantSelector(
          variants: _bottomNavVariants,
          selectedIndex: _bottomNavVariantIndex,
          onChanged: (index) => setState(() => _bottomNavVariantIndex = index),
          labelBuilder: (v) => v.name,
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).dividerColor),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              // Page content placeholder
              Container(
                height: 100,
                color: Theme.of(context).colorScheme.surface,
                alignment: Alignment.center,
                child: Text(
                  'Page Content',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
              // Bottom nav preview
              AivoBottomNavBar(
                items: items,
                currentIndex: _bottomNavIndex,
                onTap: (index) => setState(() => _bottomNavIndex = index),
                variant: variant,
                gradeBand: _gradeBand,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Floating variant
        Text(
          'Floating Bottom Nav',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Container(
          height: 140,
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).dividerColor),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              Container(
                color: Theme.of(context).colorScheme.surface,
                alignment: Alignment.center,
                child: Text(
                  'Page Content',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: AivoFloatingBottomNav(
                  items: items,
                  currentIndex: _bottomNavIndex,
                  onTap: (index) => setState(() => _bottomNavIndex = index),
                  gradeBand: _gradeBand,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ----- Drawer Section -----

  Widget _buildDrawerSection(BuildContext context) {
    final drawerItems = [
      AivoDrawerItem(
        icon: Icons.home_outlined,
        label: 'Home',
        onTap: () {},
      ),
      AivoDrawerItem(
        icon: Icons.school_outlined,
        label: 'Courses',
        onTap: () {},
      ),
      AivoDrawerItem(
        icon: Icons.assignment_outlined,
        label: 'Assignments',
        badge: '5',
        onTap: () {},
      ),
      AivoDrawerItem(
        icon: Icons.bar_chart_outlined,
        label: 'Progress',
        onTap: () {},
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            FilterChip(
              selected: _drawerExpanded,
              label: const Text('Expanded'),
              onSelected: (_) => setState(() => _drawerExpanded = true),
            ),
            const SizedBox(width: 8),
            FilterChip(
              selected: !_drawerExpanded,
              label: const Text('Mini'),
              onSelected: (_) => setState(() => _drawerExpanded = false),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          height: 400,
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).dividerColor),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Row(
            children: [
              // Drawer preview
              if (_drawerExpanded)
                SizedBox(
                  width: 280,
                  child: AivoDrawer(
                    logoWidget: Container(
                      height: 32,
                      width: 80,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'LOGO',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    profile: AivoDrawerProfile(
                      name: 'Student Name',
                      email: 'student@example.com',
                      initials: 'SN',
                      onTap: () {},
                    ),
                    sections: [
                      AivoDrawerSection(
                        items: drawerItems,
                      ),
                      AivoDrawerSection(
                        title: 'Settings',
                        items: [
                          AivoDrawerItem(
                            icon: Icons.settings_outlined,
                            label: 'Preferences',
                            onTap: () {},
                          ),
                          AivoDrawerItem(
                            icon: Icons.help_outline,
                            label: 'Help',
                            onTap: () {},
                          ),
                        ],
                      ),
                    ],
                    selectedIndex: 0,
                    gradeBand: _gradeBand,
                  ),
                )
              else
                AivoMiniDrawer(
                  items: drawerItems,
                  selectedIndex: 0,
                  onItemSelected: (index) {},
                  gradeBand: _gradeBand,
                ),
              // Content area
              Expanded(
                child: Container(
                  color: Theme.of(context).colorScheme.surface,
                  alignment: Alignment.center,
                  child: Text(
                    'Page Content',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ----- Tab Bar Section -----

  Widget _buildTabBarSection(BuildContext context) {
    final variant = _tabBarVariants[_tabBarVariantIndex];

    final tabs = [
      const AivoTabItem(label: 'All'),
      const AivoTabItem(label: 'Active'),
      const AivoTabItem(label: 'Completed', badge: '12'),
      const AivoTabItem(label: 'Archived'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildVariantSelector(
          variants: _tabBarVariants,
          selectedIndex: _tabBarVariantIndex,
          onChanged: (index) => setState(() => _tabBarVariantIndex = index),
          labelBuilder: (v) => v.name,
        ),
        const SizedBox(height: 16),
        Container(
          height: 200,
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).dividerColor),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              // Tab bar
              AivoTabBar(
                tabs: tabs,
                controller: _tabController,
                variant: variant,
                gradeBand: _gradeBand,
              ),
              // Tab content
              Expanded(
                child: AivoTabBarView(
                  controller: _tabController,
                  gradeBand: _gradeBand,
                  children: [
                    _tabContent(context, 'All Items'),
                    _tabContent(context, 'Active Items'),
                    _tabContent(context, 'Completed Items'),
                    _tabContent(context, 'Archived Items'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Scrollable tabs
        Text(
          'Scrollable Tabs',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).dividerColor),
            borderRadius: BorderRadius.circular(8),
          ),
          clipBehavior: Clip.antiAlias,
          child: AivoScrollableTabBar(
            tabs: List.generate(
              8,
              (i) => AivoTabItem(label: 'Category ${i + 1}'),
            ),
            controller: _scrollableTabController,
            gradeBand: _gradeBand,
          ),
        ),
        const SizedBox(height: 16),
        // Filter chips
        Text(
          'Filter Chips',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        AivoFilterChips(
          filters: const ['All', 'Math', 'Science', 'English', 'History', 'Art'],
          selected: const {0},
          onSelected: (indices) {},
          gradeBand: _gradeBand,
        ),
      ],
    );
  }

  Widget _tabContent(BuildContext context, String label) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      alignment: Alignment.center,
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
    );
  }

  // ----- Transitions Section -----

  Widget _buildTransitionsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Grade-band aware page transitions:',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 8),
        _buildTransitionInfo(
          context,
          'Explorer (K-5)',
          '350ms, bouncy curves',
          Colors.green,
        ),
        _buildTransitionInfo(
          context,
          'Navigator (6-8)',
          '300ms, smooth curves',
          Colors.blue,
        ),
        _buildTransitionInfo(
          context,
          'Scholar (9-12)',
          '250ms, subtle curves',
          Colors.purple,
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: AivoTransitionType.values.map((type) {
            if (type == AivoTransitionType.none) return const SizedBox.shrink();
            return FilledButton.tonal(
              onPressed: () => _showTransitionDemo(context, type),
              child: Text(type.name),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildTransitionInfo(
    BuildContext context,
    String title,
    String subtitle,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$title: ',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }

  void _showTransitionDemo(
    BuildContext context,
    AivoTransitionType type,
  ) {
    Navigator.of(context).push(
      AivoPageRoute(
        page: _TransitionDemoPage(
          transitionType: type,
          gradeBand: _gradeBand,
        ),
        transitionType: type,
        gradeBand: _gradeBand,
      ),
    );
  }
}

/// Demo page for transition preview.
class _TransitionDemoPage extends StatelessWidget {
  const _TransitionDemoPage({
    required this.transitionType,
    required this.gradeBand,
  });

  final AivoTransitionType transitionType;
  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AivoAppBar(
        title: '${transitionType.name} Transition',
        gradeBand: gradeBand,
        leading: const AivoBackButton(),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.animation,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Transition: ${transitionType.name}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Grade Band: ${gradeBand.name}',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}
