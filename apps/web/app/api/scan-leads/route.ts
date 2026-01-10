import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  scoreAndSortLeads,
  groupByProduct,
  groupByTier,
  getActionItems,
  getTopByProduct,
  calculatePipelineStats,
  type ScoredLead,
} from '@/lib/lead-scoring';
import { SECTOR_TAXONOMY, PRODUCT_INFO } from '@/lib/sector-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

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

    // Transform leads for scoring
    const leadsForScoring = leads.map(lead => ({
      id: lead.id,
      company: lead.company,
      sector: lead.sector,
      subSector: lead.sub_sector || lead.subSector || null,
      useCase: lead.use_case || lead.useCase || null,
      revenue: lead.revenue,
      employees: lead.employees,
      source: lead.source,
      priority: lead.priority,
      enrichment: lead.enrichment,
      enriched_at: lead.enriched_at,
    }));

    // Score all leads using new scoring engine
    const scoredLeads = scoreAndSortLeads(leadsForScoring);

    // Group by product
    const byProduct = groupByProduct(scoredLeads);

    // Group by tier
    const byTier = groupByTier(scoredLeads);

    // Get action items
    const actionItems = getActionItems(scoredLeads);

    // Get top leads per product
    const topByProduct = getTopByProduct(scoredLeads);

    // Calculate stats
    const stats = calculatePipelineStats(scoredLeads);

    // Get sector distribution
    const sectorCounts = leads.reduce((acc: Record<string, number>, l: any) => {
      const sector = l.sector || 'Other';
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});

    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 15);

    // Get sub-sector distribution for each product
    const subSectorsByProduct: Record<string, Record<string, number>> = {
      FORESIGHT: {},
      VERITAS: {},
      POPULOUS: {},
    };

    for (const lead of scoredLeads) {
      const product = lead.productFit.primaryProduct;
      const subSector = lead.subSector || 'Unclassified';
      subSectorsByProduct[product][subSector] = (subSectorsByProduct[product][subSector] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      source,
      stats,
      actionItems: actionItems.map(a => ({
        action: a.action,
        count: a.count,
        priority: a.priority,
      })),
      topByProduct,
      byProduct: {
        FORESIGHT: byProduct.FORESIGHT.slice(0, 20),
        VERITAS: byProduct.VERITAS.slice(0, 20),
        POPULOUS: byProduct.POPULOUS.slice(0, 20),
      },
      byTier: {
        hot: byTier.Hot.slice(0, 30),
        warm: byTier.Warm.slice(0, 30),
        medium: byTier.Medium.slice(0, 20),
      },
      hotLeads: byTier.Hot.slice(0, 30),
      warmLeads: byTier.Warm.slice(0, 30),
      topSectors,
      subSectorsByProduct,
      productInfo: PRODUCT_INFO,
      allScored: scoredLeads.slice(0, 100), // Limit for performance
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan leads' },
      { status: 500 }
    );
  }
}

// POST: Get leads to enrich
export async function POST(request: NextRequest) {
  try {
    const { count = 5, product } = await request.json();

    // Get unenriched leads
    let leads: any[] = [];

    if (supabase) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .is('enrichment', null)
        .order('company')
        .limit(200);

      if (data) leads = data;
    }

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unenriched leads found',
        leads: [],
      });
    }

    // Transform and score
    const leadsForScoring = leads.map(lead => ({
      id: lead.id,
      company: lead.company,
      sector: lead.sector,
      subSector: lead.sub_sector || null,
      useCase: lead.use_case || null,
      revenue: lead.revenue,
      employees: lead.employees,
      source: lead.source,
      priority: lead.priority,
      enrichment: null,
      enriched_at: null,
    }));

    let scoredLeads = scoreAndSortLeads(leadsForScoring);

    // Filter by product if specified
    if (product && ['FORESIGHT', 'VERITAS', 'POPULOUS'].includes(product)) {
      scoredLeads = scoredLeads.filter(l => l.productFit.primaryProduct === product);
    }

    // Get top N
    const toEnrich = scoredLeads.slice(0, Math.min(count, 20));

    return NextResponse.json({
      success: true,
      message: `Found ${toEnrich.length} leads to enrich`,
      leads: toEnrich.map(l => ({
        id: l.id,
        company: l.company,
        sector: l.sector,
        subSector: l.subSector,
        score: l.score,
        tier: l.tier,
        productFit: l.productFit,
        reasons: l.reasons,
      })),
    });
  } catch (error) {
    console.error('Auto-enrich error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to find leads to enrich' },
      { status: 500 }
    );
  }
}
