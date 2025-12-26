# Gamification Service

A comprehensive gamification system for the AIVO learning platform that motivates learners through XP, achievements, streaks, leaderboards, and challenges while maintaining focus on learning outcomes.

## Overview

The gamification service provides:

- **XP & Leveling System**: 20+ activities that award XP, 20 levels from "Novice Learner" to "Ultimate Legend"
- **Achievements**: 40+ achievements across categories (learning, streaks, social, challenges, special)
- **Streaks**: Daily streak tracking with freeze protection
- **Leaderboards**: Redis-backed real-time rankings (class, school, global)
- **Challenges**: Daily, weekly, monthly, and class-specific challenges
- **Rewards Shop**: Virtual currency system with customization items
- **Anti-Addiction**: Session tracking, break reminders, daily limits
- **Real-time Notifications**: WebSocket server for instant updates

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
cd services/gamification-svc
pnpm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/aivo_gamification"
REDIS_URL="redis://localhost:6379"
PORT=3006
```

### Database Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed initial data (optional)
pnpm prisma db seed
```

### Running the Service

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## API Reference

### Base URL

```
http://localhost:3006/api/gamification
```

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/ready` | GET | Readiness check (DB + Redis) |

### Player Profile

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profile` | GET | Get player profile |
| `/dashboard` | GET | Get full gamification dashboard |
| `/daily-progress` | GET | Get daily goals progress |
| `/xp` | POST | Award XP for activity |

### Achievements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/achievements` | GET | List all achievements |
| `/achievements/:id` | GET | Get achievement details |
| `/achievements/recent/list` | GET | Get recently earned achievements |
| `/achievements/categories/list` | GET | List achievement categories |

### Streaks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/streaks` | GET | Get current streak data |
| `/streaks/calendar` | GET | Get streak calendar |
| `/streaks/freeze` | POST | Use a streak freeze |
| `/streaks/milestones` | GET | Get streak milestones |

### Leaderboards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/leaderboard` | GET | Get leaderboard (scope, period) |
| `/leaderboard/rank` | GET | Get player's rank |
| `/leaderboard/neighbors` | GET | Get nearby players |
| `/leaderboard/top3` | GET | Get top 3 players |
| `/leaderboard/class/:classId` | GET | Get class leaderboard |

### Challenges

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/challenges` | GET | Get active challenges |
| `/challenges/daily` | GET | Get daily challenges |
| `/challenges/weekly` | GET | Get weekly challenges |
| `/challenges/monthly` | GET | Get monthly challenges |
| `/challenges/class/:classId` | GET | Get class challenges |
| `/challenges/completed` | GET | Get completed challenges |

### Shop & Inventory

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shop` | GET | Get shop items |
| `/shop/featured` | GET | Get featured items |
| `/shop/category/:category` | GET | Get items by category |
| `/shop/purchase` | POST | Purchase an item |
| `/shop/inventory` | GET | Get owned items |
| `/shop/equip` | POST | Equip an item |
| `/shop/equipped` | GET | Get equipped items |
| `/shop/balance` | GET | Get currency balance |

### Session Management (Anti-Addiction)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/session/start` | POST | Start learning session |
| `/session/end` | POST | End learning session |
| `/session/heartbeat` | POST | Session heartbeat |
| `/session/can-start` | GET | Check if session allowed |
| `/session/today-usage` | GET | Get today's usage |
| `/session/usage-stats` | GET | Get usage statistics |

## WebSocket API

Connect to `/ws/gamification` for real-time notifications.

### Events

- `xp_awarded` - XP earned
- `level_up` - Level increased
- `achievement_earned` - Achievement unlocked
- `streak_milestone` - Streak milestone reached
- `challenge_completed` - Challenge completed
- `daily_goal_completed` - Daily goal completed
- `break_reminder` - Break reminder
- `rank_change` - Leaderboard rank changed

## XP System

### Activity XP Awards

