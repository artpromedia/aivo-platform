# Developer Quick Reference - Frontend Parity Implementation
**Quick guide for developers implementing missing features**

---

## Getting Started

### 1. Pick a Feature
Check [PARITY_IMPLEMENTATION_CHECKLIST.md](PARITY_IMPLEMENTATION_CHECKLIST.md) for your assignment.

### 2. Review Mobile Implementation (if porting)
All features exist in mobile apps - use as reference!

**Example: Focus Tools**
```
Mobile Location:
  mobile-learner/lib/focus/focus_service.dart
  mobile-learner/lib/screens/focus_break_screen.dart
  
Your Job:
  Port to: web-learner/app/(learning)/focus/page.tsx
  Components: FocusTimer.tsx, BreakActivities.tsx, FocusHistory.tsx
```

### 3. Backend Service Endpoints
All services deployed and ready! Check service documentation.

**Example: Focus Service**
```
Service: focus-svc
Base URL: https://api.aivo.com/focus
Endpoints:
  GET /sessions - Get focus sessions
  POST /sessions - Start focus session
  PUT /sessions/:id - Update session
  DELETE /sessions/:id - Delete session
  GET /stats - Get focus statistics
```

---

## File Structure Patterns

### Web Apps (Next.js)

```
apps/web-[app]/
├── app/
│   ├── (learning)/        # Authenticated routes
│   │   ├── [feature]/     # Feature directory
│   │   │   ├── page.tsx   # Main page
│   │   │   └── components/ # Feature-specific components
│   ├── components/         # Shared components
│   ├── lib/
│   │   ├── api/           # API clients
│   │   │   └── [feature]-client.ts
│   │   ├── types/         # TypeScript types
│   │   │   └── [feature].ts
│   │   └── utils/         # Utility functions
```

### Mobile Apps (Flutter)

```
apps/mobile-[app]/
├── lib/
│   ├── features/          # Feature modules
│   │   └── [feature]/
│   │       ├── [feature]_service.dart
│   │       ├── models/
│   │       └── widgets/
│   ├── screens/           # Screen widgets
│   │   └── [feature]_screen.dart
│   ├── providers/         # State management (Riverpod)
│   │   └── [feature]_provider.dart
│   ├── repositories/      # Data layer
│   │   └── [feature]_repository.dart
```

---

## Code Templates

### Web: Create New Feature Page

**File:** `apps/web-learner/app/(learning)/[feature]/page.tsx`

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, Heading, Button } from '@aivo/ui-web';
import { getAuthSession } from '../../../lib/auth';

// Import types
import type { FeatureData } from '@/lib/types/feature';

// Import API client
import { getFeatureData } from '@/lib/api/feature-client';

export default async function FeaturePage() {
  // Auth check
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch data
  const data = await getFeatureData(session.user.id);

  return (
    <div className="container mx-auto p-6">
      <Heading level={1}>Feature Name</Heading>
      
      {/* Your UI here */}
      <Card>
        <p>Feature content</p>
      </Card>
    </div>
  );
}
```

### Web: Create API Client

**File:** `apps/web-learner/lib/api/feature-client.ts`

```ts
import { apiClient } from './api-client';
import type { FeatureData, FeatureResponse } from '@/lib/types/feature';

const BASE_URL = '/api/feature';

export async function getFeatureData(userId: string): Promise<FeatureData> {
  const response = await apiClient.get<FeatureResponse>(
    `${BASE_URL}/users/${userId}`
  );
  return response.data;
}

export async function createFeatureItem(data: CreateFeatureDto): Promise<FeatureData> {
  const response = await apiClient.post<FeatureResponse>(
    `${BASE_URL}/items`,
    data
  );
  return response.data;
}

export async function updateFeatureItem(
  id: string,
  data: UpdateFeatureDto
): Promise<FeatureData> {
  const response = await apiClient.put<FeatureResponse>(
    `${BASE_URL}/items/${id}`,
    data
  );
  return response.data;
}

