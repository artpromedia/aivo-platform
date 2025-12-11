/// Conflict Resolution UI Components
///
/// Provides reusable widgets for handling sync conflicts between
/// local and server data.
library;

import 'package:flutter/material.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONFLICT MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Represents a sync conflict between local and server data.
class SyncConflict {
  const SyncConflict({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.localData,
    required this.serverData,
    required this.localTimestamp,
    required this.serverTimestamp,
    this.description,
  });

  /// Unique identifier for this conflict.
  final String id;

  /// Type of entity (e.g., 'session', 'event', 'attendance').
  final String entityType;

  /// ID of the conflicting entity.
  final String entityId;

  /// Local version of the data.
  final Map<String, dynamic> localData;

  /// Server version of the data.
  final Map<String, dynamic> serverData;

  /// When the local data was created/modified.
  final DateTime localTimestamp;

  /// When the server data was created/modified.
  final DateTime serverTimestamp;

  /// Human-readable description of the conflict.
  final String? description;
}

/// User's resolution choice for a conflict.
enum ConflictResolution {
  /// Keep the local version.
  keepLocal,

  /// Accept the server version.
  acceptServer,

  /// Merge both versions (if supported).
  merge,

  /// Skip/defer resolution.
  skip,
}

/// Result of conflict resolution.
class ConflictResolutionResult {
  const ConflictResolutionResult({
    required this.conflictId,
    required this.resolution,
    this.mergedData,
  });

  final String conflictId;
  final ConflictResolution resolution;
  final Map<String, dynamic>? mergedData;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION DIALOG
// ══════════════════════════════════════════════════════════════════════════════

/// A dialog that allows users to resolve a single sync conflict.
class ConflictResolutionDialog extends StatefulWidget {
  const ConflictResolutionDialog({
    super.key,
    required this.conflict,
    this.onResolved,
    this.allowMerge = false,
  });

  final SyncConflict conflict;
  final ValueChanged<ConflictResolutionResult>? onResolved;
  final bool allowMerge;

  /// Show the conflict resolution dialog.
  static Future<ConflictResolutionResult?> show(
    BuildContext context,
    SyncConflict conflict, {
    bool allowMerge = false,
  }) {
    return showDialog<ConflictResolutionResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => ConflictResolutionDialog(
        conflict: conflict,
        allowMerge: allowMerge,
      ),
    );
  }

  @override
  State<ConflictResolutionDialog> createState() =>
      _ConflictResolutionDialogState();
}

