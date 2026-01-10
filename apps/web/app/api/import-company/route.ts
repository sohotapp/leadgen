import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(request: NextRequest) {
  try {
    const { company } = await request.json();

    if (!company || !company.company) {
      return NextResponse.json({ error: 'Company data is required' }, { status: 400 });
    }

    // Check if company already exists
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .ilike('company', company.company)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Company already exists in database',
        leadId: existing[0].id,
        alreadyExists: true,
      });
    }

    // Parse revenue if string
    let revenue = null;
    if (company.revenue) {
      const revenueStr = String(company.revenue).replace(/[^0-9.]/g, '');
      revenue = parseFloat(revenueStr) || null;
      // Check if it's in millions and needs to be converted to billions
      if (company.revenue.includes('M') && revenue) {
        revenue = revenue / 1000;
      }
    }

    // Parse employees if string
    let employees = null;
    if (company.employees) {
      const empStr = String(company.employees).replace(/[^0-9]/g, '');
      employees = parseInt(empStr) || null;
    }

    // Generate ID
    const id = `DISC-${crypto.randomUUID().slice(0, 8)}`;

    // Insert new lead
    const { data, error } = await supabase
      .from('leads')
      .insert({
        id,
        company: company.company,
        sector: company.sector || 'Other',
        sub_sector: null,
        city: company.location?.split(',')[0]?.trim() || null,
        state: company.location?.split(',')[1]?.trim() || null,
        country: company.location?.split(',')[2]?.trim() || 'USA',
        website: company.website || null,
        revenue,
        employees,
        priority: 'High', // Default new discoveries to High
        use_case: company.description || company.relevanceReason || null,
        source: `AI Discovery - ${company.source || 'Web'}`,
        enrichment: null,
        enriched_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Import error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${company.company}`,
      leadId: id,
      lead: data,
    });

  } catch (error) {
    console.error('Import company error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import company' },
      { status: 500 }
    );
  }
}
