import { FastifyInstance } from 'fastify';
import * as orchestratorService from '../services/orchestratorService.js';

export default async function routes(app: FastifyInstance) {
  // Workflow Management
  app.post('/workflows', async (request, reply) => {
    const data = request.body as any;
    const workflow = await orchestratorService.createWorkflow(request.tenantId!, {
      ...data,
      createdBy: request.user!.sub,
    });
    return reply.status(201).send(workflow);
  });

  app.get('/workflows', async (request) => {
    const { status, category, tags } = request.query as any;
    return orchestratorService.listWorkflows(request.tenantId!, {
      status,
      category,
      tags: tags ? tags.split(',') : undefined,
    });
  });

  app.get('/workflows/:workflowId', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const workflow = await orchestratorService.getWorkflow(request.tenantId!, workflowId);
    if (!workflow) return reply.notFound('Workflow not found');
    return workflow;
  });

  app.patch('/workflows/:workflowId', async (request) => {
    const { workflowId } = request.params as { workflowId: string };
    const data = request.body as any;
    return orchestratorService.updateWorkflow(request.tenantId!, workflowId, {
      ...data,
      updatedBy: request.user!.sub,
    });
  });

  app.post('/workflows/:workflowId/publish', async (request) => {
    const { workflowId } = request.params as { workflowId: string };
    return orchestratorService.publishWorkflow(request.tenantId!, workflowId, request.user!.sub);
  });

  app.delete('/workflows/:workflowId', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    await orchestratorService.deleteWorkflow(request.tenantId!, workflowId);
    return reply.status(204).send();
  });

  // Step Management
  app.post('/workflows/:workflowId/steps', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const data = request.body as any;
    const step = await orchestratorService.addStep(request.tenantId!, workflowId, data);
    return reply.status(201).send(step);
  });

  app.patch('/steps/:stepId', async (request) => {
    const { stepId } = request.params as { stepId: string };
    const data = request.body as any;
    return orchestratorService.updateStep(request.tenantId!, stepId, data);
  });

  app.delete('/steps/:stepId', async (request, reply) => {
    const { stepId } = request.params as { stepId: string };
    await orchestratorService.deleteStep(request.tenantId!, stepId);
    return reply.status(204).send();
  });

  app.put('/workflows/:workflowId/steps/reorder', async (request) => {
    const { workflowId } = request.params as { workflowId: string };
    const { stepOrders } = request.body as { stepOrders: Array<{ id: string; order: number }> };
    return orchestratorService.reorderSteps(request.tenantId!, workflowId, stepOrders);
  });

  // Trigger Management
  app.post('/workflows/:workflowId/triggers', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const data = request.body as any;
    const trigger = await orchestratorService.addTrigger(request.tenantId!, workflowId, data);
    return reply.status(201).send(trigger);
  });

  app.delete('/triggers/:triggerId', async (request, reply) => {
    const { triggerId } = request.params as { triggerId: string };
    await orchestratorService.removeTrigger(request.tenantId!, triggerId);
    return reply.status(204).send();
  });

  // Execution Management
  app.post('/workflows/:workflowId/execute', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const data = request.body as any;
    const execution = await orchestratorService.startExecution(request.tenantId!, workflowId, {
      triggeredBy: request.user!.sub,
      triggerType: 'API',
      input: data.input,
      correlationId: data.correlationId,
      priority: data.priority,
    });
    return reply.status(201).send(execution);
  });

  app.get('/executions', async (request) => {
    const { workflowId, status, startDate, endDate, limit } = request.query as any;
    return orchestratorService.listExecutions(request.tenantId!, {
      workflowId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
    });
  });

  app.get('/executions/:executionId', async (request, reply) => {
    const { executionId } = request.params as { executionId: string };
    const execution = await orchestratorService.getExecution(request.tenantId!, executionId);
    if (!execution) return reply.notFound('Execution not found');
    return execution;
  });

  app.post('/executions/:executionId/cancel', async (request) => {
    const { executionId } = request.params as { executionId: string };
    return orchestratorService.cancelExecution(request.tenantId!, executionId);
  });

  app.post('/executions/:executionId/pause', async (request) => {
    const { executionId } = request.params as { executionId: string };
    return orchestratorService.pauseExecution(request.tenantId!, executionId);
  });

  app.post('/executions/:executionId/resume', async (request) => {
    const { executionId } = request.params as { executionId: string };
    return orchestratorService.resumeExecution(request.tenantId!, executionId);
  });

  // Approval Management
  app.get('/approvals/pending', async (request) => {
    return orchestratorService.getPendingApprovals(request.tenantId!, request.user!.sub);
  });

  app.post('/approvals/:approvalId/decide', async (request) => {
    const { approvalId } = request.params as { approvalId: string };
    const { decision } = request.body as { decision: 'approved' | 'rejected' };
    return orchestratorService.handleApproval(request.tenantId!, approvalId, {
      decision,
      decidedBy: request.user!.sub,
    });
  });

  // Logs
  app.post('/executions/:executionId/logs', async (request, reply) => {
    const { executionId } = request.params as { executionId: string };
    const data = request.body as any;
    const log = await orchestratorService.addLog(request.tenantId!, executionId, data);
    return reply.status(201).send(log);
  });

  // Analytics
  app.get('/workflows/:workflowId/stats', async (request) => {
    const { workflowId } = request.params as { workflowId: string };
    const { startDate, endDate } = request.query as any;
    return orchestratorService.getWorkflowStats(
      request.tenantId!,
      workflowId,
      new Date(startDate || Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now())
    );
  });
}