class _ConflictResolutionDialogState extends State<ConflictResolutionDialog> {
  ConflictResolution? _selectedResolution;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700),
          const SizedBox(width: 8),
          const Expanded(child: Text('Sync Conflict')),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.conflict.description != null) ...[
                Text(
                  widget.conflict.description!,
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 16),
              ],
              _buildVersionComparison(),
              const SizedBox(height: 16),
              _buildResolutionOptions(),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => _resolveWith(ConflictResolution.skip),
          child: const Text('Skip for Now'),
        ),
        ElevatedButton(
          onPressed: _selectedResolution != null &&
                  _selectedResolution != ConflictResolution.skip
              ? () => _resolveWith(_selectedResolution!)
              : null,
          child: const Text('Apply'),
        ),
      ],
    );
  }

  Widget _buildVersionComparison() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _VersionCard(
            title: 'Your Version',
            subtitle: _formatTimestamp(widget.conflict.localTimestamp),
            data: widget.conflict.localData,
            isSelected: _selectedResolution == ConflictResolution.keepLocal,
            onTap: () =>
                setState(() => _selectedResolution = ConflictResolution.keepLocal),
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _VersionCard(
            title: 'Server Version',
            subtitle: _formatTimestamp(widget.conflict.serverTimestamp),
            data: widget.conflict.serverData,
            isSelected: _selectedResolution == ConflictResolution.acceptServer,
            onTap: () => setState(
                () => _selectedResolution = ConflictResolution.acceptServer),
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildResolutionOptions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Choose which version to keep:',
          style: TextStyle(
            fontWeight: FontWeight.w500,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        RadioListTile<ConflictResolution>(
          title: const Text('Keep my version'),
          subtitle: const Text('Use the data from this device'),
          value: ConflictResolution.keepLocal,
          groupValue: _selectedResolution,
          onChanged: (v) => setState(() => _selectedResolution = v),
          dense: true,
          contentPadding: EdgeInsets.zero,
        ),
        RadioListTile<ConflictResolution>(
          title: const Text('Use server version'),
          subtitle: const Text('Accept the data from the server'),
          value: ConflictResolution.acceptServer,
          groupValue: _selectedResolution,
          onChanged: (v) => setState(() => _selectedResolution = v),
          dense: true,
          contentPadding: EdgeInsets.zero,
        ),
        if (widget.allowMerge)
          RadioListTile<ConflictResolution>(
            title: const Text('Merge both'),
            subtitle: const Text('Combine changes from both versions'),
            value: ConflictResolution.merge,
            groupValue: _selectedResolution,
            onChanged: (v) => setState(() => _selectedResolution = v),
            dense: true,
            contentPadding: EdgeInsets.zero,
          ),
      ],
    );
  }

  void _resolveWith(ConflictResolution resolution) {
    final result = ConflictResolutionResult(
      conflictId: widget.conflict.id,
      resolution: resolution,
    );
    widget.onResolved?.call(result);
    Navigator.of(context).pop(result);
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);

    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';

    return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
  }
}

class _VersionCard extends StatelessWidget {
  const _VersionCard({
    required this.title,
    required this.subtitle,
    required this.data,
    required this.isSelected,
    required this.onTap,
    required this.color,
  });

  final String title;
  final String subtitle;
  final Map<String, dynamic> data;
  final bool isSelected;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(8),
          color: isSelected ? color.withOpacity(0.05) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (isSelected)
                  Icon(Icons.check_circle, color: color, size: 18),
                if (isSelected) const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isSelected ? color : null,
                    ),
                  ),
                ),
              ],
            ),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            _DataPreview(data: data),
          ],
        ),
      ),
    );
  }
}

class _DataPreview extends StatelessWidget {
  const _DataPreview({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    // Show first few key-value pairs
    final entries = data.entries.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final entry in entries)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text(
              '${_formatKey(entry.key)}: ${_formatValue(entry.value)}',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade700,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        if (data.length > 3)
          Text(
            '... and ${data.length - 3} more',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade500,
              fontStyle: FontStyle.italic,
            ),
          ),
      ],
    );
  }

  String _formatKey(String key) {
    // Convert camelCase to Title Case
    return key
        .replaceAllMapped(
          RegExp(r'([A-Z])'),
          (match) => ' ${match.group(1)}',
        )
        .trim()
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }

  String _formatValue(dynamic value) {
    if (value == null) return 'null';
    if (value is String) return value.length > 30 ? '${value.substring(0, 30)}...' : value;
    if (value is List) return '[${value.length} items]';
    if (value is Map) return '{${value.length} fields}';
    return value.toString();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFLICT LIST VIEW
// ══════════════════════════════════════════════════════════════════════════════

/// A screen/widget that shows all pending conflicts.
class ConflictListView extends StatelessWidget {
  const ConflictListView({
    super.key,
    required this.conflicts,
    required this.onResolve,
    this.onResolveAll,
  });

  final List<SyncConflict> conflicts;
  final Future<void> Function(SyncConflict conflict, ConflictResolution resolution) onResolve;
  final VoidCallback? onResolveAll;

  @override
  Widget build(BuildContext context) {
    if (conflicts.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Colors.green),
            SizedBox(height: 16),
            Text(
              'No conflicts',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('All your data is in sync!'),
          ],
        ),
      );
    }

    return Column(
      children: [
        _buildHeader(context),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: conflicts.length,
            itemBuilder: (context, index) {
              final conflict = conflicts[index];
              return _ConflictListItem(
                conflict: conflict,
                onTap: () => _showResolutionDialog(context, conflict),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.orange.shade50,
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${conflicts.length} conflict${conflicts.length == 1 ? '' : 's'} found',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const Text(
                  'Please review and resolve these conflicts to ensure your data is up to date.',
                  style: TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
          if (onResolveAll != null)
            TextButton(
              onPressed: onResolveAll,
              child: const Text('Resolve All'),
            ),
        ],
      ),
    );
  }

  Future<void> _showResolutionDialog(
    BuildContext context,
    SyncConflict conflict,
  ) async {
    final result = await ConflictResolutionDialog.show(context, conflict);
    if (result != null && result.resolution != ConflictResolution.skip) {
      await onResolve(conflict, result.resolution);
    }
  }
}

