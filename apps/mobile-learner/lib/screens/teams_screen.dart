import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Teams Screen
///
/// Displays team competitions, leaderboards, and team progress.
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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // Mock data - would come from provider/API in real app
  final Map<String, dynamic> _myTeam = {
    'id': 'team-dragons',
    'name': 'Math Dragons',
    'color': Colors.red,
    'icon': '🐉',
    'rank': 2,
    'score': 4520,
    'streak': 5,
    'members': [
      {'id': '1', 'name': 'You', 'score': 1250, 'isLeader': true},
      {'id': '2', 'name': 'Alex', 'score': 980},
      {'id': '3', 'name': 'Jordan', 'score': 875},
      {'id': '4', 'name': 'Sam', 'score': 820},
      {'id': '5', 'name': 'Casey', 'score': 595},
    ],
  };

  final List<Map<String, dynamic>> _leaderboard = [
    {'name': 'Star Squad', 'icon': '⭐', 'color': Colors.amber, 'score': 5200, 'rank': 1},
    {'name': 'Math Dragons', 'icon': '🐉', 'color': Colors.red, 'score': 4520, 'rank': 2},
    {'name': 'Science Wizards', 'icon': '🧙', 'color': Colors.purple, 'score': 4180, 'rank': 3},
    {'name': 'Reading Rockets', 'icon': '🚀', 'color': Colors.blue, 'score': 3950, 'rank': 4},
    {'name': 'History Heroes', 'icon': '🏛️', 'color': Colors.brown, 'score': 3600, 'rank': 5},
  ];

  final List<Map<String, dynamic>> _competitions = [
    {
      'id': 'comp-1',
      'title': 'Math Marathon Week',
      'description': 'Complete math activities to earn points for your team',
      'status': 'active',
      'endDate': DateTime.now().add(const Duration(days: 3)),
      'prize': '🏆 Special Badge',
    },
    {
      'id': 'comp-2',
      'title': 'Reading Challenge',
      'description': 'Read stories and answer questions',
      'status': 'upcoming',
      'startDate': DateTime.now().add(const Duration(days: 5)),
      'prize': '📚 Book Worm Badge',
    },
  ];

  @override
  Widget build(BuildContext context) {
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
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMyTeamTab(),
          _buildLeaderboardTab(),
          _buildCompetitionsTab(),
        ],
      ),
    );
  }

  Widget _buildMyTeamTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Team header card
        Card(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  (_myTeam['color'] as Color).withOpacity(0.8),
                  (_myTeam['color'] as Color).withOpacity(0.6),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  _myTeam['icon'],
                  style: const TextStyle(fontSize: 50),
                ),
                const SizedBox(height: 8),
                Text(
                  _myTeam['name'],
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
                    _buildStatBadge('🏆 #${_myTeam['rank']}', 'Rank'),
                    const SizedBox(width: 16),
                    _buildStatBadge('${_myTeam['score']}', 'Points'),
                    const SizedBox(width: 16),
                    _buildStatBadge('🔥 ${_myTeam['streak']}', 'Streak'),
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
        ...(_myTeam['members'] as List).asMap().entries.map((entry) {
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

  Widget _buildMemberCard(Map<String, dynamic> member, int position) {
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
          member['name'],
          style: TextStyle(
            fontWeight: member['isLeader'] == true ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: member['isLeader'] == true
            ? const Text('Team Leader', style: TextStyle(color: Colors.amber))
            : null,
        trailing: Text(
          '${member['score']} pts',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildLeaderboardTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _leaderboard.length,
      itemBuilder: (context, index) {
        final team = _leaderboard[index];
        final isMyTeam = team['name'] == _myTeam['name'];

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: isMyTeam ? Theme.of(context).primaryColor.withOpacity(0.1) : null,
          child: ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _getRankColor(team['rank']),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: team['rank'] <= 3
                    ? Text(_getRankEmoji(team['rank']), style: const TextStyle(fontSize: 20))
                    : Text(
                        '#${team['rank']}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            title: Row(
              children: [
                Text(team['icon']),
                const SizedBox(width: 8),
                Text(
                  team['name'],
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
              '${team['score']}',
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
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _competitions.length,
      itemBuilder: (context, index) {
        final comp = _competitions[index];
        final isActive = comp['status'] == 'active';

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
                  color: isActive ? Colors.green : Colors.blue,
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
                      isActive ? 'Active Now' : 'Scheduled',
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
                      comp['title'],
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      comp['description'],
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.emoji_events, size: 16, color: Colors.amber[700]),
                        const SizedBox(width: 4),
                        Text(
                          'Prize: ${comp['prize']}',
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
                          onPressed: () => _viewCompetition(comp['id']),
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

  Color _getRankColor(int rank) {
    switch (rank) {
      case 1:
        return Colors.amber;
      case 2:
        return Colors.grey;
      case 3:
        return Colors.orange;
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
