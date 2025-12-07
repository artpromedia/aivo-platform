import 'package:flutter/material.dart';
import 'package:flutter_common/flutter_common.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, required this.onLoggedIn});

  final VoidCallback onLoggedIn;

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    return Scaffold(
      appBar: AppBar(title: Text(strings.loginTitle)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Parent Portal', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 16),
            TextField(decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 12),
            TextField(decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 24),
            FilledButton(onPressed: onLoggedIn, child: Text(strings.loginCta)),
          ],
        ),
      ),
    );
  }
}
