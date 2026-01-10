'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProgressCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
  href?: string;
}

export function ProgressCard({ icon, label, value, unit, trend, onClick, href }: ProgressCardProps) {
  const { t } = useTranslation('parent');

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getTrendLabel = () => {
    if (!trend) return null;
    return t(`progress.trend.${trend}`);
  };

  const isClickable = onClick || href;
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.location.href = href;
    }
  };

  const CardWrapper = isClickable ? 'button' : 'div';

  return (
    <CardWrapper
      onClick={isClickable ? handleClick : undefined}
      className={`card flex flex-col text-left w-full ${
        isClickable
          ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {isClickable && (
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {getTrendIcon()}
          <span
            className={`text-xs ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {getTrendLabel()}
          </span>
        </div>
      )}
    </CardWrapper>
  );
}
