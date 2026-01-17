'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentForum } from '@/components/community-support/parent-forum';
import { ExpertQA } from '@/components/community-support/expert-qa';
import { SupportGroups } from '@/components/community-support/support-groups';

export default function CommunitySupportPage() {
  return (
    <div className="p-8 pt-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community Support</h1>
        <p className="text-muted-foreground mt-1">
          Connect with other parents, get expert advice, and join support groups
        </p>
      </div>

      <Tabs defaultValue="forum" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forum">Parent Forum</TabsTrigger>
          <TabsTrigger value="qa">Expert Q&A</TabsTrigger>
          <TabsTrigger value="groups">Support Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="forum">
          <ParentForum />
        </TabsContent>

        <TabsContent value="qa">
          <ExpertQA />
        </TabsContent>

        <TabsContent value="groups">
          <SupportGroups />
        </TabsContent>
      </Tabs>
    </div>
  );
}
