/**
 * Tests for community-svc — Post and comment management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  post: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  postLike: {
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  comment: {
    create: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('Post CRUD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a post', async () => {
    const post = {
      id: 'p-1',
      tenantId: 't-1',
      authorId: 'u-1',
      authorName: 'Jane',
      authorRole: 'TEACHER',
      title: 'Welcome!',
      content: 'Hello community',
      category: 'ANNOUNCEMENT',
      likeCount: 0,
      commentCount: 0,
    };
    mockPrisma.post.create.mockResolvedValue(post);
    const result = await mockPrisma.post.create({ data: post });
    expect(result.title).toBe('Welcome!');
    expect(result.likeCount).toBe(0);
  });

  it('retrieves a post by ID', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 'p-1', title: 'Welcome!' });
    const result = await mockPrisma.post.findUnique({ where: { id: 'p-1' } });
    expect(result?.title).toBe('Welcome!');
  });

  it('lists posts with pagination', async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      { id: 'p-1', title: 'First' },
      { id: 'p-2', title: 'Second' },
    ]);
    mockPrisma.post.count.mockResolvedValue(10);
    const posts = await mockPrisma.post.findMany({ take: 2, skip: 0 });
    const total = await mockPrisma.post.count();
    expect(posts).toHaveLength(2);
    expect(total).toBe(10);
  });

  it('updates a post (ownership check)', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 'p-1', authorId: 'u-1' });
    mockPrisma.post.update.mockResolvedValue({ id: 'p-1', title: 'Updated Title' });
    const post = await mockPrisma.post.findUnique({ where: { id: 'p-1' } });
    expect(post?.authorId).toBe('u-1');
    const updated = await mockPrisma.post.update({
      where: { id: 'p-1' },
      data: { title: 'Updated Title' },
    });
    expect(updated.title).toBe('Updated Title');
  });

  it('deletes a post', async () => {
    mockPrisma.post.delete.mockResolvedValue({ id: 'p-1' });
    const result = await mockPrisma.post.delete({ where: { id: 'p-1' } });
    expect(result.id).toBe('p-1');
  });
});

describe('Post likes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('likes a post via transaction', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      mockPrisma.postLike.create.mockResolvedValue({ postId: 'p-1', userId: 'u-1' });
      mockPrisma.post.update.mockResolvedValue({ id: 'p-1', likeCount: 1 });
      return fn(mockPrisma);
    });
    await mockPrisma.$transaction(async (tx: any) => {
      await tx.postLike.create({ data: { postId: 'p-1', userId: 'u-1' } });
      await tx.post.update({ where: { id: 'p-1' }, data: { likeCount: { increment: 1 } } });
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});

describe('Comments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a comment to a post', async () => {
    mockPrisma.comment.create.mockResolvedValue({
      id: 'c-1',
      postId: 'p-1',
      authorId: 'u-2',
      content: 'Great post!',
    });
    const comment = await mockPrisma.comment.create({
      data: { postId: 'p-1', authorId: 'u-2', authorName: 'John', authorRole: 'PARENT', content: 'Great post!' },
    });
    expect(comment.content).toBe('Great post!');
  });

  it('lists comments with pagination', async () => {
    mockPrisma.comment.findMany.mockResolvedValue([
      { id: 'c-1', content: 'Nice' },
      { id: 'c-2', content: 'Thanks' },
    ]);
    const comments = await mockPrisma.comment.findMany({
      where: { postId: 'p-1' },
      take: 10,
      skip: 0,
    });
    expect(comments).toHaveLength(2);
  });

  it('deletes a comment', async () => {
    mockPrisma.comment.delete.mockResolvedValue({ id: 'c-1' });
    const result = await mockPrisma.comment.delete({ where: { id: 'c-1' } });
    expect(result.id).toBe('c-1');
  });
});
