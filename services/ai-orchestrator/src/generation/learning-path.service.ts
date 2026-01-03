/**
 * Learning Path Generation Service
 *
 * AI-powered learning path creation:
 * - Personalized learning sequences
 * - Skill-based progression
 * - Adaptive path adjustments
 * - Milestone tracking
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  LearningPathRequest,
  GeneratedLearningPath,
  LearningPathNode,
  PathMilestone,
  StudentPathProfile,
  DifficultyLevel,
} from './types.js';

const LEARNING_PATH_SYSTEM_PROMPT = `You are an expert curriculum designer and learning science specialist.
When creating learning paths:
- Consider prerequisite knowledge and skill dependencies
- Create logical progressions from foundational to advanced concepts
- Include variety (lessons, quizzes, projects, reviews)
- Set realistic time estimates
- Include checkpoints and milestones for motivation
- Adapt difficulty progression based on learner profile
- Ensure comprehensive coverage of target skills`;

export class LearningPathService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Generate a personalized learning path
   */
  async generateLearningPath(request: LearningPathRequest): Promise<GeneratedLearningPath> {
    const pathId = uuidv4();
    const startTime = Date.now();

    console.info('Starting learning path generation', {
      pathId,
      goal: request.goal,
      targetSkills: request.targetSkills,
    });

    try {
      incrementCounter('learning_path.started');

      const prompt = this.buildPathPrompt(request);

      const messages: LLMMessage[] = [
        { role: 'system', content: LEARNING_PATH_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.6,
        maxTokens: 3000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.userId,
          agentType: 'LESSON_PLANNER',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);
      const latencyMs = Date.now() - startTime;

      const learningPath: GeneratedLearningPath = {
        id: pathId,
        title: (parsed.title as string) ?? `Learning Path: ${request.goal}`,
        description: (parsed.description as string) ?? '',
        estimatedDuration: (parsed.estimatedDuration as string) ?? this.calculateDuration(parsed.nodes as unknown[]),
        nodes: this.parseNodes(parsed.nodes as unknown[]),
        milestones: this.parseMilestones(parsed.milestones as unknown[]),
        metadata: {
          generatedAt: new Date(),
          model: result.model,
          provider: result.provider,
          tokensUsed: result.usage.totalTokens,
          latencyMs,
          cached: result.cached,
        },
      };

      recordHistogram('learning_path.duration', latencyMs);
      incrementCounter('learning_path.success');

      console.info('Learning path generation completed', {
        pathId,
        nodeCount: learningPath.nodes.length,
        milestoneCount: learningPath.milestones.length,
      });

      return learningPath;
    } catch (error) {
      incrementCounter('learning_path.error');
      console.error('Learning path generation failed', { pathId, error });
      throw error;
    }
  }

  /**
   * Generate adaptive path based on assessment results
   */
  async generateAdaptivePath(
    assessmentResults: {
      skillId: string;
      skillName: string;
      score: number;
      maxScore: number;
    }[],
    targetLevel: DifficultyLevel,
    context: { tenantId: string; userId: string }
  ): Promise<GeneratedLearningPath> {
    // Identify skill gaps
    const skillGaps = assessmentResults
      .filter((r) => r.score / r.maxScore < 0.7)
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);

    const strongSkills = assessmentResults
      .filter((r) => r.score / r.maxScore >= 0.8)
      .map((r) => r.skillName);

    const prompt = `Create a personalized learning path based on these assessment results:

SKILL GAPS (need improvement):
${skillGaps.map((s) => `- ${s.skillName}: ${Math.round((s.score / s.maxScore) * 100)}%`).join('\n')}

STRONG SKILLS (can move quickly):
${strongSkills.length > 0 ? strongSkills.map((s) => `- ${s}`).join('\n') : '- None identified yet'}

TARGET LEVEL: ${targetLevel}

Create a learning path that:
1. Addresses skill gaps in order of priority
2. Builds on existing strengths
3. Provides extra practice for weak areas
4. Includes review checkpoints
5. Sets achievable milestones

Respond with JSON: {"title": "string", "description": "string", "estimatedDuration": "string", "nodes": [...], "milestones": [...]}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: LEARNING_PATH_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 2500,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      id: uuidv4(),
      title: (parsed.title as string) ?? 'Personalized Learning Path',
      description: (parsed.description as string) ?? '',
      estimatedDuration: (parsed.estimatedDuration as string) ?? '4 weeks',
      nodes: this.parseNodes(parsed.nodes as unknown[]),
      milestones: this.parseMilestones(parsed.milestones as unknown[]),
      metadata: {
        generatedAt: new Date(),
        model: result.model,
        provider: result.provider,
        tokensUsed: result.usage.totalTokens,
        latencyMs: result.latencyMs,
        cached: result.cached,
      },
    };
  }

  /**
   * Suggest next steps based on current progress
   */
  async suggestNextSteps(
    currentPath: GeneratedLearningPath,
    completedNodeIds: string[],
    performance: { nodeId: string; score: number }[],
    context: { tenantId: string; userId: string }
  ): Promise<{
    nextNodes: LearningPathNode[];
    recommendations: string[];
    adjustments?: Array<{ nodeId: string; reason: string; suggestion: string }>;
  }> {
    const completedNodes = currentPath.nodes.filter((n) => completedNodeIds.includes(n.id));
    const remainingNodes = currentPath.nodes.filter((n) => !completedNodeIds.includes(n.id));

    // Calculate average performance
    const avgScore =
      performance.length > 0
        ? performance.reduce((sum, p) => sum + p.score, 0) / performance.length
        : 0;

    // Identify struggling areas
    const strugglingNodes = performance.filter((p) => p.score < 70);

    const prompt = `Based on student progress, suggest next steps:

COMPLETED: ${completedNodes.length}/${currentPath.nodes.length} nodes
AVERAGE SCORE: ${Math.round(avgScore)}%
${strugglingNodes.length > 0 ? `STRUGGLING AREAS: ${strugglingNodes.length} nodes below 70%` : ''}

REMAINING NODES:
${remainingNodes.slice(0, 5).map((n) => `- ${n.title} (${n.type})`).join('\n')}

Provide:
1. Recommended next 3 nodes to tackle
2. Any adjustments needed based on performance
3. Encouragement and study tips

Respond with JSON: {"nextNodes": [...], "recommendations": [...], "adjustments": [...]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a supportive learning coach helping students progress through their learning path.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 1000,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    // Return next nodes from remaining
    const nextNodeIds = ((parsed.nextNodes as string[]) ?? []).slice(0, 3);
    const nextNodes = remainingNodes.filter(
      (n) => nextNodeIds.includes(n.id) || remainingNodes.indexOf(n) < 3
    );

    return {
      nextNodes: nextNodes.slice(0, 3),
      recommendations: (parsed.recommendations as string[]) ?? ['Keep up the great work!'],
      adjustments: parsed.adjustments as
        | Array<{ nodeId: string; reason: string; suggestion: string }>
        | undefined,
    };
  }

  /**
   * Generate prerequisite map for skills
   */
  async generatePrerequisiteMap(
    skills: Array<{ id: string; name: string; description?: string }>,
    subject: string,
    context: { tenantId: string; userId: string }
  ): Promise<
    Map<
      string,
      {
        prerequisites: string[];
        order: number;
        estimatedTime: number;
      }
    >
  > {
    const prompt = `Analyze these skills and determine the prerequisite relationships:

SUBJECT: ${subject}

SKILLS:
${skills.map((s) => `- ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ''}`).join('\n')}

For each skill, determine:
1. Which other skills are prerequisites
2. The recommended learning order (1 = first to learn)
3. Estimated time to master (in hours)

Respond with JSON: {"skills": [{"id": "string", "prerequisites": ["skillId"], "order": number, "estimatedTime": number}]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at analyzing skill dependencies and learning progressions.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.4,
      maxTokens: 1500,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    const skillsData = (parsed.skills as unknown[]) ?? [];

    const prerequisiteMap = new Map<
      string,
      { prerequisites: string[]; order: number; estimatedTime: number }
    >();

    for (const skillData of skillsData) {
      const skill = skillData as Record<string, unknown>;
      prerequisiteMap.set(skill.id as string, {
        prerequisites: (skill.prerequisites as string[]) ?? [],
        order: (skill.order as number) ?? 1,
        estimatedTime: (skill.estimatedTime as number) ?? 2,
      });
    }

    return prerequisiteMap;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private buildPathPrompt(request: LearningPathRequest): string {
    const parts: string[] = [
      `Create a comprehensive learning path to achieve this goal: "${request.goal}"`,
      '',
    ];

    if (request.targetSkills?.length) {
      parts.push('TARGET SKILLS:');
      request.targetSkills.forEach((skill) => parts.push(`- ${skill}`));
      parts.push('');
    }

    if (request.currentLevel) {
      parts.push(`CURRENT LEVEL: ${request.currentLevel}`);
    }

    if (request.timeframe) {
      parts.push(`TIMEFRAME: ${request.timeframe}`);
    }

    if (request.studentProfile) {
      parts.push('');
      parts.push('STUDENT PROFILE:');
      parts.push(`- Grade Level: ${request.studentProfile.gradeLevel}`);
      if (request.studentProfile.strengths?.length) {
        parts.push(`- Strengths: ${request.studentProfile.strengths.join(', ')}`);
      }
      if (request.studentProfile.weaknesses?.length) {
        parts.push(`- Areas for growth: ${request.studentProfile.weaknesses.join(', ')}`);
      }
      if (request.studentProfile.learningStyle) {
        parts.push(`- Learning style: ${request.studentProfile.learningStyle}`);
      }
      if (request.studentProfile.pacePreference) {
        parts.push(`- Pace preference: ${request.studentProfile.pacePreference}`);
      }
    }

    parts.push('');
    parts.push('CREATE A LEARNING PATH WITH:');
    parts.push('1. A clear, motivating title');
    parts.push('2. Brief description of what will be learned');
    parts.push('3. Estimated total duration');
    parts.push('4. 10-15 learning nodes with:');
    parts.push('   - Type (lesson, quiz, project, review, checkpoint)');
    parts.push('   - Clear title and description');
    parts.push('   - Duration in minutes');
    parts.push('   - Skills addressed');
    parts.push('   - Prerequisites (if any)');
    parts.push('5. 3-4 milestones to celebrate progress');
    parts.push('');
    parts.push(
      'Respond with JSON: {"title": "string", "description": "string", "estimatedDuration": "string", "nodes": [{"id": "string", "type": "lesson|quiz|project|review|checkpoint", "title": "string", "description": "string", "duration": number, "prerequisites": ["string"], "skills": ["string"], "order": number}], "milestones": [{"title": "string", "description": "string", "targetNode": "string", "badge": "string"}]}'
    );

    return parts.join('\n');
  }

  private parseNodes(rawNodes: unknown[]): LearningPathNode[] {
    if (!rawNodes || !Array.isArray(rawNodes)) {
      return [];
    }

    return rawNodes.map((node, index) => {
      const n = node as Record<string, unknown>;
      return {
        id: (n.id as string) ?? uuidv4(),
        type: this.validateNodeType((n.type as string) ?? 'lesson'),
        title: (n.title as string) ?? `Step ${index + 1}`,
        description: (n.description as string) ?? '',
        duration: (n.duration as number) ?? 30,
        prerequisites: (n.prerequisites as string[]) ?? [],
        skills: (n.skills as string[]) ?? [],
        order: (n.order as number) ?? index + 1,
      };
    });
  }

  private validateNodeType(
    type: string
  ): 'lesson' | 'quiz' | 'project' | 'review' | 'checkpoint' {
    const validTypes = ['lesson', 'quiz', 'project', 'review', 'checkpoint'];
    return validTypes.includes(type)
      ? (type as 'lesson' | 'quiz' | 'project' | 'review' | 'checkpoint')
      : 'lesson';
  }

  private parseMilestones(rawMilestones: unknown[]): PathMilestone[] {
    if (!rawMilestones || !Array.isArray(rawMilestones)) {
      return [];
    }

    return rawMilestones.map((milestone) => {
      const m = milestone as Record<string, unknown>;
      return {
        title: (m.title as string) ?? 'Milestone',
        description: (m.description as string) ?? '',
        targetNode: (m.targetNode as string) ?? '',
        badge: m.badge as string | undefined,
      };
    });
  }

  private calculateDuration(nodes: unknown[]): string {
    if (!nodes || !Array.isArray(nodes)) {
      return '2-4 weeks';
    }

    const totalMinutes = nodes.reduce((sum, node) => {
      const n = node as Record<string, unknown>;
      return sum + ((n.duration as number) ?? 30);
    }, 0);

    const hours = Math.ceil(totalMinutes / 60);

    if (hours <= 5) return `${hours} hours`;
    if (hours <= 20) return `${Math.ceil(hours / 5)} week${hours > 5 ? 's' : ''}`;
    return `${Math.ceil(hours / 20)} month${hours > 20 ? 's' : ''}`;
  }

  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in learning path response');
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse learning path response', { error });
      return {};
    }
  }
}
