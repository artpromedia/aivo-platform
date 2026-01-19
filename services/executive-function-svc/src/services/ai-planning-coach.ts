/**
 * AI Planning Coach Service
 *
 * Provides AI-powered planning assistance for executive function support:
 * - Intelligent task breakdown
 * - Personalized strategy recommendations
 * - Time estimation assistance
 * - Goal decomposition
 *
 * @author AIVO Platform Team
 */

import type { EFSkill, SubtaskSuggestion } from './ef.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4010';
const AI_ORCHESTRATOR_API_KEY = process.env.AI_ORCHESTRATOR_API_KEY || '';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LearnerEFProfile {
  skillLevels: Record<EFSkill, number>;
  preferredChunkMin: number;
  needsVisualSchedule: boolean;
  needsCountdown: boolean;
  bestFocusTime?: string;
}

export interface AIBreakdownRequest {
  taskDescription: string;
  profile: LearnerEFProfile;
  maxSubtasks: number;
  context?: {
    subject?: string;
    gradeBand?: string;
    previousTasks?: string[];
  };
}

export interface AIBreakdownResponse {
  subtasks: SubtaskSuggestion[];
  totalEstimatedMin: number;
  strategies: string[];
  encouragement: string;
  timeEstimationTips?: string;
}

export interface AIStrategyRequest {
  weakSkills: EFSkill[];
  taskType?: string;
  gradeBand?: string;
  currentStruggle?: string;
}

export interface AIStrategyResponse {
  strategies: AIStrategy[];
  personalizedTip: string;
}

