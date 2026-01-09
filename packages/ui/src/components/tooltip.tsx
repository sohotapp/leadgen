'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delay = 200,
  className,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium',
            'bg-bg-elevated text-text-primary border border-border-subtle rounded shadow-lg',
            'whitespace-nowrap animate-fade-in',
            positionStyles[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// Keyboard shortcut tooltip
export interface KbdTooltipProps extends Omit<TooltipProps, 'content'> {
  shortcut: string;
  description?: string;
}

export const KbdTooltip: React.FC<KbdTooltipProps> = ({
  shortcut,
  description,
  children,
  ...props
}) => {
  return (
    <Tooltip
      content={
        <div className="flex items-center gap-2">
          {description && <span>{description}</span>}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-primary border border-border-default rounded">
            {shortcut}
          </kbd>
        </div>
      }
      {...props}
    >
      {children}
    </Tooltip>
  );
};
