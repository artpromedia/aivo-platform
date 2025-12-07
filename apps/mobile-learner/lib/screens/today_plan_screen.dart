import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

class TodayPlanScreen extends StatelessWidget {
  const TodayPlanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    return Scaffold(
      appBar: AppBar(title: Text(strings.todayPlan)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Your plan for today', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            const ListTile(
              leading: Icon(Icons.book),
              title: Text('Reading - 20 mins'),
              subtitle: Text('Focus on comprehension'),
            ),
            const ListTile(
              leading: Icon(Icons.calculate),
              title: Text('Math - 15 mins'),
              subtitle: Text('Fractions practice'),
            ),
            const Spacer(),
            FilledButton.icon(
              onPressed: () => context.go('/complete'),
              icon: const Icon(Icons.check_circle),
              label: const Text('Start Session'),
            )
          ],
        ),
      ),
    );
  }
}
