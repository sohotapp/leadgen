'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@lead-engine/shared';
import { SearchInput } from '@lead-engine/ui';
import { Command, User } from 'lucide-react';

interface HeaderProps {
  onOpenCommandPalette?: () => void;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = React.useState('');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // Debounced search could go here
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border-subtle bg-bg-primary">
      {/* Left - Breadcrumb or Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium text-text-primary">Lead Engine</h1>
      </div>

      {/* Center - Search / Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onOpenCommandPalette}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5',
            'text-sm text-text-tertiary bg-bg-secondary border border-border-default rounded-md',
            'hover:border-border-strong hover:text-text-secondary transition-colors'
          )}
        >
          <Command className="w-4 h-4" />
          <span className="flex-1 text-left">Search or type a command...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-tertiary border border-border-default rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right - User Menu */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-2 py-1 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors">
          <div className="w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span>Owen</span>
        </button>
      </div>
    </header>
  );
}
