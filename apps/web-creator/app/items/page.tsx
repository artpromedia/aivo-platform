import { ItemsList } from './items-list';

export default function ItemsPage() {
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
              <a
                href="/items"
                className="text-sm font-medium text-primary"
              >
                My Items
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/items/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New Item
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">My Marketplace Items</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your content packs and embedded tools
          </p>
        </div>

        <ItemsList />
      </main>
    </div>
  );
}