export async function deleteFeatureItem(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/items/${id}`);
}
```

### Web: Create TypeScript Types

**File:** `apps/web-learner/lib/types/feature.ts`

```ts
// Match backend service types
export type FeatureStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface FeatureData {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: FeatureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureDto {
  title: string;
  description: string;
}

export interface UpdateFeatureDto {
  title?: string;
  description?: string;
  status?: FeatureStatus;
}

export interface FeatureResponse {
  data: FeatureData;
  message?: string;
}
```

### Mobile: Create Service

**File:** `apps/mobile-learner/lib/features/[feature]/[feature]_service.dart`

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/feature_models.dart';

class FeatureService {
  final String baseUrl = 'https://api.aivo.com/feature';
  final http.Client client;

  FeatureService({required this.client});

  Future<List<FeatureData>> getFeatureData(String userId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/users/$userId'),
      headers: {'Authorization': 'Bearer TOKEN'},
    );

    if (response.statusCode == 200) {
      final List<dynamic> json = jsonDecode(response.body);
      return json.map((item) => FeatureData.fromJson(item)).toList();
    } else {
      throw Exception('Failed to load feature data');
    }
  }

  Future<FeatureData> createFeatureItem(CreateFeatureDto dto) async {
    final response = await client.post(
      Uri.parse('$baseUrl/items'),
      headers: {
        'Authorization': 'Bearer TOKEN',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(dto.toJson()),
    );

    if (response.statusCode == 201) {
      return FeatureData.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to create feature item');
    }
  }
}
```

### Mobile: Create Screen

**File:** `apps/mobile-learner/lib/screens/feature_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/feature_provider.dart';

class FeatureScreen extends ConsumerWidget {
  const FeatureScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featureState = ref.watch(featureProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Feature Name'),
      ),
      body: featureState.when(
        data: (data) => _buildContent(data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }

  Widget _buildContent(List<FeatureData> data) {
    return ListView.builder(
      itemCount: data.length,
      itemBuilder: (context, index) {
        final item = data[index];
        return ListTile(
          title: Text(item.title),
          subtitle: Text(item.description),
        );
      },
    );
  }
}
```

---

## Common Patterns

### Authentication Check (Web)

```tsx
import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }
  
  // Page content
}
```

### Loading States (Web)

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function FeaturePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getFeatureData();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  return <FeatureContent data={data} />;
}
```

### State Management (Mobile - Riverpod)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/feature_service.dart';
import '../models/feature_models.dart';

// Provider for service
final featureServiceProvider = Provider<FeatureService>((ref) {
  return FeatureService(client: http.Client());
});

// Provider for data
final featureProvider = FutureProvider.family<List<FeatureData>, String>(
  (ref, userId) async {
    final service = ref.read(featureServiceProvider);
    return await service.getFeatureData(userId);
  },
);

// State Notifier for complex state
final featureNotifierProvider = StateNotifierProvider<FeatureNotifier, FeatureState>(
  (ref) => FeatureNotifier(ref.read(featureServiceProvider)),
);

class FeatureNotifier extends StateNotifier<FeatureState> {
  final FeatureService _service;
  
  FeatureNotifier(this._service) : super(FeatureState.initial());

