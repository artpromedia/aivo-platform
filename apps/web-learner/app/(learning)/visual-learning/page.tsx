import { Metadata } from 'next';
import { VisualLearningContainer } from './components/VisualLearningContainer';

export const metadata: Metadata = {
  title: 'Visual Learning Tools | AIVO',
  description: 'Mind mapping, diagram creation, video annotations, and visual note-taking tools',
};

export default function VisualLearningPage() {
  return <VisualLearningContainer />;
}
