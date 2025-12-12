import { ItemDetail } from './item-detail';

interface PageProps {
  params: Promise<{ itemId: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { itemId } = await params;

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
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                My Items
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ItemDetail itemId={itemId} />
      </main>
    </div>
  );
}
