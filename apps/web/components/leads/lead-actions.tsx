'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { Button } from '@lead-engine/ui';
import { Sparkles, Play, Mail, Download, Trash2, X } from 'lucide-react';

interface LeadActionsBarProps {
  selectedCount: number;
  onEnrich: () => void;
  onStartSequence: () => void;
  onCompose: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function LeadActionsBar({
  selectedCount,
  onEnrich,
  onStartSequence,
  onCompose,
  onExport,
  onDelete,
  onClear,
}: LeadActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'flex items-center gap-3 px-4 py-3',
        'bg-bg-elevated border border-border-subtle rounded-lg shadow-2xl',
        'animate-slide-up'
      )}
    >
      {/* Selected count */}
      <div className="flex items-center gap-2 pr-3 border-r border-border-subtle">
        <span className="text-sm font-medium text-text-primary">
          {selectedCount} selected
        </span>
        <button
          onClick={onClear}
          className="p-1 text-text-tertiary hover:text-text-secondary rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          icon={<Sparkles className="w-4 h-4" />}
          kbd="⌘E"
          onClick={onEnrich}
        >
          Enrich
        </Button>

        <Button
          variant="secondary"
          icon={<Play className="w-4 h-4" />}
          kbd="⌘⇧S"
          onClick={onStartSequence}
        >
          Sequence
        </Button>

        <Button
          variant="secondary"
          icon={<Mail className="w-4 h-4" />}
          kbd="⌘⇧E"
          onClick={onCompose}
        >
          AI Compose
        </Button>

        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={onExport}
        >
          Export
        </Button>

        <div className="w-px h-6 bg-border-subtle" />

        <Button
          variant="ghost"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={onDelete}
          className="text-status-error hover:bg-status-error/10"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
