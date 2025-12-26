/// Database Schema for Local SQLite Database
class DatabaseSchema {
  static const int version = 1;

  static const List<String> createStatements = [
    // Lessons table
    '''
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      tenant_id TEXT,
      status TEXT DEFAULT 'published',
      difficulty TEXT,
      estimated_duration INTEGER,
      thumbnail_url TEXT,
      is_offline INTEGER DEFAULT 0,
      offline_at TEXT,
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      is_synced INTEGER DEFAULT 1,
      server_version INTEGER DEFAULT 1
    )
    ''',

    // Lesson blocks table
    '''
    CREATE TABLE IF NOT EXISTS lesson_blocks (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      settings TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    )
    ''',

    // Learning sessions table
    '''
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      progress REAL DEFAULT 0,
      score REAL,
      time_spent_seconds INTEGER DEFAULT 0,
      current_block_index INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      synced_time_spent INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    )
    ''',

    // Responses table
    '''
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      response_data TEXT NOT NULL,
      is_correct INTEGER,
      score REAL,
      time_spent_seconds INTEGER,
      attempt_number INTEGER DEFAULT 1,
      feedback TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
    )
    ''',

    // Skill mastery table
    '''
    CREATE TABLE IF NOT EXISTS skill_mastery (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      skill_name TEXT,
      mastery_level REAL DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      correct_attempts INTEGER DEFAULT 0,
      last_practiced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      UNIQUE(student_id, skill_id)
    )
    ''',

    // Progress table
    '''
    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      progress_data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      UNIQUE(student_id, entity_type, entity_id)
    )
    ''',

    // Lesson completions table
    '''
    CREATE TABLE IF NOT EXISTS lesson_completions (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      score REAL,
      time_spent_seconds INTEGER,
      completed_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      UNIQUE(lesson_id, student_id)
    )
    ''',

    // Change log for sync
    '''
    CREATE TABLE IF NOT EXISTS change_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      change_type TEXT NOT NULL,
      data TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      synced_at TEXT
    )
    ''',

    // Entity history for rollback
    '''
    CREATE TABLE IF NOT EXISTS entity_history (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
    ''',

    // Conflicts table
    '''
    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      local_data TEXT NOT NULL,
      server_data TEXT NOT NULL,
      resolution_strategy TEXT,
      resolved_data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
    ''',

    // Sync queue table
    '''
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      queued_at TEXT NOT NULL,
      last_attempt_at TEXT,
      completed_at TEXT
    )
    ''',

    // Cached media table
    '''
    CREATE TABLE IF NOT EXISTS cached_media (
      url TEXT PRIMARY KEY,
      lesson_id TEXT,
      file_path TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT,
      cached_at TEXT NOT NULL,
      last_accessed_at TEXT
    )
    ''',

    // Sync metadata table
    '''
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    ''',

    // User preferences (for offline access)
    '''
    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    ''',

    // Download queue for offline content
    '''
    CREATE TABLE IF NOT EXISTS download_queue (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      progress REAL DEFAULT 0,
      total_size INTEGER DEFAULT 0,
      downloaded_size INTEGER DEFAULT 0,
      error_message TEXT,
      priority INTEGER DEFAULT 0,
      queued_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    )
    ''',

    // Bookmarks for offline quick access
    '''
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      block_id TEXT,
      title TEXT,
      created_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 0,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    )
    ''',
  ];

