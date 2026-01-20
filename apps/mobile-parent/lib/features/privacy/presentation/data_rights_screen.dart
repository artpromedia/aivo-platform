/// Data Subject Rights Screen
///
/// Allows parents to:
/// - Request data export
/// - Request data deletion
/// - View privacy settings
/// - Manage consent preferences
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// DSR Request type
enum DSRRequestType {
  export('Export My Data', Icons.download, Colors.blue),
  delete('Delete My Data', Icons.delete_forever, Colors.red),
  access('Access My Data', Icons.visibility, Colors.green),
  rectify('Correct My Data', Icons.edit, Colors.orange);

  const DSRRequestType(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;
}

/// DSR Request status
enum DSRRequestStatus {
  pending('Pending'),
  processing('Processing'),
  completed('Completed'),
  cancelled('Cancelled');

  const DSRRequestStatus(this.label);
  final String label;
}

/// DSR Request
class DSRRequest {
  final String id;
  final DSRRequestType type;
  final DSRRequestStatus status;
  final DateTime requestedAt;
  final DateTime? completedAt;
  final String? downloadUrl;

  const DSRRequest({
    required this.id,
    required this.type,
    required this.status,
    required this.requestedAt,
    this.completedAt,
    this.downloadUrl,
  });
}

/// Data Rights Screen
class DataRightsScreen extends ConsumerStatefulWidget {
  const DataRightsScreen({super.key});

  @override
  ConsumerState<DataRightsScreen> createState() => _DataRightsScreenState();
}

class _DataRightsScreenState extends ConsumerState<DataRightsScreen> {
  bool _isLoading = true;
  List<DSRRequest> _requests = [];

  // Mock data
  final List<DSRRequest> _mockRequests = [
    DSRRequest(
      id: '1',
      type: DSRRequestType.export,
      status: DSRRequestStatus.completed,
      requestedAt: DateTime.now().subtract(const Duration(days: 7)),
      completedAt: DateTime.now().subtract(const Duration(days: 5)),
      downloadUrl: 'https://example.com/download/export-123',
    ),
    DSRRequest(
      id: '2',
      type: DSRRequestType.access,
      status: DSRRequestStatus.completed,
      requestedAt: DateTime.now().subtract(const Duration(days: 30)),
      completedAt: DateTime.now().subtract(const Duration(days: 28)),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _requests = _mockRequests;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Rights'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header info
                  Card(
                    color: colorScheme.primaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(
                            Icons.shield,
                            color: colorScheme.onPrimaryContainer,
                            size: 32,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Your Privacy Matters',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: colorScheme.onPrimaryContainer,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'You have the right to access, export, correct, or delete your personal data at any time.',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: colorScheme.onPrimaryContainer,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Data request options
                  Text(
                    'Make a Request',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...[
                    DSRRequestType.export,
                    DSRRequestType.access,
                    DSRRequestType.rectify,
                    DSRRequestType.delete,
                  ].map((type) => _DSROptionCard(
                        type: type,
                        onTap: () => _showRequestDialog(context, type),
                      )),

                  const SizedBox(height: 24),

                  // Previous requests
                  Text(
                    'Previous Requests',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_requests.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.history,
                                size: 48,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No previous requests',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    ..._requests.map((request) => _DSRRequestCard(
                          request: request,
                          onDownload: request.downloadUrl != null
                              ? () => _downloadExport(request)
                              : null,
                        )),

                  const SizedBox(height: 24),

                  // Privacy policy link
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.policy),
                      title: const Text('Privacy Policy'),
                      subtitle: const Text('Learn how we protect your data'),
                      trailing: const Icon(Icons.open_in_new),
                      onTap: () {},
                    ),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.support_agent),
                      title: const Text('Contact Privacy Team'),
                      subtitle: const Text('privacy@aivo.education'),
                      trailing: const Icon(Icons.email),
                      onTap: () {},
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  void _showRequestDialog(BuildContext context, DSRRequestType type) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: Icon(type.icon, color: type.color, size: 32),
        title: Text(type.label),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _getRequestDescription(type),
              textAlign: TextAlign.center,
            ),
            if (type == DSRRequestType.delete) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This action cannot be undone. You will have a 30-day grace period to cancel.',
                        style: TextStyle(
                          color: Colors.red.shade700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Processing time: 7-30 days',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _submitRequest(type);
            },
            style: type == DSRRequestType.delete
                ? FilledButton.styleFrom(backgroundColor: Colors.red)
                : null,
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
  }

  String _getRequestDescription(DSRRequestType type) {
    switch (type) {
      case DSRRequestType.export:
        return 'We will prepare a complete copy of your data in a machine-readable format. You\'ll receive an email when it\'s ready to download.';
      case DSRRequestType.access:
        return 'We will provide a detailed report of all personal data we hold about you and your children.';
      case DSRRequestType.rectify:
        return 'If you believe any of your personal data is incorrect, we will review and correct it.';
      case DSRRequestType.delete:
        return 'We will permanently delete all your personal data from our systems. This includes data for all linked children.';
    }
  }

  void _submitRequest(DSRRequestType type) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${type.label} request submitted. We\'ll email you with updates.'),
        action: SnackBarAction(
          label: 'View Status',
          onPressed: () {},
        ),
      ),
    );

    // Add to requests list
    setState(() {
      _requests.insert(
        0,
        DSRRequest(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          type: type,
          status: DSRRequestStatus.pending,
          requestedAt: DateTime.now(),
        ),
      );
    });
  }

  void _downloadExport(DSRRequest request) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Starting download...')),
    );
  }
}

class _DSROptionCard extends StatelessWidget {
  const _DSROptionCard({
    required this.type,
    required this.onTap,
  });

  final DSRRequestType type;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: type.color.withOpacity(0.2),
          child: Icon(type.icon, color: type.color),
        ),
        title: Text(
          type.label,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          _getShortDescription(type),
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  String _getShortDescription(DSRRequestType type) {
    switch (type) {
      case DSRRequestType.export:
        return 'Download a copy of all your data';
      case DSRRequestType.access:
        return 'See what data we have about you';
      case DSRRequestType.rectify:
        return 'Correct inaccurate information';
      case DSRRequestType.delete:
        return 'Permanently remove your data';
    }
  }
}

class _DSRRequestCard extends StatelessWidget {
  const _DSRRequestCard({
    required this.request,
    this.onDownload,
  });

  final DSRRequest request;
  final VoidCallback? onDownload;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: request.type.color.withOpacity(0.2),
                  child: Icon(
                    request.type.icon,
                    color: request.type.color,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        request.type.label,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Requested ${_formatDate(request.requestedAt)}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                _StatusChip(status: request.status),
              ],
            ),
            if (request.status == DSRRequestStatus.completed &&
                onDownload != null) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onDownload,
                icon: const Icon(Icons.download),
                label: const Text('Download Export'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final DSRRequestStatus status;

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case DSRRequestStatus.pending:
        color = Colors.orange;
        break;
      case DSRRequestStatus.processing:
        color = Colors.blue;
        break;
      case DSRRequestStatus.completed:
        color = Colors.green;
        break;
      case DSRRequestStatus.cancelled:
        color = Colors.grey;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
