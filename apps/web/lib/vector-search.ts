import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Initialize clients (lazy loading)
let pinecone: Pinecone | null = null;
let openai: OpenAI | null = null;

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'leads';

function getPinecone(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY) {
    console.warn('PINECONE_API_KEY not configured');
    return null;
  }
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pinecone;
}

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured');
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Generate embedding for text using OpenAI
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAI();
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Create searchable text from lead data
export function createLeadText(lead: {
  company: string;
  sector: string;
  subSector?: string | null;
  useCase?: string | null;
  revenue?: number | null;
  employees?: number | null;
}): string {
  const parts = [
    lead.company,
    lead.sector,
    lead.subSector,
    lead.useCase,
    lead.revenue ? `$${lead.revenue}B revenue` : '',
    lead.employees ? `${lead.employees} employees` : '',
  ].filter(Boolean);
  return parts.join(' | ');
}

// Upsert lead embedding to Pinecone
export async function upsertLeadEmbedding(lead: {
  id: string;
  company: string;
  sector: string;
  subSector?: string | null;
  useCase?: string | null;
  revenue?: number | null;
  employees?: number | null;
  productFit?: string | null;
}): Promise<boolean> {
  const pc = getPinecone();
  if (!pc) return false;

  try {
    const text = createLeadText(lead);
    const embedding = await generateEmbedding(text);
    if (!embedding) return false;

    const index = pc.Index(PINECONE_INDEX_NAME);
    await index.upsert([
      {
        id: lead.id,
        values: embedding,
        metadata: {
          company: lead.company,
          sector: lead.sector,
          subSector: lead.subSector || '',
          productFit: lead.productFit || '',
          revenue: lead.revenue || 0,
          employees: lead.employees || 0,
        },
      },
    ]);
    return true;
  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
    return false;
  }
}

// Search for similar leads using vector similarity
export async function searchSimilarLeads(
  query: string,
  options: {
    topK?: number;
    filter?: {
      sector?: string;
      productFit?: string;
    };
  } = {}
): Promise<Array<{
  id: string;
  score: number;
  metadata: Record<string, any>;
}>> {
  const pc = getPinecone();
  if (!pc) return [];

  try {
    const embedding = await generateEmbedding(query);
    if (!embedding) return [];

    const index = pc.Index(PINECONE_INDEX_NAME);

    // Build filter
    const filter: Record<string, any> = {};
    if (options.filter?.sector) {
      filter.sector = { $eq: options.filter.sector };
    }
    if (options.filter?.productFit) {
      filter.productFit = { $eq: options.filter.productFit };
    }

    const results = await index.query({
      vector: embedding,
      topK: options.topK || 20,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return results.matches?.map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata || {},
    })) || [];
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return [];
  }
}

// Find leads similar to a given lead
export async function findSimilarToLead(
  lead: {
    company: string;
    sector: string;
    subSector?: string | null;
    useCase?: string | null;
  },
  topK: number = 10
): Promise<Array<{
  id: string;
  score: number;
  metadata: Record<string, any>;
}>> {
  const text = createLeadText(lead as any);
  return searchSimilarLeads(text, { topK: topK + 1 }).then(results =>
    // Filter out the source lead if it's in results
    results.filter(r => r.metadata?.company !== lead.company).slice(0, topK)
  );
}

// Batch upsert leads (for initial indexing)
export async function batchUpsertLeads(
  leads: Array<{
    id: string;
    company: string;
    sector: string;
    subSector?: string | null;
    useCase?: string | null;
    revenue?: number | null;
    employees?: number | null;
    productFit?: string | null;
  }>,
  batchSize: number = 100
): Promise<{ success: number; failed: number }> {
  const pc = getPinecone();
  const oai = getOpenAI();
  if (!pc || !oai) return { success: 0, failed: leads.length };

  let success = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    try {
      // Generate embeddings for batch
      const texts = batch.map(lead => createLeadText(lead));
      const embeddingsResponse = await oai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      const vectors = batch.map((lead, idx) => ({
        id: lead.id,
        values: embeddingsResponse.data[idx].embedding,
        metadata: {
          company: lead.company,
          sector: lead.sector,
          subSector: lead.subSector || '',
          productFit: lead.productFit || '',
          revenue: lead.revenue || 0,
          employees: lead.employees || 0,
        },
      }));

      const index = pc.Index(PINECONE_INDEX_NAME);
      await index.upsert(vectors);
      success += batch.length;
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize}:`, error);
      failed += batch.length;
    }
  }

  return { success, failed };
}

// Check if vector search is available
export function isVectorSearchAvailable(): boolean {
  return !!(process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY);
}
