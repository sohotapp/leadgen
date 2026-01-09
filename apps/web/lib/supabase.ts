import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey
);

export type Lead = {
  id: string;
  company: string;
  sector: string;
  sub_sector: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  revenue: number | null;
  employees: number | null;
  priority: string;
  use_case: string | null;
  titles: string | null;
  source: string | null;
  enrichment: Record<string, any> | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadInsert = Omit<Lead, 'created_at' | 'updated_at'>;
