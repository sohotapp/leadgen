'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-bg-tertiary',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        className
      )}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  );
};

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
      <Skeleton variant="rectangular" width={16} height={16} />
      <Skeleton variant="circular" width={8} height={8} />
      <div className="flex-1 space-y-1">
        <Skeleton width="60%" />
        <Skeleton width="40%" className="h-3" />
      </div>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <Skeleton key={i} width={80} className="flex-shrink-0" />
      ))}
    </div>
  );
};

// Card Skeleton
export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-bg-secondary border border-border-subtle rounded-lg space-y-3">
      <Skeleton width={120} className="h-5" />
      <Skeleton width="80%" />
      <Skeleton width="60%" />
    </div>
  );
};

// Stat Card Skeleton
export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-bg-secondary border border-border-subtle rounded-lg space-y-2">
      <Skeleton width={60} className="h-8" />
      <Skeleton width={80} className="h-4" />
    </div>
  );
};
