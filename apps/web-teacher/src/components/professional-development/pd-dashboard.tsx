'use client';

import { useUserProgress, useLearningPaths } from '@/hooks/use-pd-resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, BookOpen, Clock, TrendingUp, Star } from 'lucide-react';

export function ProfessionalDevelopmentDashboard() {
  const { data: progress, isLoading: progressLoading } = useUserProgress();
  const { data: learningPaths, isLoading: pathsLoading } = useLearningPaths();

  const isLoading = progressLoading || pathsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.totalResourcesCompleted || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Learned</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.totalHoursLearned || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.certificates.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Paths */}
      {progress?.currentPaths && progress.currentPaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Learning Paths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progress.currentPaths.map((path) => (
                <Card key={path.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{path.title}</h3>
                        <p className="text-sm text-muted-foreground">{path.description}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {path.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {path.completedResources}/{path.totalResources} completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(path.completedResources / path.totalResources) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {path.milestones.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Milestones</p>
                        <div className="flex flex-wrap gap-2">
                          {path.milestones.map((milestone) => (
                            <Badge
                              key={milestone.id}
                              variant={milestone.achieved ? 'default' : 'outline'}
                            >
                              {milestone.achieved && <Star className="h-3 w-3 mr-1" />}
                              {milestone.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {progress?.recentActivity && progress.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progress.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">{activity.resourceTitle}</p>
                    <p className="text-muted-foreground">
                      {new Date(activity.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificates */}
      {progress?.certificates && progress.certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {progress.certificates.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={cert.badgeUrl}
                        alt={cert.title}
                        className="w-16 h-16 rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{cert.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Issued by {cert.issuer}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(cert.issueDate).toLocaleDateString()} • {cert.hours} hours
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 mt-2"
                          onClick={() => window.open(cert.credentialUrl, '_blank')}
                        >
                          View Credential
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Resources */}
      {progress?.recommendedResources && progress.recommendedResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended for You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {progress.recommendedResources.slice(0, 3).map((resource) => (
                <Card key={resource.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize">
                        {resource.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {resource.duration} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
