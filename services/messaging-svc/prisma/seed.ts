/**
 * AIVO Platform - Messaging Service Seed Data
 *
 * Creates:
 * - Sample conversations (direct, group, contextual)
 * - Participants
 * - Messages
 */

import { PrismaClient, ConversationType, ContextType, ParticipantRole, MessageType, MessageStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Users
const ADMIN_USER_ID = '00000000-0000-0000-1000-000000000001';
const TEACHER_USER_ID = '00000000-0000-0000-1000-000000000003';
const THERAPIST_USER_ID = '00000000-0000-0000-1000-000000000004';
const PARENT_USER_ID = '00000000-0000-0000-1000-000000000005';

// Learners
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';

// Conversations
const CONV_DIRECT_TEACHER_PARENT = '00000000-0000-0000-d000-000000000001';
const CONV_GROUP_CARE_TEAM = '00000000-0000-0000-d000-000000000002';
const CONV_THREAD_ALEX_GOAL = '00000000-0000-0000-d000-000000000003';

// Goals (from goal-svc)
const ALEX_GOAL_FRACTIONS = '00000000-0000-0000-b000-000000000001';

async function main() {
  console.log('🌱 Seeding messaging-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Conversations
  // ══════════════════════════════════════════════════════════════════════════

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // Direct conversation: Teacher <-> Parent
  await prisma.conversation.upsert({
    where: { id: CONV_DIRECT_TEACHER_PARENT },
    update: {},
    create: {
      id: CONV_DIRECT_TEACHER_PARENT,
      tenantId: DEV_TENANT_ID,
      type: ConversationType.DIRECT,
      name: null,
      description: null,
      messageCount: 4,
      lastMessageAt: tenMinutesAgo,
      lastMessagePreview: 'Sounds great, see you then!',
      createdAt: new Date('2024-01-10'),
      createdBy: TEACHER_USER_ID,
    },
  });
  console.log('  ✅ Created direct conversation: Teacher <-> Parent');

  // Group conversation: Alex's Care Team
  await prisma.conversation.upsert({
    where: { id: CONV_GROUP_CARE_TEAM },
    update: {},
    create: {
      id: CONV_GROUP_CARE_TEAM,
      tenantId: DEV_TENANT_ID,
      type: ConversationType.GROUP,
      name: "Alex's Care Team",
      description: "Coordination and updates for Alex's learning plan",
      contextType: ContextType.LEARNER,
      contextId: ALEX_USER_ID,
      contextLearnerId: ALEX_USER_ID,
      contextLearnerName: 'Alex Johnson',
      messageCount: 6,
      lastMessageAt: thirtyMinutesAgo,
      lastMessagePreview: 'Great progress on the focus goals this week!',
      createdAt: new Date('2024-01-05'),
      createdBy: TEACHER_USER_ID,
    },
  });
  console.log("  ✅ Created group conversation: Alex's Care Team");

  // Thread: Linked to Alex's math goal
  await prisma.conversation.upsert({
    where: { id: CONV_THREAD_ALEX_GOAL },
    update: {},
    create: {
      id: CONV_THREAD_ALEX_GOAL,
      tenantId: DEV_TENANT_ID,
      type: ConversationType.THREAD,
      name: 'Fraction Operations Goal',
      description: 'Discussion about Alex\'s progress on fraction mastery',
      contextType: ContextType.GOAL,
      contextId: ALEX_GOAL_FRACTIONS,
      contextName: 'Master fraction operations',
      contextLearnerId: ALEX_USER_ID,
      contextLearnerName: 'Alex Johnson',
      messageCount: 3,
      lastMessageAt: oneHourAgo,
      lastMessagePreview: 'The visual aids are really helping.',
      createdAt: new Date('2024-01-15'),
      createdBy: THERAPIST_USER_ID,
    },
  });
  console.log('  ✅ Created thread conversation: Fraction Goal');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Participants
  // ══════════════════════════════════════════════════════════════════════════

  const participants = [
    // Direct: Teacher <-> Parent
    {
      id: '00000000-0000-0000-d100-000000000001',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_DIRECT_TEACHER_PARENT,
      userId: TEACHER_USER_ID,
      role: ParticipantRole.OWNER,
      unreadCount: 0,
      lastReadAt: tenMinutesAgo,
    },
    {
      id: '00000000-0000-0000-d100-000000000002',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_DIRECT_TEACHER_PARENT,
      userId: PARENT_USER_ID,
      role: ParticipantRole.MEMBER,
      unreadCount: 1,
      lastReadAt: thirtyMinutesAgo,
    },

    // Group: Care Team (Teacher, Therapist, Parent)
    {
      id: '00000000-0000-0000-d100-000000000010',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      userId: TEACHER_USER_ID,
      role: ParticipantRole.OWNER,
      unreadCount: 0,
      lastReadAt: thirtyMinutesAgo,
    },
    {
      id: '00000000-0000-0000-d100-000000000011',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      userId: THERAPIST_USER_ID,
      role: ParticipantRole.ADMIN,
      unreadCount: 0,
      lastReadAt: thirtyMinutesAgo,
    },
    {
      id: '00000000-0000-0000-d100-000000000012',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      userId: PARENT_USER_ID,
      role: ParticipantRole.MEMBER,
      unreadCount: 2,
      lastReadAt: oneHourAgo,
    },

    // Thread: Goal discussion
    {
      id: '00000000-0000-0000-d100-000000000020',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_THREAD_ALEX_GOAL,
      userId: THERAPIST_USER_ID,
      role: ParticipantRole.OWNER,
      unreadCount: 0,
      lastReadAt: oneHourAgo,
    },
    {
      id: '00000000-0000-0000-d100-000000000021',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_THREAD_ALEX_GOAL,
      userId: TEACHER_USER_ID,
      role: ParticipantRole.MEMBER,
      unreadCount: 1,
      lastReadAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  ];

  for (const p of participants) {
    await prisma.participant.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        isActive: true,
        isMuted: false,
        isPinned: false,
        notificationsEnabled: true,
      },
    });
  }
  console.log(`  ✅ Created ${participants.length} participants`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Messages
  // ══════════════════════════════════════════════════════════════════════════

  const messages = [
    // Direct: Teacher <-> Parent
    {
      id: '00000000-0000-0000-d200-000000000001',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_DIRECT_TEACHER_PARENT,
      senderId: TEACHER_USER_ID,
      type: MessageType.TEXT,
      content: 'Hi! I wanted to share that Alex did great on today\'s math assessment.',
      status: MessageStatus.READ,
      createdAt: new Date(oneHourAgo.getTime() - 30 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000002',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_DIRECT_TEACHER_PARENT,
      senderId: PARENT_USER_ID,
      type: MessageType.TEXT,
      content: "That's wonderful news! We've been practicing at home too.",
      status: MessageStatus.READ,
      createdAt: oneHourAgo,
    },
    {
      id: '00000000-0000-0000-d200-000000000003',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_DIRECT_TEACHER_PARENT,
      senderId: TEACHER_USER_ID,
      type: MessageType.TEXT,
      content: 'The home practice is really showing. Can we schedule a call to discuss next steps?',
      status: MessageStatus.READ,
      createdAt: thirtyMinutesAgo,
    },
    {
      id: '00000000-0000-0000-d200-000000000004',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_DIRECT_TEACHER_PARENT,
      senderId: PARENT_USER_ID,
      type: MessageType.TEXT,
      content: 'Sounds great, see you then!',
      status: MessageStatus.DELIVERED,
      createdAt: tenMinutesAgo,
    },

    // Group: Care Team
    {
      id: '00000000-0000-0000-d200-000000000010',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      senderId: TEACHER_USER_ID,
      type: MessageType.TEXT,
      content: 'Team, I wanted to give an update on Alex\'s progress this week.',
      status: MessageStatus.READ,
      createdAt: new Date(thirtyMinutesAgo.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000011',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      senderId: TEACHER_USER_ID,
      type: MessageType.TEXT,
      content: 'Alex completed 8 sessions this week with an average focus time of 12 minutes - up from 8 minutes last week!',
      status: MessageStatus.READ,
      createdAt: new Date(thirtyMinutesAgo.getTime() - 115 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000012',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      senderId: THERAPIST_USER_ID,
      type: MessageType.TEXT,
      content: 'This is fantastic! The sensory breaks we added seem to be making a difference.',
      status: MessageStatus.READ,
      createdAt: new Date(thirtyMinutesAgo.getTime() - 60 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000013',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      senderId: PARENT_USER_ID,
      type: MessageType.TEXT,
      content: "We've noticed the same at home! Much less frustration during homework.",
      status: MessageStatus.READ,
      createdAt: new Date(thirtyMinutesAgo.getTime() - 45 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000014',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_GROUP_CARE_TEAM,
      senderId: THERAPIST_USER_ID,
      type: MessageType.TEXT,
      content: 'Great progress on the focus goals this week!',
      status: MessageStatus.DELIVERED,
      createdAt: thirtyMinutesAgo,
    },

    // Thread: Goal discussion
    {
      id: '00000000-0000-0000-d200-000000000020',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_THREAD_ALEX_GOAL,
      senderId: THERAPIST_USER_ID,
      type: MessageType.TEXT,
      content: "I've been working with Alex on fraction concepts using visual manipulatives.",
      status: MessageStatus.READ,
      createdAt: new Date(oneHourAgo.getTime() - 60 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000021',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_THREAD_ALEX_GOAL,
      senderId: TEACHER_USER_ID,
      type: MessageType.TEXT,
      content: "That aligns with what I'm seeing in class. The visual approach really resonates.",
      status: MessageStatus.READ,
      createdAt: new Date(oneHourAgo.getTime() - 30 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-d200-000000000022',
      tenantId: DEV_TENANT_ID,
      conversationId: CONV_THREAD_ALEX_GOAL,
      senderId: THERAPIST_USER_ID,
      type: MessageType.TEXT,
      content: 'The visual aids are really helping.',
      status: MessageStatus.SENT,
      createdAt: oneHourAgo,
    },
  ];

  for (const msg of messages) {
    await prisma.message.upsert({
      where: { id: msg.id },
      update: {},
      create: {
        ...msg,
        isEdited: false,
        isDeleted: false,
      },
    });
  }
  console.log(`  ✅ Created ${messages.length} messages`);

  console.log('');
  console.log('✅ messaging-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 conversations (direct, group, thread)');
  console.log('  - 7 participants across conversations');
  console.log('  - 12 messages demonstrating care team collaboration');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
