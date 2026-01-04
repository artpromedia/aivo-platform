# Team Challenges and Cross-School Competition System

## Overview

This implementation adds a comprehensive team/guild system and competitive challenge infrastructure to the AIVO platform's gamification service. Students can form teams, compete together, and participate in various competitions across schools.

## Features Implemented

### 1. Team System (Guild System)

**Team Types:**
- **Classroom Teams**: Limited to students within a specific class
- **School Teams**: Open to all students within a school
- **Cross-School Teams**: Allow students from different schools to collaborate

**Core Functionality:**
- Create, join, and leave teams
- Team XP pooling - individual contributions aggregate to team total
- Team leveling system with slower progression than individuals
- Team member roles: Owner, Captain, Member
- Member contribution tracking (total, weekly, monthly)
- Team leaderboards (by XP, filtered by type/school/period)
- Team achievements
- Anti-abuse measures (max 5 teams per student, member limits)

### 2. Competition System

**Competition Types:**
- Individual vs Individual
- Team vs Team
- Class vs Class
- School vs School

**Competition Durations:**
- Daily
- Weekly
- Seasonal

**Competition Categories:**
- XP Earned
- Lessons Completed
- Reading Minutes
- Math Problems Solved
- Learning Streaks
- Perfect Scores

**Core Functionality:**
- Create competitions with custom rules and prizes
- Fair matching algorithm (level-based eligibility)
- Prize distribution system (XP, coins, gems, badges, titles)
- Real-time standings/leaderboards
- Join/leave competitions (leave only before start)
- Auto-finalization when competition ends
- Competition recommendations based on student level
- Anti-cheating measures (rate limiting, validation)

### 3. Anti-Cheating Measures

**Built-in Protections:**
- Maximum team memberships per student (5 teams)
- Score increment validation (suspicious activity logging)
- Level-based eligibility for competitions
- Team size limits
- Rate limiting on score updates
- Competition status validation

### 4. Positive Psychology Design

**Anxiety-Reducing Features:**
- Competitions are **optional** - students choose to participate
- No negative consequences for not joining
- Supportive team environment emphasizes collaboration
- Multiple competition types accommodate different preferences
- Fair matching ensures balanced competition
- Prize distribution rewards top performers without penalizing others

## Files Created

### Backend Services

1. **`/services/gamification-svc/src/services/team.service.ts`**
   - Team CRUD operations
   - XP contribution tracking
   - Team leveling and achievements
   - Member management

2. **`/services/gamification-svc/src/services/competition.service.ts`**
   - Competition management
   - Participant tracking
   - Score updates
   - Prize distribution
   - Eligibility checking

### API Routes

3. **`/services/gamification-svc/src/routes/team.routes.ts`**
   - POST `/api/gamification/teams` - Create team
   - GET `/api/gamification/teams/:id` - Get team details
   - POST `/api/gamification/teams/:id/join` - Join team
   - POST `/api/gamification/teams/:id/leave` - Leave team
   - GET `/api/gamification/teams/:id/members` - Get team members
   - GET `/api/gamification/teams/:id/leaderboard` - Team member rankings
   - GET `/api/gamification/teams/school/:schoolId` - List school teams
   - GET `/api/gamification/teams/my/teams` - Get user's teams

4. **`/services/gamification-svc/src/routes/competition.routes.ts`**
   - POST `/api/gamification/competitions` - Create competition
   - GET `/api/gamification/competitions` - List active competitions
   - GET `/api/gamification/competitions/:id` - Competition details
   - POST `/api/gamification/competitions/:id/join` - Join competition
   - POST `/api/gamification/competitions/:id/leave` - Leave competition
   - GET `/api/gamification/competitions/history` - Past results
   - GET `/api/gamification/competitions/recommended` - Personalized recommendations

### Database Schema

5. **`/services/gamification-svc/prisma/migrations/add_teams_competitions.sql`**
   - Team table with XP tracking and metadata
   - TeamMember table with roles and contributions
   - TeamAchievement table
   - Competition table with prizes and scheduling
   - CompetitionParticipant table with scores and ranks
   - Comprehensive indexes for performance

### Frontend Components

6. **`/libs/ui-web/src/components/gamification/TeamDashboard.tsx`**
   - Team information display
   - Member list with contributions
   - Team stats and progress
   - Top contributors showcase
   - Team achievements gallery
   - Tabbed interface (Overview, Members, Achievements)