  static const List<String> indexStatements = [
    // Lessons indexes
    'CREATE INDEX IF NOT EXISTS idx_lessons_tenant ON lessons(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status)',
    'CREATE INDEX IF NOT EXISTS idx_lessons_offline ON lessons(is_offline)',
    'CREATE INDEX IF NOT EXISTS idx_lessons_synced ON lessons(is_synced) WHERE is_synced = 0',

    // Lesson blocks indexes
    'CREATE INDEX IF NOT EXISTS idx_blocks_lesson ON lesson_blocks(lesson_id)',
    'CREATE INDEX IF NOT EXISTS idx_blocks_order ON lesson_blocks(lesson_id, "order")',

    // Sessions indexes
    'CREATE INDEX IF NOT EXISTS idx_sessions_student ON learning_sessions(student_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_lesson ON learning_sessions(lesson_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_status ON learning_sessions(student_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_synced ON learning_sessions(is_synced) WHERE is_synced = 0',

    // Responses indexes
    'CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_responses_block ON responses(block_id)',
    'CREATE INDEX IF NOT EXISTS idx_responses_synced ON responses(is_synced) WHERE is_synced = 0',

    // Skill mastery indexes
    'CREATE INDEX IF NOT EXISTS idx_mastery_student ON skill_mastery(student_id)',
    'CREATE INDEX IF NOT EXISTS idx_mastery_skill ON skill_mastery(skill_id)',
    'CREATE INDEX IF NOT EXISTS idx_mastery_synced ON skill_mastery(is_synced) WHERE is_synced = 0',

    // Change log indexes
    'CREATE INDEX IF NOT EXISTS idx_changelog_entity ON change_log(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_changelog_synced ON change_log(synced_at) WHERE synced_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_changelog_time ON change_log(changed_at)',

    // Entity history indexes
    'CREATE INDEX IF NOT EXISTS idx_history_entity ON entity_history(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_history_time ON entity_history(created_at DESC)',

    // Sync queue indexes
    'CREATE INDEX IF NOT EXISTS idx_queue_status ON sync_queue(status)',
    'CREATE INDEX IF NOT EXISTS idx_queue_priority ON sync_queue(priority DESC, queued_at ASC)',

    // Conflicts indexes
    'CREATE INDEX IF NOT EXISTS idx_conflicts_unresolved ON conflicts(resolved_at) WHERE resolved_at IS NULL',

    // Cached media indexes
    'CREATE INDEX IF NOT EXISTS idx_media_lesson ON cached_media(lesson_id)',
    'CREATE INDEX IF NOT EXISTS idx_media_accessed ON cached_media(last_accessed_at)',

    // Download queue indexes
    'CREATE INDEX IF NOT EXISTS idx_download_status ON download_queue(status)',
    'CREATE INDEX IF NOT EXISTS idx_download_priority ON download_queue(priority DESC, queued_at ASC)',

    // Bookmarks indexes
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_lesson ON bookmarks(lesson_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_synced ON bookmarks(is_synced) WHERE is_synced = 0',
  ];

  static const List<String> triggerStatements = [
    // Auto-update updated_at timestamp for lessons
    '''
    CREATE TRIGGER IF NOT EXISTS lessons_updated_at
    AFTER UPDATE ON lessons
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE lessons SET updated_at = datetime('now') WHERE id = NEW.id;
    END
    ''',

    // Auto-update updated_at for sessions
    '''
    CREATE TRIGGER IF NOT EXISTS sessions_updated_at
    AFTER UPDATE ON learning_sessions
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE learning_sessions SET updated_at = datetime('now') WHERE id = NEW.id;
    END
    ''',

    // Clean up old entity history (keep last 10 versions)
    '''
    CREATE TRIGGER IF NOT EXISTS cleanup_history
    AFTER INSERT ON entity_history
    BEGIN
      DELETE FROM entity_history 
      WHERE entity_type = NEW.entity_type 
        AND entity_id = NEW.entity_id
        AND id NOT IN (
          SELECT id FROM entity_history 
          WHERE entity_type = NEW.entity_type 
            AND entity_id = NEW.entity_id
          ORDER BY created_at DESC 
          LIMIT 10
        );
    END
    ''',

    // Auto-delete old synced changes (older than 30 days)
    '''
    CREATE TRIGGER IF NOT EXISTS cleanup_change_log
    AFTER INSERT ON change_log
    BEGIN
      DELETE FROM change_log 
      WHERE synced_at IS NOT NULL 
        AND synced_at < datetime('now', '-30 days');
    END
    ''',
  ];

  static const Map<int, List<String>> migrations = {
    // Example migration for version 2
    // 2: [
    //   'ALTER TABLE lessons ADD COLUMN new_column TEXT',
    //   'CREATE INDEX IF NOT EXISTS idx_new_column ON lessons(new_column)',
    // ],
    //
    // Version 3 example with multiple changes
    // 3: [
    //   'ALTER TABLE learning_sessions ADD COLUMN device_id TEXT',
    //   '''
    //   CREATE TABLE IF NOT EXISTS sync_conflicts_v2 (
    //     id TEXT PRIMARY KEY,
    //     -- ... new schema
    //   )
    //   ''',
    //   'INSERT INTO sync_conflicts_v2 SELECT * FROM conflicts',
    //   'DROP TABLE conflicts',
    //   'ALTER TABLE sync_conflicts_v2 RENAME TO conflicts',
    // ],
  };
}
