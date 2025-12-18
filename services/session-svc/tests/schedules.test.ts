/**
 * Schedule Service Tests - ND-1.3
 *
 * Tests for visual schedule functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    visualSchedule: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    scheduleTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    schedulePreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    learnerProfile: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma.js';
import { scheduleRoutes } from '../src/routes/schedules.js';

describe('Schedule Service', () => {
  let app: FastifyInstance;
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const scheduleId = 'schedule-789';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });

    // Mock auth decorator
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        sub: 'user-789',
        tenantId,
        role: 'learner',
      };
    });

    await app.register(scheduleRoutes, { prefix: '/schedules' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /schedules/today', () => {
    it('should return today\'s schedule if exists', async () => {
      const mockSchedule = {
        id: scheduleId,
        tenantId,
        learnerId,
        title: 'Today\'s Schedule',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        date: new Date(),
        itemsJson: [
          {
            id: 'item-1',
            title: 'Morning Circle',
            activityType: 'social',
            estimatedDuration: 15,
            order: 0,
            status: 'pending',
            color: '#4CAF50',
          },
          {
            id: 'item-2',
            title: 'Reading Time',
            activityType: 'literacy',
            estimatedDuration: 30,
            order: 1,
            status: 'pending',
            color: '#2196F3',
          },
        ],
        currentItemIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.visualSchedule.findFirst).mockResolvedValue(
        mockSchedule as any
      );

      const response = await app.inject({
        method: 'GET',
        url: `/schedules/today?learnerId=${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(scheduleId);
      expect(body.items).toHaveLength(2);
      expect(body.progress).toBeDefined();
      expect(body.progress.total).toBe(2);
      expect(body.progress.completed).toBe(0);
    });

    it('should auto-generate schedule from template if none exists', async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();

      vi.mocked(prisma.visualSchedule.findFirst).mockResolvedValue(null);

      const mockTemplate = {
        id: 'template-1',
        tenantId,
        learnerId,
        name: 'School Day Template',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        itemsJson: [
          {
            id: 'tmpl-item-1',
            title: 'Morning Routine',
            activityType: 'routine',
            estimatedDuration: 20,
            order: 0,
            color: '#9C27B0',
          },
        ],
        targetDays: [dayOfWeek],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scheduleTemplate.findFirst).mockResolvedValue(
        mockTemplate as any
      );

      const createdSchedule = {
        id: 'new-schedule-id',
        tenantId,
        learnerId,
        title: 'School Day Template',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        date: today,
        itemsJson: mockTemplate.itemsJson.map((item, index) => ({
          ...item,
          id: `item-${index}`,
          status: 'pending',
        })),
        currentItemIndex: 0,
        createdAt: today,
        updatedAt: today,
      };

      vi.mocked(prisma.visualSchedule.create).mockResolvedValue(
        createdSchedule as any
      );

      const response = await app.inject({
        method: 'GET',
        url: `/schedules/today?learnerId=${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('new-schedule-id');
      expect(prisma.visualSchedule.create).toHaveBeenCalled();
    });

    it('should return 404 if no schedule and no template', async () => {
      vi.mocked(prisma.visualSchedule.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.scheduleTemplate.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/schedules/today?learnerId=${learnerId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /schedules', () => {
    it('should create a new schedule', async () => {
      const createInput = {
        learnerId,
        title: 'Custom Schedule',
        type: 'DAILY',
        displayStyle: 'HORIZONTAL_STRIP',
        date: new Date().toISOString(),
        items: [
          {
            title: 'Art Class',
            activityType: 'creative',
            estimatedDuration: 45,
            color: '#E91E63',
          },
        ],
      };

      const mockCreated = {
        id: 'created-schedule-id',
        tenantId,
        learnerId,
        title: createInput.title,
        type: createInput.type,
        displayStyle: createInput.displayStyle,
        date: new Date(createInput.date),
        itemsJson: [
          {
            id: 'item-0',
            title: 'Art Class',
            activityType: 'creative',
            estimatedDuration: 45,
            order: 0,
            status: 'pending',
            color: '#E91E63',
          },
        ],
        currentItemIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.visualSchedule.create).mockResolvedValue(
        mockCreated as any
      );

      const response = await app.inject({
        method: 'POST',
        url: '/schedules',
        payload: createInput,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('created-schedule-id');
      expect(body.items).toHaveLength(1);
    });
  });

  describe('PATCH /schedules/:id/items/:itemId/status', () => {
    const mockSchedule = {
      id: scheduleId,
      tenantId,
      learnerId,
      title: 'Test Schedule',
      type: 'DAILY',
      displayStyle: 'VERTICAL_LIST',
      date: new Date(),
      itemsJson: [
        {
          id: 'item-1',
          title: 'Activity 1',
          activityType: 'learning',
          estimatedDuration: 20,
          order: 0,
          status: 'current',
          color: '#4CAF50',
        },
        {
          id: 'item-2',
          title: 'Activity 2',
          activityType: 'learning',
          estimatedDuration: 20,
          order: 1,
          status: 'pending',
          color: '#2196F3',
        },
      ],
      currentItemIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update item status to completed', async () => {
      vi.mocked(prisma.visualSchedule.findUnique).mockResolvedValue(
        mockSchedule as any
      );

      const updatedSchedule = {
        ...mockSchedule,
        itemsJson: [
          { ...mockSchedule.itemsJson[0], status: 'completed' },
          { ...mockSchedule.itemsJson[1], status: 'current' },
        ],
        currentItemIndex: 1,
      };

      vi.mocked(prisma.visualSchedule.update).mockResolvedValue(
        updatedSchedule as any
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/schedules/${scheduleId}/items/item-1/status`,
        payload: { status: 'completed' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items[0].status).toBe('completed');
      expect(body.items[1].status).toBe('current');
      expect(body.currentItemIndex).toBe(1);
    });

    it('should update item status to skipped', async () => {
      vi.mocked(prisma.visualSchedule.findUnique).mockResolvedValue(
        mockSchedule as any
      );

      const updatedSchedule = {
        ...mockSchedule,
        itemsJson: [
          { ...mockSchedule.itemsJson[0], status: 'skipped' },
          { ...mockSchedule.itemsJson[1], status: 'current' },
        ],
        currentItemIndex: 1,
      };

      vi.mocked(prisma.visualSchedule.update).mockResolvedValue(
        updatedSchedule as any
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/schedules/${scheduleId}/items/item-1/status`,
        payload: { status: 'skipped' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items[0].status).toBe('skipped');
    });

    it('should return 404 for non-existent schedule', async () => {
      vi.mocked(prisma.visualSchedule.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: `/schedules/non-existent/items/item-1/status`,
        payload: { status: 'completed' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /schedules/:id/complete-current', () => {
    it('should mark current item as completed', async () => {
      const mockSchedule = {
        id: scheduleId,
        tenantId,
        learnerId,
        title: 'Test Schedule',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        date: new Date(),
        itemsJson: [
          {
            id: 'item-1',
            title: 'Current Activity',
            activityType: 'learning',
            estimatedDuration: 20,
            order: 0,
            status: 'current',
            color: '#4CAF50',
          },
          {
            id: 'item-2',
            title: 'Next Activity',
            activityType: 'learning',
            estimatedDuration: 20,
            order: 1,
            status: 'pending',
            color: '#2196F3',
          },
        ],
        currentItemIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.visualSchedule.findUnique).mockResolvedValue(
        mockSchedule as any
      );

      const updatedSchedule = {
        ...mockSchedule,
        itemsJson: [
          { ...mockSchedule.itemsJson[0], status: 'completed' },
          { ...mockSchedule.itemsJson[1], status: 'current' },
        ],
        currentItemIndex: 1,
      };

      vi.mocked(prisma.visualSchedule.update).mockResolvedValue(
        updatedSchedule as any
      );

      const response = await app.inject({
        method: 'POST',
        url: `/schedules/${scheduleId}/complete-current`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items[0].status).toBe('completed');
      expect(body.progress.completed).toBe(1);
    });
  });

  describe('POST /schedules/:id/items', () => {
    it('should add a new item to the schedule', async () => {
      const mockSchedule = {
        id: scheduleId,
        tenantId,
        learnerId,
        title: 'Test Schedule',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        date: new Date(),
        itemsJson: [
          {
            id: 'item-1',
            title: 'Existing Activity',
            activityType: 'learning',
            estimatedDuration: 20,
            order: 0,
            status: 'pending',
            color: '#4CAF50',
          },
        ],
        currentItemIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.visualSchedule.findUnique).mockResolvedValue(
        mockSchedule as any
      );

      const newItem = {
        title: 'New Activity',
        activityType: 'break',
        estimatedDuration: 10,
        color: '#FFC107',
      };

      const updatedSchedule = {
        ...mockSchedule,
        itemsJson: [
          ...mockSchedule.itemsJson,
          {
            id: 'item-2',
            ...newItem,
            order: 1,
            status: 'pending',
          },
        ],
      };

      vi.mocked(prisma.visualSchedule.update).mockResolvedValue(
        updatedSchedule as any
      );

      const response = await app.inject({
        method: 'POST',
        url: `/schedules/${scheduleId}/items`,
        payload: newItem,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(2);
      expect(body.items[1].title).toBe('New Activity');
    });
  });

  describe('PUT /schedules/:id/reorder', () => {
    it('should reorder items in the schedule', async () => {
      const mockSchedule = {
        id: scheduleId,
        tenantId,
        learnerId,
        title: 'Test Schedule',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        date: new Date(),
        itemsJson: [
          {
            id: 'item-1',
            title: 'First',
            activityType: 'learning',
            estimatedDuration: 20,
            order: 0,
            status: 'pending',
            color: '#4CAF50',
          },
          {
            id: 'item-2',
            title: 'Second',
            activityType: 'learning',
            estimatedDuration: 20,
            order: 1,
            status: 'pending',
            color: '#2196F3',
          },
          {
            id: 'item-3',
            title: 'Third',
            activityType: 'learning',
            estimatedDuration: 20,
            order: 2,
            status: 'pending',
            color: '#E91E63',
          },
        ],
        currentItemIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.visualSchedule.findUnique).mockResolvedValue(
        mockSchedule as any
      );

      const newOrder = ['item-3', 'item-1', 'item-2'];

      const updatedSchedule = {
        ...mockSchedule,
        itemsJson: [
          { ...mockSchedule.itemsJson[2], order: 0 },
          { ...mockSchedule.itemsJson[0], order: 1 },
          { ...mockSchedule.itemsJson[1], order: 2 },
        ],
      };

      vi.mocked(prisma.visualSchedule.update).mockResolvedValue(
        updatedSchedule as any
      );

      const response = await app.inject({
        method: 'PUT',
        url: `/schedules/${scheduleId}/reorder`,
        payload: { itemIds: newOrder },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items[0].title).toBe('Third');
      expect(body.items[1].title).toBe('First');
      expect(body.items[2].title).toBe('Second');
    });
  });

  describe('GET /schedules/preferences/:learnerId', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 'pref-1',
        tenantId,
        learnerId,
        displayStyle: 'VERTICAL_LIST',
        showTime: true,
        showDuration: true,
        showProgressBar: true,
        highlightCurrentItem: true,
        enableAnimations: true,
        itemSize: 'medium',
        colorScheme: 'default',
        transitionWarningMinutes: 5,
        showTransitionTimer: true,
        playTransitionSound: false,
        vibrationFeedback: true,
        celebrateCompletion: true,
        allowReordering: false,
        showSubItems: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.schedulePreferences.findUnique).mockResolvedValue(
        mockPreferences as any
      );

      const response = await app.inject({
        method: 'GET',
        url: `/schedules/preferences/${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.displayStyle).toBe('VERTICAL_LIST');
      expect(body.showProgressBar).toBe(true);
    });

    it('should create default preferences if none exist', async () => {
      vi.mocked(prisma.schedulePreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.learnerProfile.findUnique).mockResolvedValue(null);

      const defaultPreferences = {
        id: 'pref-new',
        tenantId,
        learnerId,
        displayStyle: 'VERTICAL_LIST',
        showTime: true,
        showDuration: true,
        showProgressBar: true,
        highlightCurrentItem: true,
        enableAnimations: true,
        itemSize: 'medium',
        colorScheme: 'default',
        transitionWarningMinutes: 5,
        showTransitionTimer: true,
        playTransitionSound: false,
        vibrationFeedback: true,
        celebrateCompletion: true,
        allowReordering: false,
        showSubItems: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.schedulePreferences.upsert).mockResolvedValue(
        defaultPreferences as any
      );

      const response = await app.inject({
        method: 'GET',
        url: `/schedules/preferences/${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.schedulePreferences.upsert).toHaveBeenCalled();
    });
  });

  describe('PATCH /schedules/preferences/:learnerId', () => {
    it('should update preferences', async () => {
      const updates = {
        displayStyle: 'GRID',
        itemSize: 'large',
        celebrateCompletion: false,
      };

      const updatedPreferences = {
        id: 'pref-1',
        tenantId,
        learnerId,
        displayStyle: 'GRID',
        showTime: true,
        showDuration: true,
        showProgressBar: true,
        highlightCurrentItem: true,
        enableAnimations: true,
        itemSize: 'large',
        colorScheme: 'default',
        transitionWarningMinutes: 5,
        showTransitionTimer: true,
        playTransitionSound: false,
        vibrationFeedback: true,
        celebrateCompletion: false,
        allowReordering: false,
        showSubItems: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.schedulePreferences.upsert).mockResolvedValue(
        updatedPreferences as any
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/schedules/preferences/${learnerId}`,
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.displayStyle).toBe('GRID');
      expect(body.itemSize).toBe('large');
      expect(body.celebrateCompletion).toBe(false);
    });
  });

  describe('Template Management', () => {
    describe('POST /schedules/templates', () => {
      it('should create a new template', async () => {
        const createInput = {
          learnerId,
          name: 'Weekend Template',
          type: 'DAILY',
          displayStyle: 'VERTICAL_LIST',
          items: [
            {
              title: 'Sleep In',
              activityType: 'rest',
              estimatedDuration: 120,
              color: '#9C27B0',
            },
            {
              title: 'Free Play',
              activityType: 'play',
              estimatedDuration: 60,
              color: '#FF9800',
            },
          ],
          targetDays: [0, 6], // Sunday and Saturday
        };

        const mockCreated = {
          id: 'template-1',
          tenantId,
          ...createInput,
          itemsJson: createInput.items.map((item, i) => ({
            id: `tmpl-item-${i}`,
            ...item,
            order: i,
          })),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(prisma.scheduleTemplate.create).mockResolvedValue(
          mockCreated as any
        );

        const response = await app.inject({
          method: 'POST',
          url: '/schedules/templates',
          payload: createInput,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.name).toBe('Weekend Template');
        expect(body.targetDays).toEqual([0, 6]);
      });
    });

    describe('GET /schedules/templates', () => {
      it('should list templates for a learner', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            tenantId,
            learnerId,
            name: 'School Day',
            type: 'DAILY',
            displayStyle: 'VERTICAL_LIST',
            itemsJson: [],
            targetDays: [1, 2, 3, 4, 5],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'template-2',
            tenantId,
            learnerId,
            name: 'Weekend',
            type: 'DAILY',
            displayStyle: 'HORIZONTAL_STRIP',
            itemsJson: [],
            targetDays: [0, 6],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        vi.mocked(prisma.scheduleTemplate.findMany).mockResolvedValue(
          mockTemplates as any
        );

        const response = await app.inject({
          method: 'GET',
          url: `/schedules/templates?learnerId=${learnerId}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveLength(2);
        expect(body[0].name).toBe('School Day');
        expect(body[1].name).toBe('Weekend');
      });
    });
  });

  describe('Activity Breakdown', () => {
    it('should return activity breakdown for known type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/schedules/activity-breakdown/independent_work',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.activityType).toBe('independent_work');
      expect(body.subItems).toBeDefined();
      expect(Array.isArray(body.subItems)).toBe(true);
      expect(body.subItems.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown activity type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/schedules/activity-breakdown/unknown_activity',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.activityType).toBe('unknown_activity');
      expect(body.subItems).toEqual([]);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly', async () => {
      const mockSchedule = {
        id: scheduleId,
        tenantId,
        learnerId,
        title: 'Progress Test',
        type: 'DAILY',
        displayStyle: 'VERTICAL_LIST',
        date: new Date(),
        itemsJson: [
          { id: '1', title: 'A', status: 'completed', order: 0, estimatedDuration: 10 },
          { id: '2', title: 'B', status: 'completed', order: 1, estimatedDuration: 15 },
          { id: '3', title: 'C', status: 'skipped', order: 2, estimatedDuration: 10 },
          { id: '4', title: 'D', status: 'current', order: 3, estimatedDuration: 20 },
          { id: '5', title: 'E', status: 'pending', order: 4, estimatedDuration: 15 },
        ],
        currentItemIndex: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.visualSchedule.findFirst).mockResolvedValue(
        mockSchedule as any
      );

      const response = await app.inject({
        method: 'GET',
        url: `/schedules/today?learnerId=${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Progress should count completed and skipped as "done"
      expect(body.progress.total).toBe(5);
      expect(body.progress.completed).toBe(2);
      expect(body.progress.skipped).toBe(1);
      expect(body.progress.remaining).toBe(2);
      expect(body.progress.percentComplete).toBe(60); // 3 of 5 done
    });
  });
});
