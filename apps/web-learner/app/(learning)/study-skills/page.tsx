import type { Metadata } from 'next';
import { StudySkillsContainer } from './components/StudySkillsContainer';

export const metadata: Metadata = {
  title: 'Study Skills | AIVO',
  description: 'Note-taking templates, study guides, memory techniques, and test prep tools',
};

export default function StudySkillsPage() {
  return <StudySkillsContainer />;
}
