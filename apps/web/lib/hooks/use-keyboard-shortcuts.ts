'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutsOptions {
  onCommandPalette?: () => void;
  onEnrich?: () => void;
  onStartSequence?: () => void;
  onCompose?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const keySequence = React.useRef<string[]>([]);
  const keySequenceTimeout = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (options.disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Command/Ctrl + K - Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        options.onCommandPalette?.();
        return;
      }

      // Command/Ctrl + E - Enrich
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        options.onEnrich?.();
        return;
      }

      // Command/Ctrl + Shift + S - Start Sequence
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        options.onStartSequence?.();
        return;
      }

      // Command/Ctrl + Shift + E - Compose
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
        e.preventDefault();
        options.onCompose?.();
        return;
      }

      // Command/Ctrl + A - Select All
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        options.onSelectAll?.();
        return;
      }

      // Command/Ctrl + Shift + A - Deselect All
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        options.onDeselectAll?.();
        return;
      }

      // Command/Ctrl + , - Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        router.push('/settings');
        return;
      }

      // Track key sequences (g d, g l, etc.)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        // Clear previous timeout
        if (keySequenceTimeout.current) {
          clearTimeout(keySequenceTimeout.current);
        }

        // Add key to sequence
        keySequence.current.push(e.key.toLowerCase());

        // Check for matches
        const sequence = keySequence.current.join(' ');

        const sequences: Record<string, string> = {
          'g d': '/',
          'g l': '/leads',
          'g s': '/sequences',
          'g i': '/inbox',
          'g e': '/enrich',
        };

        if (sequences[sequence]) {
          e.preventDefault();
          router.push(sequences[sequence]);
          keySequence.current = [];
          return;
        }

        // Reset sequence after delay
        keySequenceTimeout.current = setTimeout(() => {
          keySequence.current = [];
        }, 500);

        // Limit sequence length
        if (keySequence.current.length > 3) {
          keySequence.current = [e.key.toLowerCase()];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keySequenceTimeout.current) {
        clearTimeout(keySequenceTimeout.current);
      }
    };
  }, [router, options]);
}

// Hook for lead list navigation
interface LeadListShortcutsOptions {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleSelect?: () => void;
  onOpenLead?: () => void;
  onSearch?: () => void;
  onFilter?: () => void;
  disabled?: boolean;
}

export function useLeadListShortcuts(options: LeadListShortcutsOptions = {}) {
  React.useEffect(() => {
    if (options.disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          options.onMoveDown?.();
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          options.onMoveUp?.();
          break;
        case 'x':
          e.preventDefault();
          options.onToggleSelect?.();
          break;
        case 'enter':
          e.preventDefault();
          options.onOpenLead?.();
          break;
        case '/':
          e.preventDefault();
          options.onSearch?.();
          break;
        case 'f':
          e.preventDefault();
          options.onFilter?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}
