/// Team Dashboard Widget
///
/// Mobile team view with member list, XP contributions, and competition standings
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import '../gamification/gamification_models.dart';
import '../gamification/gamification_service.dart';

// ============================================================================
// TEAM DASHBOARD WIDGET
// ============================================================================

class TeamDashboard extends StatefulWidget {
  final String teamId;
  final VoidCallback? onLeaveTeam;
  final VoidCallback? onInviteMembers;

  const TeamDashboard({
    super.key,
    required this.teamId,
    this.onLeaveTeam,
    this.onInviteMembers,
  });

  @override
  State<TeamDashboard> createState() => _TeamDashboardState();
}

class _TeamDashboardState extends State<TeamDashboard>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  GamificationService? _gamificationService;
  TeamDetails? _team;
  List<TeamMember> _members = [];
  List<CompetitionStanding> _competitions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initializeService();
  }

  Future<void> _initializeService() async {
    // Initialize service with required parameters - in production, get these from context/provider
    _gamificationService = GamificationService(
      baseUrl: 'https://api.aivo.com',
      getAuthToken: () => '', // TODO: Get from auth provider
      studentId: '', // TODO: Get from user context
    );
    await _loadTeamData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTeamData() async {
    if (_gamificationService == null) return;
    
    setState(() {
      _isLoading = true;
    });

    try {
      // Fetch real data from gamification service
      final results = await Future.wait([
        _gamificationService!.getTeamDetails(widget.teamId),
        _gamificationService!.getTeamMembers(widget.teamId),
        _gamificationService!.getMyCompetitionStandings(),
      ]);

      if (mounted) {
        setState(() {
          _team = results[0] as TeamDetails?;
          _members = results[1] as List<TeamMember>;
          _competitions = results[2] as List<CompetitionStanding>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load team data: $e')),
        );
      }
    }
  }

  Color _getTypeColor() {
    switch (_team?.type) {
      case TeamType.classroom:
        return AivoBrand.success;
      case TeamType.school:
        return Colors.blue;
      case TeamType.crossSchool:
        return Colors.purple;
      default:
        return AivoBrand.gray;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_team == null) {
      return const Scaffold(
        body: Center(
          child: Text('Team not found'),
        ),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Team Header
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      _getTypeColor(),
                      _getTypeColor().withOpacity(0.7),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(30),
                                border: Border.all(
                                  color: Colors.white,
                                  width: 3,
                                ),
                              ),
                              child: const Center(
                                child: Text(
                                  '⚔️',
                                  style: TextStyle(fontSize: 30),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _team!.name,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    _team!.description,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.9),
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildBadge('Level ${_team!.level}'),
                            const SizedBox(width: 8),
                            _buildBadge(
                                '${_team!.memberCount}/${_team!.maxMembers} members'),
                            if (_team!.rank != null) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.yellow.shade400,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Rank #${_team!.rank}',
                                  style: TextStyle(
                                    color: Colors.yellow.shade900,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Stats
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      'Total XP',
                      _team!.totalXp.toString(),
                      Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      'This Week',
                      _team!.weeklyXp.toString(),
                      AivoBrand.success,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      'Active',
                      '${(_members.where((m) => m.weeklyContribution > 0).length)}/${_members.length}',
                      Colors.purple,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Tabs
          SliverPersistentHeader(
            pinned: true,
            delegate: _SliverTabBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: Theme.of(context).primaryColor,
                unselectedLabelColor: AivoBrand.gray,
                indicatorColor: Theme.of(context).primaryColor,
                tabs: const [
                  Tab(text: 'Members'),
                  Tab(text: 'Competitions'),
                  Tab(text: 'Achievements'),
                ],
              ),
            ),
          ),

          // Tab Content
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildMembersTab(),
                _buildCompetitionsTab(),
                _buildAchievementsTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildBadge(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: AivoBrand.gray.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMembersTab() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _members.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final member = _members[index];
        return _buildMemberCard(member, index);
      },
    );
  }

  Widget _buildMemberCard(TeamMember member, int index) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.gray.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: index < 3
                  ? (index == 0
                      ? Colors.yellow.shade100
                      : index == 1
                          ? AivoBrand.gray.shade200
                          : AivoBrand.sunshine.shade100)
                  : AivoBrand.gray.shade100,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Center(
              child: Text(
                '${index + 1}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: index < 3 ? Colors.black : AivoBrand.gray.shade600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      member.displayName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (member.role == 'owner') ...[
                      const SizedBox(width: 4),
                      const Text('👑', style: TextStyle(fontSize: 14)),
                    ],
                    if (member.role == 'captain') ...[
                      const SizedBox(width: 4),
                      const Text('⭐', style: TextStyle(fontSize: 14)),
                    ],
                  ],
                ),
                Text(
                  'Level ${member.level ?? 1} • +${member.weeklyContribution} this week',
                  style: TextStyle(
                    fontSize: 12,
                    color: AivoBrand.gray.shade600,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                member.contributedXp.toString(),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue,
                ),
              ),
              Text(
                'XP',
                style: TextStyle(
                  fontSize: 11,
                  color: AivoBrand.gray.shade600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompetitionsTab() {
    if (_competitions.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('🏆', style: TextStyle(fontSize: 48)),
            SizedBox(height: 16),
            Text(
              'No active competitions',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Check back later!',
              style: TextStyle(color: AivoBrand.gray),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _competitions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final comp = _competitions[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.purple.shade50, Colors.blue.shade50],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.purple.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      comp.competitionName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  Text(
                    '⏰ ${comp.timeRemaining}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AivoBrand.gray.shade700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Team Rank',
                        style: TextStyle(
                          fontSize: 12,
                          color: AivoBrand.gray,
                        ),
                      ),
                      Text(
                        '#${comp.rank}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.purple,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'Score',
                        style: TextStyle(
                          fontSize: 12,
                          color: AivoBrand.gray,
                        ),
                      ),
                      Text(
                        comp.score.toString(),
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAchievementsTab() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('🏅', style: TextStyle(fontSize: 48)),
          SizedBox(height: 16),
          Text(
            'No team achievements yet',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Keep contributing to unlock achievements!',
            style: TextStyle(color: AivoBrand.gray),
          ),
        ],
      ),
    );
  }

  Widget? _buildBottomBar() {
    if (widget.onLeaveTeam == null && widget.onInviteMembers == null) {
      return null;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (widget.onInviteMembers != null)
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: widget.onInviteMembers,
                  icon: const Icon(Icons.person_add),
                  label: const Text('Invite'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            if (widget.onLeaveTeam != null && widget.onInviteMembers != null)
              const SizedBox(width: 12),
            if (widget.onLeaveTeam != null)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.onLeaveTeam,
                  icon: const Icon(Icons.exit_to_app),
                  label: const Text('Leave'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// SLIVER TAB BAR DELEGATE
// ============================================================================

class _SliverTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _SliverTabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabBarDelegate oldDelegate) {
    return false;
  }
}
