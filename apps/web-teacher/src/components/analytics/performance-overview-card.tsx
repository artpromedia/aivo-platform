'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface PerformanceOverviewCardProps {
  title: string;
  value: string;
  description: string;
  trend?: 'up' | 'down' | 'stable';
  alert?: boolean;
}

export function PerformanceOverviewCard({
  title,
  value,
  description,
  trend = 'stable',
  alert = false,
}: PerformanceOverviewCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className={alert ? 'border-red-200 bg-red-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {alert ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          getTrendIcon()
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