7. **`/libs/ui-web/src/components/gamification/CompetitionCard.tsx`**
   - Competition details display
   - Real-time countdown timer
   - Standings/leaderboard
   - Prize visualization
   - Join/leave actions
   - User's current standing highlight
   - Compact and full display modes

### Mobile Components

8. **`/apps/mobile-learner/lib/features/teams/team_dashboard.dart`**
   - Flutter team dashboard widget
   - Member list with XP contributions
   - Competition standings carousel
   - Responsive mobile UI with tabs
   - Pull-to-refresh support
   - Beautiful gradient headers

## Database Schema Details

### Team Table
```sql
- id: Unique identifier
- name: Team name
- description: Team description
- type: classroom | school | cross_school
- schoolId: Associated school (nullable)
- classId: Associated class (nullable)
- avatarUrl: Team avatar image
- maxMembers: Maximum team size
- totalXp, weeklyXp, monthlyXp: XP tracking
- level: Team level
- isPublic: Public/private flag
- createdAt, createdBy: Metadata
```

### Competition Table
```sql
- id: Unique identifier
- name: Competition name
- description: Description
- type: individual | team | class | school
- duration: daily | weekly | seasonal
- category: xp_earned | lessons_completed | etc.
- startDate, endDate: Schedule
- status: upcoming | active | completed | cancelled
- minParticipants, maxParticipants: Size limits
- minLevel, maxLevel: Eligibility
- schoolId: School restriction (nullable)
- prizes: JSON array of prize tiers
- isPublic, autoJoin: Settings
```

## Integration with Existing Systems

### XP System Integration

When a student earns XP, it automatically contributes to all their teams:

```typescript
// In your existing XP award logic, add:
import { teamService } from './services/team.service';

async function awardXP(studentId: string, amount: number) {
  // Existing XP logic...
  await prisma.playerProfile.update({
    where: { studentId },
    data: { totalXp: { increment: amount } }
  });

  // NEW: Add to team XP
  await teamService.addTeamXP(studentId, amount);
}
```

### Competition Score Updates

Track student activities to update competition scores:

```typescript
import { competitionService } from './services/competition.service';

async function onLessonCompleted(studentId: string) {
  // Existing lesson logic...

  // NEW: Update competition scores
  await competitionService.updateScore(
    competitionId,
    studentId,
    1 // increment by 1 lesson
  );
}
```

### Scheduled Tasks

Add to your cron jobs:

```typescript
// Daily at midnight: Reset weekly stats (Sundays)
if (today.getDay() === 0) {
  await teamService.resetPeriodStats('weekly');
}

// Monthly reset
if (today.getDate() === 1) {
  await teamService.resetPeriodStats('monthly');
}

// Check competition status every hour
await competitionService.checkCompetitionStatus();
```

## API Usage Examples

### Creating a Team

```typescript
POST /api/gamification/teams
Headers: { "x-student-id": "student123" }
Body: {
  "name": "Math Wizards",
  "description": "We love solving problems!",
  "type": "school",
  "schoolId": "school456",
  "maxMembers": 15,
  "isPublic": true
}
```

### Joining a Team

```typescript
POST /api/gamification/teams/:teamId/join
Headers: { "x-student-id": "student123" }
```

### Creating a Competition (Teacher)

```typescript
POST /api/gamification/competitions
Headers: { "x-teacher-id": "teacher123" }
Body: {
  "name": "Weekly Reading Challenge",
  "description": "Read the most minutes this week!",
  "type": "individual",
  "duration": "weekly",
  "category": "reading_minutes",
  "startDate": "2026-01-06T00:00:00Z",
  "endDate": "2026-01-13T00:00:00Z",
  "maxParticipants": 50,
  "prizes": [
    { "rank": 1, "xp": 500, "coins": 100, "gems": 10 },
    { "rank": 2, "xp": 300, "coins": 75, "gems": 5 },
    { "rank": 3, "xp": 200, "coins": 50, "gems": 3 }
  ]
}
```

### Joining a Competition

```typescript
POST /api/gamification/competitions/:competitionId/join
Headers: { "x-student-id": "student123" }
Body: {
  "participantType": "individual"
}
```

## Setup Instructions

### 1. Run Database Migration

