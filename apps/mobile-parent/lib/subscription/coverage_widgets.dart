/// Coverage UI Widgets for Parent App
///
/// Reusable widgets for displaying coverage information:
/// - "Provided by your school" badges
/// - Feature access indicators
/// - Upgrade prompts for non-covered features
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'coverage_profile_models.dart';
import 'coverage_profile_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// COVERAGE BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// Badge showing who provides a feature.
class CoverageBadge extends StatelessWidget {
  const CoverageBadge({
    super.key,
    required this.payer,
    this.compact = false,
    this.showIcon = true,
  });

  final FeaturePayer payer;
  final bool compact;
  final bool showIcon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    final (icon, label, color) = switch (payer) {
      FeaturePayer.district => (
        Icons.school_outlined,
        'Provided by your school',
        theme.colorScheme.tertiary,
      ),
      FeaturePayer.parent => (
        Icons.check_circle_outline,
        'Your subscription',
        theme.colorScheme.primary,
      ),
      FeaturePayer.none => (
        Icons.lock_outline,
        'Upgrade available',
        theme.colorScheme.outline,
      ),
    };

    if (compact) {
      return Tooltip(
        message: label,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Icon(icon, size: 16, color: color),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE ACCESS INDICATOR
// ══════════════════════════════════════════════════════════════════════════════

/// Widget showing access status for a specific feature.
class FeatureAccessIndicator extends ConsumerWidget {
  const FeatureAccessIndicator({
    super.key,
    required this.learnerId,
    required this.featureKey,
    required this.tenantId,
    required this.grade,
    this.schoolId,
    this.onUpgradePressed,
    this.showLabel = true,
  });

  final String learnerId;
  final String featureKey;
  final String tenantId;
  final int grade;
  final String? schoolId;
  final VoidCallback? onUpgradePressed;
  final bool showLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final params = FeatureAccessParams(
      learnerId: learnerId,
      featureKey: featureKey,
      tenantId: tenantId,
      grade: grade,
      schoolId: schoolId,
    );
    
    final accessAsync = ref.watch(featureAccessProvider(params));

    return accessAsync.when(
      data: (access) => _buildContent(context, access),
      loading: () => const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
      error: (_, __) => const Icon(Icons.error_outline, size: 20),
    );
  }

  Widget _buildContent(BuildContext context, FeatureAccessResult access) {
    if (!access.hasAccess && onUpgradePressed != null) {
      return TextButton.icon(
        onPressed: onUpgradePressed,
        icon: const Icon(Icons.add_circle_outline, size: 18),
        label: const Text('Upgrade'),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          visualDensity: VisualDensity.compact,
        ),
      );
    }

    return CoverageBadge(
      payer: access.providedBy,
      compact: !showLabel,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COVERAGE SUMMARY CARD
// ══════════════════════════════════════════════════════════════════════════════

/// Card showing summary of coverage for a learner.
class CoverageSummaryCard extends ConsumerWidget {
  const CoverageSummaryCard({
    super.key,
    required this.learnerId,
    required this.tenantId,
    required this.grade,
    this.schoolId,
    this.onViewDetails,
    this.onManageSubscription,
  });

  final String learnerId;
  final String tenantId;
  final int grade;
  final String? schoolId;
  final VoidCallback? onViewDetails;
  final VoidCallback? onManageSubscription;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learnerInfo = LearnerInfo(
      learnerId: learnerId,
      tenantId: tenantId,
      grade: grade,
      schoolId: schoolId,
    );
    
    final profileAsync = ref.watch(coverageProfileProvider(learnerInfo));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: profileAsync.when(
          data: (profile) => _buildContent(context, profile),
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (error, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 8),
                Text('Failed to load coverage info'),
                TextButton(
                  onPressed: () => ref.refresh(coverageProfileProvider(learnerInfo)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, CoverageProfile profile) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Icon(Icons.shield_outlined, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Text(
              'Coverage',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            if (onViewDetails != null)
              TextButton(
                onPressed: onViewDetails,
                child: const Text('View details'),
              ),
          ],
        ),
        const SizedBox(height: 16),

        // Coverage sources
        if (profile.hasDistrictCoverage) ...[
          _CoverageSourceRow(
            icon: Icons.school_outlined,
            label: 'School coverage',
            sublabel: profile.districtCoverage?.contractNumber ?? 'Active',
            featureCount: profile.districtModules.length,
            color: theme.colorScheme.tertiary,
          ),
          const SizedBox(height: 8),
        ],
        
        if (profile.hasParentCoverage) ...[
          _CoverageSourceRow(
            icon: Icons.person_outline,
            label: 'Your subscription',
            sublabel: profile.parentCoverage?.status ?? 'Active',
            featureCount: profile.parentModules.length,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(height: 8),
        ],

        if (!profile.hasDistrictCoverage && !profile.hasParentCoverage)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.errorContainer.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: theme.colorScheme.error),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'No active coverage. Explore our plans to unlock premium features.',
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 16),

        // Total features
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Text(
                '${profile.effectiveModules.length}',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'features available',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              if (profile.upsellOpportunities.isNotEmpty)
                TextButton.icon(
                  onPressed: onManageSubscription,
                  icon: const Icon(Icons.add, size: 18),
                  label: Text('${profile.upsellOpportunities.length} more'),
                ),
            ],
          ),
        ),

        // Overlap warning
        if (profile.hasOverlap) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.amber, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Some features are covered by your school. '
                    'You may be eligible for a credit.',
                    style: theme.textTheme.bodySmall,
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

class _CoverageSourceRow extends StatelessWidget {
  const _CoverageSourceRow({
    required this.icon,
    required this.label,
    required this.sublabel,
    required this.featureCount,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String sublabel;
  final int featureCount;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(
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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$featureCount features',
              style: theme.textTheme.labelSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE LIST WITH COVERAGE
// ══════════════════════════════════════════════════════════════════════════════

/// List of features with coverage badges.
class FeatureListWithCoverage extends ConsumerWidget {
  const FeatureListWithCoverage({
    super.key,
    required this.learnerId,
    required this.tenantId,
    required this.grade,
    this.schoolId,
    this.onFeatureTap,
    this.onUpgradeTap,
  });

  final String learnerId;
  final String tenantId;
  final int grade;
  final String? schoolId;
  final void Function(String featureKey)? onFeatureTap;
  final void Function(String featureKey)? onUpgradeTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learnerInfo = LearnerInfo(
      learnerId: learnerId,
      tenantId: tenantId,
      grade: grade,
      schoolId: schoolId,
    );
    
    final profileAsync = ref.watch(coverageProfileProvider(learnerInfo));

    return profileAsync.when(
      data: (profile) => _buildList(context, profile),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const Center(child: Text('Failed to load features')),
    );
  }

  Widget _buildList(BuildContext context, CoverageProfile profile) {
    final allFeatures = FeatureKey.values;
    
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: allFeatures.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final feature = allFeatures[index];
        final payer = profile.payerForFeature[feature.code] ?? FeaturePayer.none;
        final hasAccess = profile.effectiveModules.contains(feature.code);

        return ListTile(
          leading: Icon(
            _getFeatureIcon(feature),
            color: hasAccess 
                ? Theme.of(context).colorScheme.primary 
                : Theme.of(context).colorScheme.outline,
          ),
          title: Text(feature.displayName),
          subtitle: Text(
            profile.getDisplayLabel(feature.code),
            style: TextStyle(
              color: hasAccess 
                  ? Theme.of(context).colorScheme.primary 
                  : Theme.of(context).colorScheme.outline,
            ),
          ),
          trailing: hasAccess
              ? CoverageBadge(payer: payer, compact: true)
              : TextButton(
                  onPressed: () => onUpgradeTap?.call(feature.code),
                  child: const Text('Upgrade'),
                ),
          onTap: hasAccess ? () => onFeatureTap?.call(feature.code) : null,
          enabled: hasAccess,
        );
      },
    );
  }

  IconData _getFeatureIcon(FeatureKey feature) {
    return switch (feature) {
      FeatureKey.moduleEla => Icons.menu_book_outlined,
      FeatureKey.moduleMath => Icons.calculate_outlined,
      FeatureKey.moduleScience => Icons.science_outlined,
      FeatureKey.addonSel => Icons.psychology_outlined,
      FeatureKey.addonSpeech => Icons.record_voice_over_outlined,
      FeatureKey.addonTutoring => Icons.school_outlined,
      FeatureKey.featureHomeworkHelper => Icons.assignment_outlined,
      FeatureKey.featureProgressReports => Icons.assessment_outlined,
      FeatureKey.featureParentInsights => Icons.insights_outlined,
    };
  }
}
