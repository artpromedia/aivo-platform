import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../config/environment.dart';
import '../features/gamification/gamification_models.dart';
import '../features/gamification/gamification_service.dart';
import '../pin/pin_storage.dart';
import 'team_search_screen.dart';

/// Teams Screen
///
/// Displays team competitions, leaderboards, and team progress.
/// Sprint 3.1: Now uses real gamification-svc API instead of hardcoded data.
class TeamsScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const TeamsScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<TeamsScreen> createState() => _TeamsScreenState();
}

class _TeamsScreenState extends ConsumerState<TeamsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  GamificationService? _gamificationService;
  String _cachedToken = '';

  // Real data from API
  TeamDetails? _myTeam;
  List<Team> _leaderboard = [];
  List<Competition> _competitions = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initializeService();
  }

  Future<void> _initializeService() async {
    // Get auth token from storage for API calls
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';
    
    _gamificationService = GamificationService(
      baseUrl: EnvironmentConfig.gamificationBaseUrl,
      getAuthToken: () => _cachedToken,
      studentId: widget.learnerId,
    );
    _loadData();
  }

  Future<void> _loadData() async {
    if (_gamificationService == null) return;
    
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Load all data in parallel
      final results = await Future.wait([
        _gamificationService!.getStudentTeam(),
        _gamificationService!.getTeamLeaderboard(),
        _gamificationService!.getCompetitions(),
      ]);

      if (mounted) {
        setState(() {
          _myTeam = results[0] as TeamDetails?;
          _leaderboard = results[1] as List<Team>;
          _competitions = results[2] as List<Competition>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Teams')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Teams')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load data', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(_errorMessage!, style: TextStyle(color: AivoBrand.gray)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Teams'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'My Team'),
            Tab(text: 'Leaderboard'),
            Tab(text: 'Competitions'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildMyTeamTab(),
            _buildLeaderboardTab(),
            _buildCompetitionsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildMyTeamTab() {
    if (_myTeam == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.group_off, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No Team Yet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Join or create a team to get started!',
              style: TextStyle(color: AivoBrand.gray),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => TeamSearchScreen(
                      learnerId: widget.learnerId,
                      onTeamJoined: _loadData,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.search),
              label: const Text('Find a Team'),
            ),
          ],
        ),
      );
    }

    // Get team color based on theme or default
    final teamRank = _myTeam!.rank ?? 999;
    final teamColor = teamRank <= 3 
        ? [AivoBrand.warning, Colors.grey, Colors.brown][teamRank - 1]
        : Theme.of(context).primaryColor;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Team header card
        Card(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  teamColor.withOpacity(0.8),
                  teamColor.withOpacity(0.6),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  '👥', // Default team icon
                  style: const TextStyle(fontSize: 50),
                ),
                const SizedBox(height: 8),
                Text(
                  _myTeam!.name,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildStatBadge('🏆 #${_myTeam!.rank ?? "-"}', 'Rank'),
                    const SizedBox(width: 16),
                    _buildStatBadge('${_myTeam!.totalXp}', 'Points'),
                    const SizedBox(width: 16),
                    _buildStatBadge('🔥 ${_myTeam!.weeklyXp}', 'Weekly'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        // Team members
        Text(
          'Team Members',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        ...(_myTeam!.members).asMap().entries.map((entry) {
          final index = entry.key;
          final member = entry.value;
          return _buildMemberCard(member, index + 1);
        }),
      ],
    );
  }

  Widget _buildStatBadge(String value, String label) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildMemberCard(TeamMember member, int position) {
    final isLeader = member.role == TeamMemberRole.owner;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
          child: Text(
            position == 1 ? '👑' : '#$position',
            style: TextStyle(
              fontSize: position == 1 ? 20 : 14,
            ),
          ),
        ),
        title: Text(
          member.displayName,
          style: TextStyle(
            fontWeight: isLeader ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: isLeader
            ? const Text('Team Leader', style: TextStyle(color: Colors.amber))
            : null,
        trailing: Text(
          '${member.contributedXp} pts',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildLeaderboardTab() {
    if (_leaderboard.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.leaderboard_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No Leaderboard Data',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Team rankings will appear here',
              style: TextStyle(color: AivoBrand.gray),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _leaderboard.length,
      itemBuilder: (context, index) {
        final team = _leaderboard[index];
        final isMyTeam = _myTeam != null && team.id == _myTeam!.id;
        final rank = index + 1;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: isMyTeam ? Theme.of(context).primaryColor.withOpacity(0.1) : null,
          child: ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _getRankColor(rank),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: rank <= 3
                    ? Text(_getRankEmoji(rank), style: const TextStyle(fontSize: 20))
                    : Text(
                        '#$rank',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            title: Row(
              children: [
                const Text('👥'), // Default team icon
                const SizedBox(width: 8),
                Text(
                  team.name,
                  style: TextStyle(
                    fontWeight: isMyTeam ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
                if (isMyTeam) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'You',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            trailing: Text(
              '${team.totalXp}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCompetitionsTab() {
    if (_competitions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.emoji_events_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No Competitions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for new competitions!',
              style: TextStyle(color: AivoBrand.gray),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _competitions.length,
      itemBuilder: (context, index) {
        final comp = _competitions[index];
        final isActive = comp.status == CompetitionStatus.active;

        // Get primary prize description
        final prizeText = comp.prizes.isNotEmpty 
            ? comp.prizes.first.displayText 
            : 'Rewards available';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isActive ? AivoBrand.success : Colors.blue,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: Row(
                  children: [
                    Icon(
                      isActive ? Icons.play_circle : Icons.schedule,
                      color: Colors.white,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isActive ? 'Active Now' : _getCompetitionStatusText(comp.status),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      comp.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      comp.description,
                      style: TextStyle(color: AivoBrand.gray[600]),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.emoji_events, size: 16, color: Colors.amber[700]),
                        const SizedBox(width: 4),
                        Text(
                          'Prize: $prizeText',
                          style: TextStyle(
                            color: Colors.amber[700],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (isActive)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _viewCompetition(comp.id),
                          child: const Text('View Competition'),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _getCompetitionStatusText(CompetitionStatus status) {
    switch (status) {
      case CompetitionStatus.upcoming:
        return 'Coming Soon';
      case CompetitionStatus.active:
        return 'Active Now';
      case CompetitionStatus.ended:
        return 'Completed';
      case CompetitionStatus.cancelled:
        return 'Cancelled';
    }
  }

  Color _getRankColor(int rank) {
    switch (rank) {
      case 1:
        return AivoBrand.warning;
      case 2:
        return AivoBrand.gray;
      case 3:
        return AivoBrand.sunshine[400]!;
      default:
        return Colors.blueGrey;
    }
  }

  String _getRankEmoji(int rank) {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '#$rank';
    }
  }

  void _viewCompetition(String id) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Viewing competition: $id')),
    );
  }
}
