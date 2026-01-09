'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  value?: string;
  options: DropdownOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  placeholder = 'Select...',
  onChange,
  className,
  disabled,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2',
          'text-sm bg-bg-secondary border border-border-default rounded-md',
          'text-text-primary',
          'focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary',
          'transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'border-accent-primary ring-1 ring-accent-primary'
        )}
      >
        <span className={cn(!selectedOption && 'text-text-tertiary')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1 py-1',
            'bg-bg-elevated border border-border-subtle rounded-md shadow-lg',
            'max-h-60 overflow-auto',
            'animate-fade-in'
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && handleSelect(option.value)}
              disabled={option.disabled}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                'hover:bg-bg-tertiary transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                option.value === value && 'bg-accent-subtle text-accent-primary'
              )}
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span className="flex-1">{option.label}</span>
              {option.value === value && (
                <Check className="w-4 h-4 text-accent-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
