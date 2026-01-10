import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { batchUpsertLeads, isVectorSearchAvailable } from '@/lib/vector-search';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(request: NextRequest) {
  try {
    // Check if vector search is configured
    if (!isVectorSearchAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Vector search not configured. Set PINECONE_API_KEY and OPENAI_API_KEY environment variables.',
      }, { status: 400 });
    }

    const { limit = 1000, offset = 0 } = await request.json().catch(() => ({}));

    // Fetch leads from Supabase
    const { data: leads, error, count } = await supabase
      .from('leads')
      .select('id, company, sector, sub_sector, use_case, revenue, employees, product_fit', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch leads: ${error.message}`,
      }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leads to index',
        indexed: 0,
        total: count || 0,
      });
    }

    // Transform for vector search
    const leadsForIndexing = leads.map(lead => ({
      id: lead.id,
      company: lead.company,
      sector: lead.sector,
      subSector: lead.sub_sector,
      useCase: lead.use_case,
      revenue: lead.revenue,
      employees: lead.employees,
      productFit: lead.product_fit,
    }));

    // Batch upsert to Pinecone
    const result = await batchUpsertLeads(leadsForIndexing);

    return NextResponse.json({
      success: true,
      message: `Indexed ${result.success} leads, ${result.failed} failed`,
      indexed: result.success,
      failed: result.failed,
      total: count || 0,
      nextOffset: offset + limit < (count || 0) ? offset + limit : null,
    });

  } catch (error) {
    console.error('Index leads error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to index leads',
    }, { status: 500 });
  }
}

// GET to check indexing status
export async function GET() {
  const isAvailable = isVectorSearchAvailable();

  return NextResponse.json({
    vectorSearchAvailable: isAvailable,
    configured: {
      pinecone: !!process.env.PINECONE_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
    indexName: process.env.PINECONE_INDEX_NAME || 'leads',
  });
}
