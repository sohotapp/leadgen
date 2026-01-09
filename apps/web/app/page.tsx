'use client';

import * as React from 'react';
import leadsData from '@/data/leads.json';

type Lead = typeof leadsData[0];

export default function HomePage() {
  const [search, setSearch] = React.useState('');
  const [sectorFilter, setSectorFilter] = React.useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(null);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [enriching, setEnriching] = React.useState(false);
  const [enrichedData, setEnrichedData] = React.useState<Record<string, any>>({});

  const sectors = [...new Set(leadsData.map(l => l.sector))].sort();
  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  const filteredLeads = leadsData.filter(lead => {
    const matchesSearch = !search ||
      lead.company.toLowerCase().includes(search.toLowerCase()) ||
      lead.sector.toLowerCase().includes(search.toLowerCase()) ||
      lead.useCase?.toLowerCase().includes(search.toLowerCase()) ||
      lead.titles?.toLowerCase().includes(search.toLowerCase()) ||
      lead.city?.toLowerCase().includes(search.toLowerCase());
    const matchesSector = !sectorFilter || lead.sector === sectorFilter;
    const matchesPriority = !priorityFilter || lead.priority === priorityFilter;
    return matchesSearch && matchesSector && matchesPriority;
  });

  const handleEnrich = async (lead: Lead) => {
    setEnriching(true);
    try {
      const res = await fetch('/api/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrichedData(prev => ({ ...prev, [lead.id]: data }));
      }
    } catch (e) {
      console.error('Enrich failed:', e);
    }
    setEnriching(false);
  };

  const enrichment = selectedLead ? enrichedData[selectedLead.id]?.data : null;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">R</div>
            <span className="text-xl font-semibold">RLTX Leads</span>
            <span className="text-zinc-500 text-sm ml-4">{filteredLeads.length} of {leadsData.length} leads</span>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search companies, sectors, use cases, locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[300px] bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
        <select
          value={sectorFilter || ''}
          onChange={(e) => setSectorFilter(e.target.value || null)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Sectors ({sectors.length})</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={priorityFilter || ''}
          onChange={(e) => setPriorityFilter(e.target.value || null)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Priorities</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(search || sectorFilter || priorityFilter) && (
          <button
            onClick={() => { setSearch(''); setSectorFilter(null); setPriorityFilter(null); }}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`bg-zinc-900 border rounded-lg p-4 cursor-pointer transition-all hover:border-zinc-500 ${
                enrichedData[lead.id] ? 'border-indigo-500/50' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white truncate flex-1">{lead.company}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ml-2 whitespace-nowrap ${
                  lead.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  lead.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                  lead.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-zinc-500/20 text-zinc-400'
                }`}>
                  {lead.priority}
                </span>
              </div>
              <div className="text-sm text-zinc-400 mb-2 truncate">{lead.sector}{lead.subSector && ` · ${lead.subSector}`}</div>
              {lead.useCase && <div className="text-xs text-zinc-500 mb-3 line-clamp-2">{lead.useCase}</div>}
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 truncate">{lead.city}{lead.state && `, ${lead.state}`}</span>
                {lead.revenue && <span className="text-green-400 ml-2">${lead.revenue}B</span>}
              </div>
              {enrichedData[lead.id] && (
                <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1">
                  <span className="text-xs text-indigo-400">✓ Enriched</span>
                  {enrichedData[lead.id].data?.score && (
                    <span className="text-xs text-zinc-500 ml-auto">
                      Score: {enrichedData[lead.id].data.score.fitScore}/10
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-auto" onClick={() => setSelectedLead(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-4xl w-full my-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedLead.company}</h2>
                  <p className="text-zinc-400">{selectedLead.sector}{selectedLead.subSector && ` · ${selectedLead.subSector}`}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-zinc-400 hover:text-white text-2xl">&times;</button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoBlock label="Priority" value={selectedLead.priority} color={
                  selectedLead.priority === 'Critical' ? 'text-red-400' :
                  selectedLead.priority === 'High' ? 'text-orange-400' : 'text-yellow-400'
                } />
                <InfoBlock label="Revenue" value={selectedLead.revenue ? `$${selectedLead.revenue}B` : 'N/A'} />
                <InfoBlock label="Employees" value={selectedLead.employees?.toLocaleString() || 'N/A'} />
                <InfoBlock label="Location" value={`${selectedLead.city || ''}${selectedLead.state ? `, ${selectedLead.state}` : ''}`} />
              </div>

              {selectedLead.website && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Website</label>
                  <a href={`https://${selectedLead.website}`} target="_blank" className="block text-indigo-400 hover:underline">{selectedLead.website}</a>
                </div>
              )}

              {selectedLead.useCase && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Use Case</label>
                  <p className="mt-1">{selectedLead.useCase}</p>
                </div>
              )}

              {selectedLead.titles && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Target Titles</label>
                  <p className="mt-1">{selectedLead.titles}</p>
                </div>
              )}

              {/* Enriched Data */}
              {enrichment && (
                <div className="space-y-6 pt-4 border-t border-zinc-700">
                  <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                    <span>🎯</span> AI Enrichment Analysis
                  </h3>

                  {/* Company Overview */}
                  {enrichment.companyOverview && (
                    <Section title="Company Overview">
                      <p className="text-sm text-zinc-300 mb-2">{enrichment.companyOverview.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-zinc-500">Business Model:</span> <span className="text-zinc-300">{enrichment.companyOverview.businessModel}</span></div>
                        <div><span className="text-zinc-500">Market Position:</span> <span className="text-zinc-300">{enrichment.companyOverview.marketPosition}</span></div>
                      </div>
                      {enrichment.companyOverview.recentNews && (
                        <p className="text-sm text-zinc-400 mt-2 italic">{enrichment.companyOverview.recentNews}</p>
                      )}
                    </Section>
                  )}

                  {/* Pain Points */}
                  {enrichment.painPoints && enrichment.painPoints.length > 0 && (
                    <Section title="Pain Points & RLTX Solutions">
                      <div className="space-y-3">
                        {enrichment.painPoints.map((p: any, i: number) => (
                          <div key={i} className="bg-zinc-800/50 rounded-lg p-3">
                            <div className="font-medium text-red-400 text-sm">{p.pain}</div>
                            <div className="text-xs text-zinc-500 mt-1">Impact: {p.impact}</div>
                            <div className="text-sm text-green-400 mt-2">→ {p.rltxSolution}</div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* RLTX Fit */}
                  {enrichment.rltxFit && (
                    <Section title="RLTX Fit Analysis">
                      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-indigo-400 font-semibold">Primary Product:</span>
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-sm">{enrichment.rltxFit.primaryProduct}</span>
                        </div>
                        <p className="text-sm text-zinc-300 mb-3">{enrichment.rltxFit.valueProposition}</p>
                        <div className="text-sm text-green-400 mb-3">📈 {enrichment.rltxFit.estimatedImpact}</div>
                        {enrichment.rltxFit.useCases && (
                          <div className="flex flex-wrap gap-2">
                            {enrichment.rltxFit.useCases.map((uc: string, i: number) => (
                              <span key={i} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs">{uc}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Contacts */}
                  {enrichment.contacts && (
                    <Section title="Contact Strategy">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-500">Target Titles:</span>
                          <div className="text-zinc-300 mt-1">{enrichment.contacts.targetTitles?.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500">Email Patterns:</span>
                          <div className="text-zinc-300 mt-1 font-mono text-xs">{enrichment.contacts.emailPatterns?.join(', ')}</div>
                        </div>
                      </div>
                      {enrichment.contacts.decisionProcess && (
                        <p className="text-sm text-zinc-400 mt-2">Decision Process: {enrichment.contacts.decisionProcess}</p>
                      )}
                    </Section>
                  )}

                  {/* Outreach Strategy */}
                  {enrichment.outreachStrategy && (
                    <Section title="Outreach Strategy">
                      <div className="bg-zinc-800/50 rounded-lg p-4 mb-3">
                        <span className="text-zinc-500 text-xs uppercase">Opening Hook</span>
                        <p className="text-zinc-200 italic mt-1">"{enrichment.outreachStrategy.hook}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-500">Best Channel:</span>
                          <span className="text-zinc-300 ml-2">{enrichment.outreachStrategy.channel}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Timing:</span>
                          <span className="text-zinc-300 ml-2">{enrichment.outreachStrategy.timing}</span>
                        </div>
                      </div>
                      {enrichment.outreachStrategy.objections && (
                        <div className="mt-3">
                          <span className="text-zinc-500 text-xs uppercase">Likely Objections</span>
                          <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                            {enrichment.outreachStrategy.objections.map((o: string, i: number) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Deal Intel */}
                  {enrichment.dealIntel && (
                    <Section title="Deal Intelligence">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-zinc-800/50 rounded p-2">
                          <div className="text-zinc-500 text-xs">Est. Deal Size</div>
                          <div className="text-green-400 font-semibold">{enrichment.dealIntel.estimatedDealSize}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                          <div className="text-zinc-500 text-xs">Sales Cycle</div>
                          <div className="text-zinc-300">{enrichment.dealIntel.salesCycle}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                          <div className="text-zinc-500 text-xs">Budget Source</div>
                          <div className="text-zinc-300">{enrichment.dealIntel.budget}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                          <div className="text-zinc-500 text-xs">Champion Type</div>
                          <div className="text-zinc-300">{enrichment.dealIntel.champions}</div>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Score */}
                  {enrichment.score && (
                    <Section title="Priority Score">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className={`text-3xl font-bold ${
                            enrichment.score.overallPriority === 'Critical' ? 'text-red-400' :
                            enrichment.score.overallPriority === 'High' ? 'text-orange-400' :
                            'text-yellow-400'
                          }`}>
                            {enrichment.score.overallPriority}
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div>Fit: <span className="text-indigo-400">{enrichment.score.fitScore}/10</span></div>
                          <div>Urgency: <span className="text-orange-400">{enrichment.score.urgencyScore}/10</span></div>
                          <div>Access: <span className="text-green-400">{enrichment.score.accessibilityScore}/10</span></div>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 mt-2">{enrichment.score.reasoning}</p>
                    </Section>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-zinc-800 flex gap-3 sticky bottom-0 bg-zinc-900 rounded-b-xl">
              <button
                onClick={() => handleEnrich(selectedLead)}
                disabled={enriching}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-wait text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {enriching ? '🔄 Analyzing with AI...' : enrichment ? '🔄 Re-Analyze' : '🎯 Deep Enrich with AI'}
              </button>
              {selectedLead.website && (
                <button
                  onClick={() => window.open(`https://${selectedLead.website}`, '_blank')}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Visit Website
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 uppercase">{label}</label>
      <p className={`font-medium ${color || ''}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">{title}</h4>
      {children}
    </div>
  );
}
