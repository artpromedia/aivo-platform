import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const auth = await getAuthSession();
  if (auth) {
    redirect('/dashboard');
  }

  return (
    <section className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-sm text-slate-600">Sign in with your district admin account.</p>
      <LoginForm />
    </section>
  );
}
