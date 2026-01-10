'use client';

import * as React from 'react';
import { AISidebar } from '@/components/ai-sidebar';

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
  // Contact fields
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  // Computed fit fields
  productFit?: string | null;
  fitScore?: number | null;
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
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [sectorFilter, setSectorFilter] = React.useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = React.useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [activeTab, setActiveTab] = React.useState<'all' | 'enriched' | 'pending'>('all');
  const [detailTab, setDetailTab] = React.useState<'overview' | 'sellsheet' | 'signals' | 'callprep' | 'intel' | 'chat'>('overview');
  const [dataSource, setDataSource] = React.useState<'loading' | 'supabase' | 'json'>('loading');
  const [totalLeads, setTotalLeads] = React.useState<number>(0);
  const [showAllLeads, setShowAllLeads] = React.useState(false); // false = curated only

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  // Sorting
  const [sortBy, setSortBy] = React.useState<'company' | 'priority' | 'fitScore' | 'revenue'>('company');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  // Scraper modal
  const [showScraper, setShowScraper] = React.useState(false);

  // Scanner modal
  const [showScanner, setShowScanner] = React.useState(false);

  // AI Sidebar
  const [showAISidebar, setShowAISidebar] = React.useState(true); // Open by default

  // Pagination
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const PAGE_SIZE = 500;

  // Chat state
  const [chatMessages, setChatMessages] = React.useState<Array<{role: 'user' | 'assistant'; content: string}>>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);

  // Refs
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);

  // Fetch leads from Supabase on mount and when source toggle changes
  const fetchLeads = React.useCallback(async (loadMore = false) => {
    try {
      if (loadMore) setLoadingMore(true);

      const currentOffset = loadMore ? offset + PAGE_SIZE : 0;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
        ...(showAllLeads ? {} : { source: 'curated' })
      });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();

      if (data.success && data.data) {
        if (loadMore) {
          setLeads(prev => [...prev, ...data.data]);
          setOffset(currentOffset);
        } else {
          setLeads(data.data);
          setOffset(0);
        }
        setDataSource(data.source || 'json');
        setTotalLeads(data.total || data.data.length);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setDataSource('json');
    } finally {
      setLoadingMore(false);
      setIsInitialLoading(false);
    }
  }, [showAllLeads, offset]);

  React.useEffect(() => {
    setIsInitialLoading(true);
    fetchLeads(false);
  }, [showAllLeads]);

  const sectors = [...new Set(leads.map(l => l.sector))].sort();
  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  const filteredLeads = React.useMemo(() => {
    const filtered = leads.filter(lead => {
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

    // Sort
    const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'company') {
        cmp = a.company.localeCompare(b.company);
      } else if (sortBy === 'priority') {
        cmp = (priorityOrder[a.priority || 'Medium'] || 2) - (priorityOrder[b.priority || 'Medium'] || 2);
      } else if (sortBy === 'fitScore') {
        const aScore = a.enrichment?.score?.fitScore || 0;
        const bScore = b.enrichment?.score?.fitScore || 0;
        cmp = bScore - aScore; // Higher first by default
      } else if (sortBy === 'revenue') {
        cmp = (b.revenue || 0) - (a.revenue || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [leads, search, sectorFilter, priorityFilter, activeTab, sortBy, sortDir]);

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
        const updatedLead = {
          ...lead,
          enrichment: data.data,
          enrichedAt: data.enrichedAt,
          // Update contact fields from enrichment
          email: data.contactInfo?.email || lead.email,
          phone: data.contactInfo?.phone || lead.phone,
          linkedin: data.contactInfo?.linkedin || lead.linkedin,
          productFit: data.productFit || lead.productFit,
          fitScore: data.fitScore || lead.fitScore,
        };
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
    setChatMessages([]);
    setChatInput('');
  };

  // Batch enrich (max 10 at a time)
  const handleBatchEnrich = async () => {
    const toEnrich = filteredLeads
      .filter(l => selectedIds.has(l.id) && !l.enrichment && !enrichingIds.has(l.id))
      .slice(0, 10);

    if (toEnrich.length === 0) return;

    // Add all to enriching set
    setEnrichingIds(prev => {
      const next = new Set(prev);
      toEnrich.forEach(l => next.add(l.id));
      return next;
    });

    // Process sequentially to avoid rate limits
    for (const lead of toEnrich) {
      try {
        const res = await fetch('/api/enrich-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead }),
        });
        const data = await res.json();
        if (data.success) {
          const updatedLead = {
            ...lead,
            enrichment: data.data,
            enrichedAt: data.enrichedAt,
            // Update contact fields from enrichment
            email: data.contactInfo?.email || lead.email,
            phone: data.contactInfo?.phone || lead.phone,
            linkedin: data.contactInfo?.linkedin || lead.linkedin,
            productFit: data.productFit || lead.productFit,
            fitScore: data.fitScore || lead.fitScore,
          };
          setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
        }
      } catch (e) {
        console.error('Enrich failed:', e);
      }
      // Remove from enriching
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }

    // Clear selection after batch
    setSelectedIds(new Set());
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all visible
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // Handle sort
  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  // Chat with AI about lead
  const handleChat = async () => {
    if (!chatInput.trim() || !selectedLead || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead, message: userMessage, history: chatMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (e) {
      console.error('Chat failed:', e);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    }

    setChatLoading(false);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+I to toggle AI sidebar (works even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setShowAISidebar(prev => !prev);
        return;
      }

      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case 'j':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, filteredLeads.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredLeads[focusedIndex]) {
            handleSelectLead(filteredLeads[focusedIndex]);
          }
          break;
        case 'e':
          e.preventDefault();
          if (selectedLead && !selectedLead.enrichment && !enrichingIds.has(selectedLead.id)) {
            handleEnrich(selectedLead);
          } else if (selectedIds.size > 0) {
            handleBatchEnrich();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (showScraper) {
            setShowScraper(false);
          } else if (selectedLead) {
            setSelectedLead(null);
          } else {
            setSelectedIds(new Set());
          }
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'x':
          e.preventDefault();
          if (filteredLeads[focusedIndex]) {
            toggleSelect(filteredLeads[focusedIndex].id);
          }
          break;
        case 's':
          e.preventDefault();
          setShowScraper(true);
          break;
        case 'q':
          e.preventDefault();
          setShowScanner(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredLeads, focusedIndex, selectedLead, enrichingIds, selectedIds, showScraper, showAISidebar]);

  return (
    <div className="h-screen flex bg-[#111111] text-[#e5e5e5] font-['Inter',system-ui,sans-serif]">
      {/* Sidebar - Clean Linear Style */}
      <aside className="w-48 border-r border-[#222] flex flex-col bg-[#111111]">
        {/* Logo */}
        <div className="h-11 flex items-center px-3 border-b border-[#222]">
          <span className="font-semibold text-[13px] text-white tracking-tight">Leads</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-hidden flex flex-col">
          {/* Pipeline Section */}
          <div className="space-y-0.5">
            <SidebarItem
              icon={<IconDatabase className="w-3.5 h-3.5" />}
              label="All"
              count={leads.length}
              active={activeTab === 'all' && !sectorFilter}
              onClick={() => { setActiveTab('all'); setSectorFilter(null); }}
            />
            <SidebarItem
              icon={<IconCheck className="w-3.5 h-3.5" />}
              label="Enriched"
              count={enrichedCount}
              active={activeTab === 'enriched'}
              onClick={() => setActiveTab('enriched')}
            />
            <SidebarItem
              icon={<IconClock className="w-3.5 h-3.5" />}
              label="Pending"
              count={leads.length - enrichedCount}
              active={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
            />
          </div>

          {/* Sectors */}
          <div className="mt-4 pt-3 border-t border-[#222] flex-1 flex flex-col min-h-0">
            <div className="px-2 mb-2 text-[10px] font-medium text-[#666] uppercase tracking-wider">Sectors</div>
            <div className="flex-1 overflow-auto space-y-0.5 pr-1">
              {sectors.slice(0, 20).map(s => {
                const count = leads.filter(l => l.sector === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors flex items-center justify-between group ${
                      sectorFilter === s
                        ? 'bg-[#222] text-white'
                        : 'text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <span className="truncate">{s}</span>
                    <span className={`text-[10px] tabular-nums ${sectorFilter === s ? 'text-[#888]' : 'text-[#444]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Status */}
        <div className="px-3 py-2 border-t border-[#222]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#666]">
            <div className={`w-1.5 h-1.5 rounded-full ${dataSource === 'supabase' ? 'bg-green-500' : 'bg-[#444]'}`} />
            <span>{dataSource === 'supabase' ? 'Connected' : 'Local'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - Clean Linear Style */}
        <header className="h-11 flex items-center px-4 border-b border-[#222] gap-3 bg-[#111111]">
          {/* Search */}
          <div className="relative flex items-center w-64">
            <IconSearch className="absolute left-2.5 w-3.5 h-3.5 text-[#555] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-7 bg-[#1a1a1a] border border-[#333] rounded pl-8 pr-8 text-[12px] focus:outline-none focus:border-[#444] placeholder-[#555] transition-colors"
            />
            {search ? (
              <button onClick={() => setSearch('')} className="absolute right-2.5 text-[#555] hover:text-white">
                <IconX className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="absolute right-2.5 px-1 py-0.5 bg-[#222] rounded text-[9px] text-[#555]">/</kbd>
            )}
          </div>

          {/* Filters */}
          <select
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value || null)}
            className="h-7 bg-[#1a1a1a] border border-[#333] rounded px-2 text-[11px] focus:outline-none focus:border-[#444] appearance-none cursor-pointer text-[#888] hover:text-white transition-colors"
          >
            <option value="">Priority</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button
            onClick={() => setShowAllLeads(!showAllLeads)}
            className={`h-7 px-2.5 rounded text-[11px] transition-colors ${
              showAllLeads
                ? 'bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-white'
                : 'bg-[#222] border border-[#333] text-white'
            }`}
          >
            {showAllLeads ? 'All' : 'Curated'}
          </button>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="h-7 px-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[11px] text-[#888] hover:text-white hover:border-[#444] transition-colors"
            >
              Scan
            </button>

            <button
              onClick={() => setShowScraper(true)}
              className="h-7 px-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[11px] text-[#888] hover:text-white hover:border-[#444] transition-colors"
            >
              Add
            </button>

            <div className="w-px h-4 bg-[#333]" />

            <button
              onClick={() => setShowAISidebar(!showAISidebar)}
              className={`h-7 px-2.5 rounded text-[11px] transition-colors flex items-center gap-1.5 ${
                showAISidebar
                  ? 'bg-[#222] border border-[#444] text-white'
                  : 'bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-white hover:border-[#444]'
              }`}
            >
              AI
              <kbd className="px-1 py-0.5 bg-[#222] rounded text-[9px] text-[#555]">⌘I</kbd>
            </button>
          </div>
        </header>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="h-9 flex items-center justify-between px-4 bg-[#1a1a1a] border-b border-[#333]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white">{selectedIds.size} selected</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-[#888] hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              onClick={handleBatchEnrich}
              disabled={enrichingIds.size > 0}
              className="h-6 px-2.5 bg-[#222] hover:bg-[#333] disabled:opacity-50 text-white rounded text-[11px] transition-colors"
            >
              {enrichingIds.size > 0 ? 'Enriching...' : 'Enrich'}
            </button>
          </div>
        )}

        {/* Table */}
        <div ref={tableRef} className="flex-1 overflow-auto bg-[#111111]">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#111111] border-b border-[#222] text-left">
                <th className="px-3 py-2.5 w-[36px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3 h-3 rounded border-[#444] bg-[#1a1a1a] cursor-pointer"
                  />
                </th>
                <SortHeader label="Company" col="company" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width="w-[200px]" />
                <th className="font-medium text-[#666] px-3 py-2.5 w-[100px] text-[11px]">Sector</th>
                <th className="font-medium text-[#666] px-3 py-2.5 w-[140px] text-[11px]">Contact</th>
                <th className="font-medium text-[#666] px-3 py-2.5 w-[90px] text-[11px]">Location</th>
                <SortHeader label="Revenue" col="revenue" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width="w-[70px]" />
                <SortHeader label="Priority" col="priority" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width="w-[70px]" />
                <th className="font-medium text-[#666] px-3 py-2.5 w-[60px] text-[11px]">Status</th>
                <SortHeader label="Fit" col="fitScore" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width="w-[45px]" />
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin text-[#555]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-[11px] text-[#555]">Loading leads...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-[11px] text-[#555]">
                    No leads found
                  </td>
                </tr>
              ) : filteredLeads.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`border-b border-[#1a1a1a] cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id ? 'bg-[#1a1a1a]' :
                    focusedIndex === i ? 'bg-[#161616]' :
                    selectedIds.has(lead.id) ? 'bg-[#161616]' : 'hover:bg-[#161616]'
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-3 h-3 rounded border-[#444] bg-[#1a1a1a] cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[#e5e5e5] text-[12px]">{lead.company}</div>
                    {lead.website && <div className="text-[10px] text-[#555] mt-0.5">{lead.website}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-[#888] text-[11px]">{lead.sector}</td>
                  <td className="px-3 py-2.5">
                    {lead.email ? (
                      <div>
                        <div className="text-[11px] text-[#888] truncate max-w-[130px]">{lead.email}</div>
                        {lead.phone && <div className="text-[10px] text-[#555] mt-0.5">{lead.phone}</div>}
                      </div>
                    ) : (
                      <span className="text-[#444] text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[#666] text-[11px]">{lead.city}{lead.state ? `, ${lead.state}` : ''}</td>
                  <td className="px-3 py-2.5">
                    {lead.revenue ? <span className="text-[#888] font-mono text-[11px]">${lead.revenue}B</span> : <span className="text-[#444]">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <PriorityPill priority={lead.priority} />
                  </td>
                  <td className="px-3 py-2.5">
                    {enrichingIds.has(lead.id) ? (
                      <span className="text-[#888] text-[10px]">...</span>
                    ) : lead.enrichment ? (
                      <span className="text-green-500 text-[10px]">Done</span>
                    ) : (
                      <span className="text-[#444] text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.enrichment?.score?.fitScore ? (
                      <span className="font-mono text-[11px] text-[#888]">
                        {lead.enrichment.score.fitScore}
                      </span>
                    ) : (
                      <span className="text-[#444]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-[13px] text-[#666] mb-1">No leads found</div>
              <div className="text-[11px] text-[#555]">Try adjusting your filters</div>
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="py-2 flex justify-center border-t border-[#222]">
            <button
              onClick={() => fetchLeads(true)}
              disabled={loadingMore}
              className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded text-[11px] text-[#888] hover:text-white disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading...' : `Load more (${(totalLeads - leads.length).toLocaleString()})`}
            </button>
          </div>
        )}

        {/* Status Bar */}
        <div className="h-6 flex items-center justify-between px-3 border-t border-[#222] text-[10px] text-[#666]">
          <span className="tabular-nums">{filteredLeads.length} of {leads.length}</span>
          <div className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[9px] text-[#555]">j/k</kbd>
            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[9px] text-[#555]">x</kbd>
            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[9px] text-[#555]">e</kbd>
            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[9px] text-[#555]">⌘I</kbd>
          </div>
        </div>
      </main>

      {/* Detail Panel */}
      {selectedLead && (
        <aside className="w-[380px] border-l border-[#222] flex flex-col bg-[#111111]">
          {/* Panel Header */}
          <div className="h-11 flex items-center justify-between px-3 border-b border-[#222]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded bg-[#222] flex items-center justify-center text-[#888] font-medium text-[10px]">
                {selectedLead.company.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-white text-[12px] truncate">{selectedLead.company}</div>
                <div className="text-[10px] text-[#666]">{selectedLead.sector}</div>
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="text-[#666] hover:text-white p-1 -mr-1 transition-colors">
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Panel Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#222]">
            {(['overview', 'sellsheet', 'signals', 'callprep', 'intel', 'chat'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                  detailTab === tab
                    ? 'bg-[#222] text-white'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'sellsheet' ? 'Sell Sheet' : tab === 'signals' ? 'Signals' : tab === 'callprep' ? 'Call Prep' : tab === 'intel' ? 'Intel' : 'Research'}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-3">
            {!selectedLead.enrichment ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-3">
                  <IconSparkles className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="text-[13px] font-medium text-zinc-300 mb-1">Enrich this lead</div>
                <div className="text-[11px] text-zinc-600 mb-4 max-w-[260px] leading-relaxed">
                  Get AI-powered insights, call scripts, and strategic intel
                </div>
                <button
                  onClick={() => handleEnrich(selectedLead)}
                  disabled={enrichingIds.has(selectedLead.id)}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-zinc-300 disabled:text-zinc-600 font-medium px-3 py-1.5 rounded text-[11px] transition-colors border border-zinc-700/50 hover:border-zinc-600"
                >
                  {enrichingIds.has(selectedLead.id) ? (
                    <>
                      <Spinner /> Analyzing...
                    </>
                  ) : (
                    <>
                      <IconSparkles className="w-3.5 h-3.5" /> Enrich with AI
                    </>
                  )}
                </button>
              </div>
            ) : detailTab === 'overview' ? (
              <OverviewTab lead={selectedLead} onReEnrich={() => handleEnrich(selectedLead)} enriching={enrichingIds.has(selectedLead.id)} />
            ) : detailTab === 'sellsheet' ? (
              <SellSheetTab lead={selectedLead} />
            ) : detailTab === 'signals' ? (
              <SignalsTab lead={selectedLead} />
            ) : detailTab === 'callprep' ? (
              <CallPrepTab lead={selectedLead} />
            ) : detailTab === 'intel' ? (
              <IntelTab lead={selectedLead} />
            ) : (
              <ChatTab
                lead={selectedLead}
                messages={chatMessages}
                input={chatInput}
                setInput={setChatInput}
                onSend={handleChat}
                loading={chatLoading}
              />
            )}
          </div>
        </aside>
      )}

      {/* Scraper Modal */}
      {showScraper && (
        <ScraperModal onClose={() => setShowScraper(false)} />
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <ScannerModal onClose={() => setShowScanner(false)} onSelectLead={handleSelectLead} />
      )}

      {/* AI Sidebar */}
      <AISidebar
        isOpen={showAISidebar}
        onClose={() => setShowAISidebar(false)}
        selectedLeads={filteredLeads.filter(l => selectedIds.has(l.id))}
        allLeads={leads}
        onImportCompanies={(companies) => {
          // Refresh leads after import
          fetch(`/api/leads?${new URLSearchParams({
            limit: '1000',
            ...(showAllLeads ? {} : { source: 'curated' })
          })}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                setLeads(data.data);
              }
            });
        }}
        onFilterLeads={(filter) => {
          if (filter.sector) setSectorFilter(filter.sector);
          if (filter.priority) setPriorityFilter(filter.priority);
          if (filter.search) setSearch(filter.search);
        }}
        onSelectLead={handleSelectLead}
        currentFilters={{
          sector: sectorFilter,
          priority: priorityFilter,
          search: search,
        }}
      />
    </div>
  );
}

// Overview Tab
function OverviewTab({ lead, onReEnrich, enriching }: { lead: Lead; onReEnrich: () => void; enriching: boolean }) {
  const e = lead.enrichment!;
  const [whyData, setWhyData] = React.useState<any>(null);
  const [whyLoading, setWhyLoading] = React.useState(false);
  const [similarLeads, setSimilarLeads] = React.useState<any[]>([]);
  const [similarLoading, setSimilarLoading] = React.useState(false);

  // Fetch "Why This Lead" on demand
  const fetchWhy = async () => {
    setWhyLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/why`);
      const data = await res.json();
      if (data.success && data.why) {
        setWhyData(data.why);
      }
    } catch (err) {
      console.error('Failed to fetch why:', err);
    } finally {
      setWhyLoading(false);
    }
  };

  // Fetch similar leads on demand
  const fetchSimilar = async () => {
    setSimilarLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/similar?limit=5`);
      const data = await res.json();
      if (data.success && data.similar) {
        setSimilarLeads(data.similar);
      }
    } catch (err) {
      console.error('Failed to fetch similar:', err);
    } finally {
      setSimilarLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Why This Lead - Quick Card */}
      <div className="p-3 bg-[#0a0a0a] border border-[#222] rounded">
        {whyData ? (
          <div>
            <div className="text-[12px] font-medium text-white mb-1">{whyData.headline}</div>
            <p className="text-[11px] text-[#888] leading-relaxed mb-2">{whyData.summary}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400">Next: {whyData.nextStep}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#888]">Why is this a good lead?</div>
              <div className="text-[10px] text-[#555]">AI-powered explanation</div>
            </div>
            <button
              onClick={fetchWhy}
              disabled={whyLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded text-[10px] text-[#ccc] disabled:opacity-50 transition-colors"
            >
              {whyLoading ? <Spinner /> : <IconSparkles className="w-3 h-3" />}
              {whyLoading ? 'Loading...' : 'Why This Lead'}
            </button>
          </div>
        )}
      </div>

      {/* Company Overview */}
      <Section title="Company Overview">
        <p className="text-[11px] text-zinc-400 leading-relaxed">{e.companyOverview?.description}</p>
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <InfoCard label="Business Model" value={e.companyOverview?.businessModel} />
          <InfoCard label="Market Position" value={e.companyOverview?.marketPosition} />
        </div>
        {e.companyOverview?.recentNews && (
          <div className="mt-2.5 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded">
            <div className="text-[9px] text-amber-500/80 uppercase tracking-wider mb-1">Recent News</div>
            <div className="text-[11px] text-amber-200/70">{e.companyOverview.recentNews}</div>
          </div>
        )}
      </Section>

      {/* RLTX Fit */}
      <Section title="RLTX Fit">
        <div className="flex items-center gap-2 mb-2">
          <ProductPill product={e.rltxFit?.primaryProduct || ''} large />
          {e.score && (
            <span className="text-[10px] text-zinc-600">
              Fit: <span className="text-emerald-400/80 font-medium">{e.score.fitScore}/10</span>
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">{e.rltxFit?.valueProposition}</p>
        {e.rltxFit?.estimatedImpact && (
          <div className="mt-2 text-[10px] text-emerald-400/80">
            → {e.rltxFit.estimatedImpact}
          </div>
        )}
      </Section>

      {/* Find Similar Leads */}
      <Section title="Similar Leads">
        {similarLeads.length > 0 ? (
          <div className="space-y-2">
            {similarLeads.map((sim) => (
              <div key={sim.id} className="p-2 bg-[#0a0a0a] border border-[#222] rounded flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-white">{sim.company}</div>
                  <div className="text-[10px] text-[#666]">
                    {sim.subSector || sim.sector} {sim.revenue && `· $${sim.revenue}B`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#888] tabular-nums">{sim.similarity}% match</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={fetchSimilar}
            disabled={similarLoading}
            className="w-full flex items-center justify-center gap-1.5 p-2.5 bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-[#222] rounded text-[11px] text-[#888] disabled:opacity-50 transition-colors"
          >
            {similarLoading ? <Spinner /> : <IconSearch className="w-3 h-3" />}
            {similarLoading ? 'Finding similar...' : 'Find Similar Leads'}
          </button>
        )}
      </Section>

      {/* Use Cases */}
      {e.rltxFit?.useCases && (
        <Section title="Use Cases">
          <div className="flex flex-wrap gap-1">
            {e.rltxFit.useCases.map((uc, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-zinc-800/50 text-zinc-500 rounded text-[10px] border border-zinc-800">{uc}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Scores */}
      {e.score && (
        <Section title="Priority Assessment">
          <div className="flex items-center gap-4 mb-2">
            <ScoreRing label="Fit" value={e.score.fitScore} />
            <ScoreRing label="Urgency" value={e.score.urgencyScore} />
            <ScoreRing label="Access" value={e.score.accessibilityScore} />
            <div className="ml-auto">
              <PriorityPill priority={e.score.overallPriority} />
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed">{e.score.reasoning}</p>
        </Section>
      )}

      {/* Re-enrich button */}
      <button
        onClick={onReEnrich}
        disabled={enriching}
        className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 disabled:text-zinc-600 font-medium py-2 rounded text-[11px] transition-colors border border-zinc-800 hover:border-zinc-700"
      >
        {enriching ? <><Spinner /> Re-analyzing...</> : <><IconSparkles className="w-3 h-3" /> Re-analyze</>}
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

// Chat Tab - Research assistant for each lead
function ChatTab({
  lead,
  messages,
  input,
  setInput,
  onSend,
  loading
}: {
  lead: Lead;
  messages: Array<{role: 'user' | 'assistant'; content: string}>;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
}) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <IconChat className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="text-[13px] text-zinc-400 mb-2">Research {lead.company}</div>
            <div className="text-[12px] text-zinc-500 max-w-[280px] mx-auto">
              Ask questions about this company, competitors, market position, news, or anything else.
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[
                'What are their main competitors?',
                'Recent news or announcements?',
                'Key decision makers?',
                'Tech stack they use?',
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] text-zinc-400 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-[13px] ${
              msg.role === 'user'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800/50 text-zinc-300'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
              <Spinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-zinc-800/50 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder={`Ask about ${lead.company}...`}
            className="flex-1 h-9 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 text-[13px] focus:outline-none focus:border-zinc-600 placeholder-zinc-500"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="h-9 px-4 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-black disabled:text-zinc-400 font-medium rounded-lg text-[13px] transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Sell Sheet Tab - Comprehensive contextual selling intelligence
function SellSheetTab({ lead }: { lead: Lead }) {
  const [sellSheet, setSellSheet] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<'fit' | 'pain' | 'talk' | 'decision' | 'compete' | 'outreach'>('fit');

  // Fetch sell sheet on mount or when lead changes
  React.useEffect(() => {
    const fetchSellSheet = async () => {
      try {
        // First check if cached
        const getRes = await fetch(`/api/leads/${lead.id}/sell-sheet`);
        const getData = await getRes.json();

        if (getData.success && getData.sellSheet) {
          setSellSheet(getData.sellSheet);
        }
      } catch (err) {
        // Ignore - will show generate button
      }
    };

    if (lead.id) {
      setSellSheet(null);
      fetchSellSheet();
    }
  }, [lead.id]);

  const generateSellSheet = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/sell-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      });

      const data = await res.json();

      if (data.success && data.sellSheet) {
        setSellSheet(data.sellSheet);
      } else {
        setError(data.error || 'Failed to generate sell sheet');
      }
    } catch (err) {
      setError('Failed to generate sell sheet');
    } finally {
      setLoading(false);
    }
  };

  // Show generate button if no sell sheet
  if (!sellSheet && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center mb-4">
          <IconScript className="w-6 h-6 text-[#666]" />
        </div>
        <div className="text-[14px] font-medium text-white mb-1">Generate Sell Sheet</div>
        <div className="text-[12px] text-[#666] mb-5 max-w-[280px] leading-relaxed">
          AI-powered contextual intelligence for selling to {lead.company}. Includes pain points, talking points, decision makers, and outreach strategy.
        </div>
        {error && (
          <div className="text-[11px] text-red-400 mb-3">{error}</div>
        )}
        <button
          onClick={() => generateSellSheet()}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-medium px-4 py-2 rounded text-[12px] transition-colors"
        >
          <IconSparkles className="w-4 h-4" />
          Generate with AI
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="mb-4">
          <Spinner />
        </div>
        <div className="text-[13px] text-[#888]">Generating sell sheet...</div>
        <div className="text-[11px] text-[#555] mt-1">This may take 15-30 seconds</div>
      </div>
    );
  }

  const ss = sellSheet;

  return (
    <div className="space-y-4">
      {/* Header with scores */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <ProductPill product={ss.productFit?.primaryProduct || ''} large />
          <span className="text-[11px] text-[#666]">
            Fit: <span className="text-white font-medium">{ss.productFit?.fitScore || ss.scores?.fit || 0}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[14px] font-semibold text-white">{ss.scores?.overall || 0}</div>
            <div className="text-[9px] text-[#555] uppercase">Score</div>
          </div>
          <button
            onClick={() => generateSellSheet(true)}
            className="p-1.5 hover:bg-[#222] rounded transition-colors"
            title="Regenerate"
          >
            <IconSparkles className="w-3 h-3 text-[#666]" />
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-1">
        {([
          { id: 'fit', label: 'Fit' },
          { id: 'pain', label: 'Pain Points' },
          { id: 'talk', label: 'Talking' },
          { id: 'decision', label: 'Decision' },
          { id: 'compete', label: 'Compete' },
          { id: 'outreach', label: 'Outreach' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              activeSection === tab.id
                ? 'bg-[#222] text-white'
                : 'text-[#666] hover:text-[#ccc]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="space-y-4">
        {activeSection === 'fit' && (
          <>
            {/* Product Fit */}
            <Section title="Why They're a Fit">
              <p className="text-[12px] text-[#ccc] leading-relaxed">{ss.productFit?.fitExplanation}</p>
              {ss.productFit?.useCaseMatch && (
                <div className="mt-2 p-2 bg-[#0a0a0a] border border-[#222] rounded">
                  <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Use Case Match</div>
                  <div className="text-[11px] text-[#888]">{ss.productFit.useCaseMatch}</div>
                </div>
              )}
              {ss.productFit?.competitorDisplacement && (
                <div className="mt-2 p-2 bg-[#0a0a0a] border border-[#222] rounded">
                  <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Replaces</div>
                  <div className="text-[11px] text-[#888]">{ss.productFit.competitorDisplacement}</div>
                </div>
              )}
              {ss.productFit?.reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {ss.productFit.reasons.map((r: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-[#1a1a1a] text-[#666] rounded text-[9px] border border-[#222]">{r}</span>
                  ))}
                </div>
              )}
            </Section>

            {/* Similar Customers */}
            {ss.similarCustomers?.length > 0 && (
              <Section title="Similar Customers">
                <div className="space-y-2">
                  {ss.similarCustomers.slice(0, 3).map((c: any, i: number) => (
                    <div key={i} className="p-2.5 bg-[#0a0a0a] border border-[#222] rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-white">{c.company}</span>
                        <span className="text-[10px] text-[#555]">{c.sector}</span>
                      </div>
                      <div className="text-[11px] text-[#888] mb-1">{c.useCase}</div>
                      <div className="text-[10px] text-emerald-400/80">{c.outcome}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Deal Intel */}
            {ss.dealIntel && (
              <Section title="Deal Intelligence">
                <div className="grid grid-cols-2 gap-2">
                  <InfoCard label="Deal Size" value={ss.dealIntel.estimatedDealSize} highlight />
                  <InfoCard label="Sales Cycle" value={ss.dealIntel.salesCycle} />
                  <InfoCard label="Budget Timing" value={ss.dealIntel.budgetTiming} />
                  <InfoCard label="Entry Strategy" value={ss.dealIntel.entryStrategy} />
                </div>
                {ss.dealIntel.expansionPath && (
                  <div className="mt-2 text-[10px] text-[#666]">
                    <span className="text-[#555]">Expansion:</span> {ss.dealIntel.expansionPath}
                  </div>
                )}
              </Section>
            )}
          </>
        )}

        {activeSection === 'pain' && (
          <>
            {/* Pain Points */}
            {ss.painPoints?.length > 0 && (
              <Section title="Pain Points">
                <div className="space-y-3">
                  {ss.painPoints.map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-[#0a0a0a] border border-[#222] rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          p.category === 'strategic' ? 'bg-purple-500/10 text-purple-400' :
                          p.category === 'operational' ? 'bg-blue-500/10 text-blue-400' :
                          p.category === 'financial' ? 'bg-green-500/10 text-green-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {p.category}
                        </span>
                      </div>
                      <div className="text-[12px] text-red-400/90 font-medium mb-1">{p.pain}</div>
                      <div className="text-[11px] text-[#888] mb-2">{p.businessImpact}</div>
                      {p.quantifiedCost && (
                        <div className="text-[10px] text-amber-400/80 mb-2">Cost: {p.quantifiedCost}</div>
                      )}
                      <div className="pt-2 border-t border-[#1a1a1a]">
                        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">RLTX Solution</div>
                        <div className="text-[11px] text-emerald-400/80">{p.rltxSolution}</div>
                      </div>
                      {p.proofPoint && (
                        <div className="mt-2 text-[10px] text-[#666] italic">{p.proofPoint}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {activeSection === 'talk' && (
          <>
            {/* Talking Points */}
            {ss.talkingPoints && (
              <div className="space-y-4">
                {Object.entries(ss.talkingPoints).map(([audience, points]: [string, any]) => (
                  points?.length > 0 && (
                    <Section key={audience} title={`${audience.charAt(0).toUpperCase() + audience.slice(1)} Talking Points`}>
                      <div className="space-y-1.5">
                        {points.map((point: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span className="text-[#ccc]">{point}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'decision' && (
          <>
            {/* Decision Makers */}
            {ss.decisionMakers && (
              <Section title="Decision Makers">
                <div className="space-y-3">
                  {ss.decisionMakers.targetTitles?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1.5">Target Titles</div>
                      <div className="flex flex-wrap gap-1">
                        {ss.decisionMakers.targetTitles.map((t: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded text-[10px] text-[#ccc]">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <InfoRow label="Buying Center" value={ss.decisionMakers.buyingCenter} />
                  <InfoRow label="Budget Owner" value={ss.decisionMakers.budgetOwner} />
                  <InfoRow label="Decision Process" value={ss.decisionMakers.decisionProcess} />
                  {ss.decisionMakers.influencers?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Influencers</div>
                      <div className="text-[11px] text-[#888]">{ss.decisionMakers.influencers.join(', ')}</div>
                    </div>
                  )}
                  {ss.decisionMakers.potentialBlockers?.length > 0 && (
                    <div className="p-2 bg-red-500/5 border border-red-500/10 rounded">
                      <div className="text-[9px] text-red-400/80 uppercase tracking-wider mb-1">Potential Blockers</div>
                      <div className="text-[11px] text-red-400/70">{ss.decisionMakers.potentialBlockers.join(', ')}</div>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </>
        )}

        {activeSection === 'compete' && (
          <>
            {/* Competitive Intelligence */}
            {ss.competitive && (
              <Section title="Competitive Landscape">
                <div className="space-y-3">
                  {ss.competitive.currentSolutions?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1.5">Current Solutions</div>
                      <div className="flex flex-wrap gap-1">
                        {ss.competitive.currentSolutions.map((s: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400/80 rounded text-[10px]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ss.competitive.likelyVendors?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1.5">Evaluating</div>
                      <div className="flex flex-wrap gap-1">
                        {ss.competitive.likelyVendors.map((v: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-amber-500/10 text-amber-400/80 rounded text-[10px]">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <InfoRow label="Switching Costs" value={ss.competitive.switchingCosts} />
                  {ss.competitive.competitiveAngle && (
                    <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded">
                      <div className="text-[9px] text-emerald-400/80 uppercase tracking-wider mb-1">Our Angle</div>
                      <div className="text-[11px] text-[#ccc]">{ss.competitive.competitiveAngle}</div>
                    </div>
                  )}
                  {ss.competitive.triggerEvents?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1.5">Trigger Events</div>
                      <ul className="space-y-1">
                        {ss.competitive.triggerEvents.map((t: string, i: number) => (
                          <li key={i} className="text-[11px] text-[#888] flex items-start gap-2">
                            <span className="text-[#555]">→</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </>
        )}

        {activeSection === 'outreach' && (
          <>
            {/* Outreach Strategy */}
            {ss.outreach && (
              <div className="space-y-4">
                {/* Opening Hook */}
                {ss.outreach.openingHook && (
                  <Section title="Opening Hook" icon={<IconQuote />}>
                    <div className="p-3 bg-[#0a0a0a] border border-[#333] rounded">
                      <p className="text-[13px] text-[#ccc] italic leading-relaxed">"{ss.outreach.openingHook}"</p>
                    </div>
                  </Section>
                )}

                {/* Proof Points */}
                {ss.outreach.proofPoints?.length > 0 && (
                  <Section title="Proof Points">
                    <div className="space-y-1.5">
                      {ss.outreach.proofPoints.map((p: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <span className="text-emerald-400">•</span>
                          <span className="text-[#888]">{p}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Discovery Questions */}
                {ss.outreach.discoveryQuestions?.length > 0 && (
                  <Section title="Discovery Questions" icon={<IconQuestion />}>
                    <div className="space-y-2">
                      {ss.outreach.discoveryQuestions.map((q: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          <span className="text-[#555] font-medium">{i + 1}.</span>
                          <span className="text-[#ccc]">{q}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Objection Handling */}
                {ss.outreach.objectionHandling?.length > 0 && (
                  <Section title="Objection Handling" icon={<IconShield />}>
                    <div className="space-y-2.5">
                      {ss.outreach.objectionHandling.map((obj: any, i: number) => (
                        <div key={i} className="p-2.5 bg-[#0a0a0a] border border-[#222] rounded">
                          <div className="text-[11px] text-amber-400/90 mb-1.5">"{obj.objection}"</div>
                          <div className="text-[11px] text-[#888]">{obj.response}</div>
                          {obj.proofPoint && (
                            <div className="text-[10px] text-[#555] mt-1 italic">{obj.proofPoint}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Timing & Channel */}
                <div className="flex gap-3">
                  <InfoCard label="Best Time" value={ss.outreach.timing} />
                  <InfoCard label="Channel" value={ss.outreach.recommendedChannel} highlight />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with generation info */}
      <div className="pt-3 border-t border-[#1a1a1a] mt-4">
        <div className="flex items-center justify-between text-[10px] text-[#555]">
          <span>Generated {new Date(ss.generatedAt).toLocaleDateString()}</span>
          <span>Expires {new Date(ss.expiresAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

// Signals Tab - Intent signal detection and display
function SignalsTab({ lead }: { lead: Lead }) {
  const [signals, setSignals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<string | null>(null);

  // Fetch signals on mount
  React.useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}/signals`);
        const data = await res.json();

        if (data.success && data.signals) {
          setSignals(data.signals);
          setSummary(data.summary);
        }
      } catch (err) {
        // Ignore - will show detect button
      }
    };

    if (lead.id) {
      setSignals([]);
      setSummary(null);
      fetchSignals();
    }
  }, [lead.id]);

  const detectSignals = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      });

      const data = await res.json();

      if (data.success && data.signals) {
        setSignals(data.signals);
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to detect signals');
      }
    } catch (err) {
      setError('Failed to detect signals');
    } finally {
      setLoading(false);
    }
  };

  // Signal type icon and color mapping
  const signalConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    hiring: { icon: <IconUsers className="w-3.5 h-3.5" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    funding: { icon: <IconDollar className="w-3.5 h-3.5" />, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    news: { icon: <IconSparkles className="w-3.5 h-3.5" />, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    contract: { icon: <IconScript className="w-3.5 h-3.5" />, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    tech_stack: { icon: <IconDatabase className="w-3.5 h-3.5" />, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    leadership: { icon: <IconTarget className="w-3.5 h-3.5" />, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    expansion: { icon: <IconPlus className="w-3.5 h-3.5" />, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  };

  // Show detect button if no signals
  if (signals.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center mb-4">
          <IconRadar className="w-6 h-6 text-[#666]" />
        </div>
        <div className="text-[14px] font-medium text-white mb-1">Detect Intent Signals</div>
        <div className="text-[12px] text-[#666] mb-5 max-w-[280px] leading-relaxed">
          AI-powered detection of hiring, funding, news, and tech stack signals that indicate buying intent.
        </div>
        {error && (
          <div className="text-[11px] text-red-400 mb-3">{error}</div>
        )}
        <button
          onClick={() => detectSignals()}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-medium px-4 py-2 rounded text-[12px] transition-colors"
        >
          <IconRadar className="w-4 h-4" />
          Detect Signals
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="mb-4">
          <Spinner />
        </div>
        <div className="text-[13px] text-[#888]">Detecting signals...</div>
        <div className="text-[11px] text-[#555] mt-1">Analyzing hiring, funding, and news signals</div>
      </div>
    );
  }

  // Sort signals by relevance
  const sortedSignals = [...signals].sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Group by strength
  const strongSignals = sortedSignals.filter(s => s.strength === 'strong');
  const moderateSignals = sortedSignals.filter(s => s.strength === 'moderate');
  const weakSignals = sortedSignals.filter(s => s.strength === 'weak');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#888]">{signals.length} signals detected</span>
        </div>
        <button
          onClick={() => detectSignals(true)}
          className="p-1.5 hover:bg-[#222] rounded transition-colors"
          title="Re-detect signals"
        >
          <IconRadar className="w-3 h-3 text-[#666]" />
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="p-2.5 bg-[#0a0a0a] border border-[#222] rounded">
          <div className="text-[11px] text-[#ccc]">{summary}</div>
        </div>
      )}

      {/* Strong Signals */}
      {strongSignals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#555] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            Strong Signals
          </div>
          {strongSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} config={signalConfig[signal.type]} />
          ))}
        </div>
      )}

      {/* Moderate Signals */}
      {moderateSignals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#555] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Moderate Signals
          </div>
          {moderateSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} config={signalConfig[signal.type]} />
          ))}
        </div>
      )}

      {/* Weak Signals */}
      {weakSignals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#555] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#555]"></span>
            Weak Signals
          </div>
          {weakSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} config={signalConfig[signal.type]} />
          ))}
        </div>
      )}

      {/* Signal Legend */}
      <div className="pt-3 border-t border-[#1a1a1a]">
        <div className="text-[9px] text-[#444] uppercase tracking-wider mb-2">Signal Types</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(signalConfig).map(([type, config]) => (
            <div key={type} className={`flex items-center gap-1 px-1.5 py-0.5 ${config.bgColor} rounded`}>
              <span className={config.color}>{config.icon}</span>
              <span className={`text-[9px] ${config.color}`}>{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Individual Signal Card
function SignalCard({ signal, config }: { signal: any; config?: { icon: React.ReactNode; color: string; bgColor: string } }) {
  const defaultConfig = { icon: <IconSparkles className="w-3.5 h-3.5" />, color: 'text-[#888]', bgColor: 'bg-[#222]' };
  const { icon, color, bgColor } = config || defaultConfig;

  return (
    <div className="p-3 bg-[#0a0a0a] border border-[#222] hover:border-[#333] rounded transition-colors">
      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 ${bgColor} rounded`}>
          <span className={color}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[12px] font-medium text-white truncate">{signal.title}</span>
            <span className="text-[10px] text-[#555] tabular-nums shrink-0">{signal.relevanceScore}</span>
          </div>
          <p className="text-[11px] text-[#888] leading-relaxed">{signal.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              signal.strength === 'strong' ? 'bg-green-500/10 text-green-400' :
              signal.strength === 'moderate' ? 'bg-amber-500/10 text-amber-400' :
              'bg-[#222] text-[#666]'
            }`}>
              {signal.strength}
            </span>
            <span className="text-[9px] text-[#555]">→ {signal.productRelevance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scraper Modal - Premium lead discovery
function ScraperModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = React.useState('');
  const [source, setSource] = React.useState<'ai' | 'github' | 'linkedin' | 'crunchbase'>('ai');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);
  const [foundLeads, setFoundLeads] = React.useState<any[]>([]);

  // Product-aligned search templates
  const searchTemplates = [
    { query: 'Defense contractors with simulation or wargaming needs', product: 'FORESIGHT', color: 'text-blue-400' },
    { query: 'Financial services firms with large research departments', product: 'VERITAS', color: 'text-emerald-400' },
    { query: 'Healthcare organizations running clinical trials', product: 'VERITAS', color: 'text-emerald-400' },
    { query: 'Management consulting firms doing market research', product: 'POPULOUS', color: 'text-amber-400' },
    { query: 'Intelligence and national security contractors', product: 'FORESIGHT', color: 'text-blue-400' },
    { query: 'Fortune 500 companies with strategy or analytics teams', product: 'VERITAS', color: 'text-emerald-400' },
  ];

  const handleScrape = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setFoundLeads([]);

    try {
      const res = await fetch('/api/scrape-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, source }),
      });
      const data = await res.json();
      if (data.success && data.leads) {
        setFoundLeads(data.leads);
        setResults({ success: true, count: data.count, message: data.message });
      } else {
        setResults({ success: false, message: data.message || 'Search failed' });
      }
    } catch (e) {
      setResults({ success: false, message: 'Error: Failed to search. Try again.' });
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-[560px] max-h-[80vh] bg-[#111] border border-zinc-800/80 rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
          <div>
            <h2 className="text-[14px] font-medium text-white">Find Companies</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Describe your ideal customer profile</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 overflow-auto">
          {/* Search Input */}
          <div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleScrape())}
              placeholder="Describe the companies you're looking for..."
              className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-[13px] focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 placeholder-zinc-600 resize-none transition-all"
              autoFocus
            />
          </div>

          {/* Source Pills */}
          <div className="flex gap-1.5">
            {([
              { key: 'ai', label: 'All Sources' },
              { key: 'github', label: 'GitHub' },
              { key: 'linkedin', label: 'LinkedIn' },
              { key: 'crunchbase', label: 'Crunchbase' },
            ] as const).map(s => (
              <button
                key={s.key}
                onClick={() => setSource(s.key)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  source === s.key
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Templates */}
          {!query && !foundLeads.length && (
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Templates</div>
              <div className="space-y-1">
                {searchTemplates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(t.query)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg text-left hover:bg-zinc-900 transition-colors group"
                  >
                    <span className="text-[12px] text-zinc-400 group-hover:text-zinc-200 transition-colors">{t.query}</span>
                    <span className={`text-[10px] font-medium ${t.color} opacity-60`}>{t.product}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className={`p-3 rounded-lg text-[12px] ${
              results.success
                ? 'bg-emerald-950/50 border border-emerald-900/50 text-emerald-400'
                : 'bg-red-950/50 border border-red-900/50 text-red-400'
            }`}>
              {results.message}
            </div>
          )}

          {/* Found Leads */}
          {foundLeads.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Results</div>
              <div className="space-y-1 max-h-52 overflow-auto">
                {foundLeads.map((lead, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                    <div>
                      <div className="text-[12px] font-medium text-white">{lead.company}</div>
                      <div className="text-[11px] text-zinc-500">{lead.sector}</div>
                    </div>
                    <div className="text-[10px] text-zinc-600 max-w-[180px] text-right truncate">{lead.useCase}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800/80">
          <button
            onClick={onClose}
            className="h-8 px-3 text-zinc-400 hover:text-white text-[12px] font-medium transition-colors"
          >
            {foundLeads.length > 0 ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={handleScrape}
            disabled={loading || !query.trim()}
            className="h-8 px-4 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-medium rounded-md text-[12px] transition-all flex items-center gap-1.5"
          >
            {loading ? <><Spinner /> Searching...</> : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Scanner Modal - RLTX Lead Intelligence
function ScannerModal({ onClose, onSelectLead }: { onClose: () => void; onSelectLead: (lead: Lead) => void }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<'actions' | 'FORESIGHT' | 'VERITAS' | 'POPULOUS'>('actions');
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    async function scan() {
      try {
        const res = await fetch('/api/scan-leads');
        const result = await res.json();
        if (result.success) {
          setData(result);
        }
      } catch (e) {
        console.error('Scan failed:', e);
      }
      setLoading(false);
    }
    scan();
  }, []);

  const filterLeads = (leads: any[]) => {
    if (!searchQuery || !leads) return leads || [];
    const q = searchQuery.toLowerCase();
    return leads.filter((l: any) =>
      l.company?.toLowerCase().includes(q) ||
      l.sector?.toLowerCase().includes(q)
    );
  };

  const productDescriptions: Record<string, string> = {
    FORESIGHT: 'Defense & Intel simulation',
    VERITAS: 'Enterprise research',
    POPULOUS: 'Self-serve simulation',
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[720px] max-h-[80vh] bg-[#111] border border-[#333] rounded-lg flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-white">Pipeline Scanner</span>
            {data && (
              <span className="text-[11px] text-[#666]">{data.stats?.total?.toLocaleString()} leads</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-40 h-7 bg-[#1a1a1a] border border-[#333] rounded pl-7 pr-2 text-[11px] focus:outline-none focus:border-[#444] placeholder-[#555]"
              />
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-white p-1 transition-colors">
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <span className="text-[12px] text-[#666]">Analyzing pipeline...</span>
          </div>
        ) : data ? (
          <>
            {/* Stats Row */}
            <div className="flex items-center gap-6 px-4 py-3 border-b border-[#222] bg-[#0a0a0a]">
              <div>
                <div className="text-[18px] font-medium text-white tabular-nums">{data.stats.byTier.hot}</div>
                <div className="text-[10px] text-[#666] uppercase">Hot</div>
              </div>
              <div>
                <div className="text-[18px] font-medium text-[#888] tabular-nums">{data.stats.byTier.warm}</div>
                <div className="text-[10px] text-[#666] uppercase">Warm</div>
              </div>
              <div className="border-l border-[#333] pl-6">
                <div className="text-[18px] font-medium text-white tabular-nums">{data.stats.byProduct?.FORESIGHT || 0}</div>
                <div className="text-[10px] text-[#666] uppercase">Foresight</div>
              </div>
              <div>
                <div className="text-[18px] font-medium text-white tabular-nums">{data.stats.byProduct?.VERITAS || 0}</div>
                <div className="text-[10px] text-[#666] uppercase">Veritas</div>
              </div>
              <div>
                <div className="text-[18px] font-medium text-white tabular-nums">{data.stats.byProduct?.POPULOUS || 0}</div>
                <div className="text-[10px] text-[#666] uppercase">Populous</div>
              </div>
              <div className="ml-auto">
                <div className="text-[18px] font-medium text-[#666] tabular-nums">{Math.round((data.stats.enriched / data.stats.total) * 100)}%</div>
                <div className="text-[10px] text-[#555] uppercase">Enriched</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-[#222]">
              {(['actions', 'FORESIGHT', 'VERITAS', 'POPULOUS'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[11px] rounded transition-colors ${
                    activeTab === tab
                      ? 'bg-[#222] text-white'
                      : 'text-[#666] hover:text-[#ccc] hover:bg-[#1a1a1a]'
                  }`}
                >
                  {tab === 'actions' ? 'Actions' : tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'actions' ? (
                <div className="p-4 space-y-4">
                  {/* Action Items */}
                  {data.actionItems?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-[#666] uppercase tracking-wider">Next Actions</div>
                      {data.actionItems.map((item: any, i: number) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-3 rounded border ${
                            item.priority === 'high'
                              ? 'bg-[#1a1a1a] border-[#333]'
                              : 'bg-[#111] border-[#222]'
                          }`}
                        >
                          <span className="text-[12px] text-[#ccc]">{item.action}</span>
                          <span className="text-[11px] text-[#666] tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top by Product */}
                  {data.topByProduct && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-[#666] uppercase tracking-wider">Top Opportunities</div>
                      {Object.entries(data.topByProduct).map(([product, lead]: [string, any]) => lead && (
                        <div
                          key={product}
                          onClick={() => {
                            onSelectLead(lead as Lead);
                            onClose();
                          }}
                          className="p-3 bg-[#1a1a1a] border border-[#333] hover:border-[#444] rounded cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#666] uppercase">{product}</span>
                              <span className="text-[12px] font-medium text-white">{lead.company}</span>
                            </div>
                            <span className="text-[11px] text-[#888] tabular-nums">{lead.score}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#666]">
                            <span>{lead.sector}</span>
                            {lead.nextAction && (
                              <span className="text-[#888]">· {lead.nextAction}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-[#0a0a0a] border border-[#222] rounded">
                      <div className="text-[10px] text-[#555] uppercase mb-1">Ready for Outreach</div>
                      <div className="text-[16px] font-medium text-white tabular-nums">
                        {data.hotLeads?.filter((l: any) => l.enriched).length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-[#0a0a0a] border border-[#222] rounded">
                      <div className="text-[10px] text-[#555] uppercase mb-1">Need Enrichment</div>
                      <div className="text-[16px] font-medium text-white tabular-nums">
                        {data.hotLeads?.filter((l: any) => !l.enriched).length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-[#0a0a0a] border border-[#222] rounded">
                      <div className="text-[10px] text-[#555] uppercase mb-1">Warm Pipeline</div>
                      <div className="text-[16px] font-medium text-white tabular-nums">
                        {data.stats.byTier.warm}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  {/* Product Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[13px] font-medium text-white">{activeTab}</span>
                      <span className="text-[11px] text-[#666] ml-2">{productDescriptions[activeTab]}</span>
                    </div>
                    <span className="text-[11px] text-[#666]">
                      {filterLeads(data.byProduct?.[activeTab]).length} leads
                    </span>
                  </div>

                  {/* Sub-sector breakdown */}
                  {data.subSectorsByProduct?.[activeTab] && Object.keys(data.subSectorsByProduct[activeTab]).length > 1 && (
                    <div className="mb-4 pb-4 border-b border-[#222]">
                      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Sub-sectors</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(data.subSectorsByProduct[activeTab])
                          .sort((a: any, b: any) => b[1] - a[1])
                          .slice(0, 8)
                          .map(([subSector, count]: [string, any]) => (
                            <span key={subSector} className="px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded text-[10px] text-[#888]">
                              {subSector} <span className="text-[#555] ml-1">{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Leads List */}
                  <div className="space-y-1.5">
                    {filterLeads(data.byProduct?.[activeTab])?.map((lead: any) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          onSelectLead(lead as Lead);
                          onClose();
                        }}
                        className="p-3 bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#333] rounded cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-medium text-white truncate">{lead.company}</span>
                              {lead.enriched && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-[#222] rounded text-[#666]">enriched</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#666]">
                              <span>{lead.subSector || lead.sector}</span>
                              {lead.revenue && <span>· ${lead.revenue >= 1 ? `${lead.revenue}B` : `${(lead.revenue * 1000).toFixed(0)}M`}</span>}
                            </div>
                            {/* Reasons */}
                            {lead.reasons?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {lead.reasons.slice(0, 3).map((reason: string, i: number) => (
                                  <span key={i} className="text-[9px] text-[#555]">{reason}{i < Math.min(lead.reasons.length, 3) - 1 ? ' ·' : ''}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                lead.tier === 'Hot' ? 'bg-red-500/10 text-red-400' :
                                lead.tier === 'Warm' ? 'bg-orange-500/10 text-orange-400' :
                                'bg-[#222] text-[#666]'
                              }`}>
                                {lead.tier}
                              </span>
                              <span className="text-[12px] text-white font-medium tabular-nums">{lead.score}</span>
                            </div>
                            {lead.nextAction && (
                              <span className="text-[10px] text-[#555]">{lead.nextAction}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filterLeads(data.byProduct?.[activeTab])?.length === 0 && (
                      <div className="text-center py-8 text-[#666] text-[12px]">
                        No {activeTab} leads found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-[#666] text-[12px]">
            Failed to load data
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-[20px] font-semibold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Sort Header Component
function SortHeader({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
  width
}: {
  label: string;
  col: 'company' | 'priority' | 'fitScore' | 'revenue';
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'company' | 'priority' | 'fitScore' | 'revenue') => void;
  width: string;
}) {
  const isActive = sortBy === col;
  return (
    <th
      className={`font-medium text-[11px] px-3 py-2.5 ${width} cursor-pointer transition-colors select-none ${
        isActive ? 'text-white' : 'text-[#666] hover:text-[#888]'
      }`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-[#888] text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
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
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon && <span className="text-zinc-600">{icon}</span>}
        <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value, highlight, mono }: { label: string; value?: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800/50">
      <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-[11px] ${highlight ? 'text-emerald-400 font-medium' : 'text-zinc-400'} ${mono ? 'font-mono text-[10px]' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] text-zinc-600">{label}</span>
      <span className={`text-[11px] text-zinc-400 text-right ${mono ? 'font-mono text-[10px]' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function ScriptBlock({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  const [copied, setCopied] = React.useState(false);

  if (!text) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</div>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 text-[9px] text-zinc-600 hover:text-zinc-300 transition-all flex items-center gap-1"
        >
          {copied ? <><IconCheck className="w-2.5 h-2.5" /> Copied</> : <><IconCopy className="w-2.5 h-2.5" /> Copy</>}
        </button>
      </div>
      <div className={`text-[11px] leading-relaxed ${highlight ? 'text-emerald-400' : 'text-zinc-400'}`}>{text}</div>
    </div>
  );
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? 'text-emerald-400' : value >= 6 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className={`text-[16px] font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[9px] text-zinc-600">{label}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition-colors ${
        active
          ? 'bg-[#222] text-white'
          : 'text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1a]'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {count !== undefined && (
        <span className={`text-[10px] tabular-nums ${active ? 'text-[#888]' : 'text-[#444]'}`}>{count.toLocaleString()}</span>
      )}
    </button>
  );
}

function PriorityPill({ priority = 'Medium' }: { priority?: string }) {
  const colors: Record<string, string> = {
    Critical: 'text-red-400',
    High: 'text-orange-400',
    Medium: 'text-[#888]',
    Low: 'text-[#555]',
  };
  return (
    <span className={`text-[11px] ${colors[priority] || colors.Medium}`}>
      {priority}
    </span>
  );
}

function ProductPill({ product, large }: { product: string; large?: boolean }) {
  const key = product.toUpperCase().includes('FORESIGHT') ? 'FORESIGHT' :
              product.toUpperCase().includes('VERITAS') ? 'VERITAS' :
              product.toUpperCase().includes('POPULOUS') ? 'POPULOUS' : '';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded bg-[#222] text-[#888] ${large ? 'text-[11px]' : 'text-[10px]'}`}>
      {key || product}
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
function IconPlus({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>; }
function IconChat({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>; }
function IconCopy({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>; }
function IconAI({ className = "w-4 h-4" }: IconProps) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>; }