class _ConflictListItem extends StatelessWidget {
  const _ConflictListItem({
    required this.conflict,
    required this.onTap,
  });

  final SyncConflict conflict;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.orange.shade100,
          child: Icon(
            _getIconForType(conflict.entityType),
            color: Colors.orange.shade700,
          ),
        ),
        title: Text(_getTitleForType(conflict.entityType)),
        subtitle: Text(
          conflict.description ?? 'ID: ${conflict.entityId}',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'session':
        return Icons.play_circle_outline;
      case 'event':
        return Icons.event_note;
      case 'attendance':
        return Icons.people_outline;
      case 'note':
        return Icons.note_outlined;
      default:
        return Icons.sync_problem;
    }
  }

  String _getTitleForType(String type) {
    switch (type) {
      case 'session':
        return 'Session Conflict';
      case 'event':
        return 'Event Conflict';
      case 'attendance':
        return 'Attendance Conflict';
      case 'note':
        return 'Note Conflict';
      default:
        return 'Data Conflict';
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFLICT BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// A badge showing the number of pending conflicts.
class ConflictBadge extends StatelessWidget {
  const ConflictBadge({
    super.key,
    required this.count,
    this.onTap,
  });

  final int count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox.shrink();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.orange,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.warning_amber_rounded, size: 14, color: Colors.white),
            const SizedBox(width: 4),
            Text(
              '$count conflict${count == 1 ? '' : 's'}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-RESOLUTION STRATEGIES
// ══════════════════════════════════════════════════════════════════════════════

/// Strategies for automatically resolving conflicts.
enum AutoResolutionStrategy {
  /// Always prefer local changes.
  preferLocal,

  /// Always prefer server data.
  preferServer,

  /// Prefer the most recent change.
  preferNewest,

  /// Require manual resolution for all conflicts.
  requireManual,
}

/// Helper class for applying auto-resolution strategies.
class ConflictAutoResolver {
  const ConflictAutoResolver(this.strategy);

  final AutoResolutionStrategy strategy;

  /// Determine the resolution for a conflict based on the strategy.
  ConflictResolution resolveConflict(SyncConflict conflict) {
    switch (strategy) {
      case AutoResolutionStrategy.preferLocal:
        return ConflictResolution.keepLocal;
      case AutoResolutionStrategy.preferServer:
        return ConflictResolution.acceptServer;
      case AutoResolutionStrategy.preferNewest:
        return conflict.localTimestamp.isAfter(conflict.serverTimestamp)
            ? ConflictResolution.keepLocal
            : ConflictResolution.acceptServer;
      case AutoResolutionStrategy.requireManual:
        return ConflictResolution.skip;
    }
  }

  /// Apply auto-resolution to a list of conflicts.
  List<ConflictResolutionResult> resolveAll(List<SyncConflict> conflicts) {
    return conflicts
        .map((c) => ConflictResolutionResult(
              conflictId: c.id,
              resolution: resolveConflict(c),
            ))
        .toList();
  }
}
