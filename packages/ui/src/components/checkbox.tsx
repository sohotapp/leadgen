'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current!);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          ref={innerRef}
          type="checkbox"
          checked={checked}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'w-4 h-4 rounded border transition-colors',
            'flex items-center justify-center',
            'border-border-default bg-bg-secondary',
            'peer-checked:bg-accent-primary peer-checked:border-accent-primary',
            'peer-focus:ring-2 peer-focus:ring-accent-primary peer-focus:ring-offset-2 peer-focus:ring-offset-bg-primary',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
            indeterminate && 'bg-accent-primary border-accent-primary',
            className
          )}
        >
          {indeterminate ? (
            <Minus className="w-3 h-3 text-white" />
          ) : checked ? (
            <Check className="w-3 h-3 text-white" />
          ) : null}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
