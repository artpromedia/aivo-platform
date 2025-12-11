-- Migration: Model Cards for AI Transparency
-- Created: 2024-12-10
-- Description: Stores model cards with capabilities, limitations, and safety considerations

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUM: AI Model Provider
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE model_provider AS ENUM (
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
  'INTERNAL',
  'META',
  'MISTRAL',
  'COHERE'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: model_cards
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE model_cards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Model identification
  model_key             TEXT NOT NULL UNIQUE,
  provider              model_provider NOT NULL,
  display_name          TEXT NOT NULL,
  
  -- Descriptions
  description           TEXT NOT NULL,
  intended_use_cases    TEXT NOT NULL,
  limitations           TEXT NOT NULL,
  safety_considerations TEXT NOT NULL,
  
  -- Input/Output capabilities
  input_types           TEXT NOT NULL,
  output_types          TEXT NOT NULL,
  
  -- Data and training info
  data_sources_summary  TEXT NOT NULL,
  
  -- Audit fields
  last_reviewed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_by      UUID,
  
  -- Extensible metadata
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_model_cards_provider ON model_cards(provider);
CREATE INDEX idx_model_cards_model_key ON model_cards(model_key);
CREATE INDEX idx_model_cards_last_reviewed ON model_cards(last_reviewed_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: tenant_model_assignments
-- Maps which models are available to each tenant based on their features
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE tenant_model_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  model_card_id UUID NOT NULL REFERENCES model_cards(id) ON DELETE CASCADE,
  feature_key   TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by   UUID,
  
  -- Ensure each tenant has only one assignment per model per feature
  UNIQUE(tenant_id, model_card_id, feature_key)
);

-- Indexes
CREATE INDEX idx_tenant_model_assignments_tenant ON tenant_model_assignments(tenant_id);
CREATE INDEX idx_tenant_model_assignments_model ON tenant_model_assignments(model_card_id);
CREATE INDEX idx_tenant_model_assignments_active ON tenant_model_assignments(tenant_id, is_active) WHERE is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Initial Model Cards
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO model_cards (
  model_key,
  provider,
  display_name,
  description,
  intended_use_cases,
  limitations,
  safety_considerations,
  input_types,
  output_types,
  data_sources_summary,
  last_reviewed_at,
  metadata_json
) VALUES
-- Aivo Tutor Model
(
  'AIVO_TUTOR_V1',
  'OPENAI',
  'Aivo Tutor',
  'An AI-powered tutoring assistant designed to help K-12 learners understand concepts through guided questions and scaffolded explanations. The model adapts its responses to the learner''s grade level and provides encouragement while maintaining educational best practices.',
  'Best for:
• Providing step-by-step explanations of concepts
• Answering curriculum-aligned questions
• Offering hints and guided practice
• Explaining mistakes in a supportive way
• Adapting language to different grade levels',
  'Not appropriate for:
• Medical, legal, or professional advice
• Grading or formal assessment decisions
• Replacing teacher judgment on student progress
• Handling sensitive student disclosures
• Making placement or intervention recommendations

Important: AI tutoring is a supplement to, not a replacement for, human instruction. Responses may occasionally contain errors or oversimplifications.',
  'Safety measures in place:
• Content filtered for age-appropriateness
• Guardrails prevent discussion of harmful topics
• Responses audited for bias and accuracy
• Human review of flagged interactions
• Automatic escalation for concerning content
• No personal data retained after session

Disclaimer: This is not a diagnostic tool and should not be used as a substitute for clinical evaluation or professional educational assessment.',
  'Text (student questions, responses, homework problems)',
  'Text (explanations, hints, feedback, encouragement)',
  'Trained on curated educational content aligned with Common Core and state standards. No student data is used for training. Regular human review ensures quality and accuracy.',
  '2024-12-01',
  '{"version": "1.0", "baseModel": "gpt-4o-mini", "context_window": 128000, "features": ["tutoring", "homework_help", "concept_explanation"]}'
),

-- Aivo Baseline Assessment Model
(
  'AIVO_BASELINE_V1',
  'OPENAI',
  'Aivo Baseline Assessment',
  'Analyzes learner responses during baseline assessments to determine starting skill levels. Uses natural language understanding to interpret free-form responses and compare them against grade-level expectations.',
  'Best for:
• Analyzing written responses for skill demonstration
• Identifying prerequisite knowledge gaps
• Suggesting appropriate starting points
• Processing diverse response formats
• Supporting initial learner placement',
  'Not appropriate for:
• Formal diagnostic assessment
• Special education eligibility decisions
• High-stakes placement decisions
• Clinical learning disability identification
• Summative grading

Important: Baseline results are preliminary indicators and should be validated by educators. Results may vary based on factors like test-taking conditions and language proficiency.',
  'Safety measures in place:
• Results presented as suggestions, not determinations
• Educator review required before finalizing placement
• Confidence scores indicate reliability
• Regular accuracy audits against human grading
• Bias testing across demographic groups

Disclaimer: AI-generated baselines are not a substitute for professional educational assessment. Always consult with qualified educators for placement decisions.',
  'Text (student responses, answer selections)',
  'Text (skill assessments, confidence scores, placement suggestions)',
  'Calibrated against educator-graded response samples across grade levels. Training data reviewed for demographic balance and curriculum alignment.',
  '2024-11-15',
  '{"version": "1.0", "baseModel": "gpt-4o", "features": ["baseline", "skill_assessment", "placement"]}'
),

-- Aivo Focus Agent
(
  'AIVO_FOCUS_V1',
  'INTERNAL',
  'Aivo Focus Assistant',
  'A rule-based system enhanced with machine learning that monitors learner engagement patterns and suggests appropriate breaks or interventions to maintain optimal focus during learning sessions.',
  'Best for:
• Detecting signs of learner disengagement
• Suggesting timely breaks
• Adjusting session pacing
• Providing focus-restoration activities
• Tracking attention patterns over time',
  'Not appropriate for:
• Diagnosing attention disorders
• Clinical ADHD assessment
• Medical recommendations
• Behavioral intervention planning
• Special education decisions

Important: Focus patterns vary naturally among learners. Detected attention patterns should not be interpreted as indicators of learning disabilities or behavioral issues.',
  'Safety measures in place:
• No diagnostic labels applied to learners
• Break suggestions are optional, not mandatory
• Parents can adjust sensitivity settings
• Data used only for session optimization
• No sharing of focus data with third parties

Disclaimer: This system identifies engagement patterns, not attention disorders. It is not a diagnostic tool and should not be used as evidence for clinical evaluation.',
  'Behavioral signals (response times, interaction patterns, session duration)',
  'Suggestions (break recommendations, activity switches, encouragement prompts)',
  'Trained on anonymized engagement patterns with no personally identifiable information. Regular validation against learner self-reported focus levels.',
  '2024-12-05',
  '{"version": "1.0", "type": "hybrid", "features": ["focus_detection", "break_scheduling", "engagement_monitoring"]}'
),

-- Aivo Content Recommender
(
  'AIVO_RECOMMENDER_V1',
  'INTERNAL',
  'Aivo Learning Path Recommender',
  'Uses collaborative filtering and curriculum mapping to suggest appropriate learning activities based on demonstrated skills, learning goals, and peer patterns while respecting configured difficulty bounds.',
  'Best for:
• Selecting next activities in learning paths
• Balancing challenge and success
• Personalizing content sequence
• Identifying skill-building opportunities
• Adapting to learner preferences',
  'Not appropriate for:
• Curriculum design decisions
• Grade-level promotions
• Special accommodations decisions
• Comparing learners to peers
• Modifying IEP goals

Important: Recommendations optimize for engagement and skill building, not standardized test preparation. Teacher judgment should guide major curriculum decisions.',
  'Safety measures in place:
• Difficulty bounds respect educator settings
• No competitive comparisons between learners
• Recommendations explainable to parents
• Regular equity audits on recommendation patterns
• Teacher override always available

Disclaimer: Automated recommendations should be reviewed in context of each learner''s individual needs and circumstances.',
  'Skill profiles, learning history, content metadata',
  'Activity recommendations, difficulty suggestions, path adjustments',
  'Uses curriculum-aligned content graphs and anonymized learning patterns. No demographic data used in recommendation algorithms.',
  '2024-11-20',
  '{"version": "1.0", "algorithms": ["collaborative_filtering", "knowledge_tracing"], "features": ["activity_selection", "difficulty_adjustment", "path_planning"]}'
),

-- Aivo Homework Parser
(
  'AIVO_HOMEWORK_PARSER_V1',
  'GOOGLE',
  'Aivo Homework Vision',
  'Uses optical character recognition and vision AI to extract text and mathematical notation from uploaded homework images, enabling the Homework Helper feature to assist with assigned problems.',
  'Best for:
• Extracting text from handwritten homework
• Recognizing mathematical notation
• Parsing problem structures
• Identifying question types
• Processing diverse image formats',
  'Not appropriate for:
• Grading homework quality
• Assessing handwriting
• Reading illegible content
• Processing non-educational content
• Bypassing academic integrity

Important: Parsing accuracy depends on image quality and handwriting clarity. Some content may require manual verification.',
  'Safety measures in place:
• Images processed securely and not retained
• No analysis of non-homework content
• Parsing failures routed to safe fallback
• Content filtered for appropriateness
• Student identification information redacted

Disclaimer: Parsed content should be verified for accuracy, especially for handwritten or complex mathematical notation.',
  'Images (photos of homework, worksheets, textbooks)',
  'Text (extracted problems, equations, instructions)',
  'Vision model trained on diverse handwriting samples and mathematical notation. No student images retained after processing.',
  '2024-10-30',
  '{"version": "1.0", "baseModel": "gemini-pro-vision", "features": ["ocr", "math_recognition", "layout_analysis"]}'
),

-- Aivo SEL Companion
(
  'AIVO_SEL_V1',
  'ANTHROPIC',
  'Aivo SEL Companion',
  'Provides age-appropriate social-emotional learning activities and reflections. Uses carefully crafted prompts to guide learners through SEL competencies while maintaining appropriate boundaries.',
  'Best for:
• Guided SEL activities and reflections
• Age-appropriate emotional vocabulary
• Positive coping strategy suggestions
• Self-awareness exercises
• Perspective-taking activities',
  'Not appropriate for:
• Mental health counseling
• Crisis intervention
• Trauma processing
• Behavioral therapy
• Replacing school counselors

Important: SEL activities complement, but do not replace, trained counselors and mental health professionals. Any concerning disclosures are flagged for human review.',
  'Safety measures in place:
• Strict content boundaries enforced
• Automatic escalation for concerning content
• No therapeutic relationship implied
• Activities vetted by SEL experts
• Parent visibility into SEL topics
• Crisis resources provided when appropriate

Disclaimer: This is an educational tool, not a mental health service. If a learner is in crisis, please contact a qualified professional or crisis hotline.',
  'Text (reflections, activity responses)',
  'Text (prompts, affirmations, activity guides)',
  'Content developed with certified SEL curriculum experts. Responses aligned with CASEL framework competencies.',
  '2024-11-25',
  '{"version": "1.0", "baseModel": "claude-3-haiku", "framework": "CASEL", "features": ["sel_activities", "reflection_prompts", "emotional_vocabulary"]}'
);

-- Comment on table
COMMENT ON TABLE model_cards IS 'AI model documentation for transparency and governance. Surfaces capabilities, limitations, and safety considerations to administrators.';
COMMENT ON TABLE tenant_model_assignments IS 'Maps which AI models are available to each tenant based on their enabled features.';
