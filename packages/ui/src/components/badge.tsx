'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { PRIORITY_CONFIG, STAGE_CONFIG } from '@lead-engine/shared';
import type { Priority, LeadStage } from '@lead-engine/shared';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded',
          variant === 'outline' && 'border',
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

// Priority Badge
export interface PriorityBadgeProps extends Omit<BadgeProps, 'children'> {
  priority: Priority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className, ...props }) => {
  const config = PRIORITY_CONFIG[priority];

  return (
    <Badge
      className={cn(config.bgColor, config.textColor, className)}
      {...props}
    >
      {config.label}
    </Badge>
  );
};

// Stage Indicator
export interface StageIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  stage: LeadStage;
  showLabel?: boolean;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  stage,
  showLabel = false,
  className,
  ...props
}) => {
  const config = STAGE_CONFIG[stage];

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <div className={cn('w-2 h-2 rounded-full', config.dotClass)} />
      {showLabel && (
        <span className="text-xs text-text-secondary">{config.label}</span>
      )}
    </div>
  );
};

// Sector Badge
export interface SectorBadgeProps extends Omit<BadgeProps, 'children'> {
  sector: string;
}

export const SectorBadge: React.FC<SectorBadgeProps> = ({ sector, className, ...props }) => {
  return (
    <Badge
      className={cn('bg-bg-tertiary text-text-secondary', className)}
      {...props}
    >
      {sector}
    </Badge>
  );
};

// Count Badge
export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number;
}

export const CountBadge: React.FC<CountBadgeProps> = ({ count, className, ...props }) => {
  if (count === 0) return null;

  return (
    <Badge
      className={cn(
        'min-w-[18px] h-[18px] px-1 justify-center',
        'bg-accent-primary text-white',
        className
      )}
      {...props}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
};
