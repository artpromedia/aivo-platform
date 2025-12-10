'use client';

import { Button, Card } from '@aivo/ui-web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // In a real app, this would authenticate against auth-svc
  // For now, we'll use a mock login for development
  const handleDevLogin = async (role: 'author' | 'reviewer' | 'admin') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Login failed');
      router.push('/learning-objects');
      router.refresh();
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text">Aivo Author</h1>
          <p className="mt-2 text-sm text-muted">Content Authoring Platform</p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">Development Login</p>
          <Button className="w-full" onClick={() => handleDevLogin('author')} disabled={loading}>
            Login as Author
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => handleDevLogin('reviewer')}
            disabled={loading}
          >
            Login as Reviewer
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => handleDevLogin('admin')}
            disabled={loading}
          >
            Login as Admin
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          This is a development login. In production, use SSO.
        </p>
      </Card>
    </div>
  );
}
