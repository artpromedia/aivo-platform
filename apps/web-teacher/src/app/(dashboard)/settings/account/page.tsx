/**
 * /settings/account → redirect to /settings?tab=profile
 */
import { redirect } from 'next/navigation';

export default function SettingsAccountPage() {
  redirect('/settings?tab=profile');
}
