/**
 * E2E Test Data Seeder
 * Seeds the test database with data for E2E testing
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  console.log('[Seed] Creating tables...');
  
  await pool.query(`
    -- Test users table
    CREATE TABLE IF NOT EXISTS test_users (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'learner',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Test profiles table
    CREATE TABLE IF NOT EXISTS test_profiles (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(255) REFERENCES test_users(id),
      avatar_url VARCHAR(500),
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Test children (parent-learner links)
    CREATE TABLE IF NOT EXISTS test_children (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      parent_id VARCHAR(255) NOT NULL,
      learner_id VARCHAR(255) NOT NULL,
      nickname VARCHAR(255),
      linked_at TIMESTAMP DEFAULT NOW()
    );

    -- Test classes
    CREATE TABLE IF NOT EXISTS test_classes (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      teacher_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(100),
      grade_level VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Test sessions
    CREATE TABLE IF NOT EXISTS test_sessions (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      learner_id VARCHAR(255) NOT NULL,
      content_id VARCHAR(255),
      content_type VARCHAR(100),
      started_at TIMESTAMP DEFAULT NOW(),
      ended_at TIMESTAMP,
      score INTEGER,
      status VARCHAR(50) DEFAULT 'active'
    );

    -- Test achievements
    CREATE TABLE IF NOT EXISTS test_achievements (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      learner_id VARCHAR(255) NOT NULL,
      achievement_type VARCHAR(100) NOT NULL,
      unlocked_at TIMESTAMP DEFAULT NOW()
    );

    -- Test notifications
    CREATE TABLE IF NOT EXISTS test_notifications (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Test IEP goals
    CREATE TABLE IF NOT EXISTS test_iep_goals (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      learner_id VARCHAR(255) NOT NULL,
      goal_text TEXT NOT NULL,
      target_date DATE,
      progress INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  console.log('[Seed] Tables created');
}

async function seedUsers() {
  console.log('[Seed] Seeding users...');
  
  const users = [
    // Parents
    { email: 'parent@test.com', displayName: 'Test Parent', role: 'parent' },
    { email: 'parent.premium@test.com', displayName: 'Premium Parent', role: 'parent' },
    { email: 'parent.multi@test.com', displayName: 'Multi-Child Parent', role: 'parent' },
    { email: 'parent.new@test.com', displayName: 'New Parent', role: 'parent' },
    
    // Teachers
    { email: 'teacher@test.com', displayName: 'Test Teacher', role: 'teacher' },
    { email: 'teacher.math@test.com', displayName: 'Math Teacher', role: 'teacher' },
    { email: 'teacher.sped@test.com', displayName: 'SPED Teacher', role: 'teacher' },
    { email: 'teacher.new@test.com', displayName: 'New Teacher', role: 'teacher' },
    
    // Learners
    { email: 'learner@test.com', displayName: 'Test Learner', role: 'learner' },
    { email: 'learner.child@test.com', displayName: 'Child Learner', role: 'learner' },
    { email: 'learner.teen@test.com', displayName: 'Teen Learner', role: 'learner' },
    { email: 'learner.iep@test.com', displayName: 'IEP Learner', role: 'learner' },
    { email: 'learner.neurodiverse@test.com', displayName: 'Neurodiverse Learner', role: 'learner' },
    { email: 'learner.accessibility@test.com', displayName: 'Accessibility Learner', role: 'learner' },
  ];
  
  for (const user of users) {
    await pool.query(
      `INSERT INTO test_users (email, display_name, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET display_name = $2, role = $3`,
      [user.email, user.displayName, user.role]
    );
  }
  
  console.log(`[Seed] Seeded ${users.length} users`);
}

async function seedClasses() {
  console.log('[Seed] Seeding classes...');
  
  // Get teacher ID
  const teacherResult = await pool.query(
    "SELECT id FROM test_users WHERE email = 'teacher@test.com'"
  );
  const teacherId = teacherResult.rows[0]?.id;
  
  if (!teacherId) {
    console.log('[Seed] Teacher not found, skipping classes');
    return;
  }
  
  const classes = [
    { name: 'Math 101', subject: 'Mathematics', gradeLevel: '5th Grade' },
    { name: 'Reading Circle', subject: 'Language Arts', gradeLevel: '4th Grade' },
    { name: 'Science Lab', subject: 'Science', gradeLevel: '5th Grade' },
  ];
  
  for (const cls of classes) {
    await pool.query(
      `INSERT INTO test_classes (teacher_id, name, subject, grade_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [teacherId, cls.name, cls.subject, cls.gradeLevel]
    );
  }
  
  console.log(`[Seed] Seeded ${classes.length} classes`);
}

async function seedAchievements() {
  console.log('[Seed] Seeding achievements...');
  
  // Get learner ID
  const learnerResult = await pool.query(
    "SELECT id FROM test_users WHERE email = 'learner@test.com'"
  );
  const learnerId = learnerResult.rows[0]?.id;
  
  if (!learnerId) {
    console.log('[Seed] Learner not found, skipping achievements');
    return;
  }
  
  const achievements = [
    'first_lesson',
    'streak_3',
    'math_explorer',
    'reading_champion',
  ];
  
  for (const achievement of achievements) {
    await pool.query(
      `INSERT INTO test_achievements (learner_id, achievement_type)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [learnerId, achievement]
    );
  }
  
  console.log(`[Seed] Seeded ${achievements.length} achievements`);
}

async function seedIepGoals() {
  console.log('[Seed] Seeding IEP goals...');
  
  // Get IEP learner ID
  const learnerResult = await pool.query(
    "SELECT id FROM test_users WHERE email = 'learner.iep@test.com'"
  );
  const learnerId = learnerResult.rows[0]?.id;
  
  if (!learnerId) {
    console.log('[Seed] IEP Learner not found, skipping IEP goals');
    return;
  }
  
  const goals = [
    { goal: 'Improve reading fluency to 100 WPM', progress: 65 },
    { goal: 'Complete 80% of math assignments independently', progress: 45 },
    { goal: 'Demonstrate focus for 15 minutes without breaks', progress: 80 },
  ];
  
  for (const goal of goals) {
    await pool.query(
      `INSERT INTO test_iep_goals (learner_id, goal_text, progress, target_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [learnerId, goal.goal, goal.progress, new Date(Date.now() + 90 * 86400000)]
    );
  }
  
  console.log(`[Seed] Seeded ${goals.length} IEP goals`);
}

async function seedChildLinks() {
  console.log('[Seed] Seeding parent-child links...');
  
  // Get parent and learner IDs
  const parentResult = await pool.query(
    "SELECT id FROM test_users WHERE email = 'parent@test.com'"
  );
  const learnerResult = await pool.query(
    "SELECT id FROM test_users WHERE email = 'learner.child@test.com'"
  );
  
  const parentId = parentResult.rows[0]?.id;
  const learnerId = learnerResult.rows[0]?.id;
  
  if (parentId && learnerId) {
    await pool.query(
      `INSERT INTO test_children (parent_id, learner_id, nickname)
       VALUES ($1, $2, 'My Child')
       ON CONFLICT DO NOTHING`,
      [parentId, learnerId]
    );
    console.log('[Seed] Seeded parent-child link');
  }
}

async function main() {
  console.log('[Seed] Starting E2E data seeding...');
  console.log(`[Seed] Database: ${process.env.DATABASE_URL}`);
  
  try {
    await createTables();
    await seedUsers();
    await seedClasses();
    await seedAchievements();
    await seedIepGoals();
    await seedChildLinks();
    
    console.log('[Seed] E2E data seeding complete!');
  } catch (error) {
    console.error('[Seed] Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
