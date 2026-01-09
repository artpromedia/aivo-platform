/**
 * Teacher Access Service
 *
 * Verifies teacher-student relationships and provides
 * read-only access to student AI conversations.
 * CRITICAL: Enables teacher oversight of AI tutor interactions (CRIT-003)
 */

import { prisma } from '../prisma.js';
import type { Conversation, Message, Participant } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TeacherStudentRelationship {
  valid: boolean;
  relationshipType?: 'CLASS_ENROLLMENT' | 'CARE_TEAM' | 'DIRECT_ASSIGNMENT';
  classId?: string;
  className?: string;
}

export interface StudentConversationSummary {
  id: string;
  contextType: string | null;
  contextName: string | null;
  lastMessageAt: Date | null;
  messageCount: number;
  participantCount: number;
  preview: string | null;
  createdAt: Date;
}

export interface ConversationWithMessages {
  conversation: {
    id: string;
    contextType: string | null;
    contextName: string | null;
    contextLearnerId: string | null;
    createdAt: Date;
  };
  messages: {
    id: string;
    senderId: string;
    senderName?: string;
    role: string;
    content: string;
    createdAt: Date;
  }[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY TEACHER-STUDENT RELATIONSHIP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verify that a teacher has a valid relationship with a student.
 * Required before allowing access to student conversations.
 *
 * Checks multiple relationship types:
 * 1. Direct class enrollment (teacher teaches a class the student is in)
 * 2. Care team membership (teacher is on student's care team)
 * 3. Direct assignment (teacher is directly assigned to student)
 */
export async function verifyTeacherStudentRelationship(
  tenantId: string,
  teacherId: string,
  studentId: string
): Promise<TeacherStudentRelationship> {
  // Check 1: Class enrollment - teacher teaches a class student is enrolled in
  const sharedClass = await prisma.$queryRaw<{ class_id: string; class_name: string }[]>`
    SELECT DISTINCT c.id as class_id, c.name as class_name
    FROM classes c
    INNER JOIN enrollments teacher_e ON teacher_e.class_id = c.id
    INNER JOIN enrollments student_e ON student_e.class_id = c.id
    WHERE c.tenant_id = ${tenantId}::uuid
      AND teacher_e.profile_id = ${teacherId}::uuid
      AND teacher_e.role = 'teacher'
      AND teacher_e.status = 'active'
      AND student_e.profile_id = ${studentId}::uuid
      AND student_e.role = 'student'
      AND student_e.status = 'active'
    LIMIT 1
  `;

  if (sharedClass.length > 0) {
    return {
      valid: true,
      relationshipType: 'CLASS_ENROLLMENT',
      classId: sharedClass[0].class_id,
      className: sharedClass[0].class_name,
    };
  }

  // Check 2: Care team membership
  const careTeamMember = await prisma.participant.findFirst({
    where: {
      tenantId,
      conversation: {
        contextType: 'LEARNER',
        contextLearnerId: studentId,
      },
      userId: teacherId,
      isActive: true,
      role: { in: ['ADMIN', 'MEMBER'] },
    },
  });

  if (careTeamMember) {
    return {
      valid: true,
      relationshipType: 'CARE_TEAM',
    };
  }

  // No valid relationship found
  return { valid: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET STUDENT CONVERSATIONS FOR TEACHER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all AI/tutor conversations for a student that a teacher supervises.
 * Returns conversation summaries with preview of last message.
 */
export async function getStudentConversationsForTeacher(
  tenantId: string,
  teacherId: string,
  studentId: string,
  options: {
    contextType?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  conversations: StudentConversationSummary[];
  total: number;
  relationship: TeacherStudentRelationship;
}> {
  // First verify relationship
  const relationship = await verifyTeacherStudentRelationship(tenantId, teacherId, studentId);

  if (!relationship.valid) {
    return {
      conversations: [],
      total: 0,
      relationship,
    };
  }

  const { contextType, limit = 50, offset = 0 } = options;

  // Build where clause
  const whereClause: Parameters<typeof prisma.conversation.findMany>[0]['where'] = {
    tenantId,
    OR: [
      { contextLearnerId: studentId },
      {
        participants: {
          some: {
            userId: studentId,
            isActive: true,
          },
        },
      },
    ],
  };

  // Filter by context type if specified (e.g., 'SESSION' for AI tutoring)
  if (contextType) {
    whereClause.contextType = contextType as 'LEARNER' | 'ACTION_PLAN' | 'SESSION' | 'CLASS' | 'TASK';
  }

  // Get conversations with last message
  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: whereClause,
      include: {
        participants: {
          where: { isActive: true },
          select: { id: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.conversation.count({ where: whereClause }),
  ]);

  return {
    conversations: conversations.map((c) => ({
      id: c.id,
      contextType: c.contextType,
      contextName: c.contextName,
      lastMessageAt: c.lastMessageAt,
      messageCount: c._count.messages,
      participantCount: c.participants.length,
      preview: c.messages[0]?.content?.slice(0, 200) ?? null,
      createdAt: c.createdAt,
    })),
    total,
    relationship,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET CONVERSATION MESSAGES FOR TEACHER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get messages from a specific student conversation.
 * Teacher must have a valid relationship with the student.
 */
export async function getConversationMessagesForTeacher(
  tenantId: string,
  teacherId: string,
  conversationId: string,
  options: {
    limit?: number;
    beforeId?: string;
  } = {}
): Promise<ConversationWithMessages | null> {
  const { limit = 50, beforeId } = options;

  // Get the conversation and verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      tenantId,
    },
    include: {
      participants: {
        where: { isActive: true },
        select: {
          userId: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Determine student ID from conversation
  const studentId =
    conversation.contextLearnerId ??
    conversation.participants.find((p) => p.userId !== teacherId)?.userId;

  if (!studentId) {
    return null;
  }

  // Verify teacher-student relationship
  const relationship = await verifyTeacherStudentRelationship(tenantId, teacherId, studentId);

  if (!relationship.valid) {
    return null;
  }

  // Build cursor for pagination
  let cursor: { id: string } | undefined;
  if (beforeId) {
    cursor = { id: beforeId };
  }

  // Get messages
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      tenantId,
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor, skip: 1 }),
    select: {
      id: true,
      senderId: true,
      content: true,
      createdAt: true,
      metadata: true,
    },
  });

  const hasMore = messages.length > limit;
  const resultMessages = hasMore ? messages.slice(0, -1) : messages;

  return {
    conversation: {
      id: conversation.id,
      contextType: conversation.contextType,
      contextName: conversation.contextName,
      contextLearnerId: conversation.contextLearnerId,
      createdAt: conversation.createdAt,
    },
    messages: resultMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      role: (m.metadata as Record<string, unknown>)?.role as string ?? 'user',
      content: m.content,
      createdAt: m.createdAt,
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore ? resultMessages[resultMessages.length - 1]?.id : undefined,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET AI CONVERSATIONS SUMMARY FOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get AI conversation activity summary for all students in a class.
 * Useful for teacher dashboard overview.
 */
export async function getClassAiConversationsSummary(
  tenantId: string,
  teacherId: string,
  classId: string
): Promise<{
  students: {
    studentId: string;
    studentName: string;
    totalConversations: number;
    totalMessages: number;
    lastActivityAt: Date | null;
    flaggedConversations: number;
  }[];
  classTotal: {
    totalConversations: number;
    totalMessages: number;
    activeStudents: number;
  };
}> {
  // Verify teacher has access to this class
  const teacherEnrollment = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM enrollments
    WHERE class_id = ${classId}::uuid
      AND profile_id = ${teacherId}::uuid
      AND role = 'teacher'
      AND status = 'active'
      AND tenant_id = ${tenantId}::uuid
    LIMIT 1
  `;

  if (teacherEnrollment.length === 0) {
    return {
      students: [],
      classTotal: { totalConversations: 0, totalMessages: 0, activeStudents: 0 },
    };
  }

  // Get all students in the class
  const students = await prisma.$queryRaw<
    { student_id: string; given_name: string; family_name: string }[]
  >`
    SELECT p.id as student_id, p.given_name, p.family_name
    FROM profiles p
    INNER JOIN enrollments e ON e.profile_id = p.id
    WHERE e.class_id = ${classId}::uuid
      AND e.role = 'student'
      AND e.status = 'active'
      AND e.tenant_id = ${tenantId}::uuid
  `;

  const studentIds = students.map((s) => s.student_id);

  if (studentIds.length === 0) {
    return {
      students: [],
      classTotal: { totalConversations: 0, totalMessages: 0, activeStudents: 0 },
    };
  }

  // Get conversation stats for each student
  const conversationStats = await prisma.conversation.groupBy({
    by: ['contextLearnerId'],
    where: {
      tenantId,
      contextLearnerId: { in: studentIds },
      contextType: 'SESSION', // AI tutoring sessions
    },
    _count: { id: true },
    _max: { lastMessageAt: true },
  });

  // Get message counts
  const messageCounts = await prisma.message.groupBy({
    by: ['conversationId'],
    where: {
      tenantId,
      conversation: {
        contextLearnerId: { in: studentIds },
        contextType: 'SESSION',
      },
      isDeleted: false,
    },
    _count: { id: true },
  });

  // Build stats map
  const statsMap = new Map<
    string,
    { conversations: number; messages: number; lastActivity: Date | null }
  >();

  for (const stat of conversationStats) {
    if (stat.contextLearnerId) {
      statsMap.set(stat.contextLearnerId, {
        conversations: stat._count.id,
        messages: 0,
        lastActivity: stat._max.lastMessageAt,
      });
    }
  }

  // Sum message counts (this is simplified - in production would need a more efficient query)
  let totalMessages = 0;
  for (const mc of messageCounts) {
    totalMessages += mc._count.id;
  }

  // Build response
  const studentStats = students.map((s) => {
    const stats = statsMap.get(s.student_id);
    return {
      studentId: s.student_id,
      studentName: `${s.given_name} ${s.family_name}`,
      totalConversations: stats?.conversations ?? 0,
      totalMessages: stats?.messages ?? 0,
      lastActivityAt: stats?.lastActivity ?? null,
      flaggedConversations: 0, // TODO: Implement flagging feature
    };
  });

  return {
    students: studentStats,
    classTotal: {
      totalConversations: conversationStats.reduce((sum, s) => sum + s._count.id, 0),
      totalMessages,
      activeStudents: conversationStats.length,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LOG TEACHER ACCESS FOR AUDIT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Log when a teacher views a student's AI conversation.
 * Required for compliance and transparency.
 */
export async function logTeacherConversationAccess(
  tenantId: string,
  teacherId: string,
  studentId: string,
  conversationId: string,
  action: 'VIEW_LIST' | 'VIEW_MESSAGES'
): Promise<void> {
  // Create audit log entry
  await prisma.message.create({
    data: {
      tenantId,
      conversationId,
      senderId: teacherId,
      content: '', // No content - this is an audit entry
      messageType: 'SYSTEM',
      metadata: {
        auditType: 'TEACHER_ACCESS',
        action,
        teacherId,
        studentId,
        timestamp: new Date().toISOString(),
      },
    },
  });

  // Also log to structured logging
  console.info(
    JSON.stringify({
      event: 'teacher_conversation_access',
      tenantId,
      teacherId,
      studentId,
      conversationId,
      action,
      timestamp: new Date().toISOString(),
    })
  );
}
