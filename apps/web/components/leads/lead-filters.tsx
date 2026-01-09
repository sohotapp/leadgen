'use client';

import * as React from 'react';
import { cn, SECTOR_CONFIG, PRIORITY_CONFIG, STAGE_CONFIG } from '@lead-engine/shared';
import { SearchInput, Dropdown, Button } from '@lead-engine/ui';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface LeadFilters {
  search: string;
  sector: string | null;
  priority: string | null;
  stage: string | null;
  hasContacts: boolean | null;
}

interface LeadFiltersProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export function LeadFiltersBar({ filters, onChange, totalCount, filteredCount }: LeadFiltersProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const activeFilterCount = [
    filters.sector,
    filters.priority,
    filters.stage,
    filters.hasContacts,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onChange({
      search: filters.search,
      sector: null,
      priority: null,
      stage: null,
      hasContacts: null,
    });
  };

  const sectorOptions = [
    { value: '', label: 'All Sectors' },
    ...Object.keys(SECTOR_CONFIG).map((sector) => ({
      value: sector,
      label: sector,
    })),
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    ...Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
    })),
  ];

  const stageOptions = [
    { value: '', label: 'All Stages' },
    ...Object.entries(STAGE_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
    })),
  ];

  return (
    <div className="space-y-3">
      {/* Main filter bar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="w-64">
          <SearchInput
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            onClear={() => onChange({ ...filters, search: '' })}
            placeholder="Search companies..."
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters || activeFilterCount > 0 ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
          icon={<Filter className="w-4 h-4" />}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Quick filters */}
        <div className="flex items-center gap-2">
          <QuickFilterButton
            active={filters.priority === 'critical'}
            onClick={() =>
              onChange({
                ...filters,
                priority: filters.priority === 'critical' ? null : 'critical',
              })
            }
          >
            Critical
          </QuickFilterButton>
          <QuickFilterButton
            active={filters.stage === 'raw'}
            onClick={() =>
              onChange({
                ...filters,
                stage: filters.stage === 'raw' ? null : 'raw',
              })
            }
          >
            Raw
          </QuickFilterButton>
          <QuickFilterButton
            active={filters.hasContacts === true}
            onClick={() =>
              onChange({
                ...filters,
                hasContacts: filters.hasContacts === true ? null : true,
              })
            }
          >
            Has Contacts
          </QuickFilterButton>
        </div>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}

        {/* Count */}
        <div className="ml-auto text-sm text-text-secondary">
          {filteredCount === totalCount ? (
            <span>{totalCount.toLocaleString()} leads</span>
          ) : (
            <span>
              {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} leads
            </span>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex items-center gap-3 p-3 bg-bg-secondary border border-border-subtle rounded-lg">
          <div className="w-40">
            <label className="block text-xs text-text-tertiary mb-1">Sector</label>
            <Dropdown
              value={filters.sector || ''}
              options={sectorOptions}
              onChange={(value) => onChange({ ...filters, sector: value || null })}
              placeholder="All Sectors"
            />
          </div>

          <div className="w-40">
            <label className="block text-xs text-text-tertiary mb-1">Priority</label>
            <Dropdown
              value={filters.priority || ''}
              options={priorityOptions}
              onChange={(value) => onChange({ ...filters, priority: value || null })}
              placeholder="All Priorities"
            />
          </div>

          <div className="w-40">
            <label className="block text-xs text-text-tertiary mb-1">Stage</label>
            <Dropdown
              value={filters.stage || ''}
              options={stageOptions}
              onChange={(value) => onChange({ ...filters, stage: value || null })}
              placeholder="All Stages"
            />
          </div>

          <div className="w-40">
            <label className="block text-xs text-text-tertiary mb-1">Contacts</label>
            <Dropdown
              value={
                filters.hasContacts === null
                  ? ''
                  : filters.hasContacts
                    ? 'yes'
                    : 'no'
              }
              options={[
                { value: '', label: 'Any' },
                { value: 'yes', label: 'Has Contacts' },
                { value: 'no', label: 'No Contacts' },
              ]}
              onChange={(value) =>
                onChange({
                  ...filters,
                  hasContacts: value === '' ? null : value === 'yes',
                })
              }
              placeholder="Any"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickFilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function QuickFilterButton({ active, onClick, children }: QuickFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs rounded-md border transition-colors',
        active
          ? 'bg-accent-subtle text-accent-primary border-accent-primary'
          : 'bg-bg-secondary text-text-secondary border-border-default hover:border-border-strong'
      )}
    >
      {children}
    </button>
  );
}
