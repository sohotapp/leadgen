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
  };
}

export async function GET() {
  try {
    // Try to fetch from Supabase
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('company');

    if (error) {
      // If table doesn't exist, fall back to JSON
      console.log('Supabase error, falling back to JSON:', error.message);
      return NextResponse.json({
        success: true,
        data: leadsData,
        source: 'json'
      });
    }

    if (!data || data.length === 0) {
      // Empty table, return JSON data
      return NextResponse.json({
        success: true,
        data: leadsData,
        source: 'json'
      });
    }

    // Transform to camelCase for frontend
    const transformedLeads = data.map(transformFromDb);

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      source: 'supabase',
      count: transformedLeads.length
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    // Fall back to JSON on any error
    return NextResponse.json({
      success: true,
      data: leadsData,
      source: 'json'
    });
  }
}