| Activity | XP |
|----------|------|
| LESSON_COMPLETE | 25 |
| QUIZ_PASS | 30 |
| QUIZ_PERFECT | 50 |
| PRACTICE_SESSION | 10 |
| HOMEWORK_SUBMIT | 20 |
| DISCUSSION_POST | 5 |
| HELP_PEER | 15 |
| DAILY_LOGIN | 5 |
| FIRST_OF_DAY | 10 |
| STREAK_MILESTONE | 25-100 |

### Streak Bonuses

| Streak Days | XP Multiplier |
|-------------|---------------|
| 3+ | 1.1x |
| 7+ | 1.25x |
| 14+ | 1.35x |
| 30+ | 1.5x |
| 60+ | 1.75x |
| 100+ | 2.0x |

### Levels

| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Novice Learner | 0 |
| 5 | Bright Mind | 1,000 |
| 10 | Scholar | 4,500 |
| 15 | Grand Scholar | 10,500 |
| 20 | Ultimate Legend | 25,000 |

## Architecture

```
gamification-svc/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── services/          # Business logic
│   │   ├── gamification.service.ts   # Core XP/leveling
│   │   ├── achievement.service.ts    # Achievements
│   │   ├── streak.service.ts         # Streak tracking
│   │   ├── leaderboard.service.ts    # Redis leaderboards
│   │   ├── challenge.service.ts      # Challenges
│   │   ├── reward.service.ts         # Shop/inventory
│   │   └── anti-addiction.service.ts # Session tracking
│   ├── routes/            # API endpoints
│   ├── events/            # Event emitter
│   ├── jobs/              # Scheduled tasks
│   ├── websocket/         # Real-time notifications
│   └── __tests__/         # Unit tests
```

## Frontend Integration

### React (web-teacher, web-learner)

```typescript
import { 
  PlayerDashboard,
  AchievementGrid,
  Leaderboard,
  StreakCalendar,
  CelebrationProvider
} from '@/components/gamification';

// Wrap your app with CelebrationProvider
<CelebrationProvider>
  <PlayerDashboard studentId={studentId} />
</CelebrationProvider>
```

### Flutter (mobile-learner)

```dart
import 'package:mobile_learner/features/gamification/gamification.dart';

// Use widgets
LevelProgressRing(
  level: profile.level,
  levelTitle: profile.levelTitle,
  currentXP: profile.currentLevelXP,
  xpToNextLevel: profile.xpToNextLevel,
)

StreakWidget(
  currentStreak: streak.currentStreak,
  longestStreak: streak.longestStreak,
  freezesAvailable: streak.freezesAvailable,
  completedToday: streak.completedToday,
)
```

## Teacher Controls

Teachers can configure gamification settings per class:

- Enable/disable features (XP, achievements, streaks, leaderboards, etc.)
- Customize leaderboard visibility
- Set XP multipliers for different activities
- Configure anti-addiction limits
- Create class-specific challenges

## Anti-Addiction Features

- **Daily Time Limits**: Configurable max daily learning time
- **Break Reminders**: Prompts after continuous usage
- **Session Cooldown**: Required breaks between sessions
- **Usage Statistics**: Track and report learning time

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test gamification.service.test.ts
```

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Streaks | 00:05 daily | Process broken streaks |
| Daily Challenges | 00:00 daily | Generate new daily challenges |
| Weekly Challenges | 00:00 Monday | Generate new weekly challenges |
| Weekly Archive | 23:59 Sunday | Archive weekly leaderboards |
| Monthly Archive | 23:59 last day | Archive monthly leaderboards |
| Booster Cleanup | Hourly | Remove expired boosters |
| Break Reminders | Every 5 min | Send break notifications |

## Performance Considerations

- **Redis Caching**: Leaderboards are stored in Redis sorted sets for O(log n) operations
- **Database Indexing**: Critical queries are indexed (studentId, date combinations)
- **Event-Driven**: XP awards trigger async achievement checks
- **WebSocket**: Reduces polling for real-time updates

## Related Documentation

- [Mobile Gamification Guide](../../docs/mobile/gamification.md)
- [Teacher Controls Guide](../../docs/teacher/gamification-controls.md)
- [API Integration Guide](../../docs/dev/gamification-api.md)
