import { Metadata } from 'next';
import { CommunicationDashboard } from './components/CommunicationDashboard';

export const metadata: Metadata = {
  title: 'Communication - AIVO Parent Portal',
  description: 'Stay connected with teachers, track progress, and access resources',
};

export default function CommunicationPage() {
  return <CommunicationDashboard />;
}
