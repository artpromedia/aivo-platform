/**
 * Assessment Builder Service
 *
 * Handles creation and management of custom assessments:
 * - Create quizzes and tests
 * - Question types: MC, MS, short answer, essay, matching, fill-blank
 * - Question bank management
 * - Auto-generate assessments from question bank
 * - Rubric builder
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import type {
  CustomAssessment,
  CustomAssessmentQuestion,
  QuestionBankItem,
  AssessmentSubmission,
  GradingRubric,
  RubricCriterion,
  QuestionType
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

export interface CreateAssessmentInput {
  teacherId: string;
  tenantId: string;
  title: string;
  description?: string;
  timeLimit?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  showCorrectAnswers?: boolean;
  allowRetakes?: boolean;
  maxAttempts?: number;
  passingScore?: number;
  tags?: string[];
  subjectId?: string;
  gradeLevel?: string;
}

export interface CreateQuestionInput {
  assessmentId: string;
  type: QuestionType;
  questionText: string;
  questionMedia?: any;
  options?: any;
  correctAnswer?: any;
  acceptedAnswers?: string[];
  points?: number;
  partialCredit?: boolean;
  explanation?: string;
  hints?: string[];
  orderIndex: number;
}

export interface QuestionBankFilter {
  teacherId: string;
  tenantId: string;
  tags?: string[];
  type?: QuestionType;
  subjectId?: string;
  gradeLevel?: string;
  difficulty?: string;
}

export interface AutoGenerateInput {
  teacherId: string;
  tenantId: string;
  title: string;
  filter: QuestionBankFilter;
  questionCount: number;
  pointsPerQuestion?: number;
}

export interface CreateRubricInput {
  teacherId: string;
  tenantId: string;
  name: string;
  description?: string;
  criteria: Array<{
    name: string;
    description?: string;
    maxPoints: number;
    levels: Array<{
      points: number;
      label: string;
      description: string;
      feedback?: string;
    }>;
  }>;
}

export class AssessmentBuilderService {
  /**
   * Create a new assessment
   */
  async createAssessment(input: CreateAssessmentInput): Promise<CustomAssessment> {
    return prisma.customAssessment.create({
      data: {
        teacherId: input.teacherId,
        tenantId: input.tenantId,
        title: input.title,
        description: input.description,
        timeLimit: input.timeLimit,
        shuffleQuestions: input.shuffleQuestions ?? false,
        shuffleAnswers: input.shuffleAnswers ?? false,
        showCorrectAnswers: input.showCorrectAnswers ?? true,
        allowRetakes: input.allowRetakes ?? false,
        maxAttempts: input.maxAttempts ?? 1,
        passingScore: input.passingScore,
        tags: input.tags ?? [],
        subjectId: input.subjectId,
        gradeLevel: input.gradeLevel,
        status: 'DRAFT'
      }
    });
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(assessmentId: string): Promise<CustomAssessment | null> {
    return prisma.customAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
  }

  /**
   * Update assessment
   */
  async updateAssessment(
    assessmentId: string,
    updates: Partial<CustomAssessment>
  ): Promise<CustomAssessment> {
    return prisma.customAssessment.update({
      where: { id: assessmentId },
      data: updates
    });
  }

  /**
   * Publish assessment
   */
  async publishAssessment(assessmentId: string): Promise<CustomAssessment> {
    return prisma.customAssessment.update({
      where: { id: assessmentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    await prisma.customAssessment.delete({
      where: { id: assessmentId }
    });
  }

  /**
   * Add question to assessment
   */
  async addQuestion(input: CreateQuestionInput): Promise<CustomAssessmentQuestion> {
    return prisma.customAssessmentQuestion.create({
      data: {
        assessmentId: input.assessmentId,
        type: input.type,
        questionText: input.questionText,
        questionMedia: input.questionMedia,
        options: input.options,
        correctAnswer: input.correctAnswer,
        acceptedAnswers: input.acceptedAnswers ?? [],
        points: input.points ?? 1,
        partialCredit: input.partialCredit ?? false,
        explanation: input.explanation,
        hints: input.hints ?? [],
        orderIndex: input.orderIndex
      }
    });
  }

  /**
   * Update question
   */
  async updateQuestion(
    questionId: string,
    updates: Partial<CustomAssessmentQuestion>
  ): Promise<CustomAssessmentQuestion> {
    return prisma.customAssessmentQuestion.update({
      where: { id: questionId },
      data: updates
    });
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    await prisma.customAssessmentQuestion.delete({
      where: { id: questionId }
    });
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(
    questions: Array<{ id: string; orderIndex: number }>
  ): Promise<void> {
    await prisma.$transaction(
      questions.map(q =>
        prisma.customAssessmentQuestion.update({
          where: { id: q.id },
          data: { orderIndex: q.orderIndex }
        })
      )
    );
  }

  /**
   * Add question to question bank
   */
  async addToQuestionBank(
    input: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt' | 'timesUsed' | 'averageScore'>
  ): Promise<QuestionBankItem> {
    return prisma.questionBankItem.create({
      data: {
        teacherId: input.teacherId,
        tenantId: input.tenantId,
        type: input.type,
        questionText: input.questionText,
        questionMedia: input.questionMedia,
        options: input.options,
        correctAnswer: input.correctAnswer,
        acceptedAnswers: input.acceptedAnswers ?? [],
        tags: input.tags ?? [],
        subjectId: input.subjectId,
        gradeLevel: input.gradeLevel,
        difficulty: input.difficulty,
        isShared: input.isShared ?? false,
        sharedWith: input.sharedWith ?? []
      }
    });
  }

  /**
   * Browse question bank
   */
  async browseQuestionBank(filter: QuestionBankFilter): Promise<QuestionBankItem[]> {
    const where: any = {
      OR: [
        { teacherId: filter.teacherId },
        { isShared: true, sharedWith: { has: filter.teacherId } }
      ],
      tenantId: filter.tenantId
    };

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }

    if (filter.subjectId) {
      where.subjectId = filter.subjectId;
    }

    if (filter.gradeLevel) {
      where.gradeLevel = filter.gradeLevel;
    }

    if (filter.difficulty) {
      where.difficulty = filter.difficulty;
    }

    return prisma.questionBankItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Auto-generate assessment from question bank
   */
  async autoGenerateAssessment(input: AutoGenerateInput): Promise<CustomAssessment> {
    // Get questions from bank
    const questions = await this.browseQuestionBank(input.filter);

    if (questions.length < input.questionCount) {
      throw new Error(
        `Not enough questions in bank. Found ${questions.length}, need ${input.questionCount}`
      );
    }

    // Randomly select questions
    const selectedQuestions = this.shuffleArray(questions).slice(0, input.questionCount);

    // Create assessment
    const assessment = await this.createAssessment({
      teacherId: input.teacherId,
      tenantId: input.tenantId,
      title: input.title,
      shuffleQuestions: true,
      shuffleAnswers: true
    });

    // Add questions
    await Promise.all(
      selectedQuestions.map((q, index) =>
        this.addQuestion({
          assessmentId: assessment.id,
          type: q.type,
          questionText: q.questionText,
          questionMedia: q.questionMedia,
          options: q.options,
          correctAnswer: q.correctAnswer,
          acceptedAnswers: q.acceptedAnswers,
          points: input.pointsPerQuestion ?? 1,
          orderIndex: index
        })
      )
    );

    // Update usage stats
    await Promise.all(
      selectedQuestions.map(q =>
        prisma.questionBankItem.update({
          where: { id: q.id },
          data: { timesUsed: { increment: 1 } }
        })
      )
    );

    return this.getAssessment(assessment.id) as Promise<CustomAssessment>;
  }

  /**
   * Import questions from another assessment
   */
  async importQuestions(
    targetAssessmentId: string,
    sourceAssessmentId: string
  ): Promise<CustomAssessmentQuestion[]> {
    const sourceQuestions = await prisma.customAssessmentQuestion.findMany({
      where: { assessmentId: sourceAssessmentId },
      orderBy: { orderIndex: 'asc' }
    });

    // Get current max order index in target
    const maxOrder = await prisma.customAssessmentQuestion.findFirst({
      where: { assessmentId: targetAssessmentId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true }
    });

    const startIndex = (maxOrder?.orderIndex ?? -1) + 1;

    return Promise.all(
      sourceQuestions.map((q, index) =>
        this.addQuestion({
          assessmentId: targetAssessmentId,
          type: q.type,
          questionText: q.questionText,
          questionMedia: q.questionMedia,
          options: q.options,
          correctAnswer: q.correctAnswer,
          acceptedAnswers: q.acceptedAnswers,
          points: q.points,
          partialCredit: q.partialCredit,
          explanation: q.explanation,
          hints: q.hints,
          orderIndex: startIndex + index
        })
      )
    );
  }

  /**
   * Get assessment submissions
   */
  async getSubmissions(assessmentId: string): Promise<AssessmentSubmission[]> {
    return prisma.assessmentSubmission.findMany({
      where: { assessmentId },
      orderBy: { submittedAt: 'desc' }
    });
  }

  /**
   * Grade assessment submission
   */
  async gradeSubmission(
    submissionId: string,
    gradedBy: string,
    feedback?: string
  ): Promise<AssessmentSubmission> {
    const submission = await prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Auto-grade objective questions
    let totalScore = 0;
    let maxScore = 0;
    const answers = submission.answers as Record<string, any>;

    for (const question of submission.assessment.questions) {
      maxScore += question.points;

      const answer = answers[question.id];
      if (!answer) continue;

      const isCorrect = this.checkAnswer(question, answer);
      if (isCorrect) {
        totalScore += question.points;
      } else if (question.partialCredit) {
        // Calculate partial credit (simplified)
        totalScore += question.points * 0.5;
      }
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = submission.assessment.passingScore
      ? percentage >= submission.assessment.passingScore
      : null;

    return prisma.assessmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: totalScore,
        maxScore,
        percentage,
        passed,
        status: 'graded',
        gradedBy,
        gradedAt: new Date(),
        feedback
      }
    });
  }

  /**
   * Create rubric
   */
  async createRubric(input: CreateRubricInput): Promise<GradingRubric> {
    const maxPoints = input.criteria.reduce((sum, c) => sum + c.maxPoints, 0);

    return prisma.gradingRubric.create({
      data: {
        teacherId: input.teacherId,
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        maxPoints,
        criteria: {
          create: input.criteria.map((criterion, index) => ({
            name: criterion.name,
            description: criterion.description,
            maxPoints: criterion.maxPoints,
            orderIndex: index,
            levels: criterion.levels
          }))
        }
      },
      include: {
        criteria: true
      }
    });
  }

  /**
   * Get rubric
   */
  async getRubric(rubricId: string): Promise<GradingRubric | null> {
    return prisma.gradingRubric.findUnique({
      where: { id: rubricId },
      include: {
        criteria: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
  }

  /**
   * List rubrics
   */
  async listRubrics(teacherId: string, tenantId: string): Promise<GradingRubric[]> {
    return prisma.gradingRubric.findMany({
      where: {
        OR: [{ teacherId }, { isShared: true }],
        tenantId
      },
      include: {
        criteria: {
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Helper: Check if answer is correct
   */
  private checkAnswer(question: CustomAssessmentQuestion, answer: any): boolean {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
      case 'TRUE_FALSE':
        return answer === question.correctAnswer;

      case 'MULTIPLE_SELECT': {
        const correct = question.correctAnswer as string[];
        const selected = answer as string[];
        return (
          correct.length === selected.length &&
          correct.every(c => selected.includes(c))
        );
      }

      case 'SHORT_ANSWER': {
        const answerStr = (answer as string).toLowerCase().trim();
        return question.acceptedAnswers.some(
          a => a.toLowerCase().trim() === answerStr
        );
      }

      case 'FILL_BLANK': {
        // Simplified - check if all blanks are filled correctly
        const answers = answer as string[];
        const acceptedAnswers = question.acceptedAnswers;
        return answers.every((a, i) =>
          acceptedAnswers[i]?.toLowerCase().includes(a.toLowerCase())
        );
      }

      case 'MATCHING': {
        const userMatches = answer as Record<string, string>;
        const correctMatches = question.correctAnswer as Record<string, string>;
        return Object.keys(correctMatches).every(
          key => userMatches[key] === correctMatches[key]
        );
      }

      case 'ORDERING': {
        const userOrder = answer as string[];
        const correctOrder = question.correctAnswer as string[];
        return (
          userOrder.length === correctOrder.length &&
          userOrder.every((item, index) => item === correctOrder[index])
        );
      }

      case 'NUMERIC': {
        const numAnswer = parseFloat(answer);
        const correctAnswer = parseFloat(question.correctAnswer as string);
        // Allow small tolerance
        return Math.abs(numAnswer - correctAnswer) < 0.01;
      }

      default:
        return false;
    }
  }

  /**
   * Helper: Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const assessmentBuilderService = new AssessmentBuilderService();
