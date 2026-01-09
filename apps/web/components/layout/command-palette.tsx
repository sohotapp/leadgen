'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { cn } from '@lead-engine/shared';
import {
  LayoutDashboard,
  Users,
  Zap,
  Inbox,
  Sparkles,
  Settings,
  Search,
  Mail,
  Play,
  FileUp,
  Filter,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelect = (value: string) => {
    onClose();
    setSearch('');

    // Navigation commands
    if (value.startsWith('go:')) {
      const path = value.replace('go:', '');
      router.push(path);
      return;
    }

    // Action commands
    if (onAction) {
      onAction(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Command Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg animate-slide-down">
        <Command
          className="bg-bg-secondary border border-border-subtle rounded-lg shadow-2xl overflow-hidden"
          loop
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
            <Search className="w-4 h-4 text-text-tertiary" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              autoFocus
            />
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-bg-tertiary border border-border-default rounded">
              ESC
            </kbd>
          </div>

          {/* Command List */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-text-tertiary">
              No results found.
            </Command.Empty>

            {/* Actions */}
            <Command.Group heading="Actions" className="mb-2">
              <CommandItem
                value="action:enrich"
                onSelect={handleSelect}
                icon={<Sparkles className="w-4 h-4" />}
                label="Enrich selected leads"
                description="Find emails and contacts for selection"
                shortcut="⌘E"
              />
              <CommandItem
                value="action:sequence"
                onSelect={handleSelect}
                icon={<Play className="w-4 h-4" />}
                label="Start sequence"
                description="Begin outreach sequence"
                shortcut="⌘⇧S"
              />
              <CommandItem
                value="action:compose"
                onSelect={handleSelect}
                icon={<Mail className="w-4 h-4" />}
                label="Compose email with AI"
                description="Generate personalized email"
                shortcut="⌘⇧E"
              />
              <CommandItem
                value="action:import"
                onSelect={handleSelect}
                icon={<FileUp className="w-4 h-4" />}
                label="Import leads"
                description="Import leads from CSV"
                shortcut="⌘I"
              />
              <CommandItem
                value="action:filter"
                onSelect={handleSelect}
                icon={<Filter className="w-4 h-4" />}
                label="Filter leads"
                description="Open filter menu"
                shortcut="F"
              />
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="mb-2">
              <CommandItem
                value="go:/"
                onSelect={handleSelect}
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="Go to Dashboard"
                shortcut="G D"
              />
              <CommandItem
                value="go:/leads"
                onSelect={handleSelect}
                icon={<Users className="w-4 h-4" />}
                label="Go to Leads"
                shortcut="G L"
              />
              <CommandItem
                value="go:/sequences"
                onSelect={handleSelect}
                icon={<Zap className="w-4 h-4" />}
                label="Go to Sequences"
                shortcut="G S"
              />
              <CommandItem
                value="go:/inbox"
                onSelect={handleSelect}
                icon={<Inbox className="w-4 h-4" />}
                label="Go to Inbox"
                shortcut="G I"
              />
              <CommandItem
                value="go:/enrich"
                onSelect={handleSelect}
                icon={<Sparkles className="w-4 h-4" />}
                label="Go to Enrichment"
                shortcut="G E"
              />
              <CommandItem
                value="go:/settings"
                onSelect={handleSelect}
                icon={<Settings className="w-4 h-4" />}
                label="Go to Settings"
                shortcut="⌘,"
              />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

interface CommandItemProps {
  value: string;
  onSelect: (value: string) => void;
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
}

function CommandItem({
  value,
  onSelect,
  icon,
  label,
  description,
  shortcut,
}: CommandItemProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer',
        'text-text-secondary',
        'data-[selected=true]:bg-bg-tertiary data-[selected=true]:text-text-primary'
      )}
    >
      <span className="text-text-tertiary">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-text-tertiary truncate">{description}</div>
        )}
      </div>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-bg-primary border border-border-default rounded">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
