-- ND-2.3: Anxiety and Overwhelm Detection
-- Migration to add emotional state detection and intervention tables

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Emotional state enum covering positive, neutral, concerning, warning, and critical states
CREATE TYPE emotional_state AS ENUM (
    -- Positive states
    'CALM',
    'FOCUSED',
    'ENGAGED',
    'HAPPY',
    'EXCITED',
    'PROUD',
    'CURIOUS',
    -- Neutral states
    'NEUTRAL',
    'TIRED',
    'DISTRACTED',
    -- Concerning states
    'CONFUSED',
    'UNCERTAIN',
    'HESITANT',
    -- Warning states
    'FRUSTRATED',
    'ANXIOUS',
    'WORRIED',
    'STRESSED',
    'OVERWHELMED',
    -- Critical states
    'HIGHLY_ANXIOUS',
    'HIGHLY_FRUSTRATED',
    'MELTDOWN_RISK',
    'SHUTDOWN_RISK'
);

-- Intervention type enum
CREATE TYPE intervention_type AS ENUM (
    'BREATHING',      -- Breathing exercises
    'GROUNDING',      -- Sensory grounding (5-4-3-2-1)
    'MOVEMENT',       -- Physical movement/stretching
    'SENSORY',        -- Sensory tools (squeeze, fidget)
    'COGNITIVE',      -- Thought reframing
    'DISTRACTION',    -- Brief distraction activity
    'SOCIAL',         -- Check-in with adult
    'BREAK',          -- Full break from activity
    'ENVIRONMENT',    -- Environmental adjustment
    'ENCOURAGEMENT'   -- Positive affirmation
);

-- ============================================================================
-- EMOTIONAL STATE EVENT TABLE
-- ============================================================================

CREATE TABLE emotional_state_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    learner_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,

    -- Detected state
    primary_state emotional_state NOT NULL,
    secondary_state emotional_state,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

    -- State details
    state_intensity FLOAT NOT NULL CHECK (state_intensity >= 0 AND state_intensity <= 10),
    state_details JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Detection source
    detection_source TEXT[] NOT NULL DEFAULT '{}',

    -- Context
    activity_id TEXT,
    activity_type TEXT,
    content_id TEXT,

    -- Timing
    time_in_activity_seconds INT,
    time_since_last_break INT,
    consecutive_errors INT NOT NULL DEFAULT 0,

    -- Intervention
    intervention_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    intervention_type intervention_type,
    intervention_id UUID,
    intervention_accepted BOOLEAN,

    -- Outcome
    state_after_intervention emotional_state,
    state_improved BOOLEAN,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for emotional_state_events
CREATE INDEX idx_emotional_state_events_session_id ON emotional_state_events(session_id);
CREATE INDEX idx_emotional_state_events_learner_id ON emotional_state_events(learner_id);
CREATE INDEX idx_emotional_state_events_primary_state ON emotional_state_events(primary_state);
CREATE INDEX idx_emotional_state_events_tenant_timestamp ON emotional_state_events(tenant_id, created_at DESC);
CREATE INDEX idx_emotional_state_events_intervention ON emotional_state_events(learner_id, intervention_triggered, intervention_accepted);

-- ============================================================================
-- ANXIETY PATTERN TABLE
-- ============================================================================

CREATE TABLE anxiety_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,

    -- Pattern info
    pattern_type TEXT NOT NULL,
    pattern_name TEXT NOT NULL,

    -- Triggers (array of {type, value, weight})
    triggers JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Behavioral indicators
    behavioral_indicators JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Historical data
    occurrence_count INT NOT NULL DEFAULT 0,
    last_occurrence TIMESTAMPTZ,
    average_intensity FLOAT NOT NULL DEFAULT 0,

    -- Effective interventions [{interventionId, successRate, usageCount}]
    effective_interventions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint per learner per pattern type
    CONSTRAINT anxiety_patterns_learner_type_unique UNIQUE (learner_id, pattern_type)
);

-- Indexes for anxiety_patterns
CREATE INDEX idx_anxiety_patterns_learner_id ON anxiety_patterns(learner_id);
CREATE INDEX idx_anxiety_patterns_tenant_id ON anxiety_patterns(tenant_id);

-- ============================================================================
-- OVERWHELM THRESHOLD TABLE
-- ============================================================================

CREATE TABLE overwhelm_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL,

    -- Thresholds (all 0-10 scale, lower = more sensitive)
    cognitive_load_threshold FLOAT NOT NULL DEFAULT 7 CHECK (cognitive_load_threshold >= 0 AND cognitive_load_threshold <= 10),
    sensory_load_threshold FLOAT NOT NULL DEFAULT 7 CHECK (sensory_load_threshold >= 0 AND sensory_load_threshold <= 10),
    emotional_load_threshold FLOAT NOT NULL DEFAULT 6 CHECK (emotional_load_threshold >= 0 AND emotional_load_threshold <= 10),
    time_on_task_threshold INT NOT NULL DEFAULT 20, -- minutes
    consecutive_errors_threshold INT NOT NULL DEFAULT 5,

    -- Recovery requirements
    min_break_after_overwhelm_min INT NOT NULL DEFAULT 5,
    preferred_calming_activities TEXT[] NOT NULL DEFAULT '{}',

    -- Auto-adjustment settings
    auto_adjust_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_auto_adjust TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for overwhelm_thresholds
