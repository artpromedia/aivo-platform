/// Partner Content Picker Widget
///
/// A tabbed content picker that shows both Aivo content and
/// licensed partner content from the marketplace.
///
/// Used by teachers to select content for lesson plans and activities.
library;

import 'package:flutter/material.dart';

import '../api/marketplace_api.dart';

/// Callback when content is selected
typedef OnContentSelected = void Function(
  String contentId,
  String contentTitle,
  String contentType,
  bool isPartnerContent,
);

/// Content picker with Aivo and Partner content tabs
class PartnerContentPicker extends StatefulWidget {
  const PartnerContentPicker({
    required this.tenantId,
    required this.onSelect,
    this.schoolId,
    this.classroomId,
    this.gradeBand,
    this.subject,
    this.showPartnerTab = true,
    super.key,
  });

  final String tenantId;
  final String? schoolId;
  final String? classroomId;
  final String? gradeBand;
  final String? subject;
  final bool showPartnerTab;
  final OnContentSelected onSelect;

  @override
  State<PartnerContentPicker> createState() => _PartnerContentPickerState();
}

class _PartnerContentPickerState extends State<PartnerContentPicker>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _marketplaceApi = MarketplaceApiClient();
  final _searchController = TextEditingController();

  List<PartnerContentItem> _partnerItems = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.showPartnerTab ? 2 : 1,
      vsync: this,
    );
    _loadContent();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadContent() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await _marketplaceApi.getEntitledPartnerContent(
        tenantId: widget.tenantId,
        schoolId: widget.schoolId,
        classroomId: widget.classroomId,
        gradeBand: widget.gradeBand,
        subject: widget.subject,
        itemType: MarketplaceItemType.contentPack,
      );

      setState(() {
        _partnerItems = result.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<PartnerContentItem> get _filteredPartnerItems {
    if (_searchQuery.isEmpty) return _partnerItems;
    final query = _searchQuery.toLowerCase();
    return _partnerItems.where((item) {
      return item.title.toLowerCase().contains(query) ||
          item.vendor.name.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        // Tab bar
        if (widget.showPartnerTab)
          Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: colorScheme.outlineVariant,
                ),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              tabs: [
                const Tab(
                  icon: Icon(Icons.school),
                  text: 'Aivo Content',
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.handshake),
                      const SizedBox(width: 8),
                      const Text('Partner Content'),
                      if (_partnerItems.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${_partnerItems.length}',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            onChanged: (value) => setState(() => _searchQuery = value),
            decoration: InputDecoration(
              hintText: 'Search content...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
            ),
          ),
        ),

        // Content
        Expanded(
          child: widget.showPartnerTab
              ? TabBarView(
                  controller: _tabController,
                  children: [
                    // Aivo Content Tab (placeholder - would load native LOs)
                    _buildAivoContentTab(),
                    // Partner Content Tab
                    _buildPartnerContentTab(),
                  ],
                )
              : _buildAivoContentTab(),
        ),
      ],
    );
  }

  Widget _buildAivoContentTab() {
    // This would be replaced with actual Aivo content loading
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.school,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            'Aivo Content',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Select from your Aivo content library',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerContentTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return _buildErrorState();
    }

    if (_partnerItems.isEmpty) {
      return _buildEmptyPartnerState();
    }

    final filteredItems = _filteredPartnerItems;

    if (filteredItems.isEmpty) {
      return _buildNoSearchResultsState();
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: filteredItems.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final item = filteredItems[index];
        return _PartnerContentCard(
          item: item,
          onTap: () => widget.onSelect(
            item.id,
            item.title,
            item.itemType == MarketplaceItemType.contentPack
                ? 'CONTENT_PACK'
                : 'EMBEDDED_TOOL',
            true,
          ),
        );
      },
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load content',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _loadContent,
            icon: const Icon(Icons.refresh),
            label: const Text('Try again'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyPartnerState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.handshake,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            'No Partner Content Available',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Your district hasn\'t licensed any partner content packs yet. '
              'Contact your admin to explore the marketplace.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoSearchResultsState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            'No results found',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Try a different search term',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }
}

/// Card widget for displaying a partner content item
class _PartnerContentCard extends StatelessWidget {
  const _PartnerContentCard({
    required this.item,
    required this.onTap,
  });

  final PartnerContentItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasSeatsWarning =
        item.license.seatLimit != null && !item.license.hasSeatsAvailable;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: hasSeatsWarning ? null : onTap,
        child: Opacity(
          opacity: hasSeatsWarning ? 0.5 : 1.0,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Icon
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: item.iconUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            item.iconUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.handshake,
                              size: 24,
                            ),
                          ),
                        )
                      : const Icon(Icons.handshake, size: 24),
                ),
                const SizedBox(width: 12),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: theme.textTheme.titleSmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: colorScheme.primaryContainer,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Partner',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colorScheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${item.vendor.name} • ${item.loCount} activities',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.outline,
                        ),
                      ),
                      if (item.accessibilityTags.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: item.accessibilityTags
                              .take(3)
                              .map((tag) => _AccessibilityChip(tag: tag))
                              .toList(),
                        ),
                      ],
                      if (hasSeatsWarning) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(
                              Icons.warning_amber,
                              size: 16,
                              color: colorScheme.error,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'All seats in use (${item.license.seatsUsed}/${item.license.seatLimit})',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colorScheme.error,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                // Arrow
                if (!hasSeatsWarning)
                  Icon(
                    Icons.add_circle_outline,
                    color: colorScheme.outline,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AccessibilityChip extends StatelessWidget {
  const _AccessibilityChip({required this.tag});

  final String tag;

  String get _label {
    switch (tag) {
      case 'TTS':
        return 'Text-to-Speech';
      case 'DYSLEXIA_FRIENDLY':
        return 'Dyslexia Friendly';
      case 'CAPTIONS':
        return 'Captions';
      case 'HIGH_CONTRAST':
        return 'High Contrast';
      default:
        return tag;
    }
  }

  IconData get _icon {
    switch (tag) {
      case 'TTS':
        return Icons.record_voice_over;
      case 'DYSLEXIA_FRIENDLY':
        return Icons.text_fields;
      case 'CAPTIONS':
        return Icons.closed_caption;
      case 'HIGH_CONTRAST':
        return Icons.contrast;
      default:
        return Icons.accessibility;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: colorScheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _icon,
            size: 12,
            color: colorScheme.onTertiaryContainer,
          ),
          const SizedBox(width: 4),
          Text(
            _label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onTertiaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}