  Future<void> loadData(String userId) async {
    state = state.copyWith(isLoading: true);
    try {
      final data = await _service.getFeatureData(userId);
      state = state.copyWith(data: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }
}
```

---

## Testing Templates

### Unit Test (Web - Jest/React Testing Library)

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeaturePage from '../page';

jest.mock('@/lib/api/feature-client', () => ({
  getFeatureData: jest.fn(),
}));

describe('FeaturePage', () => {
  it('renders feature data', async () => {
    const mockData = { id: '1', title: 'Test', description: 'Test desc' };
    (getFeatureData as jest.Mock).mockResolvedValue([mockData]);

    render(<FeaturePage />);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    render(<FeaturePage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (getFeatureData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<FeaturePage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Widget Test (Mobile - Flutter)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';

import 'package:aivo/screens/feature_screen.dart';
import 'package:aivo/providers/feature_provider.dart';

class MockFeatureService extends Mock implements FeatureService {}

void main() {
  testWidgets('FeatureScreen displays data', (WidgetTester tester) async {
    final mockService = MockFeatureService();
    final mockData = [FeatureData(id: '1', title: 'Test')];
    
    when(mockService.getFeatureData(any)).thenAnswer((_) async => mockData);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          featureServiceProvider.overrideWithValue(mockService),
        ],
        child: const MaterialApp(home: FeatureScreen()),
      ),
    );

    await tester.pump();

    expect(find.text('Test'), findsOneWidget);
  });

  testWidgets('FeatureScreen shows loading indicator', (WidgetTester tester) async {
    final mockService = MockFeatureService();
    
    when(mockService.getFeatureData(any)).thenAnswer(
      (_) async => Future.delayed(const Duration(seconds: 1), () => []),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          featureServiceProvider.overrideWithValue(mockService),
        ],
        child: const MaterialApp(home: FeatureScreen()),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
```

---

## Design System Usage

### Web Components (@aivo/ui-web)

```tsx
import { 
  Button, 
  Card, 
  Heading, 
  Input, 
  Select,
  Badge,
  Alert,
  Modal,
  Tabs,
  Table
} from '@aivo/ui-web';

// Button variants
<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

// Card
<Card>
  <Card.Header>
    <Heading level={3}>Card Title</Heading>
  </Card.Header>
  <Card.Body>
    Content here
  </Card.Body>
</Card>

// Form inputs
<Input
  type="text"
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
/>

<Select
  label="Status"
  value={status}
  onChange={setStatus}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]}
/>

// Alerts
<Alert variant="success">
  Changes saved successfully!
</Alert>

<Alert variant="error">
  An error occurred. Please try again.
</Alert>
```

### Mobile Components (Flutter)

```dart
import 'package:aivo/design_system/widgets.dart';

// Buttons
AivoButton.primary(
  text: 'Click Me',
  onPressed: handleClick,
);

AivoButton.secondary(
  text: 'Cancel',
  onPressed: handleCancel,
);

// Cards
AivoCard(
  child: Column(
    children: [
      Text('Card Title', style: AivoTextStyles.heading3),
      Text('Card content'),
    ],
  ),
);

// Form inputs
AivoTextField(
  label: 'Name',
  value: name,
  onChanged: setName,
  error: errors['name'],
);

AivoDropdown(
  label: 'Status',
  value: status,
  items: [
    DropdownMenuItem(value: 'active', child: Text('Active')),
    DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
  ],
  onChanged: setStatus,
);

// Alerts
AivoAlert.success(
  message: 'Changes saved successfully!',
);

AivoAlert.error(
  message: 'An error occurred. Please try again.',
);
```

---

## Accessibility Checklist

### WCAG 2.1 AA Compliance

- [ ] **Keyboard Navigation**
  - All interactive elements accessible via keyboard
  - Logical tab order
  - Visible focus indicators

- [ ] **Screen Reader Support**
  - Semantic HTML (use proper heading hierarchy)
  - ARIA labels where needed
  - Alt text for images
  - Live regions for dynamic content

- [ ] **Color Contrast**
  - Text: 4.5:1 minimum
  - Large text (18pt+): 3:1 minimum
  - Icons/graphics: 3:1 minimum

- [ ] **Responsive Design**
  - Text can be resized up to 200%
  - No horizontal scrolling at 320px width
  - Touch targets at least 44x44px

- [ ] **Form Accessibility**
  - Labels for all inputs
  - Error messages associated with inputs
  - Clear form validation

### Testing Tools

**Web:**
```bash
# Install axe DevTools extension (Chrome/Firefox)
# Run lighthouse accessibility audit
npm run test:a11y

# Manual testing
# Use keyboard only (no mouse)
# Test with screen reader (NVDA/JAWS/VoiceOver)
```

**Mobile:**
```dart
// Enable TalkBack (Android) or VoiceOver (iOS)
// Test all screens with screen reader
// Verify touch target sizes
// Test text scaling (Settings > Display > Font Size)
```

---

## Common Issues & Solutions

### Issue: API 404 Not Found

**Solution:** Check backend service is deployed and Kong route configured

```bash
# Check service deployment
kubectl get pods -n aivo | grep feature-svc

# Check Kong route
curl https://api.aivo.com/feature/health

# Check logs
kubectl logs -n aivo feature-svc-xxxxx
```

### Issue: CORS Error (Web)

**Solution:** Add API route to Next.js middleware

**File:** `apps/web-learner/middleware.ts`
```ts
export const config = {
  matcher: [
    '/api/:path*',
    // Add your API route
  ],
};
```

### Issue: Type Mismatch

**Solution:** Ensure frontend types match backend schema

```bash
# Generate types from OpenAPI spec
npm run generate:types

# Or manually sync with backend
# Check: services/[service]/src/models/
```

### Issue: Mobile Build Error

**Solution:** Update dependencies and clean build

```bash
cd apps/mobile-learner
flutter clean
flutter pub get
flutter pub upgrade
flutter build apk --debug
```

---

## Git Workflow

### Branch Naming

```bash
# Feature branch
git checkout -b feature/web-learner-focus-tools

# Bug fix
git checkout -b fix/focus-timer-not-starting

# Hotfix
git checkout -b hotfix/critical-auth-bug
```

### Commit Messages

```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(web-learner): add focus tools page"
git commit -m "fix(focus): fix timer not starting"
git commit -m "test(focus): add unit tests for FocusTimer component"
git commit -m "docs(focus): update API documentation"
```

**Types:** feat, fix, docs, style, refactor, test, chore

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing Done
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual testing complete

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added and passing
- [ ] Accessibility tested
```

---

## Performance Tips

### Web

- Use `React.memo()` for expensive components
- Implement pagination for large lists
- Use `useMemo()` and `useCallback()` hooks
- Lazy load routes with `next/dynamic`
- Optimize images with `next/image`

### Mobile

- Use `const` constructors where possible
- Implement `ListView.builder` for long lists
- Use `cached_network_image` for images
- Minimize rebuilds with proper state management
- Profile with Flutter DevTools

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Flutter Docs](https://flutter.dev/docs)
- [Riverpod Docs](https://riverpod.dev)

### Internal
- [Design System](../libs/ui-web/README.md)
- [API Gateway](../services/api-gateway/README.md)
- [Backend Services](../services/README.md)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/) - API testing
- [Figma](https://www.figma.com/) - Design mockups
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

---

## Getting Help

**Stuck? Ask for help!**

- Slack: `#frontend-dev` or `#mobile-dev`
- Documentation: `docs/` folder
- Code reviews: Create draft PR and ask for feedback
- Pair programming: Schedule session with senior dev

---

**Last Updated:** January 16, 2026  
**Maintained By:** Engineering Team  
**Questions?** Post in #frontend-dev or #mobile-dev
