'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@lead-engine/ui';
import { LeadTable, LeadFiltersBar, LeadActionsBar, type LeadTableData, type LeadFilters } from '@/components/leads';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { FileUp, Plus } from 'lucide-react';
import type { Priority, LeadStage } from '@lead-engine/shared';

// Mock data - would come from API
const mockLeads: LeadTableData[] = [
  {
    id: '1',
    companyName: 'Lockheed Martin',
    subSector: 'Defense Contractor',
    sector: 'Defense',
    rltxPriority: 'critical',
    stage: 'enriched',
    targetTitles: ['VP Strategy', 'CTO', 'Chief Digital Officer'],
    revenue: 67600,
    contactCount: 3,
    primaryContactEmail: 'j.smith@lm.com',
    website: 'lockheedmartin.com',
  },
  {
    id: '2',
    companyName: 'RTX Corporation',
    subSector: 'Defense Contractor',
    sector: 'Defense',
    rltxPriority: 'critical',
    stage: 'contacted',
    targetTitles: ['VP Strategy', 'CTO'],
    revenue: 68900,
    contactCount: 2,
    primaryContactEmail: 'm.jones@rtx.com',
    website: 'rtx.com',
  },
  {
    id: '3',
    companyName: 'Northrop Grumman',
    subSector: 'Defense Contractor',
    sector: 'Defense',
    rltxPriority: 'critical',
    stage: 'replied',
    targetTitles: ['Chief Digital Officer', 'VP Analytics'],
    revenue: 36600,
    contactCount: 4,
    primaryContactEmail: 's.chen@ngc.com',
    website: 'northropgrumman.com',
  },
  {
    id: '4',
    companyName: 'Boeing Defense',
    subSector: 'Defense Contractor',
    sector: 'Defense',
    rltxPriority: 'high',
    stage: 'raw',
    targetTitles: ['VP Strategy'],
    revenue: 66600,
    contactCount: 0,
    primaryContactEmail: null,
    website: 'boeing.com',
  },
  {
    id: '5',
    companyName: 'UnitedHealth Group',
    subSector: 'Health Insurance',
    sector: 'Healthcare',
    rltxPriority: 'critical',
    stage: 'enriched',
    targetTitles: ['Chief Analytics Officer', 'VP Data Science'],
    revenue: 324200,
    contactCount: 2,
    primaryContactEmail: 'analytics@uhg.com',
    website: 'unitedhealthgroup.com',
  },
  {
    id: '6',
    companyName: 'JPMorgan Chase',
    subSector: 'Investment Banking',
    sector: 'Finance',
    rltxPriority: 'high',
    stage: 'raw',
    targetTitles: ['Chief Risk Officer', 'Head of Quant'],
    revenue: 154800,
    contactCount: 0,
    primaryContactEmail: null,
    website: 'jpmorganchase.com',
  },
  {
    id: '7',
    companyName: 'Palantir Technologies',
    subSector: 'Defense Tech',
    sector: 'Intelligence',
    rltxPriority: 'medium',
    stage: 'contacted',
    targetTitles: ['VP Partnerships'],
    revenue: 2200,
    contactCount: 1,
    primaryContactEmail: 'partnerships@palantir.com',
    website: 'palantir.com',
  },
  {
    id: '8',
    companyName: 'McKinsey & Company',
    subSector: 'Management Consulting',
    sector: 'Consulting',
    rltxPriority: 'high',
    stage: 'raw',
    targetTitles: ['Partner', 'Director of Analytics'],
    revenue: 15000,
    contactCount: 0,
    primaryContactEmail: null,
    website: 'mckinsey.com',
  },
];

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [leads] = React.useState<LeadTableData[]>(mockLeads);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [filters, setFilters] = React.useState<LeadFilters>({
    search: '',
    sector: searchParams.get('sector'),
    priority: null,
    stage: null,
    hasContacts: null,
  });

  // Filter leads
  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (
          !lead.companyName.toLowerCase().includes(search) &&
          !lead.sector.toLowerCase().includes(search) &&
          !lead.subSector?.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      if (filters.sector && lead.sector !== filters.sector) return false;
      if (filters.priority && lead.rltxPriority !== filters.priority) return false;
      if (filters.stage && lead.stage !== filters.stage) return false;
      if (filters.hasContacts !== null) {
        if (filters.hasContacts && lead.contactCount === 0) return false;
        if (!filters.hasContacts && lead.contactCount > 0) return false;
      }
      return true;
    });
  }, [leads, filters]);

  // Handlers
  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleOpenLead = (id: string) => {
    router.push(`/leads/${id}`);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEnrich: () => {
      if (selectedIds.size > 0) {
        console.log('Enrich', Array.from(selectedIds));
      }
    },
    onStartSequence: () => {
      if (selectedIds.size > 0) {
        console.log('Start sequence', Array.from(selectedIds));
      }
    },
    onCompose: () => {
      if (selectedIds.size > 0) {
        console.log('Compose', Array.from(selectedIds));
      }
    },
    onSelectAll: handleSelectAll,
    onDeselectAll: handleDeselectAll,
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Leads</h1>
          <p className="text-sm text-text-secondary">
            Manage your lead database and outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<FileUp className="w-4 h-4" />}>
            Import CSV
          </Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border-subtle">
        <LeadFiltersBar
          filters={filters}
          onChange={setFilters}
          totalCount={leads.length}
          filteredCount={filteredLeads.length}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <LeadTable
          leads={filteredLeads}
          selectedIds={selectedIds}
          focusedIndex={focusedIndex}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onOpen={handleOpenLead}
          onFocusChange={setFocusedIndex}
        />
      </div>

      {/* Actions Bar */}
      <LeadActionsBar
        selectedCount={selectedIds.size}
        onEnrich={() => console.log('Enrich', Array.from(selectedIds))}
        onStartSequence={() => console.log('Start sequence', Array.from(selectedIds))}
        onCompose={() => console.log('Compose', Array.from(selectedIds))}
        onExport={() => console.log('Export', Array.from(selectedIds))}
        onDelete={() => console.log('Delete', Array.from(selectedIds))}
        onClear={handleDeselectAll}
      />
    </div>
  );
}
