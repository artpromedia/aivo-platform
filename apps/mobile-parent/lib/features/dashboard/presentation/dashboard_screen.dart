import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../l10n/app_localizations.dart';
import '../../../core/theme.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/progress_card.dart';
import '../widgets/subject_progress_chart.dart';
import '../widgets/child_selector.dart';
import '../widgets/activity_list.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  String? _selectedChildId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final profile = ref.watch(parentProfileProvider);
    final summary = ref.watch(studentSummaryProvider(_selectedChildId ?? ''));

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.dashboardTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            tooltip: l10n.downloadReport,
            onPressed: () {
              // Download report
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(parentProfileProvider);
          if (_selectedChildId != null) {
            ref.invalidate(studentSummaryProvider(_selectedChildId!));
          }
        },
        child: profile.when(
          data: (data) {
            // Auto-select first child
            if (_selectedChildId == null && data.students.isNotEmpty) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                setState(() => _selectedChildId = data.students.first.id);
              });
            }

            return CustomScrollView(
              slivers: [
                // Welcome header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.welcomeBack(data.firstName),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 16),
                        
                        // Child selector
                        if (data.students.length > 1)
                          ChildSelector(
                            children: data.students,
                            selectedId: _selectedChildId,
                            onSelect: (id) => setState(() => _selectedChildId = id),
                          ),
                      ],
                    ),
                  ),
                ),

                // Quick stats
                summary.when(
                  data: (summaryData) => SliverToBoxAdapter(
                    child: _buildQuickStats(context, summaryData, l10n),
                  ),
                  loading: () => const SliverToBoxAdapter(
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (e, _) => SliverToBoxAdapter(
                    child: Center(child: Text('Error: $e')),
                  ),
                ),

                // Subject progress
                summary.when(
                  data: (summaryData) => SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.subjects,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 16),
                              SubjectProgressChart(
                                subjects: summaryData.subjectProgress,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  loading: () => const SliverToBoxAdapter(child: SizedBox()),
                  error: (_, __) => const SliverToBoxAdapter(child: SizedBox()),
                ),

                // Recent activity
                summary.when(
                  data: (summaryData) => SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    l10n.recentActivity,
                                    style: Theme.of(context).textTheme.titleMedium,
                                  ),
                                  TextButton(
                                    onPressed: () {},
                                    child: Text(l10n.viewAll),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ActivityList(
                                activities: summaryData.recentActivity,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  loading: () => const SliverToBoxAdapter(child: SizedBox()),
                  error: (_, __) => const SliverToBoxAdapter(child: SizedBox()),
                ),

                const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error: $e')),
        ),
      ),
    );
  }

  Widget _buildQuickStats(BuildContext context, StudentSummary summary, AppLocalizations l10n) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: ProgressCard(
              icon: Icons.access_time,
              label: l10n.timeSpent,
              value: '${summary.weeklyTimeSpent}',
              unit: l10n.minutes,
              trend: summary.timeTrend,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ProgressCard(
              icon: Icons.calendar_today,
              label: l10n.activeDays,
              value: '${summary.activeDays}',
              unit: '/7',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ProgressCard(
              icon: Icons.trending_up,
              label: l10n.avgScore,
              value: '${summary.averageScore}%',
              trend: summary.scoreTrend,
            ),
          ),
        ],
      ),
    );
  }
}
