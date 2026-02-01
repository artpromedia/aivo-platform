/// Icon & Illustration Preview Gallery
///
/// Interactive showcase of the Aivo icon system and illustrations.
/// Demonstrates sizes, colors, buttons, and grade-band adaptations.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_icons.dart';
import '../theme/aivo_illustrations.dart';
import '../theme/aivo_theme.dart';

/// Icon & Illustration system preview gallery.
class IconPreview extends StatefulWidget {
  const IconPreview({
    super.key,
    this.gradeBand,
  });

  final AivoGradeBand? gradeBand;

  @override
  State<IconPreview> createState() => _IconPreviewState();
}

class _IconPreviewState extends State<IconPreview>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  AivoGradeBand get _gradeBand =>
      widget.gradeBand ?? AivoTheme.gradeBandOf(context);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Icon & Illustration System'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Icons'),
            Tab(text: 'Sizes'),
            Tab(text: 'Buttons'),
            Tab(text: 'Illustrations'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _IconGalleryTab(
            gradeBand: _gradeBand,
            searchQuery: _searchQuery,
            onSearchChanged: (query) => setState(() => _searchQuery = query),
          ),
          _SizesTab(gradeBand: _gradeBand),
          _ButtonsTab(gradeBand: _gradeBand),
          _IllustrationsTab(gradeBand: _gradeBand),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ICON GALLERY TAB
// ══════════════════════════════════════════════════════════════════════════════

class _IconGalleryTab extends StatelessWidget {
  const _IconGalleryTab({
    required this.gradeBand,
    required this.searchQuery,
    required this.onSearchChanged,
  });

  final AivoGradeBand gradeBand;
  final String searchQuery;
  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Grouped icons
    final iconGroups = _getIconGroups();

    // Filter by search
    final filteredGroups = searchQuery.isEmpty
        ? iconGroups
        : iconGroups.map((group) {
            final filtered = group.icons.where((icon) =>
                icon.name.toLowerCase().contains(searchQuery.toLowerCase()));
            return _IconGroup(group.name, filtered.toList());
          }).where((group) => group.icons.isNotEmpty).toList();

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search icons...',
              prefixIcon: const Icon(LucideIcons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onChanged: onSearchChanged,
          ),
        ),
        // Info banner
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(
                LucideIcons.info,
                size: 16,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Using Lucide Icons to match web lucide-react. Tap icon to copy name.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Icon grid
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: filteredGroups.length,
            itemBuilder: (context, index) {
              final group = filteredGroups[index];
              return _IconGroupSection(
                group: group,
                gradeBand: gradeBand,
              );
            },
          ),
        ),
      ],
    );
  }

  List<_IconGroup> _getIconGroups() {
    return [
      _IconGroup('Navigation', [
        _IconEntry('home', AivoIcons.home),
        _IconEntry('menu', AivoIcons.menu),
        _IconEntry('back', AivoIcons.back),
        _IconEntry('forward', AivoIcons.forward),
        _IconEntry('chevronLeft', AivoIcons.chevronLeft),
        _IconEntry('chevronRight', AivoIcons.chevronRight),
        _IconEntry('chevronUp', AivoIcons.chevronUp),
        _IconEntry('chevronDown', AivoIcons.chevronDown),
        _IconEntry('close', AivoIcons.close),
        _IconEntry('moreHorizontal', AivoIcons.moreHorizontal),
        _IconEntry('moreVertical', AivoIcons.moreVertical),
        _IconEntry('externalLink', AivoIcons.externalLink),
      ]),
      _IconGroup('Actions', [
        _IconEntry('search', AivoIcons.search),
        _IconEntry('filter', AivoIcons.filter),
        _IconEntry('sort', AivoIcons.sort),
        _IconEntry('add', AivoIcons.add),
        _IconEntry('remove', AivoIcons.remove),
        _IconEntry('edit', AivoIcons.edit),
        _IconEntry('delete', AivoIcons.delete),
        _IconEntry('save', AivoIcons.save),
        _IconEntry('copy', AivoIcons.copy),
        _IconEntry('share', AivoIcons.share),
        _IconEntry('download', AivoIcons.download),
        _IconEntry('upload', AivoIcons.upload),
        _IconEntry('refresh', AivoIcons.refresh),
        _IconEntry('settings', AivoIcons.settings),
        _IconEntry('send', AivoIcons.send),
      ]),
      _IconGroup('Status', [
        _IconEntry('check', AivoIcons.check),
        _IconEntry('checkCircle', AivoIcons.checkCircle),
        _IconEntry('error', AivoIcons.error),
        _IconEntry('warning', AivoIcons.warning),
        _IconEntry('info', AivoIcons.info),
        _IconEntry('help', AivoIcons.help),
        _IconEntry('loading', AivoIcons.loading),
      ]),
      _IconGroup('User', [
        _IconEntry('user', AivoIcons.user),
        _IconEntry('users', AivoIcons.users),
        _IconEntry('userPlus', AivoIcons.userPlus),
        _IconEntry('profile', AivoIcons.profile),
        _IconEntry('graduationCap', AivoIcons.graduationCap),
      ]),
      _IconGroup('Communication', [
        _IconEntry('bell', AivoIcons.bell),
        _IconEntry('bellOff', AivoIcons.bellOff),
        _IconEntry('mail', AivoIcons.mail),
        _IconEntry('message', AivoIcons.message),
        _IconEntry('messageSquare', AivoIcons.messageSquare),
        _IconEntry('phone', AivoIcons.phone),
        _IconEntry('video', AivoIcons.video),
      ]),
      _IconGroup('Media', [
        _IconEntry('file', AivoIcons.file),
        _IconEntry('fileText', AivoIcons.fileText),
        _IconEntry('folder', AivoIcons.folder),
        _IconEntry('image', AivoIcons.image),
        _IconEntry('music', AivoIcons.music),
        _IconEntry('play', AivoIcons.play),
        _IconEntry('pause', AivoIcons.pause),
        _IconEntry('camera', AivoIcons.camera),
        _IconEntry('microphone', AivoIcons.microphone),
      ]),
      _IconGroup('Education', [
        _IconEntry('book', AivoIcons.book),
        _IconEntry('bookOpen', AivoIcons.bookOpen),
        _IconEntry('library', AivoIcons.library),
        _IconEntry('school', AivoIcons.school),
        _IconEntry('award', AivoIcons.award),
        _IconEntry('trophy', AivoIcons.trophy),
        _IconEntry('star', AivoIcons.star),
        _IconEntry('target', AivoIcons.target),
        _IconEntry('calendar', AivoIcons.calendar),
        _IconEntry('clock', AivoIcons.clock),
      ]),
      _IconGroup('Progress', [
        _IconEntry('brain', AivoIcons.brain),
        _IconEntry('lightbulb', AivoIcons.lightbulb),
        _IconEntry('puzzle', AivoIcons.puzzle),
        _IconEntry('trendingUp', AivoIcons.trendingUp),
        _IconEntry('trendingDown', AivoIcons.trendingDown),
        _IconEntry('barChart', AivoIcons.barChart),
        _IconEntry('activity', AivoIcons.activity),
      ]),
      _IconGroup('Gamification', [
        _IconEntry('coins', AivoIcons.coins),
        _IconEntry('gem', AivoIcons.gem),
        _IconEntry('flame', AivoIcons.flame),
        _IconEntry('zap', AivoIcons.zap),
        _IconEntry('rocket', AivoIcons.rocket),
        _IconEntry('sparkles', AivoIcons.sparkles),
        _IconEntry('crown', AivoIcons.crown),
        _IconEntry('medal', AivoIcons.medal),
        _IconEntry('gift', AivoIcons.gift),
      ]),
      _IconGroup('Interface', [
        _IconEntry('eye', AivoIcons.eye),
        _IconEntry('eyeOff', AivoIcons.eyeOff),
        _IconEntry('lock', AivoIcons.lock),
        _IconEntry('unlock', AivoIcons.unlock),
        _IconEntry('bookmark', AivoIcons.bookmark),
        _IconEntry('heart', AivoIcons.heart),
        _IconEntry('thumbsUp', AivoIcons.thumbsUp),
        _IconEntry('thumbsDown', AivoIcons.thumbsDown),
      ]),
      _IconGroup('Device', [
        _IconEntry('smartphone', AivoIcons.smartphone),
        _IconEntry('tablet', AivoIcons.tablet),
        _IconEntry('monitor', AivoIcons.monitor),
        _IconEntry('wifi', AivoIcons.wifi),
        _IconEntry('wifiOff', AivoIcons.wifiOff),
        _IconEntry('globe', AivoIcons.globe),
      ]),
      _IconGroup('Tools', [
        _IconEntry('drag', AivoIcons.drag),
        _IconEntry('maximize', AivoIcons.maximize),
        _IconEntry('minimize', AivoIcons.minimize),
        _IconEntry('sun', AivoIcons.sun),
        _IconEntry('moon', AivoIcons.moon),
        _IconEntry('palette', AivoIcons.palette),
        _IconEntry('languages', AivoIcons.languages),
      ]),
      _IconGroup('AI', [
        _IconEntry('bot', AivoIcons.bot),
        _IconEntry('cpu', AivoIcons.cpu),
        _IconEntry('wand', AivoIcons.wand),
        _IconEntry('magic', AivoIcons.magic),
      ]),
    ];
  }
}

