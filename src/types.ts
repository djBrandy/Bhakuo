export type Page = 'home' | 'mentor' | 'learner' | 'settings' | 'auth' | 'live' | 'library';

export type UserRole = 'mentor' | 'pending_mentor' | 'learner';

export type ChatMessage = {
  role: 'user' | 'ai'
  text: string
  timestamp?: number
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  groq_api_key: string | null;
  created_at: string;
}

export type KnowledgeEntry = Knowledge;

export interface Knowledge {
  id: string;
  creator_id: string;
  english: string | null;
  swahili: string | null;
  kitaveta: string;
  pronunciation_guide: string | null;
  audio_url: string | null;
  context: string | null;
  social_context: string | null;
  audience: string;
  formality: string;
  time_of_day: string;
  time_context: string | null;
  expected_response: string | null;
  created_at: string;
}

export interface KnowledgeQueue {
  id: string;
  query: string;
  requested_by: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

export interface SyllabusLesson {
  id: string;
  unit_number: number;
  unit_title: string;
  unit: number;
  lesson_number: number;
  lesson_title: string;
  title: string;
  category: string;
  knowledge_ids: string[];
  description: string | null;
  content_tags: string[];
}

export interface LearnerProgress {
  user_id: string;
  lesson_id: string;
  completed: boolean;
  score: number;
  last_attempted: string;
}

export interface SyntaxPattern {
  id: string;
  pattern_name: string;
  rule_description: string;
  examples: { english: string; kitaveta: string }[];
}
