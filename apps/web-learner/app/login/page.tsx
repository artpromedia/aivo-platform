import { redirect } from 'next/navigation';

// Learners don't login directly - redirect to join page
export default function LoginPage() {
  redirect('/join');
}
