import { createBrowserClient } from '@supabase/ssr';

// =============================================================================
// Supabase Client for Browser
// =============================================================================

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

// =============================================================================
// Database Types (generated from schema)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      learners: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          grade_band: 'K5' | 'G6_8' | 'G9_12';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['learners']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['learners']['Insert']>;
      };
      assessment_sessions: {
        Row: {
          id: string;
          learner_id: string;
          type: 'baseline' | 'progress' | 'subject';
          subject_id: string | null;
          started_at: string;
          completed_at: string | null;
          results: Record<string, unknown> | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: Omit<Database['public']['Tables']['assessment_sessions']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['assessment_sessions']['Insert']>;
      };
      assessment_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          domain: string | null;
          answer: Record<string, unknown>;
          latency_ms: number | null;
          is_correct: boolean | null;
          score: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assessment_answers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['assessment_answers']['Insert']>;
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          grade_level: 'K5' | 'G6_8' | 'G9_12';
          emoji: string;
          description: string;
          color: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
      };
      lessons: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          description: string;
          order_index: number;
          duration_minutes: number;
          content: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lessons']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>;
      };
      learner_progress: {
        Row: {
          id: string;
          learner_id: string;
          subject_id: string;
          lesson_id: string | null;
          progress_percentage: number;
          score: number | null;
          time_spent_minutes: number;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['learner_progress']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['learner_progress']['Insert']>;
      };
    };
  };
}