class _IconGroup {
  const _IconGroup(this.name, this.icons);
  final String name;
  final List<_IconEntry> icons;
}

class _IconEntry {
  const _IconEntry(this.name, this.icon);
  final String name;
  final IconData icon;
}

class _IconGroupSection extends StatelessWidget {
  const _IconGroupSection({
    required this.group,
    required this.gradeBand,
  });

  final _IconGroup group;
  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            group.name,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: group.icons.map((entry) {
            return _IconTile(
              entry: entry,
              gradeBand: gradeBand,
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _IconTile extends StatelessWidget {
  const _IconTile({
    required this.entry,
    required this.gradeBand,
  });

  final _IconEntry entry;
  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Tooltip(
      message: 'AivoIcons.${entry.name}',
      child: InkWell(
        onTap: () {
          Clipboard.setData(ClipboardData(text: 'AivoIcons.${entry.name}'));
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Copied: AivoIcons.${entry.name}'),
              duration: const Duration(seconds: 1),
            ),
          );
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 72,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.3),
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AivoIcon(
                entry.icon,
                size: AivoIconSize.lg,
                gradeBand: gradeBand,
              ),
              const SizedBox(height: 4),
              Text(
                entry.name,
                style: theme.textTheme.labelSmall,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SIZES TAB
// ══════════════════════════════════════════════════════════════════════════════

class _SizesTab extends StatelessWidget {
  const _SizesTab({required this.gradeBand});

  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionHeader(title: 'Standard Sizes'),
        const SizedBox(height: 16),
        _SizeRow(
          label: 'XS (12px)',
          sublabel: 'Inline indicators',
          icon: AivoIcons.check,
          size: AivoIconSize.xs,
        ),
        _SizeRow(
          label: 'SM (16px)',
          sublabel: 'Badges, compact UI',
          icon: AivoIcons.check,
          size: AivoIconSize.sm,
        ),
        _SizeRow(
          label: 'MD (20px)',
          sublabel: 'Default, buttons',
          icon: AivoIcons.check,
          size: AivoIconSize.md,
        ),
        _SizeRow(
          label: 'LG (24px)',
          sublabel: 'Navigation, prominent',
          icon: AivoIcons.check,
          size: AivoIconSize.lg,
        ),
        _SizeRow(
          label: 'XL (32px)',
          sublabel: 'Feature highlights',
          icon: AivoIcons.check,
          size: AivoIconSize.xl,
        ),
        _SizeRow(
          label: 'XXL (40px)',
          sublabel: 'Empty states',
          icon: AivoIcons.check,
          size: AivoIconSize.xxl,
        ),
        _SizeRow(
          label: 'XXXL (48px)',
          sublabel: 'Hero icons',
          icon: AivoIcons.check,
          size: AivoIconSize.xxxl,
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Grade Band Scaling'),
        const SizedBox(height: 8),
        Text(
          'Icons scale up for younger learners',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        _GradeBandScaleDemo(),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Color Variants'),
        const SizedBox(height: 16),
        _ColorVariantsDemo(),
      ],
    );
  }
}

class _SizeRow extends StatelessWidget {
  const _SizeRow({
    required this.label,
    required this.sublabel,
    required this.icon,
    required this.size,
  });

  final String label;
  final String sublabel;
  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.3),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: Center(
              child: Icon(icon, size: size),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  sublabel,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${size.toInt()}px',
            style: theme.textTheme.labelMedium?.copyWith(
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}

class _GradeBandScaleDemo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        for (final band in AivoGradeBand.values) ...[
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  AivoIcon(
                    AivoIcons.star,
                    size: AivoIconSize.lg,
                    gradeBand: band,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    band.name,
                    style: theme.textTheme.labelSmall,
                  ),
                  Text(
                    '${AivoIconSize.forGradeBand(band, baseSize: AivoIconSize.lg).toStringAsFixed(1)}px',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontFamily: 'monospace',
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (band != AivoGradeBand.values.last) const SizedBox(width: 8),
        ],
      ],
    );
  }
}

class _ColorVariantsDemo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final variant in AivoIconVariant.values)
          _ColorVariantTile(variant: variant),
      ],
    );
  }
}

