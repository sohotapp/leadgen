#!/usr/bin/env node
/**
 * Supabase Bulk Import Pipeline
 * Imports processed leads into Supabase database
 * Handles batching, deduplication, and error recovery
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { PROCESSED_DIR, SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('./config');

const BATCH_SIZE = 500;
const MAX_RETRIES = 3;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTableExists() {
  console.log('Checking if leads table exists...');

  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('\nTable does not exist. Creating table...\n');

    // Create table via SQL
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS leads (
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

        CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
        CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
        CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
        CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
      `
    });

    if (sqlError) {
      console.log('Could not create table via RPC. Please create manually in Supabase dashboard.');
      console.log('\nRun this SQL in Supabase SQL Editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS leads (
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

CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON leads FOR ALL USING (true) WITH CHECK (true);
      `);
      return false;
    }

    console.log('Table created successfully!');
    return true;
  }

  if (error) {
    console.log('Error checking table:', error.message);
    return false;
  }

  console.log('Table exists!');
  return true;
}

async function getExistingIds() {
  console.log('Fetching existing lead IDs...');

  const ids = new Set();
  let offset = 0;
  const pageSize = 10000;

  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.log('Error fetching IDs:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    data.forEach(row => ids.add(row.id));
    offset += pageSize;

    if (data.length < pageSize) break;
  }

  console.log(`Found ${ids.size} existing leads in database`);
  return ids;
}

async function insertBatch(batch, retryCount = 0) {
  const { data, error } = await supabase
    .from('leads')
    .upsert(batch, {
      onConflict: 'id',
      ignoreDuplicates: false
    });

  if (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`  Retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return insertBatch(batch, retryCount + 1);
    }
    return { success: false, error: error.message };
  }

  return { success: true, count: batch.length };
}

async function importLeads(leads) {
  console.log(`\nImporting ${leads.length.toLocaleString()} leads to Supabase...`);

  // Get existing IDs to avoid duplicates
  const existingIds = await getExistingIds();

  // Filter out existing leads
  const newLeads = leads.filter(l => !existingIds.has(l.id));
  console.log(`New leads to import: ${newLeads.length.toLocaleString()}`);

  if (newLeads.length === 0) {
    console.log('No new leads to import!');
    return { imported: 0, failed: 0 };
  }

  let imported = 0;
  let failed = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
    const batch = newLeads.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newLeads.length / BATCH_SIZE);

    process.stdout.write(`\r  Batch ${batchNum}/${totalBatches}: `);

    const result = await insertBatch(batch);

    if (result.success) {
      imported += batch.length;
      process.stdout.write(`${imported.toLocaleString()} imported`);
    } else {
      failed += batch.length;
      console.log(`\n  Error: ${result.error}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nImport complete!`);
  console.log(`  Imported: ${imported.toLocaleString()}`);
  console.log(`  Failed: ${failed.toLocaleString()}`);
  console.log(`  Duration: ${duration}s`);
  console.log(`  Rate: ${(imported / parseFloat(duration)).toFixed(0)} leads/sec`);

  return { imported, failed };
}

async function getStats() {
  console.log('\n--- DATABASE STATS ---');

  // Total count
  const { count: totalCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`Total leads: ${(totalCount || 0).toLocaleString()}`);

  // By priority
  for (const priority of ['Critical', 'High', 'Medium', 'Low']) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('priority', priority);
    console.log(`  ${priority}: ${(count || 0).toLocaleString()}`);
  }

  // By sector (top 5)
  const { data: sectors } = await supabase
    .from('leads')
    .select('sector')
    .limit(100000);

  if (sectors) {
    const sectorCounts = {};
    sectors.forEach(s => {
      sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1;
    });

    console.log('\nTop sectors:');
    Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([sector, count]) => {
        console.log(`  ${sector}: ${count.toLocaleString()}`);
      });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('SUPABASE BULK IMPORT PIPELINE');
  console.log('='.repeat(60));

  // Check table exists
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log('\nPlease create the table first, then re-run this script.');
    return;
  }

  // Load processed leads
  const leadsPath = path.join(PROCESSED_DIR, 'all_leads.json');

  if (!fs.existsSync(leadsPath)) {
    console.log(`\nNo leads file found at: ${leadsPath}`);
    console.log('Run transform-to-leads.js first to process raw data.');
    return;
  }

  console.log(`\nLoading leads from: ${leadsPath}`);
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  console.log(`Loaded ${leads.length.toLocaleString()} leads`);

  // Import to Supabase
  await importLeads(leads);

  // Show stats
  await getStats();

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, importLeads };
