'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aivo/ui-web';

import { ResourceDashboard } from '@/components/resource-library/resource-dashboard';
import { ResourceBrowser } from '@/components/resource-library/resource-browser';
import { VideoLibrary } from '@/components/resource-library/video-library';
import { GuideLibrary } from '@/components/resource-library/guide-library';

export default function ResourceLibraryPage() {
  return (
    <div className="p-8 pt-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Library</h1>
        <p className="text-muted-foreground mt-1">
          Access learning resources, video tutorials, and step-by-step guides to support your child's education
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="resources">All Resources</TabsTrigger>
          <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
          <TabsTrigger value="guides">Step-by-Step Guides</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ResourceDashboard />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceBrowser />
        </TabsContent>

        <TabsContent value="videos">
          <VideoLibrary />
        </TabsContent>

        <TabsContent value="guides">
          <GuideLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
