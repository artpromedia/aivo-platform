import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../pin/pin_storage.dart';
import '../sel_models.dart';
import '../sel_service.dart';
import '../widgets/coping_card.dart';

/// Coping Strategies Screen
///
/// Browse and learn various coping strategies organized by category.
class CopingStrategiesScreen extends StatefulWidget {
  final String learnerId;

  const CopingStrategiesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<CopingStrategiesScreen> createState() => _CopingStrategiesScreenState();
}

class _CopingStrategiesScreenState extends State<CopingStrategiesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  SELService? _selService;
  String _cachedToken = '';

  List<CopingStrategy> _strategies = [];
  bool _isLoading = true;
  CopingCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: CopingCategory.values.length + 1,
      vsync: this,
    );
    _tabController.addListener(_onTabChanged);
    _initializeService();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;

    setState(() {
      _selectedCategory = _tabController.index == 0
          ? null
          : CopingCategory.values[_tabController.index - 1];
    });
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _selService = SELService(
      baseUrl: EnvironmentConfig.selBaseUrl,
      getAuthToken: () => _cachedToken,
      learnerId: widget.learnerId,
    );

    await _loadStrategies();
  }

  Future<void> _loadStrategies() async {
    if (_selService == null) return;

    setState(() => _isLoading = true);

    try {
      final strategies = await _selService!.getCopingStrategies();
      if (mounted) {
        setState(() {
          _strategies = strategies;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<CopingStrategy> get _filteredStrategies {
    if (_selectedCategory == null) return _strategies;
    return _strategies
        .where((s) => s.category == _selectedCategory)
        .toList();
  }

  List<CopingStrategy> get _favorites {
    return _strategies.where((s) => s.isFavorite).toList();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Coping Strategies'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            const Tab(text: 'All'),
            ...CopingCategory.values.map((cat) => Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(cat.icon),
                      const SizedBox(width: 4),
                      Text(cat.label),
                    ],
                  ),
                )),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadStrategies,
              child: _buildContent(),
            ),
    );
  }

  Widget _buildContent() {
    if (_filteredStrategies.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.self_improvement,
              size: 64,
              color: AivoBrand.gray.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No strategies found',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for new strategies',
              style: TextStyle(color: AivoBrand.gray.shade600),
            ),
          ],
        ),
      );
    }

    return CustomScrollView(
      slivers: [
        // Favorites section (only on All tab)
        if (_selectedCategory == null && _favorites.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Favorites',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 160,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _favorites.length,
                itemBuilder: (context, index) {
                  return Padding(
                    padding: EdgeInsets.only(
                      right: index < _favorites.length - 1 ? 12 : 0,
                    ),
                    child: SizedBox(
                      width: 280,
                      child: CopingCard(
                        strategy: _favorites[index],
                        compact: true,
                        onTap: () => _openStrategyDetail(_favorites[index]),
                        onFavoriteToggle: () =>
                            _toggleFavorite(_favorites[index]),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 16),
          ),
        ],

        // All strategies header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Text(
              _selectedCategory == null
                  ? 'All Strategies'
                  : '${_selectedCategory!.label} Strategies',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        ),

        // Strategies list
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final strategy = _filteredStrategies[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: CopingCard(
                    strategy: strategy,
                    onTap: () => _openStrategyDetail(strategy),
                    onFavoriteToggle: () => _toggleFavorite(strategy),
                  ),
                );
              },
              childCount: _filteredStrategies.length,
            ),
          ),
        ),

        const SliverToBoxAdapter(
          child: SizedBox(height: 24),
        ),
      ],
    );
  }

  void _openStrategyDetail(CopingStrategy strategy) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _StrategyDetailSheet(
        strategy: strategy,
        selService: _selService!,
        onFavoriteToggle: () => _toggleFavorite(strategy),
      ),
    );
  }

  Future<void> _toggleFavorite(CopingStrategy strategy) async {
    if (_selService == null) return;

    try {
      await _selService!.toggleStrategyFavorite(
        strategy.id,
        !strategy.isFavorite,
      );
      setState(() {
        final index = _strategies.indexWhere((s) => s.id == strategy.id);
        if (index != -1) {
          _strategies[index] = strategy.copyWith(
            isFavorite: !strategy.isFavorite,
          );
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update favorite: $e')),
        );
      }
    }
  }
}

