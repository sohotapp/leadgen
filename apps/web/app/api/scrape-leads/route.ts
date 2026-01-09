import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { query, source } = await request.json();

    // Use Claude to generate potential leads based on the query
    const prompt = `You are a lead generation assistant for RLTX.ai. Based on the following search query, generate a list of 5-10 real companies that would be good prospects.

Search Query: "${query}"
Source Context: ${source}

RLTX.ai sells:
- FORESIGHT: AI simulation for defense/intelligence (wargaming, PSYOP simulation)
- VERITAS: AI-powered market research (replaces surveys with synthetic simulation)
- POPULOUS: Self-serve audience simulation platform

Return a JSON array of companies with this exact structure:
[
  {
    "id": "unique-id-string",
    "company": "Company Name",
    "sector": "Industry Sector",
    "subSector": "More specific industry",
    "city": "City",
    "state": "State/Region",
    "country": "Country",
    "website": "company.com",
    "revenue": null,
    "employees": null,
    "priority": "High",
    "useCase": "Why this company would benefit from RLTX",
    "titles": "Target job titles to reach",
    "source": "${source}"
  }
]

Only include REAL companies that actually exist. Focus on companies that would genuinely benefit from RLTX's products. Be specific about the use case.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    let newLeads: any[] = [];
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        newLeads = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Failed to parse lead suggestions. Try a more specific query.',
      });
    }

    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching companies found. Try a different search query.',
        count: 0,
      });
    }

    // Add unique IDs if missing
    newLeads = newLeads.map((lead, i) => ({
      ...lead,
      id: lead.id || `scraped-${Date.now()}-${i}`,
    }));

    // Save to Supabase if available
    if (supabase) {
      const transformedLeads = newLeads.map(lead => ({
        id: lead.id,
        company: lead.company,
        sector: lead.sector,
        sub_sector: lead.subSector || null,
        city: lead.city || null,
        state: lead.state || null,
        country: lead.country || null,
        website: lead.website || null,
        revenue: lead.revenue || null,
        employees: lead.employees || null,
        priority: lead.priority || 'Medium',
        use_case: lead.useCase || null,
        titles: lead.titles || null,
        source: lead.source || source,
      }));

      const { error } = await supabase
        .from('leads')
        .upsert(transformedLeads, { onConflict: 'id' });

      if (error) {
        console.error('Supabase insert error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${newLeads.length} potential leads. Refresh the page to see them.`,
      count: newLeads.length,
      leads: newLeads,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { success: false, message: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}
