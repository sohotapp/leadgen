'use client';

import * as React from 'react';

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
  source?: string | null;
};

type DiscoveredCompany = {
  company: string;
  sector?: string;
  description?: string;
  website?: string;
  revenue?: string;
  employees?: string;
  location?: string;
  source: string;
  confidence: number;
};

type Message = {
  id: string;
  role: 'user' | 'kevin' | 'stephan' | 'system';
  content: string;
  discoveredCompanies?: DiscoveredCompany[];
  localResults?: Lead[];
  action?: 'searching' | 'discovering' | 'enriching' | 'analyzing';
  timestamp: Date;
};

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: Lead[];
  allLeads: Lead[];
  onImportCompanies: (companies: DiscoveredCompany[]) => void;
  onFilterLeads: (filter: { sector?: string; priority?: string; search?: string }) => void;
  onSelectLead: (lead: Lead) => void;
  currentFilters: {
    sector: string | null;
    priority: string | null;
    search: string;
  };
}

export function AISidebar({
  isOpen,
  onClose,
  selectedLeads,
  allLeads,
  onImportCompanies,
  onFilterLeads,
  onSelectLead,
  currentFilters,
}: AISidebarProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [importingIds, setImportingIds] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const thinkingId = crypto.randomUUID();
    const isDiscovery = input.toLowerCase().includes('find') || input.toLowerCase().includes('discover') || input.toLowerCase().includes('search');

    setMessages(prev => [...prev, {
      id: thinkingId,
      role: isDiscovery ? 'kevin' : 'stephan',
      content: '',
      action: isDiscovery ? 'discovering' : 'analyzing',
      timestamp: new Date(),
    }]);

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          context: {
            selectedLeads: selectedLeads.map(l => ({ id: l.id, company: l.company, sector: l.sector })),
            selectedCount: selectedLeads.length,
            totalLeads: allLeads.length,
            currentFilters,
            sectors: [...new Set(allLeads.map(l => l.sector))],
          },
        }),
      });

      const data = await response.json();
      setMessages(prev => prev.filter(m => m.id !== thinkingId));

      // Kevin handles discovery, Stephan handles analysis
      const hasDiscoveries = data.discoveredCompanies?.length > 0;
      const hasLocalResults = data.localResults?.length > 0;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: hasDiscoveries ? 'kevin' : 'stephan',
        content: data.message || data.response,
        discoveredCompanies: data.discoveredCompanies,
        localResults: data.localResults,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.suggestedFilters) {
        onFilterLeads(data.suggestedFilters);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'stephan',
        content: 'Hit a snag. Try that again?',
        timestamp: new Date(),
      }]);
    }

    setIsLoading(false);
  };

  const handleImportCompany = async (company: DiscoveredCompany) => {
    const tempId = `import-${company.company}`;
    setImportingIds(prev => new Set(prev).add(tempId));

    try {
      const response = await fetch('/api/import-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'system',
          content: `Added ${company.company} to pipeline`,
          timestamp: new Date(),
        }]);
        onImportCompanies([company]);
      }
    } catch (error) {
      console.error('Import error:', error);
    }

    setImportingIds(prev => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  const handleImportAll = async (companies: DiscoveredCompany[]) => {
    for (const company of companies) {
      await handleImportCompany(company);
    }
  };

  // Quick actions - all functional
  const quickActions = [
    {
      label: 'Find similar companies',
      query: selectedLeads.length > 0
        ? `Find companies similar to ${selectedLeads[0].company}`
        : 'Find simulation and decision intelligence companies',
      icon: '◎',
    },
    {
      label: 'Defense & govt targets',
      query: 'Show me defense contractors and government agencies in my database',
      icon: '⬡',
    },
    {
      label: 'High-value unenriched',
      query: 'Which Critical and High priority leads need enrichment?',
      icon: '▲',
    },
    {
      label: 'ICP match',
      query: 'Find enterprise companies that need decision intelligence software - simulation, wargaming, or synthetic data',
      icon: '◈',
    },
    {
      label: 'Discover AI startups',
      query: 'Discover AI and machine learning startups that could use our products',
      icon: '◇',
    },
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-[320px] border-l border-[#222] flex flex-col bg-[#111111]">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-[#222]">
        <span className="text-[12px] font-medium text-white">AI</span>
        <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Context */}
      {selectedLeads.length > 0 && (
        <div className="px-3 py-2 border-b border-[#222] bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#666]">Selected:</span>
            <span className="text-white">{selectedLeads.length}</span>
            <span className="text-[#555] truncate">{selectedLeads.slice(0, 2).map(l => l.company).join(', ')}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="p-3">
            {/* Intro */}
            <div className="mb-4 text-[11px] text-[#888]">
              Search and analyze {allLeads.length.toLocaleString()} leads
            </div>

            {/* Quick Actions */}
            <div className="space-y-1">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setInput(action.query)}
                  className="w-full text-left px-2.5 py-2 rounded text-[11px] transition-colors flex items-center gap-2 group bg-[#1a1a1a] hover:bg-[#222] text-[#888] hover:text-white border border-[#333] hover:border-[#444]"
                >
                  <span className="flex-1">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-4 pt-3 border-t border-[#222]">
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#666]">Total</span>
                  <span className="text-[#888] tabular-nums">{allLeads.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#666]">Enriched</span>
                  <span className="text-[#888] tabular-nums">{allLeads.filter(l => (l as any).enrichment).length}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onImportCompany={handleImportCompany}
                onImportAll={handleImportAll}
                onSelectLead={onSelectLead}
                importingIds={importingIds}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#222]">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask a question..."
            className="w-full h-8 bg-[#1a1a1a] border border-[#333] rounded pl-3 pr-9 text-[12px] focus:outline-none focus:border-[#444] placeholder-[#555] transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#222] hover:bg-[#333] disabled:opacity-50 rounded flex items-center justify-center transition-colors text-[#888] hover:text-white"
          >
            {isLoading ? (
              <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({
  message,
  onImportCompany,
  onImportAll,
  onSelectLead,
  importingIds,
}: {
  message: Message;
  onImportCompany: (company: DiscoveredCompany) => void;
  onImportAll: (companies: DiscoveredCompany[]) => void;
  onSelectLead: (lead: Lead) => void;
  importingIds: Set<string>;
}) {
  if (message.action) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#888]">
          {message.action === 'discovering' && 'Searching...'}
          {message.action === 'analyzing' && 'Analyzing...'}
          {message.action === 'searching' && 'Searching...'}
          {message.action === 'enriching' && 'Processing...'}
        </span>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-2.5 py-1.5 bg-[#222] rounded text-[12px] text-white">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-green-500">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        {message.content}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Response */}
      <div className="text-[12px] text-[#ccc] leading-relaxed">
        {message.content}
      </div>

      {/* Local Results */}
      {message.localResults && message.localResults.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">
            Found in database
          </div>
          {message.localResults.slice(0, 6).map((lead) => (
            <button
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className="w-full flex items-center justify-between p-2 bg-[#1a1a1a] hover:bg-[#222] rounded border border-[#333] hover:border-[#444] transition-colors group"
            >
              <div className="text-left">
                <div className="text-[11px] font-medium text-[#ccc] group-hover:text-white">{lead.company}</div>
                <div className="text-[10px] text-[#666]">{lead.sector}</div>
              </div>
              <span className={`text-[9px] ${
                lead.priority === 'Critical' ? 'text-red-400' :
                lead.priority === 'High' ? 'text-orange-400' :
                lead.priority === 'Medium' ? 'text-[#888]' :
                'text-[#555]'
              }`}>
                {lead.priority}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Discovered Companies */}
      {message.discoveredCompanies && message.discoveredCompanies.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] text-[#555] uppercase tracking-wider">
              Discovered
            </div>
            <button
              onClick={() => onImportAll(message.discoveredCompanies!)}
              className="text-[10px] text-[#888] hover:text-white transition-colors"
            >
              Add all
            </button>
          </div>
          {message.discoveredCompanies.map((company, i) => {
            const importId = `import-${company.company}`;
            const isImporting = importingIds.has(importId);

            return (
              <div
                key={i}
                className="p-2 bg-[#1a1a1a] border border-[#333] rounded"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-[#ccc] truncate">{company.company}</div>
                    <div className="text-[10px] text-[#666] truncate">{company.sector || company.description?.slice(0, 40)}</div>
                  </div>
                  <button
                    onClick={() => onImportCompany(company)}
                    disabled={isImporting}
                    className="shrink-0 h-5 px-2 bg-[#222] hover:bg-[#333] disabled:bg-[#1a1a1a] rounded text-[9px] text-[#888] hover:text-white disabled:text-[#555] font-medium transition-colors"
                  >
                    {isImporting ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
