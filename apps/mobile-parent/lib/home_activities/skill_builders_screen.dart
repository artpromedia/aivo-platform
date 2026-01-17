import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models.dart';
import 'providers.dart';

/// Skill builders screen with progressive skill development activities
class SkillBuildersScreen extends ConsumerStatefulWidget {
  final String childId;

  const SkillBuildersScreen({
    super.key,
    required this.childId,
  });

  @override
  ConsumerState<SkillBuildersScreen> createState() => _SkillBuildersScreenState();
}

class _SkillBuildersScreenState extends ConsumerState<SkillBuildersScreen> {
  String? _selectedCategory;
  SkillBuilder? _selectedBuilder;

  @override
  Widget build(BuildContext context) {
    final buildersAsync = ref.watch(skillBuildersProvider(widget.childId));
    final progressAsync = ref.watch(skillBuilderProgressProvider(widget.childId));

    return Column(
      children: [
        // Category Filter
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.surfaceVariant,
          child: DropdownButtonFormField<String>(
            value: _selectedCategory,
            decoration: const InputDecoration(
              labelText: 'Skill Category',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: const [
              DropdownMenuItem(value: null, child: Text('All Categories')),
              DropdownMenuItem(value: 'Reading', child: Text('Reading')),
              DropdownMenuItem(value: 'Math', child: Text('Math')),
              DropdownMenuItem(value: 'Writing', child: Text('Writing')),
              DropdownMenuItem(value: 'Critical Thinking', child: Text('Critical Thinking')),
              DropdownMenuItem(value: 'Social Skills', child: Text('Social Skills')),
            ],
            onChanged: (value) => setState(() => _selectedCategory = value),
          ),
        ),

        // Overall Progress
        if (progressAsync.value != null && progressAsync.value!.isNotEmpty)
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Overall Progress',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatColumn(
                      'Skills',
                      progressAsync.value!.length.toString(),
                      Icons.construction,
                    ),
                    _buildStatColumn(
                      'Completed',
                      '${progressAsync.value!.map((p) => p.completedActivities).reduce((a, b) => a + b)}',
                      Icons.check_circle,
                    ),
                    _buildStatColumn(
                      'Avg Progress',
                      '${(progressAsync.value!.map((p) => p.progressPercentage).reduce((a, b) => a + b) / progressAsync.value!.length).toStringAsFixed(0)}%',
                      Icons.trending_up,
                    ),
                  ],
                ),
              ],
            ),
          ),

        // Skill Builders List
        Expanded(
          child: _selectedBuilder == null
              ? buildersAsync.when(
                  data: (builders) {
                    final filteredBuilders = builders.where((builder) {
                      if (_selectedCategory != null &&
                          builder.skillCategory != _selectedCategory) {
                        return false;
                      }
                      return true;
                    }).toList();

                    if (filteredBuilders.isEmpty) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 64, color: Colors.grey),
                            SizedBox(height: 16),
                            Text('No skill builders found',
                                style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filteredBuilders.length,
                      itemBuilder: (context, index) {
                        final builder = filteredBuilders[index];
                        return _buildSkillBuilderCard(builder);
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, stack) => Center(child: Text('Error: ${error.toString()}')),
                )
              : _buildSkillBuilderDetail(_selectedBuilder!),
        ),
      ],
    );
  }

  Widget _buildStatColumn(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildSkillBuilderCard(SkillBuilder builder) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () async {
          final detailsAsync = ref.read(skillBuilderDetailProvider(builder.id));
          final details = await detailsAsync.future;
          setState(() => _selectedBuilder = details);
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.construction, size: 32),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          builder.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          builder.skillCategory,
                          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                builder.description,
                style: const TextStyle(fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: LinearProgressIndicator(
                      value: builder.progressPercentage / 100,
                      backgroundColor: Colors.grey[200],
                      minHeight: 8,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${builder.progressPercentage.toStringAsFixed(0)}%',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${builder.completedActivities}/${builder.totalActivities} activities completed',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkillBuilderDetail(SkillBuilder builder) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () => setState(() => _selectedBuilder = null),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          builder.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          builder.skillCategory,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(builder.description),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: builder.progressPercentage / 100,
                backgroundColor: Colors.white.withOpacity(0.3),
                minHeight: 10,
              ),
              const SizedBox(height: 8),
              Text(
                '${builder.completedActivities}/${builder.totalActivities} completed (${builder.progressPercentage.toStringAsFixed(0)}%)',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),

        // Activities List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: builder.activities.length,
            itemBuilder: (context, index) {
              final activity = builder.activities[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: activity.completed
                        ? Colors.green
                        : Theme.of(context).colorScheme.primaryContainer,
                    child: Icon(
                      activity.completed ? Icons.check : Icons.play_arrow,
                      color: activity.completed ? Colors.white : null,
                    ),
                  ),
                  title: Text(
                    activity.title,
                    style: TextStyle(
                      decoration: activity.completed
                          ? TextDecoration.lineThrough
                          : null,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(activity.description),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.timer, size: 14),
                          const SizedBox(width: 4),
                          Text('${activity.estimatedTime} min'),
                          if (activity.score != null) ...[
                            const SizedBox(width: 16),
                            const Icon(Icons.star, size: 14, color: Colors.amber),
                            const SizedBox(width: 4),
                            Text('${activity.score}%'),
                          ],
                        ],
                      ),
                    ],
                  ),
                  trailing: !activity.completed
                      ? ElevatedButton(
                          onPressed: () => _startActivity(builder.id, activity),
                          child: const Text('Start'),
                        )
                      : null,
                  isThreeLine: true,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _startActivity(String builderId, SkillBuilderActivity activity) async {
    await ref.read(skillBuilderSessionProvider.notifier).startActivity(
          builderId: builderId,
          activityId: activity.id,
          childId: widget.childId,
        );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Starting ${activity.title}...')),
      );
    }
  }
}
