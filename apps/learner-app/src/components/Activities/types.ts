export interface Problem {
  id: string;
  title: string;
  content: string;
  type: 'arithmetic' | 'word_problem' | 'geometry' | 'pattern';
  difficulty: number;
  hints: string[];
  solution: string;
  explanation: string;
}

export interface ActivityResult {
  correct: boolean;
  attempts: number;
  timeSpent: number;
  hintsUsed?: number;
  score?: number;
}

export interface ActivityProps {
  problem: Problem;
  onComplete: (result: ActivityResult) => void;
  showTimer?: boolean;
  maxAttempts?: number;
}

export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  difficulty: number;
  gradeLevel: string;
  questions: ComprehensionQuestion[];
}

export interface ComprehensionQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: string[];
  correctAnswer: string;
  points: number;
}

export interface GameConfig {
  id: string;
  type: 'matching' | 'sorting' | 'puzzle' | 'memory';
  title: string;
  instructions: string;
  items: GameItem[];
  timeLimit?: number;
  difficulty: number;
}

export interface GameItem {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  category?: string;
  matchId?: string;
}

export interface GameResult {
  completed: boolean;
  score: number;
  timeSpent: number;
  accuracy: number;
  streakBonus?: number;
}
