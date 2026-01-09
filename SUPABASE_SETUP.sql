-- RLTX Lead Engine Database Setup
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/fsbdquldclxyjqyfnlac/sql

-- Create leads table
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

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_enriched ON leads(enriched_at);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow all access (internal tool)
DROP POLICY IF EXISTS "Allow all access" ON leads;
CREATE POLICY "Allow all access" ON leads FOR ALL USING (true) WITH CHECK (true);

-- Verify table was created
SELECT 'Table created successfully!' as status, COUNT(*) as current_rows FROM leads;
