'use client';

import * as React from 'react';
import leadsDataJson from '@/data/leads.json';

type Lead = {
  id: string;
  company: string;
  sector: string;
  subSector?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  revenue?: number | null;
  employees?: number | null;
  priority?: string;
  useCase?: string | null;
  titles?: string | null;
  source?: string | null;
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

export default function LeadEngine() {
  const [leads, setLeads] = React.useState<Lead[]>(leadsDataJson as Lead[]);
  const [search, setSearch] = React.useState('');
  const [sectorFilter, setSectorFilter] = React.useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = React.useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [activeTab, setActiveTab] = React.useState<'all' | 'enriched' | 'pending'>('all');
  const [detailTab, setDetailTab] = React.useState<'overview' | 'callprep' | 'intel'>('overview');
  const [dataSource, setDataSource] = React.useState<'loading' | 'supabase' | 'json'>('loading');

  // Fetch leads from Supabase on mount
  React.useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (data.success && data.data) {
          setLeads(data.data);
          setDataSource(data.source || 'json');
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        setDataSource('json');
      }
    }
    fetchLeads();
  }, []);

  const sectors = [...new Set(leads.map(l => l.sector))].sort();
  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  const filteredLeads = React.useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !search ||
        lead.company.toLowerCase().includes(search.toLowerCase()) ||
        lead.sector.toLowerCase().includes(search.toLowerCase()) ||
        lead.useCase?.toLowerCase().includes(search.toLowerCase()) ||
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

  const handleEnrich = async (lead: Lead) => {
    setEnrichingIds(prev => new Set(prev).add(lead.id));

    try {
      const res = await fetch('/api/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedLead = { ...lead, enrichment: data.data, enrichedAt: data.enrichedAt };
        setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
        setSelectedLead(updatedLead);
      }
    } catch (e) {
      console.error('Enrich failed:', e);
    }

    setEnrichingIds(prev => {
      const next = new Set(prev);
      next.delete(lead.id);
      return next;
    });
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailTab('overview');
  };

  return (
    <div className="h-screen flex bg-[#0a0a0a] text-zinc-100 font-['Inter',system-ui,sans-serif]">
      {/* Sidebar */}
      <aside className="w-52 border-r border-zinc-800/50 flex flex-col">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[14px] text-white tracking-tight">RLTX</span>
            <span className="text-[10px] text-zinc-600 font-medium tracking-wider">/</span>
            <span className="text-[12px] text-zinc-500">leads</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2">
          <div className="space-y-0.5">
            <NavItem icon={<IconDatabase />} label="Leads" active count={leads.length} />
            <NavItem icon={<IconSparkles />} label="Enriched" count={enrichedCount} onClick={() => setActiveTab('enriched')} />
            <NavItem icon={<IconClock />} label="Pending" count={leads.length - enrichedCount} onClick={() => setActiveTab('pending')} />
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/50">
            <div className="px-2 mb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Sectors</div>
            <div className="space-y-0.5 max-h-64 overflow-auto">
              <button
                onClick={() => setSectorFilter(null)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                  !sectorFilter ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                All Sectors
              </button>
              {sectors.slice(0, 12).map(s => (
                <button
                  key={s}
                  onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] truncate transition-colors ${
                    sectorFilter === s ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{enrichingIds.size > 0 ? `Enriching ${enrichingIds.size}...` : 'Ready'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 flex items-center px-4 border-b border-zinc-800/50 gap-4">
          <h1 className="text-[14px] font-medium text-white">Leads</h1>

          <div className="flex items-center bg-zinc-800/50 rounded-md p-0.5">
            {(['all', 'enriched', 'pending'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
                  activeTab === tab ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <IconSearch className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52 h-8 bg-zinc-800/50 border border-zinc-700/50 rounded-md pl-8 pr-8 text-[13px] focus:outline-none focus:border-zinc-600 placeholder-zinc-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 text-zinc-500 hover:text-white">
                  <IconX className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={priorityFilter || ''}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="h-8 bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2.5 text-[13px] focus:outline-none focus:border-zinc-600 appearance-none cursor-pointer"
            >
              <option value="">Priority</option>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-900/95 backdrop-blur border-b border-zinc-800/50 text-left">
                <th className="font-medium text-zinc-400 px-4 py-2.5 w-[280px]">Company</th>
                <th className="font-medium text-zinc-400 px-4 py-2.5 w-[140px]">Sector</th>
                <th className="font-medium text-zinc-400 px-4 py-2.5 w-[120px]">Location</th>
                <th className="font-medium text-zinc-400 px-4 py-2.5 w-[90px]">Revenue</th>
                <th className="font-medium text-zinc-400 px-4 py-2.5 w-[90px]">Priority</th>
                <th className="font-medium text-zinc-400 px-4 py-2.5 w-[100px]">Status</th>
                <th className="font-medium text-zinc-400 px-4 py-2.5">RLTX Fit</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`border-b border-zinc-800/30 cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id ? 'bg-white/[0.03]' : 'hover:bg-zinc-800/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{lead.company}</div>
                    {lead.website && <div className="text-[11px] text-zinc-500 mt-0.5">{lead.website}</div>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{lead.sector}</td>
                  <td className="px-4 py-3 text-zinc-500">{lead.city}{lead.state ? `, ${lead.state}` : ''}</td>
                  <td className="px-4 py-3">
                    {lead.revenue ? <span className="text-emerald-400 font-mono text-[12px]">${lead.revenue}B</span> : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityPill priority={lead.priority} />
                  </td>
                  <td className="px-4 py-3">
                    {enrichingIds.has(lead.id) ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-400 text-[12px]">
                        <Spinner /> Enriching
                      </span>
                    ) : lead.enrichment ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[12px]">
                        <IconCheck className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[12px]">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.enrichment?.rltxFit?.primaryProduct ? (
                      <ProductPill product={lead.enrichment.rltxFit.primaryProduct} />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="flex items-center justify-center h-64 text-zinc-500 text-[13px]">
              No leads match your criteria
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-8 flex items-center justify-between px-4 border-t border-zinc-800/50 text-[11px] text-zinc-500">
          <span>{filteredLeads.length} of {leads.length} leads</span>
          <span>Click a row to open intel panel</span>
        </div>
      </main>

      {/* Detail Panel */}
      {selectedLead && (
        <aside className="w-[480px] border-l border-zinc-800/50 flex flex-col bg-zinc-900/50">
          {/* Panel Header */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium text-[12px]">
                {selectedLead.company.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-white text-[13px] truncate">{selectedLead.company}</div>
                <div className="text-[11px] text-zinc-500">{selectedLead.sector}</div>
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="text-zinc-500 hover:text-white p-1 -mr-1">
              <IconX className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2">
            {(['overview', 'callprep', 'intel'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  detailTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'callprep' ? 'Call Prep' : 'Intel'}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-4">
            {!selectedLead.enrichment ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
                  <IconSparkles className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="text-[14px] font-medium text-white mb-1">Enrich this lead</div>
                <div className="text-[13px] text-zinc-500 mb-4 max-w-[280px]">
                  Get AI-powered insights, call scripts, and strategic intel for {selectedLead.company}
                </div>
                <button
                  onClick={() => handleEnrich(selectedLead)}
                  disabled={enrichingIds.has(selectedLead.id)}
                  className="flex items-center gap-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-black disabled:text-zinc-400 font-medium px-4 py-2 rounded-lg text-[13px] transition-colors"
                >
                  {enrichingIds.has(selectedLead.id) ? (
                    <>
                      <Spinner /> Analyzing...
                    </>
                  ) : (
                    <>
                      <IconSparkles className="w-4 h-4" /> Enrich with AI
                    </>
                  )}
                </button>
              </div>
            ) : detailTab === 'overview' ? (
              <OverviewTab lead={selectedLead} onReEnrich={() => handleEnrich(selectedLead)} enriching={enrichingIds.has(selectedLead.id)} />
            ) : detailTab === 'callprep' ? (
              <CallPrepTab lead={selectedLead} />
            ) : (
              <IntelTab lead={selectedLead} />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ lead, onReEnrich, enriching }: { lead: Lead; onReEnrich: () => void; enriching: boolean }) {
  const e = lead.enrichment!;

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <Section title="Company Overview">
        <p className="text-[13px] text-zinc-300 leading-relaxed">{e.companyOverview?.description}</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <InfoCard label="Business Model" value={e.companyOverview?.businessModel} />
          <InfoCard label="Market Position" value={e.companyOverview?.marketPosition} />
        </div>
        {e.companyOverview?.recentNews && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Recent News</div>
            <div className="text-[12px] text-amber-200/80">{e.companyOverview.recentNews}</div>
          </div>
        )}
      </Section>

      {/* RLTX Fit */}
      <Section title="RLTX Fit">
        <div className="flex items-center gap-2 mb-3">
          <ProductPill product={e.rltxFit?.primaryProduct || ''} large />
          {e.score && (
            <span className="text-[11px] text-zinc-500">
              Fit Score: <span className="text-emerald-400 font-medium">{e.score.fitScore}/10</span>
            </span>
          )}
        </div>
        <p className="text-[13px] text-zinc-300">{e.rltxFit?.valueProposition}</p>
        {e.rltxFit?.estimatedImpact && (
          <div className="mt-2 text-[12px] text-emerald-400">
            → {e.rltxFit.estimatedImpact}
          </div>
        )}
      </Section>

      {/* Use Cases */}
      {e.rltxFit?.useCases && (
        <Section title="Use Cases">
          <div className="flex flex-wrap gap-1.5">
            {e.rltxFit.useCases.map((uc, i) => (
              <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-[11px]">{uc}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Scores */}
      {e.score && (
        <Section title="Priority Assessment">
          <div className="flex items-center gap-4 mb-3">
            <ScoreRing label="Fit" value={e.score.fitScore} />
            <ScoreRing label="Urgency" value={e.score.urgencyScore} />
            <ScoreRing label="Access" value={e.score.accessibilityScore} />
            <div className="ml-auto">
              <PriorityPill priority={e.score.overallPriority} />
            </div>
          </div>
          <p className="text-[12px] text-zinc-500">{e.score.reasoning}</p>
        </Section>
      )}

      {/* Re-enrich button */}
      <button
        onClick={onReEnrich}
        disabled={enriching}
        className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-zinc-300 font-medium py-2.5 rounded-lg text-[13px] transition-colors"
      >
        {enriching ? <><Spinner /> Re-analyzing...</> : 'Re-analyze with AI'}
      </button>
    </div>
  );
}

// Call Prep Tab
function CallPrepTab({ lead }: { lead: Lead }) {
  const e = lead.enrichment!;

  return (
    <div className="space-y-6">
      {/* Opening Hook */}
      {e.outreachStrategy?.hook && (
        <Section title="Opening Hook" icon={<IconQuote />}>
          <div className="p-4 bg-zinc-800/80 border border-zinc-700/50 rounded-lg">
            <p className="text-[14px] text-zinc-200 italic leading-relaxed">"{e.outreachStrategy.hook}"</p>
          </div>
        </Section>
      )}

      {/* Pain Points & Solutions */}
      {e.painPoints && e.painPoints.length > 0 && (
        <Section title="Pain Points to Address" icon={<IconTarget />}>
          <div className="space-y-3">
            {e.painPoints.map((p, i) => (
              <div key={i} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="text-[13px] text-red-400 font-medium mb-1">{p.pain}</div>
                <div className="text-[11px] text-zinc-500 mb-2">Impact: {p.impact}</div>
                <div className="text-[12px] text-emerald-400 flex items-start gap-1.5">
                  <span className="mt-0.5">→</span>
                  <span>RLTX Solution: {p.rltxSolution}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Discovery Questions */}
      <Section title="Discovery Questions" icon={<IconQuestion />}>
        <div className="space-y-2">
          {getDiscoveryQuestions(lead).map((q, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px]">
              <span className="text-zinc-500 font-medium">{i + 1}.</span>
              <span className="text-zinc-300">{q}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Objection Handling */}
      {e.outreachStrategy?.objections && (
        <Section title="Objection Handling" icon={<IconShield />}>
          <div className="space-y-3">
            {e.outreachStrategy.objections.map((obj, i) => (
              <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="text-[12px] text-amber-400 mb-2">"{obj}"</div>
                <div className="text-[12px] text-zinc-400">
                  <span className="text-emerald-400 font-medium">Response:</span> {getObjectionResponse(obj, lead)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Value Script */}
      <Section title="Value Proposition Script" icon={<IconScript />}>
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 space-y-3">
          <ScriptBlock label="Open with" text={`"I've been studying ${lead.company}'s approach to ${lead.sector.toLowerCase()} and noticed an opportunity..."`} />
          <ScriptBlock label="Bridge to RLTX" text={`"At RLTX, we've built ${e.rltxFit?.primaryProduct || 'decision infrastructure'} specifically for organizations like yours..."`} />
          <ScriptBlock label="Value statement" text={e.rltxFit?.valueProposition || ''} />
          <ScriptBlock label="Impact" text={e.rltxFit?.estimatedImpact || ''} highlight />
        </div>
      </Section>
    </div>
  );
}

// Intel Tab
function IntelTab({ lead }: { lead: Lead }) {
  const e = lead.enrichment!;

  return (
    <div className="space-y-6">
      {/* Contact Strategy */}
      {e.contacts && (
        <Section title="Contact Strategy" icon={<IconUsers />}>
          <div className="space-y-3">
            <InfoRow label="Target Titles" value={e.contacts.targetTitles?.join(', ')} />
            <InfoRow label="Email Pattern" value={e.contacts.emailPatterns?.[0]} mono />
            <InfoRow label="Decision Process" value={e.contacts.decisionProcess} />
            <InfoRow label="Best Channel" value={e.outreachStrategy?.channel} />
            <InfoRow label="Timing" value={e.outreachStrategy?.timing} />
          </div>
        </Section>
      )}

      {/* Competitive Intel */}
      {e.competitiveIntel && (
        <Section title="Competitive Intelligence" icon={<IconRadar />}>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Current Solutions</div>
              <div className="flex flex-wrap gap-1.5">
                {e.competitiveIntel.currentSolutions?.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-[11px]">{s}</span>
                ))}
              </div>
            </div>
            <InfoRow label="Switching Costs" value={e.competitiveIntel.switchingCosts} />
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Trigger Events</div>
              <ul className="space-y-1">
                {e.competitiveIntel.triggerEvents?.map((t, i) => (
                  <li key={i} className="text-[12px] text-zinc-400 flex items-start gap-2">
                    <span className="text-emerald-400">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {/* Deal Intelligence */}
      {e.dealIntel && (
        <Section title="Deal Intelligence" icon={<IconDollar />}>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Deal Size" value={e.dealIntel.estimatedDealSize} highlight />
            <InfoCard label="Sales Cycle" value={e.dealIntel.salesCycle} />
            <InfoCard label="Budget" value={e.dealIntel.budget} />
            <InfoCard label="Champion Type" value={e.dealIntel.champions} />
          </div>
        </Section>
      )}

      {/* Competitive Angle */}
      {e.rltxFit?.competitiveAngle && (
        <Section title="Competitive Positioning" icon={<IconTarget />}>
          <p className="text-[13px] text-zinc-300 leading-relaxed">{e.rltxFit.competitiveAngle}</p>
        </Section>
      )}

      {/* Company Data */}
      <Section title="Company Data" icon={<IconDatabase />}>
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="Revenue" value={lead.revenue ? `$${lead.revenue}B` : 'Unknown'} />
          <InfoCard label="Employees" value={lead.employees?.toLocaleString() || 'Unknown'} />
          <InfoCard label="Location" value={`${lead.city || ''}${lead.state ? `, ${lead.state}` : ''}`} />
          <InfoCard label="Source" value={lead.source || 'Unknown'} />
        </div>
      </Section>
    </div>
  );
}

// Helper Functions
function getDiscoveryQuestions(lead: Lead): string[] {
  const e = lead.enrichment;
  const product = e?.rltxFit?.primaryProduct?.toUpperCase() || '';

  const baseQuestions = [
    `How is ${lead.company} currently approaching decision-making at scale?`,
    `What's your biggest challenge with ${lead.sector.toLowerCase()} operations right now?`,
    `How do you currently simulate outcomes before committing resources?`,
  ];

  if (product.includes('FORESIGHT')) {
    return [
      ...baseQuestions,
      'How are you modeling adversary behavior in your current wargaming exercises?',
      'What would it mean to run thousands of simulations before a major decision?',
    ];
  } else if (product.includes('VERITAS')) {
    return [
      ...baseQuestions,
      'How long does a typical research cycle take from question to actionable insight?',
      'Have you ever had research results that didn\'t match real-world outcomes?',
    ];
  } else if (product.includes('POPULOUS')) {
    return [
      ...baseQuestions,
      'How are you currently testing messaging before major campaigns?',
      'What would it mean to simulate audience reactions in hours instead of weeks?',
    ];
  }

  return baseQuestions;
}

function getObjectionResponse(objection: string, lead: Lead): string {
  const lower = objection.toLowerCase();
  if (lower.includes('budget') || lower.includes('cost')) {
    return `The question isn't cost—it's ROI. Our clients see ${lead.enrichment?.rltxFit?.estimatedImpact || '10x returns'} within the first quarter. What's the cost of a wrong decision?`;
  }
  if (lower.includes('time') || lower.includes('bandwidth')) {
    return 'That\'s exactly why we built this. RLTX reduces decision cycles from months to hours. We handle the complexity so your team can focus on execution.';
  }
  if (lower.includes('already') || lower.includes('solution')) {
    return `Current tools give you data. RLTX gives you decisions. We're not replacing your stack—we're adding the decision layer that makes everything else more valuable.`;
  }
  return 'I understand. Let me show you how similar organizations approached this and the outcomes they achieved.';
}

// UI Components
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value, highlight, mono }: { label: string; value?: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="p-2.5 bg-zinc-800/50 rounded-lg">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-[13px] ${highlight ? 'text-emerald-400 font-medium' : 'text-zinc-300'} ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[12px] text-zinc-500">{label}</span>
      <span className={`text-[12px] text-zinc-300 text-right ${mono ? 'font-mono text-[11px]' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function ScriptBlock({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-[13px] ${highlight ? 'text-emerald-400' : 'text-zinc-300'}`}>{text}</div>
    </div>
  );
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? 'text-emerald-400' : value >= 6 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className={`text-[18px] font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  );
}

function NavItem({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-colors ${
        active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {count !== undefined && <span className="text-[11px] text-zinc-500">{count}</span>}
    </button>
  );
}

function PriorityPill({ priority = 'Medium' }: { priority?: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-500/15 text-red-400',
    High: 'bg-orange-500/15 text-orange-400',
    Medium: 'bg-yellow-500/15 text-yellow-400',
    Low: 'bg-zinc-500/15 text-zinc-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${colors[priority] || colors.Low}`}>
      {priority}
    </span>
  );
}

function ProductPill({ product, large }: { product: string; large?: boolean }) {
  const colors: Record<string, string> = {
    FORESIGHT: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    VERITAS: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    POPULOUS: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
  };
  const key = product.toUpperCase().includes('FORESIGHT') ? 'FORESIGHT' :
              product.toUpperCase().includes('VERITAS') ? 'VERITAS' :
              product.toUpperCase().includes('POPULOUS') ? 'POPULOUS' : '';
  return (
    <span className={`inline-block px-2 py-0.5 rounded font-medium ${colors[key] || 'bg-zinc-800 text-zinc-300'} ${large ? 'text-[12px]' : 'text-[11px]'}`}>
      {key || product}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// Icons - all accept className prop for flexibility
type IconProps = { className?: string };
function IconDatabase({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>; }
function IconSparkles({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>; }
function IconClock({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>; }
function IconSearch({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>; }
function IconX({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>; }
function IconCheck({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>; }
function IconQuote({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>; }
function IconTarget({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>; }
function IconQuestion({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>; }
function IconShield({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>; }
function IconScript({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>; }
function IconUsers({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>; }
function IconRadar({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0110 10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>; }
function IconDollar({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>; }
