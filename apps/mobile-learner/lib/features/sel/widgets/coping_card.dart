import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import '../sel_models.dart';

/// Coping Card Widget
///
/// Displays a coping strategy in a card format with category, duration, and actions.
class CopingCard extends StatelessWidget {
  final CopingStrategy strategy;
  final VoidCallback onTap;
  final VoidCallback? onFavoriteToggle;
  final bool compact;

  const CopingCard({
    super.key,
    required this.strategy,
    required this.onTap,
    this.onFavoriteToggle,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return _buildCompactCard(context);
    }
    return _buildFullCard(context);
  }

  Widget _buildFullCard(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Category icon
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: strategy.category.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    strategy.category.icon,
                    style: const TextStyle(fontSize: 28),
                  ),
                ),
              ),
              const SizedBox(width: 16),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strategy.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      strategy.description,
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildMetaBadge(
                          Icons.timer_outlined,
                          '${strategy.duration} min',
                        ),
                        const SizedBox(width: 8),
                        _buildDifficultyBadge(strategy.difficulty),
                      ],
                    ),
                  ],
                ),
              ),

              // Favorite button
              if (onFavoriteToggle != null)
                IconButton(
                  icon: Icon(
                    strategy.isFavorite ? Icons.star : Icons.star_border,
                    color: strategy.isFavorite ? Colors.amber : AivoBrand.gray,
                  ),
                  onPressed: onFavoriteToggle,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompactCard(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                strategy.category.color.withOpacity(0.1),
                strategy.category.color.withOpacity(0.05),
              ],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    strategy.category.icon,
                    style: const TextStyle(fontSize: 24),
                  ),
                  const Spacer(),
                  if (strategy.isFavorite)
                    const Icon(
                      Icons.star,
                      color: Colors.amber,
                      size: 18,
                    ),
                ],
              ),
              const Spacer(),
              Text(
                strategy.name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                '${strategy.duration} min',
                style: TextStyle(
                  color: AivoBrand.gray.shade600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetaBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AivoBrand.gray.shade100,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AivoBrand.gray.shade600),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: AivoBrand.gray.shade700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDifficultyBadge(Difficulty difficulty) {
    Color color;
    switch (difficulty) {
      case Difficulty.beginner:
        color = AivoBrand.success;
      case Difficulty.intermediate:
        color = Colors.orange;
      case Difficulty.advanced:
        color = AivoBrand.error;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        difficulty.label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Strategy Steps Widget
///
/// Displays the steps of a coping strategy in a checklist format.
class StrategySteps extends StatefulWidget {
  final List<String> steps;
  final VoidCallback? onComplete;

  const StrategySteps({
    super.key,
    required this.steps,
    this.onComplete,
  });

  @override
  State<StrategySteps> createState() => _StrategyStepsState();
}

class _StrategyStepsState extends State<StrategySteps> {
  final Set<int> _completedSteps = {};

  @override
  Widget build(BuildContext context) {
    final allComplete = _completedSteps.length == widget.steps.length;

    return Column(
      children: [
        ...widget.steps.asMap().entries.map((entry) {
          final index = entry.key;
          final step = entry.value;
          final isComplete = _completedSteps.contains(index);

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () {
                setState(() {
                  if (isComplete) {
                    _completedSteps.remove(index);
                  } else {
                    _completedSteps.add(index);
                  }
                });

                if (_completedSteps.length == widget.steps.length) {
                  widget.onComplete?.call();
                }
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isComplete
                      ? AivoBrand.success.withOpacity(0.1)
                      : AivoBrand.gray.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isComplete
                        ? AivoBrand.success.withOpacity(0.3)
                        : AivoBrand.gray.shade200,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: isComplete
                            ? AivoBrand.success
                            : AivoBrand.gray.shade200,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: isComplete
                            ? const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 16,
                              )
                            : Text(
                                '${index + 1}',
                                style: TextStyle(
                                  color: AivoBrand.gray.shade600,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        step,
                        style: TextStyle(
                          color: isComplete
                              ? AivoBrand.gray.shade600
                              : AivoBrand.gray.shade800,
                          decoration: isComplete
                              ? TextDecoration.lineThrough
                              : null,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        if (allComplete) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AivoBrand.success.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.celebration, color: AivoBrand.success),
                const SizedBox(width: 8),
                Text(
                  'All steps completed!',
                  style: TextStyle(
                    color: AivoBrand.success,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
