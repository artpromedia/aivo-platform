import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models.dart';
import 'providers.dart';

/// Family activities screen with collaborative activities for families
class FamilyActivitiesScreen extends ConsumerStatefulWidget {
  final String childId;

  const FamilyActivitiesScreen({
    super.key,
    required this.childId,
  });

  @override
  ConsumerState<FamilyActivitiesScreen> createState() => _FamilyActivitiesScreenState();
}

class _FamilyActivitiesScreenState extends ConsumerState<FamilyActivitiesScreen> {
  ActivityType? _selectedType;
  FamilyActivity? _selectedActivity;
  bool _showRecommended = true;

  @override
  Widget build(BuildContext context) {
    final activitiesAsync = _showRecommended
        ? ref.watch(recommendedActivitiesProvider(widget.childId))
        : ref.watch(familyActivitiesProvider(widget.childId));
    final completedAsync = ref.watch(completedFamilyActivitiesProvider(widget.childId));

    return Column(
      children: [
        // Filters
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Column(
            children: [
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(
                    value: true,
                    label: Text('Recommended'),
                    icon: Icon(Icons.thumb_up),
                  ),
                  ButtonSegment(
                    value: false,
                    label: Text('All Activities'),
                    icon: Icon(Icons.grid_view),
                  ),
                ],
                selected: {_showRecommended},
                onSelectionChanged: (Set<bool> newSelection) {
                  setState(() => _showRecommended = newSelection.first);
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<ActivityType>(
                initialValue: _selectedType,
                decoration: const InputDecoration(
                  labelText: 'Activity Type',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All Types')),
                  ...ActivityType.values.map(
                    (type) => DropdownMenuItem(
                      value: type,
                      child: Text(_formatActivityType(type)),
                    ),
                  ),
                ],
                onChanged: (value) => setState(() => _selectedType = value),
              ),
            ],
          ),
        ),

        // Completed Summary
        if (completedAsync.value != null && completedAsync.value!.isNotEmpty)
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.tertiaryContainer,
                  Theme.of(context).colorScheme.secondaryContainer,
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStat(
                  'Completed',
                  completedAsync.value!.length.toString(),
                  Icons.check_circle,
                ),
                _buildStat(
                  'Avg Rating',
                  _calculateAverageRating(completedAsync.value!).toStringAsFixed(1),
                  Icons.star,
                ),
                _buildStat(
                  'This Month',
                  _countThisMonth(completedAsync.value!).toString(),
                  Icons.calendar_month,
                ),
              ],
            ),
          ),

        // Activities List
        Expanded(
          child: _selectedActivity == null
              ? activitiesAsync.when(
                  data: (activities) {
                    final filteredActivities = activities.where((activity) {
                      if (_selectedType != null && activity.type != _selectedType) {
                        return false;
                      }
                      return true;
                    }).toList();

                    if (filteredActivities.isEmpty) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 64, color: Colors.grey),
                            SizedBox(height: 16),
                            Text('No activities found',
                                style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      );
                    }

                    return GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: filteredActivities.length,
                      itemBuilder: (context, index) {
                        final activity = filteredActivities[index];
                        return _buildActivityCard(activity);
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, stack) => Center(child: Text('Error: ${error.toString()}')),
                )
              : _buildActivityDetail(_selectedActivity!),
        ),
      ],
    );
  }

  Widget _buildStat(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.white70),
        ),
      ],
    );
  }

  Widget _buildActivityCard(FamilyActivity activity) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          final detailsAsync = ref.read(familyActivityDetailProvider(activity.id));
          detailsAsync.whenData((details) {
            setState(() => _selectedActivity = details);
          });
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Container(
              height: 120,
              width: double.infinity,
              color: _getActivityColor(activity.type),
              child: Icon(
                _getActivityIcon(activity.type),
                size: 48,
                color: Colors.white,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.timer, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '${activity.estimatedTime} min',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.people, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '${activity.participantCount}+',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                  if (activity.averageRating != null && activity.averageRating! > 0) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, size: 14, color: Colors.amber),
                        const SizedBox(width: 4),
                        Text(
                          activity.averageRating!.toStringAsFixed(1),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityDetail(FamilyActivity activity) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Image
          Stack(
            children: [
              Container(
                height: 200,
                width: double.infinity,
                color: _getActivityColor(activity.type),
                child: Icon(
                  _getActivityIcon(activity.type),
                  size: 80,
                  color: Colors.white,
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: CircleAvatar(
                  backgroundColor: Colors.black54,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => setState(() => _selectedActivity = null),
                  ),
                ),
              ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title and Details
                Text(
                  activity.title,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(activity.description),
                const SizedBox(height: 16),

                // Quick Info
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _buildInfoChip(Icons.timer, '${activity.estimatedTime} min'),
                    _buildInfoChip(Icons.people, '${activity.minAge}-${activity.maxAge} years'),
                    _buildInfoChip(Icons.group, '${activity.participantCount}+ people'),
                    _buildInfoChip(Icons.category, _formatActivityType(activity.type)),
                    if (activity.averageRating != null && activity.averageRating! > 0)
                      _buildInfoChip(Icons.star, activity.averageRating!.toStringAsFixed(1)),
                  ],
                ),
                const SizedBox(height: 24),

                // Materials Needed
                const Text(
                  'Materials Needed',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...activity.materials.map(
                  (material) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, size: 16, color: Colors.green),
                        const SizedBox(width: 8),
                        Expanded(child: Text(material)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Instructions
                const Text(
                  'Instructions',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...activity.instructions.asMap().entries.map(
                      (entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor:
                                  Theme.of(context).colorScheme.primaryContainer,
                              child: Text(
                                '${entry.key + 1}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Text(entry.value)),
                          ],
                        ),
                      ),
                    ),
                const SizedBox(height: 24),

                // Learning Benefits
                const Text(
                  'Learning Benefits',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...activity.learningBenefits.map(
                  (benefit) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.school, size: 16, color: Colors.blue),
                        const SizedBox(width: 8),
                        Expanded(child: Text(benefit)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Start Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _startActivity(activity),
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('START ACTIVITY'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label) {
    return Chip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  String _formatActivityType(ActivityType type) {
    return type.name[0].toUpperCase() + type.name.substring(1);
  }

  Color _getActivityColor(ActivityType type) {
    switch (type) {
      case ActivityType.indoor:
        return Colors.blue;
      case ActivityType.outdoor:
        return Colors.green;
      case ActivityType.creative:
        return Colors.pink;
      case ActivityType.educational:
        return Colors.purple;
      case ActivityType.physical:
        return Colors.orange;
      case ActivityType.social:
        return Colors.teal;
    }
  }

  IconData _getActivityIcon(ActivityType type) {
    switch (type) {
      case ActivityType.indoor:
        return Icons.home;
      case ActivityType.outdoor:
        return Icons.nature;
      case ActivityType.creative:
        return Icons.palette;
      case ActivityType.educational:
        return Icons.school;
      case ActivityType.physical:
        return Icons.directions_run;
      case ActivityType.social:
        return Icons.people;
    }
  }

  double _calculateAverageRating(List<FamilyActivitySession> sessions) {
    if (sessions.isEmpty) return 0;
    final total = sessions.fold<double>(0, (sum, session) => sum + (session.rating ?? 0));
    return total / sessions.length;
  }

  int _countThisMonth(List<FamilyActivitySession> sessions) {
    final now = DateTime.now();
    return sessions.where((session) {
      return session.startTime.year == now.year &&
          session.startTime.month == now.month;
    }).length;
  }

  void _startActivity(FamilyActivity activity) async {
    await ref.read(familyActivitySessionProvider.notifier).startActivity(
          activityId: activity.id,
          childId: widget.childId,
          participants: [], // Could show participant selection dialog
        );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Starting ${activity.title}...')),
      );
    }
  }
}
