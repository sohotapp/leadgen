const { Pool } = require('pg');

// Disable TLS validation for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Try session mode pooler (port 5432, not transaction mode 6543)
const pool = new Pool({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.fsbdquldclxyjqyfnlac',
  password: '101Iloveworking',
  ssl: true
});

async function createTable() {
  const client = await pool.connect();

  try {
    console.log('Connected! Creating leads table...\n');

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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
      CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
      CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
      CREATE INDEX IF NOT EXISTS idx_leads_enriched ON leads(enriched_at);
    `);
    console.log('Indexes created!\n');

    await client.query(`ALTER TABLE leads ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'leads') THEN
          CREATE POLICY "Allow all access" ON leads FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);
    console.log('RLS enabled with open policy!\n');

    console.log('SUCCESS! Table is ready.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTable();
