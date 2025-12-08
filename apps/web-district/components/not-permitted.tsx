import type { Role } from '@aivo/ts-rbac';
import { Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';

export function NotPermitted({
  title,
  allowedRoles,
  retryHref,
}: {
  title?: string;
  allowedRoles: Role[];
  retryHref?: string;
}) {
  return (
    <Card className="border-warning bg-warning/10">
      <Heading level={2} className="text-warning">
        {title ?? 'Access restricted'}
      </Heading>
      <p className="mt-2 text-sm text-muted">
        This page is only available to: {allowedRoles.join(', ')}.
      </p>
      {retryHref && (
        <Link href={retryHref} className="mt-4 inline-block">
          <Button variant="secondary">Return to login</Button>
        </Link>
      )}
    </Card>
  );
}
