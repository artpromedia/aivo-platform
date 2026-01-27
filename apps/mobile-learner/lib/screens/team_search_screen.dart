import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../config/environment.dart';
import '../features/gamification/gamification_models.dart';
import '../features/gamification/gamification_service.dart';
import '../pin/pin_storage.dart';

/// Team Search Screen
///
/// Allows users to search for existing teams or create new ones.
/// Sprint 1: Teams navigation fix - implements the TODO from teams_screen.dart
class TeamSearchScreen extends ConsumerStatefulWidget {
  final String learnerId;
  final VoidCallback? onTeamJoined;

  const TeamSearchScreen({
    super.key,
    required this.learnerId,
    this.onTeamJoined,
  });

  @override
  ConsumerState<TeamSearchScreen> createState() => _TeamSearchScreenState();
}

class _TeamSearchScreenState extends ConsumerState<TeamSearchScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _teamNameController = TextEditingController();
  final TextEditingController _teamDescController = TextEditingController();

  GamificationService? _gamificationService;
  String _cachedToken = '';

  // Search state
  List<Team> _searchResults = [];
  List<TeamInvite> _pendingInvites = [];
  bool _isSearching = false;
  bool _isLoadingInvites = true;
  String? _searchError;

  // Create team state
  TeamType _selectedTeamType = TeamType.classroom;
  bool _isPublic = true;
  bool _isCreating = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _gamificationService = GamificationService(
      baseUrl: EnvironmentConfig.gamificationBaseUrl,
      getAuthToken: () => _cachedToken,
      studentId: widget.learnerId,
    );

    _loadPendingInvites();
  }

  Future<void> _loadPendingInvites() async {
    if (_gamificationService == null) return;

    setState(() {
      _isLoadingInvites = true;
    });

    try {
      final invites = await _gamificationService!.getTeamInvites();
      if (mounted) {
        setState(() {
          _pendingInvites = invites.where((i) => i.isPending && !i.isExpired).toList();
          _isLoadingInvites = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingInvites = false;
        });
      }
    }
  }

  Future<void> _searchTeams(String query) async {
    if (_gamificationService == null || query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
      });
      return;
    }

    setState(() {
      _isSearching = true;
      _searchError = null;
    });

    try {
      final results = await _gamificationService!.searchTeams(query.trim());
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _searchError = e.toString();
          _isSearching = false;
        });
      }
    }
  }

  Future<void> _joinTeam(Team team) async {
    if (_gamificationService == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Join Team'),
        content: Text('Do you want to join "${team.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Join'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _gamificationService!.joinTeam(team.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Successfully joined "${team.name}"!'),
            backgroundColor: AivoBrand.success,
          ),
        );
        widget.onTeamJoined?.call();
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to join team: ${e.toString()}'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }

  Future<void> _respondToInvite(TeamInvite invite, bool accept) async {
    if (_gamificationService == null) return;

    try {
      final success = await _gamificationService!.respondToTeamInvite(
        invite.id,
        accept: accept,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(accept
              ? 'Joined "${invite.teamName}"!'
              : 'Declined invite to "${invite.teamName}"'),
            backgroundColor: accept ? AivoBrand.success : AivoBrand.gray,
          ),
        );

        if (accept) {
          widget.onTeamJoined?.call();
          Navigator.pop(context, true);
        } else {
          _loadPendingInvites();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to respond to invite: ${e.toString()}'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }

  Future<void> _createTeam() async {
    if (_gamificationService == null) return;

    final name = _teamNameController.text.trim();
    final description = _teamDescController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a team name'),
          backgroundColor: AivoBrand.warning,
        ),
      );
      return;
    }

    setState(() {
      _isCreating = true;
    });

    try {
      await _gamificationService!.createTeam(
        name: name,
        description: description,
        type: _selectedTeamType,
        isPublic: _isPublic,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Team "$name" created successfully!'),
            backgroundColor: AivoBrand.success,
          ),
        );
        widget.onTeamJoined?.call();
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCreating = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create team: ${e.toString()}'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _teamNameController.dispose();
    _teamDescController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Find a Team'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            const Tab(text: 'Search'),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Invites'),
                  if (_pendingInvites.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AivoBrand.error,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_pendingInvites.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Create'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSearchTab(),
          _buildInvitesTab(),
          _buildCreateTab(),
        ],
      ),
    );
  }

  Widget _buildSearchTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search for teams...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _isSearching
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchResults = [];
                            });
                          },
                        )
                      : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onChanged: (value) {
              if (value.length >= 2) {
                _searchTeams(value);
              } else if (value.isEmpty) {
                setState(() {
                  _searchResults = [];
                });
              }
            },
          ),
        ),
        Expanded(
          child: _buildSearchResults(),
        ),
      ],
    );
  }

  Widget _buildSearchResults() {
    if (_searchError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AivoBrand.error),
            const SizedBox(height: 16),
            Text('Search failed', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(_searchError!, style: const TextStyle(color: AivoBrand.gray)),
          ],
        ),
      );
    }

    if (_searchController.text.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.groups, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'Search for Teams',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Enter a team name to find teams to join',
              style: TextStyle(color: AivoBrand.gray.shade600),
            ),
          ],
        ),
      );
    }

    if (_searchResults.isEmpty && !_isSearching) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No Teams Found',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Try a different search or create your own team',
              style: TextStyle(color: AivoBrand.gray.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _tabController.animateTo(2),
              icon: const Icon(Icons.add),
              label: const Text('Create Team'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _searchResults.length,
      itemBuilder: (context, index) {
        final team = _searchResults[index];
        return _buildTeamCard(team);
      },
    );
  }

  Widget _buildTeamCard(Team team) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _joinTeam(team),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: team.typeColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(25),
                ),
                child: Center(
                  child: Text(
                    team.name.isNotEmpty ? team.name[0].toUpperCase() : '?',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: team.typeColor,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      team.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    if (team.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        team.description,
                        style: TextStyle(
                          color: AivoBrand.gray.shade600,
                          fontSize: 13,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildTeamBadge(
                          Icons.people,
                          '${team.memberCount}/${team.maxMembers}',
                        ),
                        const SizedBox(width: 8),
                        _buildTeamBadge(
                          Icons.star,
                          'Level ${team.level}',
                        ),
                        if (team.rank != null) ...[
                          const SizedBox(width: 8),
                          _buildTeamBadge(
                            Icons.leaderboard,
                            '#${team.rank}',
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AivoBrand.gray.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTeamBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AivoBrand.gray.shade100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AivoBrand.gray.shade600),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              color: AivoBrand.gray.shade700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvitesTab() {
    if (_isLoadingInvites) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_pendingInvites.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.mail_outline, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No Pending Invites',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Team invites will appear here',
              style: TextStyle(color: AivoBrand.gray.shade600),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPendingInvites,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _pendingInvites.length,
        itemBuilder: (context, index) {
          final invite = _pendingInvites[index];
          return _buildInviteCard(invite);
        },
      ),
    );
  }

  Widget _buildInviteCard(TeamInvite invite) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: const Center(
                    child: Icon(Icons.mail, color: Colors.blue),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invite.teamName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'Invited by ${invite.inviterName}',
                        style: TextStyle(
                          color: AivoBrand.gray.shade600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _respondToInvite(invite, false),
                    child: const Text('Decline'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _respondToInvite(invite, true),
                    child: const Text('Accept'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create a New Team',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Start your own team and invite friends to join!',
            style: TextStyle(color: AivoBrand.gray.shade600),
          ),
          const SizedBox(height: 24),

          // Team Name
          TextField(
            controller: _teamNameController,
            decoration: InputDecoration(
              labelText: 'Team Name',
              hintText: 'Enter a team name',
              prefixIcon: const Icon(Icons.group),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            maxLength: 50,
          ),
          const SizedBox(height: 16),

          // Team Description
          TextField(
            controller: _teamDescController,
            decoration: InputDecoration(
              labelText: 'Description (optional)',
              hintText: 'What is your team about?',
              prefixIcon: const Icon(Icons.description),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            maxLines: 3,
            maxLength: 200,
          ),
          const SizedBox(height: 16),

          // Team Type
          Text(
            'Team Type',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: TeamType.values.map((type) {
              final isSelected = _selectedTeamType == type;
              return ChoiceChip(
                label: Text(_getTeamTypeName(type)),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    setState(() {
                      _selectedTeamType = type;
                    });
                  }
                },
                selectedColor: _getTeamTypeColor(type).withOpacity(0.2),
                labelStyle: TextStyle(
                  color: isSelected ? _getTeamTypeColor(type) : AivoBrand.gray,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // Public/Private toggle
          SwitchListTile(
            title: const Text('Public Team'),
            subtitle: Text(
              _isPublic
                ? 'Anyone can search and join'
                : 'Only invited members can join',
              style: TextStyle(
                color: AivoBrand.gray.shade600,
                fontSize: 13,
              ),
            ),
            value: _isPublic,
            onChanged: (value) {
              setState(() {
                _isPublic = value;
              });
            },
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 32),

          // Create Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isCreating ? null : _createTeam,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isCreating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Create Team'),
            ),
          ),
        ],
      ),
    );
  }

  String _getTeamTypeName(TeamType type) {
    switch (type) {
      case TeamType.classroom:
        return 'Classroom';
      case TeamType.school:
        return 'School';
      case TeamType.crossSchool:
        return 'Cross-School';
    }
  }

  Color _getTeamTypeColor(TeamType type) {
    switch (type) {
      case TeamType.classroom:
        return AivoBrand.success;
      case TeamType.school:
        return Colors.blue;
      case TeamType.crossSchool:
        return Colors.purple;
    }
  }
}
