import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const auth = await getAuthSession();
  if (auth) {
    redirect('/tenants');
  }

  return (
    <section className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="text-sm text-slate-600">Restricted to platform administrators.</p>
      <LoginForm />
    </section>
  );
}