class _StrategyDetailSheet extends StatefulWidget {
  final CopingStrategy strategy;
  final SELService selService;
  final VoidCallback onFavoriteToggle;

  const _StrategyDetailSheet({
    required this.strategy,
    required this.selService,
    required this.onFavoriteToggle,
  });

  @override
  State<_StrategyDetailSheet> createState() => _StrategyDetailSheetState();
}

class _StrategyDetailSheetState extends State<_StrategyDetailSheet> {
  int _currentStep = 0;
  bool _isCompleted = false;
  int _effectiveness = 3;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AivoBrand.gray.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(24),
                  children: [
                    // Header
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: widget.strategy.category.color.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              widget.strategy.category.icon,
                              style: const TextStyle(fontSize: 24),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.strategy.name,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              Text(
                                '${widget.strategy.duration} min • ${widget.strategy.difficulty.label}',
                                style: TextStyle(color: AivoBrand.gray.shade600),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            widget.strategy.isFavorite
                                ? Icons.star
                                : Icons.star_border,
                            color: widget.strategy.isFavorite
                                ? Colors.amber
                                : AivoBrand.gray,
                          ),
                          onPressed: widget.onFavoriteToggle,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Description
                    Text(
                      widget.strategy.description,
                      style: TextStyle(
                        color: AivoBrand.gray.shade700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Steps
                    if (!_isCompleted) ...[
                      Text(
                        'Follow these steps:',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),
                      ...widget.strategy.steps.asMap().entries.map((entry) {
                        final index = entry.key;
                        final step = entry.value;
                        final isActive = index == _currentStep;
                        final isCompleted = index < _currentStep;

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? widget.strategy.category.color.withOpacity(0.1)
                                  : isCompleted
                                      ? AivoBrand.success.withOpacity(0.05)
                                      : AivoBrand.gray.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isActive
                                    ? widget.strategy.category.color
                                    : Colors.transparent,
                                width: 2,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: isCompleted
                                        ? AivoBrand.success
                                        : isActive
                                            ? widget.strategy.category.color
                                            : AivoBrand.gray.shade200,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: isCompleted
                                        ? const Icon(
                                            Icons.check,
                                            color: Colors.white,
                                            size: 18,
                                          )
                                        : Text(
                                            '${index + 1}',
                                            style: TextStyle(
                                              color: isActive
                                                  ? Colors.white
                                                  : AivoBrand.gray.shade600,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    step,
                                    style: TextStyle(
                                      color: isActive
                                          ? Colors.black
                                          : AivoBrand.gray.shade700,
                                      fontWeight: isActive
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 24),

                      // Navigation buttons
                      Row(
                        children: [
                          if (_currentStep > 0)
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () {
                                  setState(() => _currentStep--);
                                },
                                child: const Text('Previous'),
                              ),
                            ),
                          if (_currentStep > 0) const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                if (_currentStep < widget.strategy.steps.length - 1) {
                                  setState(() => _currentStep++);
                                } else {
                                  setState(() => _isCompleted = true);
                                }
                              },
                              child: Text(
                                _currentStep < widget.strategy.steps.length - 1
                                    ? 'Next Step'
                                    : 'Complete',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      // Completion feedback
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AivoBrand.success.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              '🎉',
                              style: TextStyle(fontSize: 48),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Great job!',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'How helpful was this strategy?',
                              style: TextStyle(color: AivoBrand.gray.shade600),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(5, (index) {
                                return IconButton(
                                  icon: Icon(
                                    index < _effectiveness
                                        ? Icons.star
                                        : Icons.star_border,
                                    color: Colors.amber,
                                    size: 32,
                                  ),
                                  onPressed: () {
                                    setState(() => _effectiveness = index + 1);
                                  },
                                );
                              }),
                            ),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () {
                                  widget.selService.recordStrategyUse(
                                    strategyId: widget.strategy.id,
                                    effectiveness: _effectiveness,
                                  );
                                  Navigator.pop(context);
                                },
                                child: const Text('Done'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
