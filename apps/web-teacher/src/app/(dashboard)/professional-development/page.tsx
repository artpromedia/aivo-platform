import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfessionalDevelopmentDashboard } from '@/components/professional-development/pd-dashboard';
import { TrainingResourcesLibrary } from '@/components/professional-development/training-resources-library';
import { BestPracticesLibrary } from '@/components/professional-development/best-practices-library';
import { TeachingStrategiesLibrary } from '@/components/professional-development/teaching-strategies-library';

export default function ProfessionalDevelopmentPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Professional Development</h2>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="resources">Training Resources</TabsTrigger>
          <TabsTrigger value="practices">Best Practices</TabsTrigger>
          <TabsTrigger value="strategies">Teaching Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ProfessionalDevelopmentDashboard />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <TrainingResourcesLibrary />
        </TabsContent>

        <TabsContent value="practices" className="space-y-4">
          <BestPracticesLibrary />
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <TeachingStrategiesLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