class _ColorVariantTile extends StatelessWidget {
  const _ColorVariantTile({required this.variant});

  final AivoIconVariant variant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: 80,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.3),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          AivoIcon(
            AivoIcons.bell,
            size: AivoIconSize.lg,
            variant: variant,
          ),
          const SizedBox(height: 4),
          Text(
            variant.name,
            style: theme.textTheme.labelSmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BUTTONS TAB
// ══════════════════════════════════════════════════════════════════════════════

class _ButtonsTab extends StatelessWidget {
  const _ButtonsTab({required this.gradeBand});

  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionHeader(title: 'Standard Icon Buttons'),
        const SizedBox(height: 16),
        _ButtonRow(
          label: 'Small',
          children: [
            AivoIconButton.sm(
              icon: AivoIcons.bell,
              onPressed: () {},
              tooltip: 'Notifications',
            ),
            AivoIconButton.sm(
              icon: AivoIcons.settings,
              onPressed: () {},
            ),
            AivoIconButton.sm(
              icon: AivoIcons.search,
              onPressed: () {},
            ),
          ],
        ),
        _ButtonRow(
          label: 'Medium',
          children: [
            AivoIconButton.md(
              icon: AivoIcons.bell,
              onPressed: () {},
              tooltip: 'Notifications',
            ),
            AivoIconButton.md(
              icon: AivoIcons.settings,
              onPressed: () {},
            ),
            AivoIconButton.md(
              icon: AivoIcons.search,
              onPressed: () {},
            ),
          ],
        ),
        _ButtonRow(
          label: 'Large',
          children: [
            AivoIconButton.lg(
              icon: AivoIcons.bell,
              onPressed: () {},
              tooltip: 'Notifications',
            ),
            AivoIconButton.lg(
              icon: AivoIcons.settings,
              onPressed: () {},
            ),
            AivoIconButton.lg(
              icon: AivoIcons.search,
              onPressed: () {},
            ),
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Filled Icon Buttons'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AivoFilledIconButton(
              icon: AivoIcons.add,
              onPressed: () {},
              tooltip: 'Add',
              gradeBand: gradeBand,
            ),
            AivoFilledIconButton(
              icon: AivoIcons.edit,
              onPressed: () {},
              backgroundColor: AivoBrand.teal,
              gradeBand: gradeBand,
            ),
            AivoFilledIconButton(
              icon: AivoIcons.delete,
              onPressed: () {},
              backgroundColor: theme.colorScheme.error,
              gradeBand: gradeBand,
            ),
            AivoFilledIconButton(
              icon: AivoIcons.check,
              onPressed: () {},
              backgroundColor: AivoBrand.success,
              gradeBand: gradeBand,
            ),
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Outlined Icon Buttons'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AivoOutlinedIconButton(
              icon: AivoIcons.share,
              onPressed: () {},
              gradeBand: gradeBand,
            ),
            AivoOutlinedIconButton(
              icon: AivoIcons.download,
              onPressed: () {},
              gradeBand: gradeBand,
            ),
            AivoOutlinedIconButton(
              icon: AivoIcons.bookmark,
              onPressed: () {},
              gradeBand: gradeBand,
            ),
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Icon with Badge'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 24,
          runSpacing: 16,
          children: [
            _BadgeDemo(label: 'No count', count: null),
            _BadgeDemo(label: 'Count: 3', count: 3),
            _BadgeDemo(label: 'Count: 99', count: 99),
            _BadgeDemo(label: 'Count: 150', count: 150),
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Disabled States'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AivoIconButton(
              icon: AivoIcons.bell,
              onPressed: () {},
              enabled: false,
            ),
            AivoFilledIconButton(
              icon: AivoIcons.add,
              onPressed: () {},
              enabled: false,
              gradeBand: gradeBand,
            ),
            AivoOutlinedIconButton(
              icon: AivoIcons.share,
              onPressed: () {},
              enabled: false,
              gradeBand: gradeBand,
            ),
          ],
        ),
      ],
    );
  }
}

