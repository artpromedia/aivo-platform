-- AIVO Platform - Database Initialization Script
-- Creates databases for Python services

-- AI Inference Service Database
CREATE DATABASE ai_inference;

-- Training Service Database
CREATE DATABASE training;

-- Curriculum Service Database
CREATE DATABASE curriculum;

-- API Gateway Database
CREATE DATABASE gateway;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ai_inference TO aivo;
GRANT ALL PRIVILEGES ON DATABASE training TO aivo;
GRANT ALL PRIVILEGES ON DATABASE curriculum TO aivo;
GRANT ALL PRIVILEGES ON DATABASE gateway TO aivo;

-- Connect to ai_inference and create schema
\c ai_inference
CREATE SCHEMA IF NOT EXISTS public;

-- Connect to training and create schema
\c training
CREATE SCHEMA IF NOT EXISTS public;

-- Connect to curriculum and create schema
\c curriculum
CREATE SCHEMA IF NOT EXISTS public;

-- Connect to gateway and create schema
\c gateway
CREATE SCHEMA IF NOT EXISTS public;

-- Create baseline_items table for assessment system
\c gateway
CREATE TABLE IF NOT EXISTS baseline_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(100) NOT NULL,
    grade_band VARCHAR(50) NOT NULL,
    difficulty FLOAT DEFAULT 0.5,
    discrimination FLOAT DEFAULT 1.0,
    guessing FLOAT DEFAULT 0.25,
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baseline_items_domain ON baseline_items(domain);
CREATE INDEX IF NOT EXISTS idx_baseline_items_grade_band ON baseline_items(grade_band);
