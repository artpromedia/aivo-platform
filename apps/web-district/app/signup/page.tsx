import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

import { SignUpWizard } from './SignUpWizard';

export const metadata = {
  title: 'Sign Up | Aivo',
  description: 'Create your district account on the AIVO platform',
};

export default async function SignUpPage() {
  const auth = await getAuthSession();
  if (auth) {
    redirect('/dashboard');
  }

  return (
    <section className="mx-auto max-w-2xl py-8">
      <SignUpWizard />
    </section>
  );
}