export interface AIStrategy {
  title: string;
  description: string;
  targetSkill: EFSkill;
  steps: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// AI ORCHESTRATOR CLIENT
// ══════════════════════════════════════════════════════════════════════════════

interface AIRequest {
  agentType: string;
  prompt: string;
  context: Record<string, unknown>;
  maxTokens?: number;
}

interface AIResponse {
  response: string;
  metadata?: Record<string, unknown>;
}

async function callAIOrchestrator(request: AIRequest): Promise<AIResponse> {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/internal/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-API-Key': AI_ORCHESTRATOR_API_KEY,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI Orchestrator error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<AIResponse>;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI PLANNING COACH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get AI-powered task breakdown with personalization based on learner's EF profile
 */
export async function getAITaskBreakdown(
  request: AIBreakdownRequest
): Promise<AIBreakdownResponse> {
  const { taskDescription, profile, maxSubtasks, context } = request;

  // Identify weak skills to address in breakdown
  const weakSkills = Object.entries(profile.skillLevels)
    .filter(([_, level]) => level < 50)
    .map(([skill]) => skill as EFSkill);

  try {
    const aiResponse = await callAIOrchestrator({
      agentType: 'EF_PLANNING_COACH',
      prompt: buildBreakdownPrompt(taskDescription, profile, maxSubtasks, weakSkills),
      context: {
        taskDescription,
        preferredChunkMin: profile.preferredChunkMin,
        weakSkills,
        subject: context?.subject,
        gradeBand: context?.gradeBand,
      },
      maxTokens: 1500,
    });

    // Parse AI response
    return parseBreakdownResponse(aiResponse.response, profile, taskDescription);
  } catch (err) {
    console.error('[AIPlanningCoach] AI breakdown failed, using enhanced heuristics:', err);

    // Fallback to enhanced heuristic breakdown
    return getEnhancedHeuristicBreakdown(taskDescription, profile, maxSubtasks, weakSkills);
  }
}

/**
 * Get AI-powered strategy recommendations
 */
export async function getAIStrategyRecommendations(
  request: AIStrategyRequest
): Promise<AIStrategyResponse> {
  try {
    const aiResponse = await callAIOrchestrator({
      agentType: 'EF_STRATEGY_COACH',
      prompt: buildStrategyPrompt(request),
      context: {
        weakSkills: request.weakSkills,
        taskType: request.taskType,
        gradeBand: request.gradeBand,
      },
      maxTokens: 1000,
    });

    return parseStrategyResponse(aiResponse.response, request.weakSkills);
  } catch (err) {
    console.error('[AIPlanningCoach] AI strategy recommendations failed:', err);

    // Fallback to predefined strategies
    return getFallbackStrategies(request.weakSkills);
  }
}

/**
 * Get AI coaching for time estimation improvement
 */
export async function getTimeEstimationCoaching(
  taskType: string,
  historicalAccuracy: number,
  recentTasks: { estimated: number; actual: number }[]
): Promise<{ tip: string; adjustmentFactor: number }> {
  // Analyze patterns in time estimation
  const avgUnderestimate =
    recentTasks.length > 0
      ? recentTasks.reduce((sum, t) => sum + (t.actual - t.estimated), 0) / recentTasks.length
      : 0;

  const adjustmentFactor = avgUnderestimate > 0 ? 1.2 : avgUnderestimate < -5 ? 0.9 : 1.0;

  let tip: string;
  if (historicalAccuracy < 50) {
    tip =
      'Your time estimates have been off lately. Try adding a buffer of 20% to your estimates.';
  } else if (historicalAccuracy < 70) {
    tip = "You're getting better at estimating! Keep tracking your actual time to improve.";
  } else {
    tip = 'Great job with time estimation! Your predictions are becoming more accurate.';
  }

  return { tip, adjustmentFactor };
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function buildBreakdownPrompt(
  task: string,
  profile: LearnerEFProfile,
  maxSubtasks: number,
  weakSkills: EFSkill[]
): string {
  const skillContext = weakSkills.length > 0
    ? `This learner needs extra support with: ${weakSkills.join(', ').toLowerCase().replace(/_/g, ' ')}.`
    : '';

  return `You are an executive function planning coach helping a student break down a task.

Task to break down: "${task}"

Student Profile:
- Preferred work chunk: ${profile.preferredChunkMin} minutes
- Needs visual schedule: ${profile.needsVisualSchedule ? 'Yes' : 'No'}
- Needs countdown timers: ${profile.needsCountdown ? 'Yes' : 'No'}
${skillContext}

Guidelines:
- Break this into ${maxSubtasks} or fewer clear, actionable steps
- Each step should take approximately ${profile.preferredChunkMin} minutes
- Use simple, encouraging language
- Include a "gather materials" step if needed
- Include a "review work" step at the end
- Be specific and concrete

Respond in JSON format:
{
  "subtasks": [
    { "title": "Step title", "description": "What to do", "estimatedMin": 15, "order": 0 }
  ],
  "strategies": ["Strategy 1", "Strategy 2"],
  "encouragement": "A brief encouraging message",
  "timeEstimationTip": "Optional tip about time"
}`;
}

function buildStrategyPrompt(request: AIStrategyRequest): string {
  return `You are an executive function coach. Recommend strategies for a student who struggles with: ${request.weakSkills.join(', ').toLowerCase().replace(/_/g, ' ')}.

${request.currentStruggle ? `Current struggle: ${request.currentStruggle}` : ''}
${request.taskType ? `Task type: ${request.taskType}` : ''}

Provide 2-3 practical strategies that can help immediately. Each strategy should:
- Be easy to implement
- Be specific and actionable
- Target the identified weak skills

Respond in JSON format:
{
  "strategies": [
    { "title": "Strategy name", "description": "Brief description", "targetSkill": "SKILL_NAME", "steps": ["Step 1", "Step 2"] }
  ],
  "personalizedTip": "A personalized tip for this learner"
}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSERS
// ══════════════════════════════════════════════════════════════════════════════

function parseBreakdownResponse(
  response: string,
  profile: LearnerEFProfile,
  originalTask: string
): AIBreakdownResponse {
  try {
    const jsonMatch = /\{[\s\S]*\}/.exec(response);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        subtasks?: {
          title?: string;
          description?: string;
          estimatedMin?: number;
          order?: number;
        }[];
        strategies?: string[];
        encouragement?: string;
        timeEstimationTip?: string;
      };

      const subtasks: SubtaskSuggestion[] = (parsed.subtasks || []).map((s, i) => ({
        title: s.title || `Step ${i + 1}`,
        description: s.description || '',
        estimatedMin: s.estimatedMin || profile.preferredChunkMin,
        order: s.order ?? i,
      }));

      return {
        subtasks,
        totalEstimatedMin: subtasks.reduce((sum, s) => sum + s.estimatedMin, 0),
        strategies: parsed.strategies || [],
        encouragement: parsed.encouragement || 'You can do this! Take it one step at a time.',
        timeEstimationTips: parsed.timeEstimationTip,
      };
    }
  } catch {
    // Fall through to enhanced heuristics
  }

  // If parsing fails, return enhanced heuristics
  return getEnhancedHeuristicBreakdown(originalTask, profile, 5, []);
}

function parseStrategyResponse(
  response: string,
  weakSkills: EFSkill[]
): AIStrategyResponse {
  try {
    const jsonMatch = /\{[\s\S]*\}/.exec(response);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        strategies?: {
          title?: string;
          description?: string;
          targetSkill?: string;
          steps?: string[];
        }[];
        personalizedTip?: string;
      };

      const strategies: AIStrategy[] = (parsed.strategies || []).map((s) => ({
        title: s.title || 'Strategy',
        description: s.description || '',
        targetSkill: (s.targetSkill as EFSkill) || weakSkills[0] || 'PLANNING',
        steps: s.steps || [],
      }));

      return {
        strategies,
        personalizedTip: parsed.personalizedTip || 'Keep trying! Small steps lead to big progress.',
      };
    }
  } catch {
    // Fall through to fallback
  }

  return getFallbackStrategies(weakSkills);
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK/ENHANCED HEURISTICS
// ══════════════════════════════════════════════════════════════════════════════

function getEnhancedHeuristicBreakdown(
  task: string,
  profile: LearnerEFProfile,
  maxSubtasks: number,
  weakSkills: EFSkill[]
): AIBreakdownResponse {
  const chunkMin = profile.preferredChunkMin;

  // Analyze task complexity
  const words = task.split(' ').length;
  const hasAction = /write|read|solve|complete|finish|create|make|do/i.test(task);
  const isHomework = /homework|assignment|project|essay|report/i.test(task);
  const isMath = /math|problem|equation|calculate/i.test(task);

  // Estimate total time based on task type
  let estimatedTotal: number;
  if (isMath) {
    estimatedTotal = Math.max(20, words * 2);
  } else if (isHomework) {
    estimatedTotal = Math.max(30, words * 3);
  } else {
    estimatedTotal = Math.max(15, words * 2);
  }

  // Calculate number of subtasks
  const numSubtasks = Math.min(maxSubtasks, Math.max(2, Math.ceil(estimatedTotal / chunkMin)));
  const subtaskTime = Math.ceil(estimatedTotal / numSubtasks);

  // Build contextual subtasks
  const subtasks: SubtaskSuggestion[] = [];

  // Always start with preparation
  subtasks.push({
    title: 'Get ready',
    description: 'Gather your materials, find a quiet spot, and take a deep breath.',
    estimatedMin: Math.min(5, chunkMin),
    order: 0,
  });

  // Add middle steps
  const middleSteps = numSubtasks - 2;
  for (let i = 0; i < middleSteps; i++) {
    const stepNum = i + 1;
    const totalMiddle = middleSteps;
    let title: string;
    let description: string;

    if (stepNum === 1) {
      title = 'Start working';
      description = `Begin the first part of: ${task.substring(0, 40)}...`;
    } else if (stepNum === totalMiddle) {
      title = 'Almost done!';
      description = 'Finish up the main work.';
    } else {
      title = `Keep going (Part ${stepNum})`;
      description = 'Continue working on your task. You\'re doing great!';
    }

    subtasks.push({
      title,
      description,
      estimatedMin: subtaskTime,
      order: i + 1,
    });
  }

  // Always end with review
  subtasks.push({
    title: 'Check your work',
    description: 'Review what you did. Does it look complete?',
    estimatedMin: Math.min(5, chunkMin),
    order: numSubtasks - 1,
  });

  // Build strategies based on weak skills
  const strategies: string[] = [];
  if (weakSkills.includes('TASK_INITIATION')) {
    strategies.push('Start with the easiest part first to build momentum');
  }
  if (weakSkills.includes('TIME_MANAGEMENT')) {
    strategies.push('Use a timer for each step');
  }
  if (weakSkills.includes('WORKING_MEMORY')) {
    strategies.push('Check off each step as you complete it');
  }
  if (strategies.length === 0) {
    strategies.push('Take a short break between steps if needed');
    strategies.push('Celebrate when you finish each step!');
  }

  return {
    subtasks,
    totalEstimatedMin: subtasks.reduce((sum, s) => sum + s.estimatedMin, 0),
    strategies,
    encouragement: getEncouragement(weakSkills),
  };
}

function getFallbackStrategies(weakSkills: EFSkill[]): AIStrategyResponse {
  const strategyMap: Record<EFSkill, AIStrategy> = {
    WORKING_MEMORY: {
      title: 'Write It Down',
      description: 'Use checklists and notes to remember important steps.',
      targetSkill: 'WORKING_MEMORY',
      steps: [
        'Keep a notepad or sticky notes nearby',
        'Write down each step before starting',
        'Check off items as you complete them',
      ],
    },
    COGNITIVE_FLEXIBILITY: {
      title: 'Plan B Thinking',
      description: 'Have a backup plan ready when things change.',
      targetSkill: 'COGNITIVE_FLEXIBILITY',
      steps: [
        "Before starting, think: 'What if this doesn't work?'",
        'Have 2-3 different approaches in mind',
        "Practice saying: 'It's okay, I can try another way'",
      ],
    },
    INHIBITORY_CONTROL: {
      title: 'Stop and Think',
      description: 'Pause before acting to make better choices.',
      targetSkill: 'INHIBITORY_CONTROL',
      steps: [
        "When you feel like rushing, say 'STOP' in your head",
        'Take 3 deep breaths',
        "Ask yourself: 'Is this the best choice right now?'",
      ],
    },
    PLANNING: {
      title: 'Chunk It Down',
      description: 'Break big tasks into smaller, manageable pieces.',
      targetSkill: 'PLANNING',
      steps: [
        'Write down the big task',
        'List 3-5 smaller steps to get there',
        'Start with just the first step',
      ],
    },
    ORGANIZATION: {
      title: 'Everything Has a Home',
      description: 'Keep your space and materials organized.',
      targetSkill: 'ORGANIZATION',
      steps: [
        'Before starting, gather all materials',
        'Put things back when you\'re done using them',
        'Use folders or containers to group similar items',
      ],
    },
    TIME_MANAGEMENT: {
      title: 'Beat the Clock',
      description: 'Use timers to stay on track.',
      targetSkill: 'TIME_MANAGEMENT',
      steps: [
        'Set a timer for each task',
        'When the timer rings, check your progress',
        'Adjust your pace if needed',
      ],
    },
    TASK_INITIATION: {
      title: 'Just Start Small',
      description: 'Beginning is often the hardest part. Start tiny!',
      targetSkill: 'TASK_INITIATION',
      steps: [
        'Commit to just 2 minutes of work',
        'Start with the easiest part',
        "Tell yourself: 'I only have to do the first step'",
      ],
    },
    EMOTIONAL_REGULATION: {
      title: 'Calm Down Corner',
      description: 'Have strategies ready when emotions run high.',
      targetSkill: 'EMOTIONAL_REGULATION',
      steps: [
        'Notice when you\'re feeling frustrated',
        'Take 5 slow, deep breaths',
        "Say: 'I can handle this. I just need a moment.'",
      ],
    },
    METACOGNITION: {
      title: 'Think About Thinking',
      description: 'Reflect on how you learn best.',
      targetSkill: 'METACOGNITION',
      steps: [
        "After finishing, ask: 'What worked well?'",
        "Ask: 'What would I do differently next time?'",
        'Write down one thing you learned about yourself',
      ],
    },
  };

  const strategies = weakSkills
    .filter((skill) => strategyMap[skill])
    .slice(0, 3)
    .map((skill) => strategyMap[skill]);

  if (strategies.length === 0) {
    strategies.push(strategyMap.PLANNING, strategyMap.TASK_INITIATION);
  }

  return {
    strategies,
    personalizedTip: 'Remember: Every expert was once a beginner. Keep practicing!',
  };
}

function getEncouragement(weakSkills: EFSkill[]): string {
  const messages = [
    'You\'ve got this! One step at a time.',
    'Breaking things down makes them easier. Great job planning!',
    'Every big achievement starts with small steps. Keep going!',
    'You\'re building great skills by planning ahead!',
    'Taking time to plan is smart work. You\'re doing great!',
  ];

  if (weakSkills.includes('TASK_INITIATION')) {
    return "Starting can be tough, but you've already begun by planning. That's huge!";
  }
  if (weakSkills.includes('EMOTIONAL_REGULATION')) {
    return "It's okay to take breaks when you need them. You're doing your best!";
  }

  return messages[Math.floor(Math.random() * messages.length)];
}
