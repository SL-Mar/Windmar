'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function Card({ children, className, title, subtitle, icon }: CardProps) {
  return (
    <div className={cn('glass rounded-xl p-6 shadow-maritime animate-fadeIn', className)}>
      {(title || subtitle || icon) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
          {icon && <div className="text-primary-400">{icon}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">{label}</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className={cn('p-3 rounded-lg bg-white/5', trend && trendColors[trend])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