class _ButtonRow extends StatelessWidget {
  const _ButtonRow({
    required this.label,
    required this.children,
  });

  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: theme.textTheme.labelLarge,
            ),
          ),
          ...children.map((child) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: child,
              )),
        ],
      ),
    );
  }
}

class _BadgeDemo extends StatelessWidget {
  const _BadgeDemo({
    required this.label,
    required this.count,
  });

  final String label;
  final int? count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        AivoIconBadge(
          icon: AivoIcons.bell,
          count: count,
          size: AivoIconSize.lg,
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.labelSmall,
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ILLUSTRATIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

class _IllustrationsTab extends StatelessWidget {
  const _IllustrationsTab({required this.gradeBand});

  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionHeader(title: 'Preset Illustrations'),
        const SizedBox(height: 8),
        Text(
          'Icon-based illustrations for common empty states',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _IllustrationTile(
              label: 'Empty Inbox',
              child: AivoPresetIllustration.emptyInbox(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'No Results',
              child: AivoPresetIllustration.noResults(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'Error',
              child: AivoPresetIllustration.error(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'Offline',
              child: AivoPresetIllustration.offline(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'Success',
              child: AivoPresetIllustration.success(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'Empty List',
              child: AivoPresetIllustration.emptyList(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'Learning',
              child: AivoPresetIllustration.learning(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
            _IllustrationTile(
              label: 'Achievement',
              child: AivoPresetIllustration.achievement(
                size: AivoIllustrationSize.md,
                gradeBand: gradeBand,
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Illustration Sizes'),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _SizeDemo(
              label: 'SM (80)',
              size: AivoIllustrationSize.sm,
              gradeBand: gradeBand,
            ),
            _SizeDemo(
              label: 'MD (120)',
              size: AivoIllustrationSize.md,
              gradeBand: gradeBand,
            ),
            _SizeDemo(
              label: 'LG (180)',
              size: AivoIllustrationSize.lg,
              gradeBand: gradeBand,
            ),
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Grade Band Variations'),
        const SizedBox(height: 8),
        Text(
          'Same illustration adapts visual style per grade band',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            for (final band in AivoGradeBand.values) ...[
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      AivoGradeBandIllustration(
                        icon: AivoIcons.rocket,
                        size: AivoIllustrationSize.md,
                        gradeBand: band,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        band.name,
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (band != AivoGradeBand.values.last) const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 32),
        _SectionHeader(title: 'Icon Illustrations'),
        const SizedBox(height: 8),
        Text(
          'Custom icon-based illustrations with decorations',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 24,
          runSpacing: 16,
          children: [
            AivoIconIllustration(
              icon: AivoIcons.trophy,
              size: AivoIllustrationSize.md,
              primaryColor: AivoBrand.warning,
              gradeBand: gradeBand,
            ),
            AivoIconIllustration(
              icon: AivoIcons.brain,
              size: AivoIllustrationSize.md,
              primaryColor: AivoBrand.primary,
              gradeBand: gradeBand,
            ),
            AivoIconIllustration(
              icon: AivoIcons.flame,
              size: AivoIllustrationSize.md,
              primaryColor: AivoBrand.coral,
              gradeBand: gradeBand,
            ),
            AivoIconIllustration(
              icon: AivoIcons.sparkles,
              size: AivoIllustrationSize.md,
              primaryColor: AivoBrand.teal,
              gradeBand: gradeBand,
            ),
          ],
        ),
      ],
    );
  }
}

class _IllustrationTile extends StatelessWidget {
  const _IllustrationTile({
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.3),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          child,
          const SizedBox(height: 8),
          Text(
            label,
            style: theme.textTheme.labelSmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SizeDemo extends StatelessWidget {
  const _SizeDemo({
    required this.label,
    required this.size,
    required this.gradeBand,
  });

  final String label;
  final double size;
  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        AivoIconIllustration(
          icon: AivoIcons.star,
          size: size,
          gradeBand: gradeBand,
          decorations: false,
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: theme.textTheme.labelSmall,
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 4,
          height: 20,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
