'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, clearable, onClear, value, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          value={value}
          className={cn(
            'w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary',
            'transition-colors',
            icon && 'pl-9',
            clearable && value && 'pr-9',
            className
          )}
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'icon'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onSearch?.(e.target.value);
    };

    return (
      <Input
        ref={ref}
        icon={<Search className="w-4 h-4" />}
        placeholder="Search..."
        onChange={handleChange}
        clearable
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
