/**
 * AIVO E2E Mock API Server
 * Provides mock endpoints for E2E testing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createClient } from 'redis';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
let redis;
if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });
  await redis.connect();
  console.log('[Mock API] Redis connected');
}

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Auth endpoints
app.post('/api/v1/auth/login', async (req, res) => {
  const { email } = req.body;
  // Note: Password validation would happen here in production
  
  try {
    const result = await pool.query(
      'SELECT id, email, role, display_name FROM test_users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Generate mock token
    const token = Buffer.from(JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 3600000,
    })).toString('base64');
    
    res.json({
      accessToken: token,
      refreshToken: `refresh_${token}`,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  const { email, displayName, role } = req.body;
  // Note: Password would be hashed and stored in production
  
  try {
    const result = await pool.query(
      `INSERT INTO test_users (email, display_name, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, display_name`,
      [email, displayName, role || 'learner']
    );
    
    const user = result.rows[0];
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/logout', (_req, res) => {
  res.json({ success: true });
});

// Profile endpoints
app.get('/api/v1/profiles/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM test_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Children endpoints (for parent app)
app.get('/api/v1/parents/:parentId/children', async (req, res) => {
  const { parentId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT c.*, u.display_name, u.email
       FROM test_children c
       JOIN test_users u ON c.learner_id = u.id
       WHERE c.parent_id = $1`,
      [parentId]
    );
    
    res.json({ children: result.rows });
  } catch (error) {
    console.error('Children fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/parents/:parentId/children', async (req, res) => {
  const { parentId } = req.params;
  const { childName } = req.body;
  // Note: Link code verification would happen here in production
  
  try {
    // Mock child linking
    const childId = `child_${Date.now()}`;
    
    await pool.query(
      `INSERT INTO test_children (id, parent_id, learner_id, nickname)
       VALUES ($1, $2, $3, $4)`,
      [childId, parentId, `learner_${Date.now()}`, childName]
    );
    
    res.status(201).json({
      id: childId,
      parentId,
      nickname: childName,
      linkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Child linking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Classes endpoints (for teacher app)
app.get('/api/v1/teachers/:teacherId/classes', async (req, res) => {
  const { teacherId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM test_classes WHERE teacher_id = $1',
      [teacherId]
    );
    
    res.json({ classes: result.rows });
  } catch (error) {
    console.error('Classes fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/classes', async (req, res) => {
  const { teacherId, name, subject, gradeLevel } = req.body;
  
  try {
    const classId = `class_${Date.now()}`;
    
    await pool.query(
      `INSERT INTO test_classes (id, teacher_id, name, subject, grade_level)
       VALUES ($1, $2, $3, $4, $5)`,
      [classId, teacherId, name, subject, gradeLevel]
    );
    
    res.status(201).json({
      id: classId,
      teacherId,
      name,
      subject,
      gradeLevel,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Class creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sessions endpoints (for learner app)
app.get('/api/v1/learners/:learnerId/sessions', async (req, res) => {
  const { learnerId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM test_sessions WHERE learner_id = $1 ORDER BY started_at DESC',
      [learnerId]
    );
    
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/sessions', async (req, res) => {
  const { learnerId, contentId, contentType } = req.body;
  
  try {
    const sessionId = `session_${Date.now()}`;
    
    await pool.query(
      `INSERT INTO test_sessions (id, learner_id, content_id, content_type, started_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, learnerId, contentId, contentType]
    );
    
    res.status(201).json({
      id: sessionId,
      learnerId,
      contentId,
      contentType,
      startedAt: new Date().toISOString(),
      status: 'active',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Progress endpoints
app.get('/api/v1/learners/:learnerId/progress', async (req, res) => {
  const { learnerId } = req.params;
  
  // Mock progress data
  res.json({
    learnerId,
    overall: {
      completedSessions: 45,
      totalTime: 12500,
      averageScore: 87,
      streak: 5,
    },
    subjects: [
      { subject: 'Mathematics', progress: 72, score: 85 },
      { subject: 'Reading', progress: 68, score: 90 },
      { subject: 'Science', progress: 55, score: 82 },
    ],
    recentActivity: [
      { date: new Date().toISOString(), sessions: 3, time: 45 },
      { date: new Date(Date.now() - 86400000).toISOString(), sessions: 2, time: 30 },
    ],
  });
});

// Achievements endpoints
app.get('/api/v1/learners/:learnerId/achievements', async (_req, res) => {
  // Note: Would filter achievements by learner in production using req.params.learnerId
  
  // Mock achievements
  res.json({
    achievements: [
      { id: 'first_lesson', name: 'First Steps', unlockedAt: new Date().toISOString() },
      { id: 'streak_3', name: '3 Day Streak', unlockedAt: new Date().toISOString() },
      { id: 'perfect_score', name: 'Perfect Score', unlockedAt: null },
    ],
    points: 1250,
    level: 5,
  });
});

// Notifications endpoints
app.get('/api/v1/users/:userId/notifications', async (_req, res) => {
  // Note: Would filter notifications by user in production using req.params.userId
  
  // Mock notifications
  res.json({
    notifications: [
      {
        id: 'notif_1',
        type: 'progress',
        title: 'Great progress!',
        body: 'Your child completed 5 lessons today.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_2',
        type: 'achievement',
        title: 'New badge earned!',
        body: 'Math Explorer badge unlocked.',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  });
});

// Billing endpoints
app.get('/api/v1/users/:userId/subscription', async (_req, res) => {
  // Note: Would fetch user's subscription in production using req.params.userId
  
  // Mock subscription
  res.json({
    id: 'sub_mock123',
    plan: 'family_monthly',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
  });
});

app.post('/api/v1/subscriptions', async (req, res) => {
  const { userId, planId } = req.body;
  // Note: Payment processing would happen here in production
  
  // Mock subscription creation
  res.status(201).json({
    id: `sub_${Date.now()}`,
    userId,
    plan: planId,
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
});

// Error handling
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Mock API] Server running on port ${PORT}`);
  console.log(`[Mock API] Health check: http://localhost:${PORT}/health`);
});
