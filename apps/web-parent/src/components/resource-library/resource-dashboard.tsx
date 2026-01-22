'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@aivo/ui-web';
import { 
  BookOpen,
  Video,
  FileText,
  Bookmark,
  Heart,
  Download,
  TrendingUp,
  Clock,
  Star,
} from 'lucide-react';
import { useUserActivity } from '@/hooks/use-resource-library';

const resourceTypeIcons = {
  video: Video,
  article: FileText,
  guide: BookOpen,
  webinar: Video,
  pdf: FileText,
  interactive: BookOpen,
};

export function ResourceDashboard() {
  const { data: activity, isLoading } = useUserActivity();

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!activity) {
    return null;
  }

  const stats = [
    {
      title: 'Bookmarked',
      value: activity.bookmarked.length,
      icon: Bookmark,
      color: 'text-blue-600',
    },
    {
      title: 'Favorites',
      value: activity.favorites.length,
      icon: Heart,
      color: 'text-red-600',
    },
    {
      title: 'Downloaded',
      value: activity.downloaded.length,
      icon: Download,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Viewed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activity.recentlyViewed.slice(0, 5).map((resource) => {
              const Icon = resourceTypeIcons[resource.type];
              return (
                <div
                  key={resource.id}
                  className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted cursor-pointer"
                >
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium line-clamp-1">{resource.title}</h4>
                      <Badge variant="outline" className="flex-shrink-0">
                        {resource.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                    {resource.lastViewed && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Viewed {new Date(resource.lastViewed).toLocaleDateString()}
                      </p>
                    )}
                    {resource.progress && resource.progress > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-muted-foreground">{resource.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div
                            className="bg-primary rounded-full h-1.5"
                            style={{ width: `${resource.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Bookmarked Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.bookmarked.slice(0, 5).map((resource) => {
                const Icon = resourceTypeIcons[resource.type];
                return (
                  <div
                    key={resource.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{resource.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {resource.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activity.bookmarked.length > 5 && (
                <Button variant="outline" className="w-full" size="sm">
                  View All ({activity.bookmarked.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Favorite Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.favorites.slice(0, 5).map((resource) => {
                const Icon = resourceTypeIcons[resource.type];
                return (
                  <div
                    key={resource.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{resource.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{resource.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activity.favorites.length > 5 && (
                <Button variant="outline" className="w-full" size="sm">
                  View All ({activity.favorites.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {activity.recommendedForYou.slice(0, 3).map((resource) => {
              const Icon = resourceTypeIcons[resource.type];
              return (
                <div
                  key={resource.id}
                  className="flex flex-col gap-2 p-4 rounded-lg border hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <Badge variant="outline">{resource.type}</Badge>
                  </div>
                  <h4 className="font-medium line-clamp-2">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {resource.description}
                  </p>
                  <div className="flex items-center gap-3 mt-auto pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{resource.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{resource.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popular Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {activity.popularResources.slice(0, 4).map((resource) => {
              const Icon = resourceTypeIcons[resource.type];
              return (
                <div
                  key={resource.id}
                  className="flex gap-4 p-3 rounded-lg border hover:bg-muted cursor-pointer"
                >
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-1 mb-1">{resource.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline">{resource.type}</Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{resource.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {resource.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
