import { FastifyInstance } from 'fastify';
import * as approvalService from '../services/approvalService.js';

export default async function routes(app: FastifyInstance) {
  // Workflow Management
  app.post('/workflows', async (request, reply) => {
    const data = request.body as any;
    const workflow = await approvalService.createWorkflow(request.tenantId!, {
      ...data,
      createdBy: request.user!.sub,
    });
    return reply.status(201).send(workflow);
  });

  app.get('/workflows', async (request) => {
    const { entityType, status } = request.query as any;
    return approvalService.listWorkflows(request.tenantId!, { entityType, status });
  });

  app.get('/workflows/:workflowId', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const workflow = await approvalService.getWorkflow(request.tenantId!, workflowId);
    if (!workflow) return reply.notFound('Workflow not found');
    return workflow;
  });

  app.patch('/workflows/:workflowId', async (request) => {
    const { workflowId } = request.params as { workflowId: string };
    const data = request.body as any;
    return approvalService.updateWorkflow(request.tenantId!, workflowId, {
      ...data,
      updatedBy: request.user!.sub,
    });
  });

  app.post('/workflows/:workflowId/activate', async (request) => {
    const { workflowId } = request.params as { workflowId: string };
    return approvalService.activateWorkflow(request.tenantId!, workflowId);
  });

  app.delete('/workflows/:workflowId', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    await approvalService.deleteWorkflow(request.tenantId!, workflowId);
    return reply.status(204).send();
  });

  // Step Management
  app.post('/workflows/:workflowId/steps', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const data = request.body as any;
    const step = await approvalService.addStep(request.tenantId!, workflowId, data);
    return reply.status(201).send(step);
  });

  app.patch('/steps/:stepId', async (request) => {
    const { stepId } = request.params as { stepId: string };
    const data = request.body as any;
    return approvalService.updateStep(request.tenantId!, stepId, data);
  });

  app.delete('/steps/:stepId', async (request, reply) => {
    const { stepId } = request.params as { stepId: string };
    await approvalService.deleteStep(request.tenantId!, stepId);
    return reply.status(204).send();
  });

  // Request Management
  app.post('/requests', async (request, reply) => {
    const data = request.body as any;
    const req = await approvalService.createRequest(request.tenantId!, {
      ...data,
      requestedBy: request.user!.sub,
    });
    return reply.status(201).send(req);
  });

  app.get('/requests', async (request) => {
    const { status, entityType, requestedBy, assignedTo, limit } = request.query as any;
    return approvalService.listRequests(request.tenantId!, {
      status,
      entityType,
      requestedBy,
      assignedTo,
      limit: limit ? Number.parseInt(limit) : 50,
    });
  });

  app.get('/requests/pending', async (request) => {
    return approvalService.getPendingForUser(request.tenantId!, request.user!.sub);
  });

  app.get('/requests/:requestId', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const req = await approvalService.getRequest(request.tenantId!, requestId);
    if (!req) return reply.notFound('Request not found');
    return req;
  });

  app.post('/requests/:requestId/decide', async (request) => {
    const { requestId } = request.params as { requestId: string };
    const data = request.body as any;
    return approvalService.makeDecision(request.tenantId!, requestId, {
      ...data,
      decidedBy: request.user!.sub,
    });
  });

  app.post('/requests/:requestId/cancel', async (request) => {
    const { requestId } = request.params as { requestId: string };
    const { reason } = request.body as { reason?: string };
    return approvalService.cancelRequest(request.tenantId!, requestId, request.user!.sub, reason);
  });

  // Comments
  app.post('/requests/:requestId/comments', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const data = request.body as any;
    const comment = await approvalService.addComment(request.tenantId!, requestId, {
      ...data,
      userId: request.user!.sub,
    });
    return reply.status(201).send(comment);
  });

  // Delegation
  app.post('/delegations', async (request, reply) => {
    const data = request.body as any;
    const delegation = await approvalService.createDelegation(request.tenantId!, {
      ...data,
      fromUserId: request.user!.sub,
    });
    return reply.status(201).send(delegation);
  });

  app.get('/delegations', async (request) => {
    return approvalService.getDelegations(request.tenantId!, request.user!.sub);
  });

  app.delete('/delegations/:delegationId', async (request, reply) => {
    const { delegationId } = request.params as { delegationId: string };
    await approvalService.revokeDelegation(request.tenantId!, delegationId);
    return reply.status(204).send();
  });

  // Stats
  app.get('/stats', async (request) => {
    const { startDate, endDate } = request.query as any;
    return approvalService.getStats(
      request.tenantId!,
      new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now())
    );
  });
}