```bash
cd services/gamification-svc
# Run the migration SQL file
psql $DATABASE_URL -f prisma/migrations/add_teams_competitions.sql

# Or if using Prisma migrations:
# First, add the schema to schema.prisma, then:
npx prisma migrate dev --name add_teams_competitions
```

### 2. Update Prisma Schema

Add the models to your `schema.prisma` file based on the SQL migration.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Restart Services

```bash
# Restart gamification service
npm run dev
# or in production:
npm run build && npm start
```

### 5. Frontend Integration

Import and use the components:

```typescript
// React Web App
import { TeamDashboard } from '@aivo/ui-web/components/gamification/TeamDashboard';
import { CompetitionCard } from '@aivo/ui-web/components/gamification/CompetitionCard';

// Usage
<TeamDashboard
  teamId="team123"
  onLeave={() => handleLeave()}
  onInviteMember={() => handleInvite()}
/>

<CompetitionCard
  competition={competition}
  standings={standings}
  userParticipant={myParticipation}
  onJoin={() => handleJoin()}
/>
```

```dart
// Flutter Mobile App
import 'package:mobile_learner/features/teams/team_dashboard.dart';

// Usage
TeamDashboard(
  teamId: 'team123',
  onLeaveTeam: () => _handleLeave(),
  onInviteMembers: () => _handleInvite(),
)
```

## Performance Considerations

### Indexing
All necessary indexes are created by the migration:
- Team type, XP, and membership indexes
- Competition status, category, and date indexes
- Participant score indexes for fast leaderboard queries

### Caching Recommendations
Consider caching:
- Team leaderboards (refresh every 5 minutes)
- Competition standings (refresh every 1 minute for active competitions)
- Team member counts

### Optimization Tips
- Use pagination for large team lists
- Implement real-time updates via WebSockets for live competitions
- Pre-compute weekly/monthly rankings

## Security Considerations

### Authorization
- Verify student/teacher roles before allowing actions
- Team owners can manage their teams
- Only teachers/admins can create competitions
- Students can only join competitions they're eligible for

### Rate Limiting
Implement rate limiting on:
- Competition score updates (prevent spam)
- Team join/leave actions
- Team creation

### Input Validation
All inputs are validated using Zod schemas in the routes.

## Future Enhancements

Potential additions:
1. **Team Chat** - Real-time messaging within teams
2. **Team Challenges** - Teams can challenge other teams
3. **Tournament Brackets** - Single/double elimination tournaments
4. **Spectator Mode** - Watch competitions in progress
5. **Team Customization** - Custom avatars, colors, banners
6. **Achievement Badges** - Visual badges for team achievements
7. **Team Quests** - Collaborative multi-step challenges
8. **Cross-School Tournaments** - Large-scale competitions
9. **Team Rankings History** - Historical performance tracking
10. **Parent/Teacher Dashboards** - Monitor team participation

## Testing

### Manual Testing Checklist

#### Teams
- [ ] Create a classroom team
- [ ] Create a school team
- [ ] Create a cross-school team
- [ ] Join a public team
- [ ] Leave a team
- [ ] View team dashboard
- [ ] Check team XP updates when earning XP
- [ ] Verify team leaderboard rankings
- [ ] Test member role updates (owner only)
- [ ] Verify team member limits

#### Competitions
- [ ] Create individual competition
- [ ] Create team competition
- [ ] Join competition
- [ ] Leave competition (before start)
- [ ] View competition standings
- [ ] Check score updates during competition
- [ ] Verify competition auto-start
- [ ] Verify competition auto-finalization
- [ ] Check prize distribution
- [ ] View competition history

## Troubleshooting

### Common Issues

**Teams not receiving XP:**
- Verify `teamService.addTeamXP()` is called after XP awards
- Check team membership records exist
- Verify no database transaction conflicts

**Competition not auto-starting:**
- Ensure `competitionService.checkCompetitionStatus()` runs on schedule
- Check competition dates are correct
- Verify competition status is 'upcoming'

**Standings not updating:**
- Verify `competitionService.updateScore()` is called
- Check competition is in 'active' status
- Ensure participant exists in competition

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments in service files
3. Check database indexes and constraints
4. Verify API endpoint authentication

## License

Part of the AIVO platform - Internal use only.

---

**Implementation Date**: January 4, 2026
**Version**: 1.0.0
**Author**: AIVO Development Team