CREATE INDEX idx_overwhelm_thresholds_tenant_id ON overwhelm_thresholds(tenant_id);

-- ============================================================================
-- INTERVENTION TABLE
-- ============================================================================

CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,

    -- Intervention info
    name TEXT NOT NULL,
    type intervention_type NOT NULL,
    description TEXT NOT NULL,

    -- Content (instructions, mediaUrl, steps, duration)
    content JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Targeting
    target_states emotional_state[] NOT NULL DEFAULT '{}',
    target_intensity_min FLOAT NOT NULL DEFAULT 0 CHECK (target_intensity_min >= 0 AND target_intensity_min <= 10),
    target_intensity_max FLOAT NOT NULL DEFAULT 10 CHECK (target_intensity_max >= 0 AND target_intensity_max <= 10),

    -- Requirements
    requires_audio BOOLEAN NOT NULL DEFAULT FALSE,
    requires_motion BOOLEAN NOT NULL DEFAULT FALSE,
    requires_privacy BOOLEAN NOT NULL DEFAULT FALSE,

    -- Effectiveness tracking
    usage_count INT NOT NULL DEFAULT 0,
    success_rate FLOAT NOT NULL DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 1),

    -- Status
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for interventions
CREATE INDEX idx_interventions_tenant_id ON interventions(tenant_id);
CREATE INDEX idx_interventions_type ON interventions(type);
CREATE INDEX idx_interventions_active ON interventions(is_active, tenant_id);
CREATE INDEX idx_interventions_target_states ON interventions USING gin(target_states);

-- ============================================================================
-- LEARNER INTERVENTION HISTORY TABLE
-- ============================================================================

CREATE TABLE learner_intervention_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    intervention_id UUID NOT NULL REFERENCES interventions(id),

    -- Usage tracking
    usage_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    success_rate FLOAT NOT NULL DEFAULT 0,

    -- Last usage
    last_used_at TIMESTAMPTZ,
    last_state_before emotional_state,
    last_state_after emotional_state,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint per learner per intervention
    CONSTRAINT learner_intervention_history_unique UNIQUE (learner_id, intervention_id)
);

-- Indexes for learner_intervention_history
CREATE INDEX idx_learner_intervention_history_learner ON learner_intervention_history(learner_id);
CREATE INDEX idx_learner_intervention_history_success ON learner_intervention_history(learner_id, success_rate DESC);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_anxiety_patterns_updated_at
    BEFORE UPDATE ON anxiety_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overwhelm_thresholds_updated_at
    BEFORE UPDATE ON overwhelm_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at
    BEFORE UPDATE ON interventions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learner_intervention_history_updated_at
    BEFORE UPDATE ON learner_intervention_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT INTERVENTIONS
-- ============================================================================

