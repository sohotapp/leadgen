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
CREATE INDEX IF NOT EXISTS idx_leads_enriched ON leads(enriched_at);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'leads') THEN
    CREATE POLICY "Allow all access" ON leads FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
