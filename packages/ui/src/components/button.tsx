'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  kbd?: string;
}

const variantStyles = {
  primary: 'bg-accent-primary text-white hover:bg-accent-hover',
  secondary: 'bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-elevated hover:border-border-strong',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
  danger: 'bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error/20',
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-2',
  lg: 'px-4 py-2 text-base gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, icon, kbd, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {kbd && (
          <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-bg-primary/50 rounded">
            {kbd}
          </kbd>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
