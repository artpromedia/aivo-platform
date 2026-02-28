/**
 * /settings/notifications → redirect to /settings?tab=notifications
 */
import { redirect } from 'next/navigation';

export default function SettingsNotificationsPage() {
  redirect('/settings?tab=notifications');
}
