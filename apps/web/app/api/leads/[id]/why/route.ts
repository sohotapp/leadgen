import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { calculateProductFit } from '@/lib/product-fit-engine';

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

export interface WhyThisLeadResponse {
  success: boolean;
  why?: {
    headline: string;
    summary: string;
    fitReasons: string[];
    timingOpportunity: string;
    bestAngle: string;
    keyRisks: string[];
    nextStep: string;
    score: number;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leadId = params.id;

  try {
    // Get lead data
    let lead: any = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!error && data) {
        lead = data;
      }
    }

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Check cache (store in enrichment.whyThisLead)
    if (lead.enrichment?.whyThisLead) {
      const cachedWhy = lead.enrichment.whyThisLead;
      const generatedAt = new Date(cachedWhy.generatedAt);
      const daysSince = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);

      // Cache for 14 days
      if (daysSince < 14) {
        return NextResponse.json({
          success: true,
          why: cachedWhy,
          cached: true,
        });
      }
    }

    // Calculate product fit for context
    const productFit = calculateProductFit({
      company: lead.company,
      sector: lead.sector,
      subSector: lead.sub_sector,
      useCase: lead.use_case,
      revenue: lead.revenue,
      employees: lead.employees,
      source: lead.source,
      priority: lead.priority,
    });

    // Generate "Why This Lead" with Claude
    const prompt = `You are an expert sales strategist at RLTX. Generate a concise "Why This Lead" explanation.

RLTX PRODUCTS:
- FORESIGHT: Multi-agent simulation for defense/intel (wargaming, PSYOP modeling, adversary simulation)
- VERITAS: AI-powered enterprise research replacement (consumer insights in hours, not months)
- POPULOUS: Self-serve simulation for audience modeling and decision analysis

LEAD INFORMATION:
- Company: ${lead.company}
- Sector: ${lead.sector}
- Sub-sector: ${lead.sub_sector || 'Unknown'}
- Revenue: ${lead.revenue ? `$${lead.revenue}B` : 'Unknown'}
- Employees: ${lead.employees?.toLocaleString() || 'Unknown'}
- Use Case: ${lead.use_case || 'None specified'}
- Source: ${lead.source || 'Unknown'}
- Product Fit: ${productFit.primaryProduct} (${productFit.score}/100)
- Fit Reasons: ${productFit.reasons.join(', ')}

${lead.enrichment?.companyOverview ? `COMPANY INTEL:
${JSON.stringify(lead.enrichment.companyOverview, null, 2)}` : ''}

${lead.enrichment?.signals?.signals ? `INTENT SIGNALS:
${JSON.stringify(lead.enrichment.signals.signals.slice(0, 3), null, 2)}` : ''}

Generate a compelling "Why This Lead" explanation. Be specific and actionable.

Return JSON:
{
  "headline": "One powerful sentence explaining why this is a good lead (max 15 words)",
  "summary": "2-3 sentence explanation of the opportunity",
  "fitReasons": ["3-4 specific reasons this company is a fit for ${productFit.primaryProduct}"],
  "timingOpportunity": "Why NOW is the right time to reach out",
  "bestAngle": "The most compelling approach/angle to use",
  "keyRisks": ["2-3 potential objections or risks"],
  "nextStep": "Specific recommended next action",
  "score": ${productFit.score}
}

Return ONLY valid JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    // Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    let whyData: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        whyData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse why response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate explanation' },
        { status: 500 }
      );
    }

    // Add metadata
    whyData.generatedAt = new Date().toISOString();

    // Cache in enrichment
    if (supabase) {
      const existingEnrichment = lead.enrichment || {};
      await supabase
        .from('leads')
        .update({
          enrichment: {
            ...existingEnrichment,
            whyThisLead: whyData,
          },
        })
        .eq('id', leadId);
    }

    return NextResponse.json({
      success: true,
      why: whyData,
      cached: false,
    });

  } catch (error) {
    console.error('Why This Lead error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
