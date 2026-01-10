-- Add contact fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin TEXT;

-- Add embedding column for vector search (Pinecone will store the actual vectors, this stores the embedding ID)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS embedding_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Add product fit fields for computed scoring
ALTER TABLE leads ADD COLUMN IF NOT EXISTS product_fit TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fit_score INTEGER;

-- Create index on product fit for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_product_fit ON leads(product_fit);
CREATE INDEX IF NOT EXISTS idx_leads_fit_score ON leads(fit_score);
