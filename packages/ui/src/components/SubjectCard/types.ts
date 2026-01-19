import type { SubjectInfo } from '../../types';

export interface SubjectCardProps {
  /** Subject information */
  subject: SubjectInfo;
  /** Whether the card is selected */
  selected?: boolean;
  /** Callback when card is clicked */
  onClick?: (subjectId: string) => void;
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}
