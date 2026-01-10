import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import leadsData from '@/data/leads.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Transform from snake_case (DB) to camelCase (frontend)
function transformFromDb(lead: any) {
  return {
    id: lead.id,
    company: lead.company,
    sector: lead.sector,
    subSector: lead.sub_sector,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    website: lead.website,
    revenue: lead.revenue,
    employees: lead.employees,
    priority: lead.priority,
    useCase: lead.use_case,
    titles: lead.titles,
    source: lead.source,
    enrichment: lead.enrichment,
    enrichedAt: lead.enriched_at,
    // Contact fields
    email: lead.email,
    phone: lead.phone,
    linkedin: lead.linkedin,
    // Computed fit fields
    productFit: lead.product_fit,
    fitScore: lead.fit_score,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '500');
  const offset = parseInt(searchParams.get('offset') || '0');
  const sector = searchParams.get('sector');
  const priority = searchParams.get('priority');
  const search = searchParams.get('search');
  const source = searchParams.get('source'); // 'curated' for quality leads only

  try {
    // Build query with priority ordering (Critical > High > Medium > Low)
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    // Filter by source type
    if (source === 'curated') {
      // Show all original curated leads (from JSON import) + Curated High-Value
      // These are the manually curated sources vs mass-imported data
      const curatedSources = [
        'Curated High-Value',
        'Defense Contractors',
        'Fortune 500',
        'inc5000 fastest growing',
        'saas companies 500',
        'MASTER LEADS ALL SECTORS',
        'fortune500 top100 2025',
        'advertising media agencies',
        'supply chain logistics',
        'market research firms',
        'clinical research organizations',
        'management consulting firms',
        'think tanks policy orgs',
        'opendata500 companies',
        'defense contractors 2024',
        'financial services 2025',
        'wargaming simulation companies',
        'polling opinion research',
        'enterprise ai companies 2025',
        'sp500 filtered rltx targets',
        'unicorn companies global',
        'intelligence community contractors',
        'yc companies database',
        'Federal Agency',
        'federal contractors complete',
        'healthcare companies 2025',
        'Sovereign Wealth',
        'MASTER LEADS RLTX',
        'Defense Tech Startup',
        'Federal Contractor',
        'vc backed startups 2024',
        'Tier-1 Bank',
        'AI Discovery',
      ].map(s => `source.eq.${s}`).join(',');
      query = query.or(curatedSources);
    }

    // Apply filters
    if (sector) {
      query = query.eq('sector', sector);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (search) {
      query = query.or(`company.ilike.%${search}%,sector.ilike.%${search}%,use_case.ilike.%${search}%`);
    }

    // Order by priority (Critical first), then enriched status, then company name
    const { data, error, count } = await query
      .order('priority', { ascending: true, nullsFirst: false })
      .order('enriched_at', { ascending: false, nullsFirst: true })
      .order('company', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.log('Supabase error, falling back to JSON:', error.message);
      return NextResponse.json({
        success: true,
        data: leadsData,
        source: 'json',
        count: leadsData.length
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: leadsData,
        source: 'json',
        count: leadsData.length
      });
    }

    // Transform to camelCase for frontend
    const transformedLeads = data.map(transformFromDb);

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      source: 'supabase',
      count: transformedLeads.length,
      total: count,
      pagination: {
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({
      success: true,
      data: leadsData,
      source: 'json',
      count: leadsData.length
    });
  }
}
