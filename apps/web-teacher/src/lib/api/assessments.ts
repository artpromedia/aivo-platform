/**
 * Assessment API Service
 *
 * API endpoints for assessment management including CRUD operations,
 * assignment to classes, and grading operations
 */

import type {
  Assessment,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssignAssessmentDto,
  AssessmentAssignment,
  AssessmentSubmission,
  GradeSubmissionDto,
  QuestionBankItem,
  QuestionBankFilter,
} from '../types';

import { api } from './client';

export const assessmentsApi = {
  // ══════════════════════════════════════════════════════════════════════════
  // ASSESSMENT CRUD
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all assessments for the current teacher
   */
  async getAll(params?: { subject?: string; gradeLevel?: string; type?: string; status?: string }) {
    return api.get<Assessment[]>('/assessments', params);
  },

  /**
   * Get a single assessment by ID
   */
  async getById(id: string) {
    return api.get<Assessment>(`/assessments/${id}`);
  },

  /**
   * Create a new assessment
   */
  async create(data: CreateAssessmentDto) {
    return api.post<Assessment>('/assessments', data);
  },

  /**
   * Update an existing assessment
   */
  async update(id: string, data: Partial<UpdateAssessmentDto>) {
    return api.patch<Assessment>(`/assessments/${id}`, data);
  },

  /**
   * Delete an assessment
   */
  async delete(id: string) {
    return api.delete<Record<string, never>>(`/assessments/${id}`);
  },

  /**
   * Publish an assessment (change status to published)
   */
  async publish(id: string) {
    return api.post<Assessment>(`/assessments/${id}/publish`);
  },

  /**
   * Duplicate an assessment
   */
  async duplicate(id: string) {
    return api.post<Assessment>(`/assessments/${id}/duplicate`);
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ASSIGNMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Assign assessment to a class
   */
  async assignToClass(data: AssignAssessmentDto) {
    return api.post<AssessmentAssignment>('/assessments/assign', data);
  },

  /**
   * Get all assignments for an assessment
   */
  async getAssignments(assessmentId: string) {
    return api.get<AssessmentAssignment[]>(`/assessments/${assessmentId}/assignments`);
  },

  /**
   * Update an assignment
   */
  async updateAssignment(
    assessmentId: string,
    assignmentId: string,
    data: Partial<AssignAssessmentDto>
  ) {
    return api.patch<AssessmentAssignment>(
      `/assessments/${assessmentId}/assignments/${assignmentId}`,
      data
    );
  },

  /**
   * Remove an assignment
   */
  async removeAssignment(assessmentId: string, assignmentId: string) {
    return api.delete<Record<string, never>>(
      `/assessments/${assessmentId}/assignments/${assignmentId}`
    );
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS & GRADING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all submissions for an assessment assignment
   */
  async getSubmissions(assessmentId: string, assignmentId?: string) {
    const params = assignmentId ? { assignmentId } : undefined;
    return api.get<AssessmentSubmission[]>(`/assessments/${assessmentId}/submissions`, params);
  },

  /**
   * Get a single submission
   */
  async getSubmission(assessmentId: string, submissionId: string) {
    return api.get<AssessmentSubmission>(
      `/assessments/${assessmentId}/submissions/${submissionId}`
    );
  },

  /**
   * Grade a submission manually
   */
  async gradeSubmission(assessmentId: string, data: GradeSubmissionDto) {
    return api.post<AssessmentSubmission>(`/assessments/${assessmentId}/grade`, data);
  },

  /**
   * Trigger auto-grading for a submission
   */
  async autoGrade(assessmentId: string, submissionId: string) {
    return api.post<AssessmentSubmission>(
      `/assessments/${assessmentId}/submissions/${submissionId}/auto-grade`
    );
  },

  /**
   * Bulk auto-grade all submissions for an assignment
   */
  async bulkAutoGrade(assessmentId: string, assignmentId: string) {
    return api.post<{ processed: number; failed: number }>(
      `/assessments/${assessmentId}/assignments/${assignmentId}/auto-grade`
    );
  },

  // ══════════════════════════════════════════════════════════════════════════
  // QUESTION BANK
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Search the question bank
   */
  async searchQuestionBank(filter: QuestionBankFilter) {
    return api.get<QuestionBankItem[]>(
      '/assessments/question-bank',
      filter as unknown as Record<string, unknown>
    );
  },

  /**
   * Add a question to the question bank
   */
  async addToQuestionBank(question: Omit<QuestionBankItem, 'id' | 'usageCount' | 'createdAt'>) {
    return api.post<QuestionBankItem>('/assessments/question-bank', question);
  },

  /**
   * Get popular questions by subject
   */
  async getPopularQuestions(subject: string, gradeLevel: string, limit = 10) {
    return api.get<QuestionBankItem[]>('/assessments/question-bank/popular', {
      subject,
      gradeLevel,
      limit,
    });
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get assessment analytics
   */
  async getAnalytics(assessmentId: string, assignmentId?: string) {
    return api.get<{
      totalSubmissions: number;
      averageScore: number;
      scoreDistribution: { range: string; count: number }[];
      questionAnalytics: {
        questionId: string;
        averageScore: number;
        correctRate: number;
        averageTimeSpent: number;
      }[];
      completionRate: number;
    }>(`/assessments/${assessmentId}/analytics`, assignmentId ? { assignmentId } : undefined);
  },
};
