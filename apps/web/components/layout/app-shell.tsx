'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { CommandPalette } from './command-palette';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
  });

  const handleCommandAction = (action: string) => {
    console.log('Command action:', action);
    // Handle actions here
  };

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAction={handleCommandAction}
      />
    </div>
  );
}
