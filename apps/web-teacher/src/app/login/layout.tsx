import type { ReactNode } from 'react';

/**
 * Login layout — no navigation chrome, no auth guard.
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
