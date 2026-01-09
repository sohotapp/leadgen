const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://fsbdquldclxyjqyfnlac.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_2XlStCoUEwlmFgUtjEnj5w_S0W-0uSn';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedDatabase() {
  console.log('Seeding Supabase database...\n');

  // Load leads from JSON
  const leadsPath = path.join(__dirname, '../apps/web/data/leads.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  console.log(`Loaded ${leads.length} leads from JSON\n`);

  // Check if table exists
  const { data: testData, error: testError } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  if (testError) {
    console.error('ERROR: Table does not exist!');
    console.log('\nPlease run the SQL in SUPABASE_SETUP.sql first:');
    console.log('  1. Go to https://supabase.com/dashboard/project/fsbdquldclxyjqyfnlac/sql');
    console.log('  2. Copy and paste the contents of SUPABASE_SETUP.sql');
    console.log('  3. Click "Run"');
    console.log('  4. Then run this script again: node scripts/seed-supabase.js\n');
    return;
  }

  // Get existing count
  const { count: existingCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`Current leads in Supabase: ${existingCount || 0}\n`);

  // Get existing IDs
  const { data: existingIds } = await supabase
    .from('leads')
    .select('id');

  const existingIdSet = new Set(existingIds?.map(l => l.id) || []);

  // Filter new leads
  const newLeads = leads.filter(l => !existingIdSet.has(l.id));

  if (newLeads.length === 0) {
    console.log('All leads already exist in database. No seeding needed.\n');
    return;
  }

  console.log(`Found ${newLeads.length} new leads to insert\n`);

  // Transform leads for Supabase (snake_case)
  const transformedLeads = newLeads.map(lead => ({
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

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  let errors = [];

  for (let i = 0; i < transformedLeads.length; i += batchSize) {
    const batch = transformedLeads.slice(i, i + batchSize);

    const { error } = await supabase
      .from('leads')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${transformedLeads.length}`);
    }
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`\nDone! Total leads in Supabase: ${finalCount}`);

  if (errors.length > 0) {
    console.log(`\nErrors encountered: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

seedDatabase().catch(console.error);
