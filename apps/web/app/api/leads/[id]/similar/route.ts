import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateProductFit } from '@/lib/product-fit-engine';
import { calculateLeadScore, type ScoredLead } from '@/lib/lead-scoring';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

export interface SimilarLeadsResponse {
  success: boolean;
  similar?: Array<{
    id: string;
    company: string;
    sector: string;
    subSector?: string;
    revenue?: number;
    employees?: number;
    score: number;
    productFit: string;
    similarity: number;
    matchReasons: string[];
  }>;
  totalMatches?: number;
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leadId = params.id;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get the reference lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Calculate product fit for reference lead
    const refProductFit = calculateProductFit({
      company: lead.company,
      sector: lead.sector,
      subSector: lead.sub_sector,
      useCase: lead.use_case,
      revenue: lead.revenue,
      employees: lead.employees,
      source: lead.source,
      priority: lead.priority,
    });

    // Build similarity query - find leads in same sector and similar product fit
    let query = supabase
      .from('leads')
      .select('*')
      .neq('id', leadId) // Exclude the reference lead
      .order('company');

    // Prioritize same sector
    if (lead.sector) {
      query = query.eq('sector', lead.sector);
    }

    // Get candidates
    const { data: candidates, error: candidatesError } = await query.limit(500);

    if (candidatesError) {
      console.error('Candidates query error:', candidatesError);
      return NextResponse.json(
        { success: false, error: 'Failed to find similar leads' },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        success: true,
        similar: [],
        totalMatches: 0,
      });
    }

    // Score and rank candidates by similarity
    const scoredCandidates = candidates.map((candidate: any) => {
      const candidateFit = calculateProductFit({
        company: candidate.company,
        sector: candidate.sector,
        subSector: candidate.sub_sector,
        useCase: candidate.use_case,
        revenue: candidate.revenue,
        employees: candidate.employees,
        source: candidate.source,
        priority: candidate.priority,
      });

      // Calculate similarity score (0-100)
      let similarity = 0;
      const matchReasons: string[] = [];

      // Same sector (+30)
      if (candidate.sector === lead.sector) {
        similarity += 30;
        matchReasons.push('Same sector');
      }

      // Same sub-sector (+25)
      if (candidate.sub_sector && candidate.sub_sector === lead.sub_sector) {
        similarity += 25;
        matchReasons.push('Same sub-sector');
      }

      // Same product fit (+20)
      if (candidateFit.primaryProduct === refProductFit.primaryProduct) {
        similarity += 20;
        matchReasons.push(`${candidateFit.primaryProduct} fit`);
      }

      // Similar revenue range (+15)
      if (lead.revenue && candidate.revenue) {
        const revRatio = Math.min(lead.revenue, candidate.revenue) / Math.max(lead.revenue, candidate.revenue);
        if (revRatio > 0.5) {
          similarity += 15;
          matchReasons.push('Similar revenue');
        } else if (revRatio > 0.2) {
          similarity += 7;
        }
      }

      // Similar employee count (+10)
      if (lead.employees && candidate.employees) {
        const empRatio = Math.min(lead.employees, candidate.employees) / Math.max(lead.employees, candidate.employees);
        if (empRatio > 0.5) {
          similarity += 10;
          matchReasons.push('Similar size');
        } else if (empRatio > 0.2) {
          similarity += 5;
        }
      }

      // Same source bonus (+5)
      if (lead.source && candidate.source === lead.source) {
        similarity += 5;
        matchReasons.push('Same source');
      }

      // Higher fit score bonus (up to +10)
      const fitBonus = Math.min((candidateFit.score / 100) * 10, 10);
      similarity += fitBonus;

      return {
        id: candidate.id,
        company: candidate.company,
        sector: candidate.sector,
        subSector: candidate.sub_sector,
        revenue: candidate.revenue,
        employees: candidate.employees,
        website: candidate.website,
        score: candidateFit.score,
        productFit: candidateFit.primaryProduct,
        similarity: Math.round(similarity),
        matchReasons,
        enriched: !!candidate.enrichment,
      };
    });

    // Sort by similarity (descending) then by score (descending)
    scoredCandidates.sort((a: any, b: any) => {
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      return b.score - a.score;
    });

    // Return top matches
    const topMatches = scoredCandidates.slice(0, limit);

    return NextResponse.json({
      success: true,
      similar: topMatches,
      totalMatches: scoredCandidates.length,
      reference: {
        company: lead.company,
        sector: lead.sector,
        subSector: lead.sub_sector,
        productFit: refProductFit.primaryProduct,
      },
    });

  } catch (error) {
    console.error('Similar leads error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to find similar leads' },
      { status: 500 }
    );
  }
}
