'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ProfessionalDevelopmentDashboard } from '@/components/professional-development/pd-dashboard';
import { TrainingResourcesLibrary } from '@/components/professional-development/training-resources-library';
import { BestPracticesLibrary } from '@/components/professional-development/best-practices-library';
import { TeachingStrategiesLibrary } from '@/components/professional-development/teaching-strategies-library';
import { TrainingModules } from '@/components/professional-development/training-modules';
import { PeerCollaboration } from '@/components/professional-development/peer-collaboration';
import { ResourceLibrary } from '@/components/professional-development/resource-library';
import { CertificationTracker } from '@/components/professional-development/certification-tracker';
import {
  BookOpen,
  Award,
  Clock,
  Trophy,
  TrendingUp,
  Target,
  Sparkles,
} from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  total?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgColor: string;
}

function StatCard({ icon, label, value, total, trend, bgColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColor}`}>
            {icon}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <TrendingUp
                className={`h-4 w-4 ${!trend.isPositive ? 'rotate-180' : ''}`}
              />
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-gray-900">
            {value}
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">/{total}</span>
            )}
          </div>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface PDStats {
  modulesCompleted: number;
  totalModules: number;
  certifications: number;
  hoursCompleted: number;
  badgesEarned: number;
  currentStreak: number;
}

export default function ProfessionalDevelopmentPage() {
  const [stats] = useState<PDStats>({
    modulesCompleted: 12,
    totalModules: 24,
    certifications: 4,
    hoursCompleted: 86,
    badgesEarned: 8,
    currentStreak: 5,
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Professional Development</h2>
          <p className="text-gray-600 mt-1">
            Grow your skills, earn certifications, and connect with peers
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-primary-700">
            {stats.currentStreak} day streak!
          </span>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="h-6 w-6 text-blue-600" />}
          label="Modules Completed"
          value={stats.modulesCompleted}
          total={stats.totalModules}
          trend={{ value: 15, isPositive: true }}
          bgColor="bg-blue-100"
        />
        <StatCard
          icon={<Award className="h-6 w-6 text-purple-600" />}
          label="Certifications"
          value={stats.certifications}
          bgColor="bg-purple-100"
        />
        <StatCard
          icon={<Clock className="h-6 w-6 text-green-600" />}
          label="Hours Completed"
          value={stats.hoursCompleted}
          trend={{ value: 8, isPositive: true }}
          bgColor="bg-green-100"
        />
        <StatCard
          icon={<Trophy className="h-6 w-6 text-yellow-600" />}
          label="Badges Earned"
          value={stats.badgesEarned}
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Training Modules</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="practices">Best Practices</TabsTrigger>
          <TabsTrigger value="strategies">Teaching Strategies</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Dashboard Layout */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Learning Progress Dashboard */}
              <ProfessionalDevelopmentDashboard />

              {/* Featured Training Modules */}
              <TrainingModules />
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* Certification Tracker - Compact */}
              <CertificationTracker compact />

              {/* Peer Collaboration */}
              <PeerCollaboration />

              {/* Resource Library - Compact */}
              <ResourceLibrary compact />
            </div>
          </div>
        </TabsContent>

        {/* Training Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrainingModules />
            </div>
            <div className="space-y-6">
              <CertificationTracker compact />
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Goals
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium">Complete IEP Training</p>
                      <p className="text-xs text-gray-500 mt-1">Due: Feb 28, 2025</p>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-3/4" />
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium">Earn Tech Integration Badge</p>
                      <p className="text-xs text-gray-500 mt-1">Due: Mar 15, 2025</p>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-2/5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrainingResourcesLibrary />
            </div>
            <div>
              <ResourceLibrary />
            </div>
          </div>
        </TabsContent>

        {/* Best Practices Tab */}
        <TabsContent value="practices" className="space-y-6">
          <BestPracticesLibrary />
        </TabsContent>

        {/* Teaching Strategies Tab */}
        <TabsContent value="strategies" className="space-y-6">
          <TeachingStrategiesLibrary />
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CertificationTracker />
            </div>
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Recommended Certifications
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                      <p className="text-sm font-medium">Advanced Assessment Design</p>
                      <p className="text-xs text-gray-500 mt-1">30 PD hours</p>
                      <p className="text-xs text-primary-600 mt-1">Based on your interests</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                      <p className="text-sm font-medium">Social-Emotional Learning Leader</p>
                      <p className="text-xs text-gray-500 mt-1">25 PD hours</p>
                      <p className="text-xs text-primary-600 mt-1">High demand in your district</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                      <p className="text-sm font-medium">Data-Driven Instruction</p>
                      <p className="text-xs text-gray-500 mt-1">20 PD hours</p>
                      <p className="text-xs text-primary-600 mt-1">Builds on completed courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <PeerCollaboration />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
