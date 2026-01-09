const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct PostgreSQL connection to Supabase
const pool = new Pool({
  host: 'db.fsbdquldclxyjqyfnlac.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '101Iloveworking',
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('Connected to Supabase PostgreSQL\n');

    // Create the leads table
    console.log('Creating leads table...');
    await client.query(`
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
    `);
    console.log('Table created!\n');

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
      CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
      CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
      CREATE INDEX IF NOT EXISTS idx_leads_enriched ON leads(enriched_at);
    `);
    console.log('Indexes created!\n');

    // Check existing count
    const countResult = await client.query('SELECT COUNT(*) FROM leads');
    const existingCount = parseInt(countResult.rows[0].count);
    console.log(`Existing leads in database: ${existingCount}\n`);

    // Load leads from JSON
    const leadsPath = path.join(__dirname, '../apps/web/data/leads.json');
    const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
    console.log(`Loaded ${leads.length} leads from JSON\n`);

    if (existingCount >= leads.length) {
      console.log('Database already has all leads. Skipping seed.\n');
      return;
    }

    // Get existing IDs
    const existingResult = await client.query('SELECT id FROM leads');
    const existingIds = new Set(existingResult.rows.map(r => r.id));

    // Filter new leads
    const newLeads = leads.filter(l => !existingIds.has(l.id));
    console.log(`Found ${newLeads.length} new leads to insert\n`);

    if (newLeads.length === 0) {
      console.log('No new leads to insert.\n');
      return;
    }

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < newLeads.length; i += batchSize) {
      const batch = newLeads.slice(i, i + batchSize);

      const values = batch.map((lead, idx) => {
        const offset = idx * 15;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`;
      }).join(', ');

      const params = batch.flatMap(lead => [
        lead.id,
        lead.company,
        lead.sector,
        lead.subSector || null,
        lead.city || null,
        lead.state || null,
        lead.country || null,
        lead.website || null,
        lead.revenue || null,
        lead.employees || null,
        lead.priority || 'Medium',
        lead.useCase || null,
        lead.titles || null,
        lead.source || null,
        lead.enrichment ? JSON.stringify(lead.enrichment) : null,
      ]);

      await client.query(`
        INSERT INTO leads (id, company, sector, sub_sector, city, state, country, website, revenue, employees, priority, use_case, titles, source, enrichment)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `, params);

      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${newLeads.length}`);
    }

    console.log(`\nDone! Inserted ${inserted} leads into Supabase.`);

    // Final count
    const finalCount = await client.query('SELECT COUNT(*) FROM leads');
    console.log(`Total leads in database: ${finalCount.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
