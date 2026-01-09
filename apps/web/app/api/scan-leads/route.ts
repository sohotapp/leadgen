import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

// RLTX target criteria
const RLTX_CRITERIA = {
  hotSectors: [
    'defense', 'military', 'intelligence', 'national security',
    'financial services', 'banking', 'hedge fund', 'asset management',
    'healthcare', 'pharmaceutical', 'biotech',
    'ai', 'artificial intelligence', 'machine learning',
    'consulting', 'research', 'analytics',
    'government', 'federal', 'contractor'
  ],
  hotKeywords: [
    'simulation', 'modeling', 'forecasting', 'prediction',
    'decision', 'intelligence', 'analytics', 'research',
    'defense', 'security', 'risk', 'strategy'
  ],
  revenueThresholds: {
    enterprise: 1, // $1B+
    midMarket: 0.1, // $100M+
  },
  employeeThresholds: {
    enterprise: 5000,
    midMarket: 500,
  }
};

// Quick score without AI (instant)
function quickScore(lead: any): { score: number; reasons: string[]; tier: string } {
  let score = 0;
  const reasons: string[] = [];

  const sector = (lead.sector || '').toLowerCase();
  const useCase = (lead.useCase || lead.use_case || '').toLowerCase();
  const company = (lead.company || '').toLowerCase();

  // Sector matching
  for (const hot of RLTX_CRITERIA.hotSectors) {
    if (sector.includes(hot) || useCase.includes(hot) || company.includes(hot)) {
      score += 15;
      reasons.push(`Hot sector: ${hot}`);
      break;
    }
  }

  // Keyword matching
  for (const kw of RLTX_CRITERIA.hotKeywords) {
    if (useCase.includes(kw)) {
      score += 10;
      reasons.push(`Keyword: ${kw}`);
    }
  }

  // Revenue scoring
  const revenue = lead.revenue || 0;
  if (revenue >= RLTX_CRITERIA.revenueThresholds.enterprise) {
    score += 25;
    reasons.push(`Enterprise revenue: $${revenue}B`);
  } else if (revenue >= RLTX_CRITERIA.revenueThresholds.midMarket) {
    score += 15;
    reasons.push(`Mid-market revenue: $${revenue}B`);
  }

  // Employee scoring
  const employees = lead.employees || 0;
  if (employees >= RLTX_CRITERIA.employeeThresholds.enterprise) {
    score += 20;
    reasons.push(`Enterprise size: ${employees.toLocaleString()} employees`);
  } else if (employees >= RLTX_CRITERIA.employeeThresholds.midMarket) {
    score += 10;
    reasons.push(`Mid-market size: ${employees.toLocaleString()} employees`);
  }

  // Source quality
  const source = (lead.source || '').toLowerCase();
  if (source.includes('fortune') || source.includes('sp500') || source.includes('f500')) {
    score += 15;
    reasons.push('Fortune 500 source');
  } else if (source.includes('defense') || source.includes('federal') || source.includes('contractor')) {
    score += 20;
    reasons.push('Defense/Federal source');
  }

  // Priority boost
  if (lead.priority === 'Critical') score += 10;
  else if (lead.priority === 'High') score += 5;

  // Determine tier
  let tier = 'Low';
  if (score >= 60) tier = 'Hot';
  else if (score >= 40) tier = 'Warm';
  else if (score >= 20) tier = 'Medium';

  return { score: Math.min(score, 100), reasons, tier };
}

export async function GET(request: NextRequest) {
  try {
    // Get leads from Supabase or JSON
    let leads: any[] = [];
    let source = 'json';

    if (supabase) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('company');

      if (!error && data && data.length > 0) {
        leads = data;
        source = 'supabase';
      }
    }

    if (leads.length === 0) {
      // Fall back to JSON
      const leadsJson = require('@/data/leads.json');
      leads = leadsJson;
    }

    // Score all leads
    const scoredLeads = leads.map(lead => {
      const { score, reasons, tier } = quickScore(lead);
      return {
        id: lead.id,
        company: lead.company,
        sector: lead.sector,
        revenue: lead.revenue,
        employees: lead.employees,
        score,
        tier,
        reasons,
        enriched: !!lead.enrichment || !!lead.enriched_at,
        priority: lead.priority,
      };
    });

    // Sort by score descending
    scoredLeads.sort((a, b) => b.score - a.score);

    // Calculate stats
    const stats = {
      total: leads.length,
      enriched: scoredLeads.filter(l => l.enriched).length,
      pending: scoredLeads.filter(l => !l.enriched).length,
      byTier: {
        hot: scoredLeads.filter(l => l.tier === 'Hot').length,
        warm: scoredLeads.filter(l => l.tier === 'Warm').length,
        medium: scoredLeads.filter(l => l.tier === 'Medium').length,
        low: scoredLeads.filter(l => l.tier === 'Low').length,
      },
      topSectors: Object.entries(
        leads.reduce((acc: any, l: any) => {
          acc[l.sector] = (acc[l.sector] || 0) + 1;
          return acc;
        }, {})
      ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10),
    };

    return NextResponse.json({
      success: true,
      source,
      stats,
      hotLeads: scoredLeads.filter(l => l.tier === 'Hot').slice(0, 20),
      warmLeads: scoredLeads.filter(l => l.tier === 'Warm').slice(0, 20),
      allScored: scoredLeads,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan leads' },
      { status: 500 }
    );
  }
}

// POST: Auto-enrich top leads
export async function POST(request: NextRequest) {
  try {
    const { count = 5 } = await request.json();

    // Get unenriched leads
    let leads: any[] = [];

    if (supabase) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .is('enrichment', null)
        .order('company')
        .limit(100);

      if (data) leads = data;
    }

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unenriched leads found',
        enriched: 0,
      });
    }

    // Score and get top N
    const scoredLeads = leads.map(lead => ({
      ...lead,
      ...quickScore(lead),
    }));

    scoredLeads.sort((a, b) => b.score - a.score);
    const toEnrich = scoredLeads.slice(0, Math.min(count, 10));

    // This would trigger enrichment - for now just return the list
    return NextResponse.json({
      success: true,
      message: `Found ${toEnrich.length} leads to enrich`,
      leads: toEnrich.map(l => ({
        id: l.id,
        company: l.company,
        score: l.score,
        tier: l.tier,
        reasons: l.reasons,
      })),
    });
  } catch (error) {
    console.error('Auto-enrich error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to auto-enrich' },
      { status: 500 }
    );
  }
}
