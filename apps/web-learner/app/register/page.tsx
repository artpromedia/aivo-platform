import { redirect } from 'next/navigation';

// Learners don't register directly - redirect to access page
export default function RegisterPage() {
  redirect('/access');
}
