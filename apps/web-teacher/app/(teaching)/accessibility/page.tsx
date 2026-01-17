import type { Metadata } from 'next';
import { AccessibilityDashboard } from './components/AccessibilityDashboard';

export const metadata: Metadata = {
  title: 'Accessibility Dashboard - AIVO Teacher',
  description: 'Manage student accommodations, monitor progress, and access IEP resources',
};

export default function AccessibilityPage() {
  return <AccessibilityDashboard />;
}
