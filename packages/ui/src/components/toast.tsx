'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styleMap = {
  success: 'border-l-status-success',
  error: 'border-l-status-error',
  warning: 'border-l-status-warning',
  info: 'border-l-status-info',
};

const iconStyleMap = {
  success: 'text-status-success',
  error: 'text-status-error',
  warning: 'text-status-warning',
  info: 'text-status-info',
};

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  description,
  action,
  onClose,
  className,
}) => {
  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg',
        'border-l-[3px] animate-slide-up',
        styleMap[type],
        className
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', iconStyleMap[type])} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm font-medium text-accent-primary hover:text-accent-hover"
          >
            {action.label}
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
