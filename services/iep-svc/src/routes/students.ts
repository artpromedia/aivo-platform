/**
 * AIVO IEP Service - Student Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as studentService from '../services/studentService.js';

export default async function studentRoutes(fastify: FastifyInstance): Promise<void> {
  // List students
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const result = await studentService.listStudents(tenantId, request.query);
    return reply.send(result);
  });

  // Create student
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    try {
      const student = await studentService.createStudent(tenantId, request.body);
      return reply.status(201).send(student);
    } catch (error: any) {
      if (error.code === 'P2002') return reply.status(409).send({ error: 'Student ID already exists' });
      throw error;
    }
  });

  // Get student
  fastify.get('/:studentId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { studentId } = request.params as { studentId: string };
    const student = await studentService.getStudent(tenantId, studentId);
    if (!student) return reply.status(404).send({ error: 'Student not found' });
    return reply.send(student);
  });

  // Update student
  fastify.put('/:studentId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { studentId } = request.params as { studentId: string };
    try {
      const student = await studentService.updateStudent(tenantId, studentId, request.body);
      return reply.send(student);
    } catch (error: any) {
      if (error.message === 'Student not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Get team members
  fastify.get('/:studentId/team', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { studentId } = request.params as { studentId: string };
    const members = await studentService.getTeamMembers(tenantId, studentId);
    return reply.send(members);
  });

  // Add team member
  fastify.post('/:studentId/team', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { studentId } = request.params as { studentId: string };
    try {
      const member = await studentService.addTeamMember(tenantId, studentId, request.body);
      return reply.status(201).send(member);
    } catch (error: any) {
      if (error.message === 'Student not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Create evaluation
  fastify.post('/:studentId/evaluations', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { studentId } = request.params as { studentId: string };
    try {
      const evaluation = await studentService.createEvaluation(tenantId, studentId, userId, request.body);
      return reply.status(201).send(evaluation);
    } catch (error: any) {
      if (error.message === 'Student not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Update evaluation
  fastify.put('/:studentId/evaluations/:evaluationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { evaluationId } = request.params as { evaluationId: string };
    try {
      const evaluation = await studentService.updateEvaluation(tenantId, evaluationId, request.body);
      return reply.send(evaluation);
    } catch (error: any) {
      if (error.message === 'Evaluation not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });
}
