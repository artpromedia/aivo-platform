/**
 * TutorAgent - Specialized agent for tutoring interactions
 */

import { Agent, type AgentDependencies } from '../core/agent';
import type { AgentConfig, AgentContext, AgentOutput, AgentInput } from '../core/types';
import { AgentBuilder } from '../core/agent-builder';

export interface TutorAgentConfig extends AgentConfig {
  subject?: string;
  gradeLevel?: string;
  teachingStyle?: 'socratic' | 'direct' | 'guided' | 'adaptive';
  scaffoldingLevel?: 'minimal' | 'moderate' | 'extensive';
  paceAdjustment?: boolean;
}

export interface StudentProfile {
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing';
  priorKnowledge?: string[];
  misconceptions?: string[];
  strengths?: string[];
  areasForImprovement?: string[];
  preferredPace?: 'slow' | 'moderate' | 'fast';
}

const TUTOR_SYSTEM_PROMPT = `You are an expert educational tutor specializing in personalized instruction. Your role is to:

1. **Assess Understanding**: Start by gauging the student's current understanding of the topic.
2. **Scaffold Learning**: Break down complex concepts into manageable steps.
3. **Use Socratic Method**: Ask guiding questions rather than giving direct answers when appropriate.
4. **Provide Examples**: Use relevant, relatable examples to illustrate concepts.
5. **Check Comprehension**: Regularly verify understanding before moving on.
6. **Adapt Instruction**: Adjust your teaching based on student responses.
7. **Encourage**: Provide positive reinforcement and constructive feedback.
8. **Be Patient**: Allow time for the student to think and respond.

Teaching Guidelines:
- Start with what the student knows and build from there
- Use analogies and real-world connections
- Break problems into smaller, manageable steps
- Celebrate progress and effort, not just correct answers
- If a student is struggling, try a different approach
- End sessions with a summary of key learnings

Remember: Your goal is not just to provide answers, but to help students develop understanding and problem-solving skills.`;

export class TutorAgent extends Agent {
  private tutorConfig: TutorAgentConfig;
  private studentProfile?: StudentProfile;
  private lessonHistory: Array<{
    topic: string;
    date: Date;
    comprehensionLevel: number;
    notes: string;
  }> = [];

  constructor(config: TutorAgentConfig, dependencies: AgentDependencies) {
    super(config, dependencies);
    this.tutorConfig = config;
  }

  /**
   * Set the student profile for personalized instruction
   */
  setStudentProfile(profile: StudentProfile): void {
    this.studentProfile = profile;
  }

  /**
   * Get the current student profile
   */
  getStudentProfile(): StudentProfile | undefined {
    return this.studentProfile;
  }

  /**
   * Add a lesson to history
   */
  addLessonRecord(record: {
    topic: string;
    comprehensionLevel: number;
    notes: string;
  }): void {
    this.lessonHistory.push({
      ...record,
      date: new Date(),
    });
  }

  /**
   * Get lesson history
   */
  getLessonHistory(): typeof this.lessonHistory {
    return [...this.lessonHistory];
  }

  /**
   * Override run to inject tutor-specific context
   */
  async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    // Inject student profile and teaching context into metadata
    const enrichedContext: AgentContext = {
      ...context,
      metadata: {
        ...context.metadata,
        tutorConfig: {
          subject: this.tutorConfig.subject,
          gradeLevel: this.tutorConfig.gradeLevel,
          teachingStyle: this.tutorConfig.teachingStyle,
          scaffoldingLevel: this.tutorConfig.scaffoldingLevel,
        },
        studentProfile: this.studentProfile,
        lessonCount: this.lessonHistory.length,
      },
    };

    return super.run(input, enrichedContext);
  }

  /**
   * Lifecycle hook - on start
   */
  protected async onStart(context: AgentContext): Promise<void> {
    // Load any previous session data for this student
    const memories = await this.recall(`student:${context.userId}`, 'long-term');
    if (memories.length > 0) {
      // Restore student profile from memory
      const profileMemory = memories.find(m =>
        (m.metadata as Record<string, string>)?.type === 'student_profile'
      );
      if (profileMemory && profileMemory.content) {
        this.studentProfile = profileMemory.content as StudentProfile;
      }
    }
  }

  /**
   * Lifecycle hook - on complete
   */
  protected async onComplete(output: AgentOutput): Promise<void> {
    // Save student profile if updated
    if (this.studentProfile) {
      await this.remember(
        `student:${this.config.id}`,
        this.studentProfile,
        'long-term'
      );
    }
  }

  /**
   * Create a tutor agent with builder
   */
  static create(options: {
    name?: string;
    subject?: string;
    gradeLevel?: string;
    teachingStyle?: TutorAgentConfig['teachingStyle'];
    tools?: TutorAgentConfig['tools'];
  }): AgentBuilder {
    const systemPrompt = options.subject
      ? `${TUTOR_SYSTEM_PROMPT}\n\nSubject: ${options.subject}\nGrade Level: ${options.gradeLevel || 'Adaptive'}`
      : TUTOR_SYSTEM_PROMPT;

    return new AgentBuilder()
      .withName(options.name || 'Tutor')
      .withDescription(`Educational tutor for ${options.subject || 'general subjects'}`)
      .withSystemPrompt(systemPrompt)
      .withTools(options.tools || [])
      .withMaxIterations(20);
  }
}
