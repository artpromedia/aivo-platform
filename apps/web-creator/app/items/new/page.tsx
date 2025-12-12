import { NewItemForm } from './new-item-form';

export default function NewItemPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold">
              Aivo Creator
            </a>
            <nav className="hidden sm:flex sm:gap-4">
              <a href="/items" className="text-sm font-medium text-muted-foreground hover:text-primary">
                My Items
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <a
            href="/items"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Items
          </a>
          <h1 className="mt-4 text-2xl font-bold">Create New Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a new content pack or embedded tool to the marketplace
          </p>
        </div>

        <NewItemForm />
      </main>
    </div>
  );
}
