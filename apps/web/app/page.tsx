'use client';

import * as React from 'react';
import leadsData from '@/data/leads.json';

type Lead = typeof leadsData[0] & {
  enrichedAt?: string;
  enrichment?: EnrichmentData;
};

type EnrichmentData = {
  companyOverview?: {
    description: string;
    businessModel: string;
    marketPosition: string;
    recentNews: string;
  };
  painPoints?: Array<{
    pain: string;
    impact: string;
    rltxSolution: string;
  }>;
  rltxFit?: {
    primaryProduct: string;
    useCases: string[];
    valueProposition: string;
    estimatedImpact: string;
    competitiveAngle: string;
  };
  contacts?: {
    targetTitles: string[];
    emailPatterns: string[];
    linkedInUrl: string;
    decisionProcess: string;
  };
  outreachStrategy?: {
    hook: string;
    proofPoints: string[];
    objections: string[];
    timing: string;
    channel: string;
  };
  competitiveIntel?: {
    currentSolutions: string[];
    vendors: string[];
    switchingCosts: string;
    triggerEvents: string[];
  };
  dealIntel?: {
    estimatedDealSize: string;
    salesCycle: string;
    budget: string;
    champions: string;
  };
  score?: {
    fitScore: number;
    urgencyScore: number;
    accessibilityScore: number;
    overallPriority: string;
    reasoning: string;
  };
};

const COLUMN_GROUPS = [
  {
    id: 'base',
    label: 'Company Info',
    columns: [
      { id: 'company', label: 'Company', width: 200, sticky: true },
      { id: 'sector', label: 'Sector', width: 140 },
      { id: 'subSector', label: 'Sub-Sector', width: 120 },
      { id: 'location', label: 'Location', width: 140 },
      { id: 'website', label: 'Website', width: 160 },
      { id: 'revenue', label: 'Revenue', width: 90 },
      { id: 'employees', label: 'Employees', width: 100 },
      { id: 'priority', label: 'Priority', width: 90 },
    ],
  },
  {
    id: 'context',
    label: 'Context',
    columns: [
      { id: 'source', label: 'Source', width: 120 },
      { id: 'useCase', label: 'Use Case', width: 200 },
      { id: 'titles', label: 'Target Titles', width: 180 },
    ],
  },
  {
    id: 'enrichment',
    label: 'AI Enrichment',
    columns: [
      { id: 'enrichStatus', label: 'Status', width: 100 },
      { id: 'description', label: 'Description', width: 280 },
      { id: 'businessModel', label: 'Business Model', width: 180 },
      { id: 'marketPosition', label: 'Market Position', width: 120 },
      { id: 'primaryProduct', label: 'RLTX Product', width: 120 },
      { id: 'valueProposition', label: 'Value Prop', width: 240 },
      { id: 'estimatedImpact', label: 'Est. Impact', width: 180 },
    ],
  },
  {
    id: 'outreach',
    label: 'Outreach',
    columns: [
      { id: 'hook', label: 'Opening Hook', width: 280 },
      { id: 'channel', label: 'Channel', width: 90 },
      { id: 'timing', label: 'Timing', width: 140 },
      { id: 'emailPattern', label: 'Email Pattern', width: 180 },
    ],
  },
  {
    id: 'deal',
    label: 'Deal Intel',
    columns: [
      { id: 'dealSize', label: 'Deal Size', width: 120 },
      { id: 'salesCycle', label: 'Sales Cycle', width: 100 },
      { id: 'budget', label: 'Budget', width: 140 },
      { id: 'switchingCosts', label: 'Switching Costs', width: 110 },
    ],
  },
  {
    id: 'scores',
    label: 'Scores',
    columns: [
      { id: 'fitScore', label: 'Fit', width: 60 },
      { id: 'urgencyScore', label: 'Urgency', width: 70 },
      { id: 'accessScore', label: 'Access', width: 70 },
      { id: 'overallPriority', label: 'AI Priority', width: 100 },
    ],
  },
];

