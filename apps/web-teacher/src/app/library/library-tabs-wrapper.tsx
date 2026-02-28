'use client';

/**
 * Library Tabs Wrapper
 *
 * Client component that manages the Marketplace / My Resources tab switch.
 * The Marketplace content is passed as children (server-rendered),
 * while "My Resources" renders the ResourceHubGrid (client, React Query).
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Plus } from 'lucide-react';

import { ResourceHubGrid } from './resource-hub-grid';

type Tab = 'marketplace' | 'resources';

interface LibraryTabsWrapperProps {
  marketplaceContent: ReactNode;
}

export function LibraryTabsWrapper({ marketplaceContent }: LibraryTabsWrapperProps) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'marketplace';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const search = searchParams.get('q') || undefined;
  const subject = searchParams.get('subject') || undefined;
  const grade = searchParams.get('gradeBand') || undefined;

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'marketplace'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-text'
            }`}
          >
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'resources'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-text'
            }`}
          >
            My Resources
          </button>
        </div>

        {/* Upload button – shown on My Resources tab */}
        {activeTab === 'resources' && (
          <Link
            href="/library/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Upload Resource
          </Link>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'marketplace' && marketplaceContent}

      {activeTab === 'resources' && (
        <ResourceHubGrid search={search} subject={subject} grade={grade} />
      )}
    </div>
  );
}
