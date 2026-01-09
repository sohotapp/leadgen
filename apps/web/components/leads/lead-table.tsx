'use client';

import * as React from 'react';
import { cn, formatCompactNumber } from '@lead-engine/shared';
import { Checkbox, PriorityBadge, StageIndicator, Button, Spinner } from '@lead-engine/ui';
import type { Priority, LeadStage } from '@lead-engine/shared';
import { ChevronRight, Mail, Linkedin, Phone, ExternalLink } from 'lucide-react';
import { useLeadListShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

export interface LeadTableData {
  id: string;
  companyName: string;
  subSector: string | null;
  sector: string;
  rltxPriority: Priority;
  stage: LeadStage;
  targetTitles: string[] | null;
  revenue: number | null;
  contactCount: number;
  primaryContactEmail: string | null;
  website: string | null;
}

interface LeadTableProps {
  leads: LeadTableData[];
  selectedIds: Set<string>;
  focusedIndex: number;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpen: (id: string) => void;
  onFocusChange: (index: number) => void;
  loading?: boolean;
}

export function LeadTable({
  leads,
  selectedIds,
  focusedIndex,
  onSelect,
  onSelectAll,
  onDeselectAll,
  onOpen,
  onFocusChange,
  loading,
}: LeadTableProps) {
  const tableRef = React.useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useLeadListShortcuts({
    onMoveDown: () => {
      const newIndex = Math.min(focusedIndex + 1, leads.length - 1);
      onFocusChange(newIndex);
    },
    onMoveUp: () => {
      const newIndex = Math.max(focusedIndex - 1, 0);
      onFocusChange(newIndex);
    },
    onToggleSelect: () => {
      if (leads[focusedIndex]) {
        onSelect(leads[focusedIndex].id);
      }
    },
    onOpenLead: () => {
      if (leads[focusedIndex]) {
        onOpen(leads[focusedIndex].id);
      }
    },
  });

  // Scroll focused row into view
  React.useEffect(() => {
    const focusedRow = tableRef.current?.querySelector(`[data-index="${focusedIndex}"]`);
    focusedRow?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const allSelected = selectedIds.size === leads.length && leads.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < leads.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-text-tertiary" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-1">No leads found</h3>
        <p className="text-sm text-text-secondary mb-4">
          Import leads from CSV or adjust your filters
        </p>
        <Button variant="primary">Import Leads</Button>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-bg-secondary border-b border-border-subtle text-xs font-medium text-text-tertiary uppercase tracking-wide">
        <div className="w-4">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
          />
        </div>
        <div className="w-5" /> {/* Stage indicator */}
        <div className="flex-1 min-w-[200px]">Company</div>
        <div className="w-24">Sector</div>
        <div className="w-20">Priority</div>
        <div className="w-32">Target Titles</div>
        <div className="w-20 text-right">Revenue</div>
        <div className="w-28">Contact</div>
        <div className="w-5" /> {/* Chevron */}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-subtle">
        {leads.map((lead, index) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            index={index}
            selected={selectedIds.has(lead.id)}
            focused={index === focusedIndex}
            onSelect={() => onSelect(lead.id)}
            onOpen={() => onOpen(lead.id)}
            onFocus={() => onFocusChange(index)}
          />
        ))}
      </div>
    </div>
  );
}

interface LeadRowProps {
  lead: LeadTableData;
  index: number;
  selected: boolean;
  focused: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onFocus: () => void;
}

function LeadRow({ lead, index, selected, focused, onSelect, onOpen, onFocus }: LeadRowProps) {
  return (
    <div
      data-index={index}
      onClick={onOpen}
      onMouseEnter={onFocus}
      className={cn(
        'flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors',
        'hover:bg-bg-tertiary',
        selected && 'bg-accent-subtle',
        focused && !selected && 'bg-bg-tertiary',
        focused && 'ring-1 ring-inset ring-accent-primary/50'
      )}
    >
      {/* Checkbox */}
      <div className="w-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onChange={onSelect} />
      </div>

      {/* Stage */}
      <div className="w-5">
        <StageIndicator stage={lead.stage} />
      </div>

      {/* Company */}
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium text-text-primary truncate">{lead.companyName}</div>
        <div className="text-xs text-text-tertiary truncate">
          {lead.subSector || lead.sector}
        </div>
      </div>

      {/* Sector */}
      <div className="w-24 text-sm text-text-secondary truncate">{lead.sector}</div>

      {/* Priority */}
      <div className="w-20">
        <PriorityBadge priority={lead.rltxPriority} />
      </div>

      {/* Target Titles */}
      <div className="w-32 text-xs text-text-tertiary truncate">
        {lead.targetTitles?.slice(0, 2).join(', ') || '-'}
      </div>

      {/* Revenue */}
      <div className="w-20 text-sm text-text-secondary text-right">
        {lead.revenue ? `$${formatCompactNumber(lead.revenue * 1_000_000)}` : '-'}
      </div>

      {/* Contact Status */}
      <div className="w-28">
        {lead.contactCount > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-status-success">
              <Mail className="w-3 h-3" />
              <span className="text-xs">{lead.contactCount}</span>
            </div>
            {lead.primaryContactEmail && (
              <span className="text-xs text-text-tertiary truncate max-w-[100px]">
                {lead.primaryContactEmail}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-tertiary">No contacts</span>
        )}
      </div>

      {/* Chevron */}
      <div className="w-5">
        <ChevronRight className="w-4 h-4 text-text-tertiary" />
      </div>
    </div>
  );
}
