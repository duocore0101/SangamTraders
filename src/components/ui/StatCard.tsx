import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  className,
}: StatCardProps) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50/80',
      iconColor: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50/80',
      iconColor: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50/80',
      iconColor: 'text-amber-600',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50/80',
      iconColor: 'text-rose-600',
      border: 'border-rose-100',
    },
    indigo: {
      bg: 'bg-indigo-50/80',
      iconColor: 'text-indigo-600',
      border: 'border-indigo-100',
    },
    slate: {
      bg: 'bg-slate-50',
      iconColor: 'text-slate-600',
      border: 'border-slate-200',
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden',
        className
      )}
    >
      {/* Top Row: Title + Icon Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate min-w-0">
          {title}
        </span>
        <div
          className={cn(
            'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 transition-transform',
            scheme.bg,
            scheme.iconColor,
            scheme.border
          )}
        >
          <div className="[&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-4.5 sm:[&>svg]:h-4.5 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>

      {/* Middle Row: Large Value */}
      <div className="min-w-0 my-0.5 sm:my-1">
        <h3
          className="text-base sm:text-2xl font-black text-slate-900 tracking-tight font-mono sm:font-sans truncate"
          title={typeof value === 'string' ? value : undefined}
        >
          {value}
        </h3>
      </div>

      {/* Bottom Row: Subtitle and/or Trend */}
      {(subtitle || trend) && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500 gap-1 min-w-0">
          {subtitle && (
            <span className="truncate min-w-0 text-slate-400 font-medium" title={subtitle}>
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={cn(
                'font-bold ml-auto shrink-0 flex items-center gap-0.5',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

