import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProgressUpdates,
  markUpdateAsRead,
  getUpdatesSummary,
  getMessages,
  sendMessage,
  replyToMessage,
  markMessageAsRead,
  archiveMessage,
  getSharedGoals,
  getGoalDetails,
  addParentNote,
  updateGoalProgress,
  getResources,
  getResourceCollections,
  createCollection,
  getRecommendedResources,
} from '@/lib/parent-communication-api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Progress Updates API
// ============================================================================
describe('Progress Updates API', () => {
  it('getProgressUpdates builds correct query params and returns data', async () => {
    const updates = [{ id: 'u1', title: 'Math progress', type: 'academic' }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) });

    const result = await getProgressUpdates({ studentId: 'stu-1', type: 'academic', unreadOnly: true });

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('studentId=stu-1');
    expect(url).toContain('type=academic');
    expect(url).toContain('unreadOnly=true');
    expect(result).toEqual(updates);
  });

  it('getProgressUpdates throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(getProgressUpdates({ studentId: 'stu-1' })).rejects.toThrow('Failed to fetch progress updates');
  });

  it('markUpdateAsRead sends PUT and returns updated record', async () => {
    const updated = { id: 'u1', read: true };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    const result = await markUpdateAsRead('u1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/u1/read'), { method: 'PUT' });
    expect(result).toEqual(updated);
  });

  it('getUpdatesSummary returns summary object', async () => {
    const summary = { total: 10, unread: 3, byType: { academic: 5 }, recentHighPriority: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(summary) });

    const result = await getUpdatesSummary('stu-1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('studentId=stu-1'));
    expect(result.total).toBe(10);
    expect(result.unread).toBe(3);
  });
});

// ============================================================================
// Message Center API
// ============================================================================
describe('Message Center API', () => {
  it('getMessages builds correct query params', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await getMessages({ parentId: 'p1', studentId: 'stu-1', unreadOnly: true });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('parentId=p1');
    expect(url).toContain('studentId=stu-1');
    expect(url).toContain('unreadOnly=true');
  });

  it('sendMessage posts JSON body and returns message', async () => {
    const msg = { id: 'm1', subject: 'Hello', body: 'Hi teacher' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(msg) });

    const result = await sendMessage({
      parentId: 'p1',
      teacherId: 't1',
      studentId: 'stu-1',
      subject: 'Hello',
      body: 'Hi teacher',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } }),
    );
    expect(result).toEqual(msg);
  });

  it('replyToMessage sends POST with reply body', async () => {
    const reply = { id: 'r1', body: 'Thanks!' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(reply) });

    const result = await replyToMessage('m1', { parentId: 'p1', body: 'Thanks!' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/m1/reply');
    expect(result).toEqual(reply);
  });

  it('markMessageAsRead sends PUT request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'm1', status: 'read' }) });

    await markMessageAsRead('m1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/m1/read'), { method: 'PUT' });
  });

  it('archiveMessage sends PUT and throws on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(archiveMessage('m1')).rejects.toThrow('Failed to archive message');
  });
});

// ============================================================================
// Goal Sharing API
// ============================================================================
describe('Goal Sharing API', () => {
  it('getSharedGoals returns goals for a student', async () => {
    const goals = [{ id: 'g1', title: 'Read 20 books', status: 'inProgress' }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(goals) });

    const result = await getSharedGoals({ studentId: 'stu-1', status: 'inProgress' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('studentId=stu-1');
    expect(url).toContain('status=inProgress');
    expect(result).toEqual(goals);
  });

  it('getGoalDetails fetches a single goal', async () => {
    const goal = { id: 'g1', title: 'Read 20 books', progress: 60 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(goal) });

    const result = await getGoalDetails('g1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/goals/g1'));
    expect(result.progress).toBe(60);
  });

  it('addParentNote posts note to goal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'g1', parentNotes: 'Great work!' }) });

    const result = await addParentNote('g1', 'Great work!');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/goals/g1/notes');
    expect(JSON.parse(opts.body)).toEqual({ note: 'Great work!' });
    expect(result.parentNotes).toBe('Great work!');
  });

  it('updateGoalProgress sends PUT with progress data', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'g1', current: 15 }) });

    const result = await updateGoalProgress('g1', { current: 15, notes: 'Halfway there' });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/goals/g1/progress');
    expect(opts.method).toBe('PUT');
    expect(result.current).toBe(15);
  });
});

// ============================================================================
// Resource Hub API
// ============================================================================
describe('Resource Hub API', () => {
  it('getResources builds query params for filters', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await getResources({ category: 'article', topics: ['math', 'science'], recommended: true });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('category=article');
    expect(url).toContain('topics=math');
    expect(url).toContain('topics=science');
    expect(url).toContain('recommended=true');
  });

  it('getResourceCollections fetches collections for a parent', async () => {
    const collections = [{ id: 'c1', name: 'Reading list', resources: ['r1', 'r2'] }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(collections) });

    const result = await getResourceCollections('p1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('parentId=p1'));
    expect(result).toHaveLength(1);
  });

  it('createCollection posts JSON body and returns new collection', async () => {
    const collection = { id: 'c2', name: 'Science Fun' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(collection) });

    const result = await createCollection({
      name: 'Science Fun',
      description: 'Science activities',
      parentId: 'p1',
      isPublic: false,
    });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).name).toBe('Science Fun');
    expect(result.id).toBe('c2');
  });

  it('getRecommendedResources fetches student-specific recommendations', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 'r1', recommended: true }]) });

    const result = await getRecommendedResources('stu-1');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('studentId=stu-1'));
    expect(result).toHaveLength(1);
  });
});