INSERT INTO interventions (tenant_id, name, type, description, content, target_states, target_intensity_min, target_intensity_max, is_default, is_active)
VALUES
    -- Breathing exercises
    ('__default__', 'Deep Breathing', 'BREATHING', 'Guided deep breathing exercise with visual circle', 
     '{"instructions": "Take 3 deep breaths following the circle", "duration": 60, "steps": ["Breathe in for 4 seconds", "Hold for 2 seconds", "Breathe out for 4 seconds"]}',
     ARRAY['ANXIOUS', 'HIGHLY_ANXIOUS', 'STRESSED', 'WORRIED', 'OVERWHELMED']::emotional_state[],
     4, 10, TRUE, TRUE),
    
    ('__default__', 'Belly Breathing', 'BREATHING', 'Calming belly breathing for younger learners',
     '{"instructions": "Put your hands on your belly and feel it rise and fall", "duration": 45, "steps": ["Breathe in through your nose", "Feel your belly grow like a balloon", "Slowly let the air out"]}',
     ARRAY['ANXIOUS', 'STRESSED', 'WORRIED']::emotional_state[],
     3, 7, TRUE, TRUE),

    -- Grounding exercises
    ('__default__', '5-4-3-2-1 Grounding', 'GROUNDING', 'Sensory grounding exercise using five senses',
     '{"instructions": "Name things you can sense around you", "duration": 120, "steps": ["5 things you can see", "4 things you can touch", "3 things you can hear", "2 things you can smell", "1 thing you can taste"]}',
     ARRAY['ANXIOUS', 'HIGHLY_ANXIOUS', 'OVERWHELMED', 'MELTDOWN_RISK']::emotional_state[],
     5, 10, TRUE, TRUE),
    
    ('__default__', 'Safe Place Visualization', 'GROUNDING', 'Imagine a calm and safe place',
     '{"instructions": "Close your eyes and imagine your favorite safe place", "duration": 90, "steps": ["Picture a place where you feel safe", "What do you see there?", "What sounds do you hear?", "How does it feel?"]}',
     ARRAY['ANXIOUS', 'STRESSED', 'WORRIED', 'OVERWHELMED']::emotional_state[],
     4, 8, TRUE, TRUE),

    -- Movement exercises
    ('__default__', 'Stretch Break', 'MOVEMENT', 'Quick stretching exercises to release tension',
     '{"instructions": "Follow these simple stretches", "duration": 60, "steps": ["Reach up high", "Touch your toes", "Roll your shoulders", "Shake it out"]}',
     ARRAY['FRUSTRATED', 'HIGHLY_FRUSTRATED', 'STRESSED', 'TIRED']::emotional_state[],
     4, 8, TRUE, TRUE),
    
    ('__default__', 'Energy Release', 'MOVEMENT', 'Physical movement to release frustration energy',
     '{"instructions": "Move your body to feel better", "duration": 45, "steps": ["Jump in place 10 times", "Do 5 arm circles", "March in place", "Take a deep breath"]}',
     ARRAY['FRUSTRATED', 'HIGHLY_FRUSTRATED', 'OVERWHELMED']::emotional_state[],
     5, 9, TRUE, TRUE),

    -- Sensory exercises
    ('__default__', 'Squeeze and Release', 'SENSORY', 'Muscle tension release exercise',
     '{"instructions": "Squeeze your muscles tight, then let go", "duration": 45, "steps": ["Make tight fists", "Hold for 5 seconds", "Release and relax", "Notice how your hands feel"]}',
     ARRAY['ANXIOUS', 'STRESSED', 'OVERWHELMED', 'SHUTDOWN_RISK']::emotional_state[],
     4, 10, TRUE, TRUE),

    -- Encouragement
    ('__default__', 'You Can Do This', 'ENCOURAGEMENT', 'Positive affirmations and encouragement',
     '{"instructions": "Remember how awesome you are!", "duration": 30, "affirmations": ["You are doing an amazing job!", "It is okay to find things hard sometimes", "You are brave for trying", "Everyone makes mistakes - that is how we learn!", "You have got this!"]}',
     ARRAY['FRUSTRATED', 'WORRIED', 'STRESSED', 'CONFUSED', 'UNCERTAIN']::emotional_state[],
     3, 7, TRUE, TRUE),
    
    ('__default__', 'Celebration Moment', 'ENCOURAGEMENT', 'Celebrate your effort and progress',
     '{"instructions": "Let us celebrate!", "duration": 20, "affirmations": ["Great job sticking with it!", "Your hard work is paying off!", "You should be proud of yourself!"]}',
     ARRAY['TIRED', 'FRUSTRATED']::emotional_state[],
     2, 5, TRUE, TRUE),

    -- Break
    ('__default__', 'Quick Break', 'BREAK', 'Short break to reset and recharge',
     '{"instructions": "Take a short break", "duration": 120, "suggestions": ["Get a drink of water", "Look out the window", "Walk around for a minute"]}',
     ARRAY['TIRED', 'OVERWHELMED', 'FRUSTRATED', 'HIGHLY_FRUSTRATED']::emotional_state[],
     5, 10, TRUE, TRUE),
    
    ('__default__', 'Full Reset Break', 'BREAK', 'Longer break for when things feel like too much',
     '{"instructions": "Let us take a real break", "duration": 300, "suggestions": ["Step away from the screen", "Do something you enjoy", "Come back when you feel ready"]}',
     ARRAY['MELTDOWN_RISK', 'SHUTDOWN_RISK', 'HIGHLY_ANXIOUS', 'HIGHLY_FRUSTRATED']::emotional_state[],
     7, 10, TRUE, TRUE),

    -- Distraction
    ('__default__', 'Quick Fun Activity', 'DISTRACTION', 'Brief fun activity to reset mood',
     '{"instructions": "Let us do something fun for a moment", "duration": 60, "activities": ["Draw a quick doodle", "Think of 3 animals you like", "Count backwards from 20"]}',
     ARRAY['FRUSTRATED', 'STRESSED', 'DISTRACTED']::emotional_state[],
     3, 6, TRUE, TRUE),

    -- Social
    ('__default__', 'Talk to Someone', 'SOCIAL', 'Connect with a trusted adult',
     '{"instructions": "It might help to talk to someone", "duration": 0, "suggestions": ["Find a teacher or parent", "Tell them how you are feeling", "It is okay to ask for help"]}',
     ARRAY['HIGHLY_ANXIOUS', 'MELTDOWN_RISK', 'SHUTDOWN_RISK']::emotional_state[],
     7, 10, TRUE, TRUE);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE emotional_state_events IS 'Logs emotional state detections during learning sessions';
COMMENT ON TABLE anxiety_patterns IS 'Learned anxiety patterns specific to each learner';
COMMENT ON TABLE overwhelm_thresholds IS 'Personalized overwhelm thresholds for each learner';
COMMENT ON TABLE interventions IS 'Available calming and regulation interventions';
COMMENT ON TABLE learner_intervention_history IS 'Tracks intervention effectiveness per learner';
