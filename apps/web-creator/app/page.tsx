import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Aivo Creator Portal</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Create, manage, and publish marketplace content for the Aivo platform.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/items"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View My Items
          </Link>
          <Link
            href="/items/new"
            className="rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium hover:bg-muted"
          >
            Create New Item
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-6 text-left">
            <h3 className="font-semibold">Content Packs</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bundle Learning Objects into curated content packs for teachers and students.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-6 text-left">
            <h3 className="font-semibold">Embedded Tools</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Integrate third-party apps and tools into the Aivo learning experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
