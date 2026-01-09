import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import leadsData from '@/data/leads.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST() {
  try {
    // First, let's check if leads table exists by trying to query it
    const { data: existingLeads, error: checkError } = await supabase
      .from('leads')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === 'PGRST204') {
      return NextResponse.json({
        success: false,
        error: 'Table does not exist. Please create it via Supabase SQL Editor with this SQL:',
        sql: `
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  sector TEXT NOT NULL,
  sub_sector TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  website TEXT,
  revenue DECIMAL,
  employees INTEGER,
  priority TEXT DEFAULT 'Medium',
  use_case TEXT,
  titles TEXT,
  source TEXT,
  enrichment JSONB,
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_sector ON leads(sector);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_enriched ON leads(enriched_at);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON leads FOR ALL USING (true) WITH CHECK (true);
        `
      });
    }

    // Count existing leads
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`Existing leads: ${count}`);

    // Get existing IDs
    const { data: existingIds } = await supabase
      .from('leads')
      .select('id');

    const existingIdSet = new Set(existingIds?.map(l => l.id) || []);

    // Filter new leads
    const newLeads = leadsData.filter((l: any) => !existingIdSet.has(l.id));

    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new leads to insert',
        existingCount: count
      });
    }

    // Transform leads for Supabase
    const transformedLeads = newLeads.map((lead: any) => ({
      id: lead.id,
      company: lead.company,
      sector: lead.sector,
      sub_sector: lead.subSector || null,
      city: lead.city || null,
      state: lead.state || null,
      country: lead.country || null,
      website: lead.website || null,
      revenue: lead.revenue || null,
      employees: lead.employees || null,
      priority: lead.priority || 'Medium',
      use_case: lead.useCase || null,
      titles: lead.titles || null,
      source: lead.source || null,
      enrichment: lead.enrichment || null,
      enriched_at: lead.enrichedAt || null,
    }));

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedLeads.length; i += batchSize) {
      const batch = transformedLeads.slice(i, i + batchSize);

      const { error } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    // Final count
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: `Inserted ${inserted} leads`,
      previousCount: count,
      finalCount: finalCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Init DB error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to initialize the database'
  });
}
