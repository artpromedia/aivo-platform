import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      assessment_sessions: {
        Row: {
          id: string;
          learner_id: string;
          type: 'baseline' | 'progress' | 'subject';
          subject_id: string | null;
          started_at: string;
          completed_at: string | null;
          results: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          learner_id: string;
          type: 'baseline' | 'progress' | 'subject';
          subject_id?: string | null;
          started_at: string;
          completed_at?: string | null;
          results?: Record<string, unknown> | null;
        };
        Update: {
          completed_at?: string | null;
          results?: Record<string, unknown> | null;
        };
      };
      assessment_responses: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          answer: unknown;
          is_correct: boolean | null;
          time_taken_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          answer: unknown;
          is_correct?: boolean | null;
          time_taken_ms?: number | null;
        };
        Update: {
          is_correct?: boolean | null;
        };
      };
      learner_progress: {
        Row: {
          id: string;
          learner_id: string;
          subject_id: string;
          progress_percentage: number;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          learner_id: string;
          subject_id: string;
          progress_percentage?: number;
          last_activity_at?: string;
        };
        Update: {
          progress_percentage?: number;
          last_activity_at?: string;
        };
      };
      lesson_progress: {
        Row: {
          id: string;
          learner_id: string;
          lesson_id: string;
          progress_percentage: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          learner_id: string;
          lesson_id: string;
          progress_percentage?: number;
          completed_at?: string | null;
        };
        Update: {
          progress_percentage?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          grade_level: 'K5' | 'MS' | 'HS';
          emoji: string;
          color: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          grade_level: 'K5' | 'MS' | 'HS';
          emoji: string;
          color: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          emoji?: string;
          color?: string;
          description?: string | null;
        };
      };
    };
  };
};