export default function DatabaseView() {
  const [leads, setLeads] = React.useState<Lead[]>(leadsData as Lead[]);
  const [search, setSearch] = React.useState('');
  const [sectorFilter, setSectorFilter] = React.useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = React.useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'all' | 'enriched' | 'pending'>('all');
  const tableRef = React.useRef<HTMLDivElement>(null);

  const sectors = [...new Set(leadsData.map(l => l.sector))].sort();
  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  const filteredLeads = React.useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !search ||
        lead.company.toLowerCase().includes(search.toLowerCase()) ||
        lead.sector.toLowerCase().includes(search.toLowerCase()) ||
        lead.useCase?.toLowerCase().includes(search.toLowerCase()) ||
        lead.titles?.toLowerCase().includes(search.toLowerCase()) ||
        lead.city?.toLowerCase().includes(search.toLowerCase());
      const matchesSector = !sectorFilter || lead.sector === sectorFilter;
      const matchesPriority = !priorityFilter || lead.priority === priorityFilter;
      const matchesTab = activeTab === 'all' ||
        (activeTab === 'enriched' && lead.enrichment) ||
        (activeTab === 'pending' && !lead.enrichment);
      return matchesSearch && matchesSector && matchesPriority && matchesTab;
    });
  }, [leads, search, sectorFilter, priorityFilter, activeTab]);

  const enrichedCount = leads.filter(l => l.enrichment).length;

  const handleEnrich = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    setEnrichingIds(prev => new Set(prev).add(leadId));

    try {
      const res = await fetch('/api/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l =>
          l.id === leadId
            ? { ...l, enrichment: data.data, enrichedAt: data.enrichedAt }
            : l
        ));
      }
    } catch (e) {
      console.error('Enrich failed:', e);
    }

    setEnrichingIds(prev => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
  };

  const handleBulkEnrich = async () => {
    const toEnrich = Array.from(selectedRows).filter(id => {
      const lead = leads.find(l => l.id === id);
      return lead && !lead.enrichment;
    });
    for (const id of toEnrich) {
      await handleEnrich(id);
    }
  };

  const getCellValue = (lead: Lead, columnId: string): React.ReactNode => {
    const e = lead.enrichment;

    switch (columnId) {
      case 'company':
        return lead.company;
      case 'sector':
        return <span className="text-zinc-300">{lead.sector}</span>;
      case 'subSector':
        return lead.subSector || <span className="text-zinc-600">—</span>;
      case 'location':
        return `${lead.city || ''}${lead.state ? `, ${lead.state}` : ''}` || <span className="text-zinc-600">—</span>;
      case 'website':
        return lead.website ? (
          <a href={`https://${lead.website}`} target="_blank" className="text-blue-400 hover:underline truncate block">
            {lead.website}
          </a>
        ) : <span className="text-zinc-600">—</span>;
      case 'revenue':
        return lead.revenue ? (
          <span className="text-emerald-400 font-mono">${lead.revenue}B</span>
        ) : <span className="text-zinc-600">—</span>;
      case 'employees':
        return lead.employees ? (
          <span className="font-mono text-zinc-300">{lead.employees.toLocaleString()}</span>
        ) : <span className="text-zinc-600">—</span>;
      case 'priority':
        return <PriorityBadge priority={lead.priority} />;
      case 'source':
        return lead.source || <span className="text-zinc-600">—</span>;
      case 'useCase':
        return lead.useCase ? (
          <span className="text-zinc-300 truncate block" title={lead.useCase}>{lead.useCase}</span>
        ) : <span className="text-zinc-600">—</span>;
      case 'titles':
        return lead.titles || <span className="text-zinc-600">—</span>;
      case 'enrichStatus':
        if (enrichingIds.has(lead.id)) {
          return <span className="text-amber-400 flex items-center gap-1"><Spinner /> Enriching</span>;
        }
        return e ? (
          <span className="text-emerald-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Enriched
          </span>
        ) : (
          <button
            onClick={(ev) => { ev.stopPropagation(); handleEnrich(lead.id); }}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded transition-colors"
          >
            Enrich
          </button>
        );
      case 'description':
        return e?.companyOverview?.description || <span className="text-zinc-600">—</span>;
      case 'businessModel':
        return e?.companyOverview?.businessModel || <span className="text-zinc-600">—</span>;
      case 'marketPosition':
        return e?.companyOverview?.marketPosition ? (
          <PositionBadge position={e.companyOverview.marketPosition} />
        ) : <span className="text-zinc-600">—</span>;
      case 'primaryProduct':
        return e?.rltxFit?.primaryProduct ? (
          <ProductBadge product={e.rltxFit.primaryProduct} />
        ) : <span className="text-zinc-600">—</span>;
      case 'valueProposition':
        return e?.rltxFit?.valueProposition || <span className="text-zinc-600">—</span>;
      case 'estimatedImpact':
        return e?.rltxFit?.estimatedImpact ? (
          <span className="text-emerald-400">{e.rltxFit.estimatedImpact}</span>
        ) : <span className="text-zinc-600">—</span>;
      case 'hook':
        return e?.outreachStrategy?.hook ? (
          <span className="text-zinc-300 italic truncate block" title={e.outreachStrategy.hook}>
            "{e.outreachStrategy.hook}"
          </span>
        ) : <span className="text-zinc-600">—</span>;
      case 'channel':
        return e?.outreachStrategy?.channel ? (
          <ChannelBadge channel={e.outreachStrategy.channel} />
        ) : <span className="text-zinc-600">—</span>;
      case 'timing':
        return e?.outreachStrategy?.timing || <span className="text-zinc-600">—</span>;
      case 'emailPattern':
        return e?.contacts?.emailPatterns?.[0] ? (
          <span className="font-mono text-xs text-zinc-400">{e.contacts.emailPatterns[0]}</span>
        ) : <span className="text-zinc-600">—</span>;
      case 'dealSize':
        return e?.dealIntel?.estimatedDealSize ? (
          <span className="text-emerald-400 font-mono">{e.dealIntel.estimatedDealSize}</span>
        ) : <span className="text-zinc-600">—</span>;
      case 'salesCycle':
        return e?.dealIntel?.salesCycle || <span className="text-zinc-600">—</span>;
      case 'budget':
        return e?.dealIntel?.budget || <span className="text-zinc-600">—</span>;
      case 'switchingCosts':
        return e?.competitiveIntel?.switchingCosts ? (
          <SwitchingCostBadge cost={e.competitiveIntel.switchingCosts} />
        ) : <span className="text-zinc-600">—</span>;
      case 'fitScore':
        return e?.score?.fitScore !== undefined ? (
          <ScoreCell value={e.score.fitScore} />
        ) : <span className="text-zinc-600">—</span>;
      case 'urgencyScore':
        return e?.score?.urgencyScore !== undefined ? (
          <ScoreCell value={e.score.urgencyScore} />
        ) : <span className="text-zinc-600">—</span>;
      case 'accessScore':
        return e?.score?.accessibilityScore !== undefined ? (
          <ScoreCell value={e.score.accessibilityScore} />
        ) : <span className="text-zinc-600">—</span>;
      case 'overallPriority':
        return e?.score?.overallPriority ? (
          <PriorityBadge priority={e.score.overallPriority} />
        ) : <span className="text-zinc-600">—</span>;
      default:
        return <span className="text-zinc-600">—</span>;
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredLeads.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredLeads.map(l => l.id)));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {/* Top Bar */}
      <header className="flex-shrink-0 border-b border-zinc-800 bg-[#09090b]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded flex items-center justify-center text-xs font-bold">
                R
              </div>
              <span className="font-semibold text-white">RLTX</span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400">leads</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">{leads.length.toLocaleString()} records</span>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-500">{enrichedCount} enriched</span>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Tabs */}
          <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5">
            {(['all', 'enriched', 'pending'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? `All (${leads.length})` :
                 tab === 'enriched' ? `Enriched (${enrichedCount})` :
                 `Pending (${leads.length - enrichedCount})`}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-zinc-700 mx-2" />

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search companies, sectors, locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-500 placeholder-zinc-500"
            />
          </div>

          {/* Filters */}
          <select
            value={sectorFilter || ''}
            onChange={(e) => setSectorFilter(e.target.value || null)}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value || null)}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {(search || sectorFilter || priorityFilter) && (
            <button
              onClick={() => { setSearch(''); setSectorFilter(null); setPriorityFilter(null); }}
              className="text-xs text-zinc-500 hover:text-white px-2"
            >
              Clear
            </button>
          )}

          <div className="flex-1" />

          {/* Bulk Actions */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-1.5">
              <span className="text-sm text-indigo-400">{selectedRows.size} selected</span>
              <button
                onClick={handleBulkEnrich}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded transition-colors"
              >
                Bulk Enrich
              </button>
              <button
                onClick={() => setSelectedRows(new Set())}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div ref={tableRef} className="h-full overflow-auto">
          <table className="w-full border-collapse text-sm">
            {/* Column Group Headers */}
            <thead className="sticky top-0 z-20">
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="sticky left-0 z-30 bg-zinc-900 w-10 px-3 py-2 border-r border-zinc-800">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                </th>
                {COLUMN_GROUPS.map((group, gi) => (
                  <th
                    key={group.id}
                    colSpan={group.columns.length}
                    className={`px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider ${
                      gi % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/80'
                    } ${gi === 0 ? 'sticky left-10 z-20' : ''}`}
                    style={gi === 0 ? { left: 40, minWidth: group.columns.reduce((a, c) => a + c.width, 0) } : undefined}
                  >
                    <span className={
                      group.id === 'enrichment' ? 'text-indigo-400' :
                      group.id === 'outreach' ? 'text-amber-400' :
                      group.id === 'deal' ? 'text-emerald-400' :
                      group.id === 'scores' ? 'text-violet-400' :
                      'text-zinc-500'
                    }>
                      {group.label}
                    </span>
                  </th>
                ))}
              </tr>
              {/* Column Headers */}
              <tr className="bg-zinc-800/80 border-b border-zinc-700">
                <th className="sticky left-0 z-30 bg-zinc-800/80 w-10 border-r border-zinc-700" />
                {COLUMN_GROUPS.map((group, gi) => (
                  group.columns.map((col, ci) => (
                    <th
                      key={col.id}
                      className={`px-3 py-2 text-left text-xs font-medium text-zinc-400 border-r border-zinc-700/50 ${
                        col.sticky ? 'sticky z-20 bg-zinc-800/80' : ''
                      }`}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        ...(col.sticky ? { left: 40 } : {}),
                      }}
                    >
                      {col.label}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, ri) => (
                <React.Fragment key={lead.id}>
                  <tr
                    className={`border-b border-zinc-800/50 transition-colors ${
                      selectedRows.has(lead.id) ? 'bg-indigo-500/10' :
                      expandedRow === lead.id ? 'bg-zinc-800/50' :
                      ri % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/10'
                    } hover:bg-zinc-800/50 cursor-pointer`}
                    onClick={() => setExpandedRow(expandedRow === lead.id ? null : lead.id)}
                  >
                    <td
                      className="sticky left-0 z-10 bg-inherit w-10 px-3 py-2 border-r border-zinc-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(lead.id)}
                        onChange={() => toggleRowSelection(lead.id)}
                        className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                    </td>
                    {COLUMN_GROUPS.map((group) => (
                      group.columns.map((col) => (
                        <td
                          key={col.id}
                          className={`px-3 py-2 truncate border-r border-zinc-800/30 ${
                            col.sticky ? 'sticky z-10 bg-inherit font-medium text-white' : ''
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            ...(col.sticky ? { left: 40 } : {}),
                          }}
                          onClick={(e) => col.id === 'enrichStatus' ? e.stopPropagation() : null}
                        >
                          {getCellValue(lead, col.id)}
                        </td>
                      ))
                    ))}
                  </tr>
                  {/* Expanded Row */}
                  {expandedRow === lead.id && lead.enrichment && (
                    <tr className="bg-zinc-900/80">
                      <td colSpan={100} className="p-0">
                        <ExpandedPanel lead={lead} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              No leads match your filters
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs text-zinc-500 flex items-center justify-between">
        <span>Showing {filteredLeads.length} of {leads.length} leads</span>
        <span>
          {enrichingIds.size > 0 && (
            <span className="text-amber-400 mr-4">Enriching {enrichingIds.size} leads...</span>
          )}
          Press Enter to expand row details
        </span>
      </div>
    </div>
  );
}

// Expanded Panel Component
function ExpandedPanel({ lead }: { lead: Lead }) {
  const e = lead.enrichment;
  if (!e) return null;

  return (
    <div className="border-t border-zinc-700 bg-zinc-900/60">
      <div className="grid grid-cols-4 gap-6 p-6">
        {/* Pain Points */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Pain Points</h4>
          <div className="space-y-2">
            {e.painPoints?.slice(0, 3).map((p, i) => (
              <div key={i} className="bg-zinc-800/50 rounded p-2">
                <div className="text-xs text-zinc-300">{p.pain}</div>
                <div className="text-[10px] text-emerald-400 mt-1">→ {p.rltxSolution}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RLTX Use Cases */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Use Cases</h4>
          <div className="flex flex-wrap gap-1.5">
            {e.rltxFit?.useCases?.map((uc, i) => (
              <span key={i} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                {uc}
              </span>
            ))}
          </div>
          {e.rltxFit?.competitiveAngle && (
            <div className="mt-3">
              <div className="text-[10px] text-zinc-500 uppercase">Competitive Angle</div>
              <div className="text-xs text-zinc-300 mt-1">{e.rltxFit.competitiveAngle}</div>
            </div>
          )}
        </div>

        {/* Contacts & Outreach */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Contacts</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-zinc-500">Target Titles: </span>
              <span className="text-zinc-300">{e.contacts?.targetTitles?.join(', ')}</span>
            </div>
            <div>
              <span className="text-zinc-500">Decision Process: </span>
              <span className="text-zinc-300">{e.contacts?.decisionProcess}</span>
            </div>
            {e.outreachStrategy?.objections && (
              <div className="mt-2">
                <span className="text-zinc-500">Likely Objections:</span>
                <ul className="text-zinc-400 mt-1 text-[11px] list-disc list-inside">
                  {e.outreachStrategy.objections.slice(0, 2).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Competitive Intel */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Competitive Intel</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-zinc-500">Current Solutions: </span>
              <span className="text-zinc-300">{e.competitiveIntel?.currentSolutions?.join(', ')}</span>
            </div>
            <div>
              <span className="text-zinc-500">Trigger Events: </span>
              <span className="text-zinc-300">{e.competitiveIntel?.triggerEvents?.join(', ')}</span>
            </div>
            {e.score?.reasoning && (
              <div className="mt-2 p-2 bg-zinc-800/50 rounded">
                <span className="text-zinc-500">AI Reasoning: </span>
                <span className="text-zinc-400 text-[11px]">{e.score.reasoning}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Badge Components
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[priority] || colors.Low}`}>
      {priority}
    </span>
  );
}

function ProductBadge({ product }: { product: string }) {
  const colors: Record<string, string> = {
    FORESIGHT: 'bg-blue-500/20 text-blue-400',
    VERITAS: 'bg-purple-500/20 text-purple-400',
    POPULOUS: 'bg-emerald-500/20 text-emerald-400',
  };
  const key = product.toUpperCase().includes('FORESIGHT') ? 'FORESIGHT' :
              product.toUpperCase().includes('VERITAS') ? 'VERITAS' :
              product.toUpperCase().includes('POPULOUS') ? 'POPULOUS' : '';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[key] || 'bg-zinc-700 text-zinc-300'}`}>
      {key || product}
    </span>
  );
}

function PositionBadge({ position }: { position: string }) {
  const colors: Record<string, string> = {
    Leader: 'text-emerald-400',
    Challenger: 'text-blue-400',
    Niche: 'text-amber-400',
    Emerging: 'text-violet-400',
  };
  return <span className={`text-xs ${colors[position] || 'text-zinc-400'}`}>{position}</span>;
}

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    Email: 'bg-blue-500/20 text-blue-400',
    LinkedIn: 'bg-indigo-500/20 text-indigo-400',
    Phone: 'bg-emerald-500/20 text-emerald-400',
    Event: 'bg-amber-500/20 text-amber-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[channel] || 'bg-zinc-700 text-zinc-300'}`}>
      {channel}
    </span>
  );
}

function SwitchingCostBadge({ cost }: { cost: string }) {
  const colors: Record<string, string> = {
    Low: 'text-emerald-400',
    Medium: 'text-amber-400',
    High: 'text-red-400',
  };
  return <span className={`text-xs ${colors[cost] || 'text-zinc-400'}`}>{cost}</span>;
}

function ScoreCell({ value }: { value: number }) {
  const color = value >= 8 ? 'text-emerald-400' :
                value >= 6 ? 'text-amber-400' :
                value >= 4 ? 'text-orange-400' :
                'text-red-400';
  return (
    <span className={`font-mono font-medium ${color}`}>
      {value}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
