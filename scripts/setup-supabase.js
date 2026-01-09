const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://fsbdquldclxyjqyfnlac.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_2XlStCoUEwlmFgUtjEnj5w_S0W-0uSn';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  console.log('Setting up Supabase database...\n');

  // Read existing leads
  const leadsPath = path.join(__dirname, '../apps/web/data/leads.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  console.log(`Loaded ${leads.length} leads from JSON\n`);

  // Check if leads table exists by trying to query it
  const { data: existingData, error: checkError } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.log('Table does not exist. Please create it via Supabase dashboard with this SQL:\n');
    console.log(`
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

-- Create indexes for common queries
CREATE INDEX idx_leads_sector ON leads(sector);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_enriched ON leads(enriched_at);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (internal tool)
CREATE POLICY "Allow all access" ON leads FOR ALL USING (true) WITH CHECK (true);
    `);
    return;
  }

  if (checkError) {
    console.error('Error checking table:', checkError);
    return;
  }

  // Check how many leads exist
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`Current leads in Supabase: ${count || 0}\n`);

  if (count && count > 0) {
    console.log('Leads already exist. Checking for new leads to add...\n');

    // Get existing IDs
    const { data: existingIds } = await supabase
      .from('leads')
      .select('id');

    const existingIdSet = new Set(existingIds?.map(l => l.id) || []);

    // Filter to only new leads
    const newLeads = leads.filter(l => !existingIdSet.has(l.id));

    if (newLeads.length === 0) {
      console.log('No new leads to add.\n');
      return;
    }

    console.log(`Found ${newLeads.length} new leads to add\n`);

    // Transform and insert new leads
    const transformedLeads = newLeads.map(transformLead);
    await insertLeads(transformedLeads);
  } else {
    // Insert all leads
    console.log('Inserting all leads...\n');
    const transformedLeads = leads.map(transformLead);
    await insertLeads(transformedLeads);
  }
}

function transformLead(lead) {
  return {
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
  };
}

async function insertLeads(leads) {
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    const { error } = await supabase
      .from('leads')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}: ${inserted}/${leads.length}`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} leads into Supabase.`);
}

setupDatabase().catch(console.error);
