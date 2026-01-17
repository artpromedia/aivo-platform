import 'package:flutter/material.dart';
import 'learning_games_screen.dart';
import 'practice_exercises_screen.dart';
import 'skill_builders_screen.dart';
import 'family_activities_screen.dart';

/// Main home activities screen with tab navigation
class HomeActivitiesScreen extends StatefulWidget {
  final String childId;

  const HomeActivitiesScreen({
    super.key,
    required this.childId,
  });

  @override
  State<HomeActivitiesScreen> createState() => _HomeActivitiesScreenState();
}

class _HomeActivitiesScreenState extends State<HomeActivitiesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home Activities'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.gamepad), text: 'Games'),
            Tab(icon: Icon(Icons.assignment), text: 'Exercises'),
            Tab(icon: Icon(Icons.construction), text: 'Skill Builders'),
            Tab(icon: Icon(Icons.family_restroom), text: 'Family'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          LearningGamesScreen(childId: widget.childId),
          PracticeExercisesScreen(childId: widget.childId),
          SkillBuildersScreen(childId: widget.childId),
          FamilyActivitiesScreen(childId: widget.childId),
        ],
      ),
    );
  }
}
