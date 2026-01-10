import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { SellSheet, PainPoint, SimilarCustomer, ObjectionResponse } from '@/lib/types/sell-sheet';
import { calculateProductFit } from '@/lib/product-fit-engine';
import { PRODUCT_INFO } from '@/lib/sector-config';

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leadId = params.id;

  try {
    const { forceRefresh = false } = await request.json().catch(() => ({}));

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

    // Check for cached sell sheet (if not force refresh)
    if (!forceRefresh && lead.enrichment?.sellSheet) {
      const cachedSheet = lead.enrichment.sellSheet;
      const expiresAt = new Date(cachedSheet.expiresAt);
      if (expiresAt > new Date()) {
        return NextResponse.json({
          success: true,
          sellSheet: cachedSheet,
          cached: true,
        });
      }
    }

    // Calculate product fit
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

    const productInfo = PRODUCT_INFO[productFit.primaryProduct];

    // Generate sell sheet with Claude
    const prompt = `You are a senior sales strategist at RLTX, an AI company that sells decision intelligence software. Generate a comprehensive "Sell Sheet" for this lead.

RLTX PRODUCTS:
- FORESIGHT: Multi-agent population simulation for defense and intelligence applications (wargaming, PSYOP modeling, adversary simulation)
- VERITAS: AI-powered enterprise research replacement - delivers consumer insights in hours, not months
- POPULOUS: Self-serve simulation platform for audience modeling and decision analysis

LEAD INFORMATION:
- Company: ${lead.company}
- Sector: ${lead.sector}
- Sub-sector: ${lead.sub_sector || 'Unknown'}
- Revenue: ${lead.revenue ? `$${lead.revenue}B` : 'Unknown'}
- Employees: ${lead.employees?.toLocaleString() || 'Unknown'}
- Use Case Notes: ${lead.use_case || 'None'}
- Source: ${lead.source || 'Unknown'}
- Primary Product Fit: ${productFit.primaryProduct} (${productInfo.tagline})

${lead.enrichment ? `EXISTING ENRICHMENT DATA:
${JSON.stringify(lead.enrichment, null, 2)}` : ''}

Generate a comprehensive sell sheet in this EXACT JSON format:
{
  "productFit": {
    "fitExplanation": "2-3 sentences explaining why this company is a good fit for ${productFit.primaryProduct}",
    "useCaseMatch": "Specific use case this company likely has that RLTX solves",
    "competitorDisplacement": "What solution/process RLTX would replace"
  },
  "painPoints": [
    {
      "category": "operational|strategic|financial|competitive",
      "pain": "Specific pain point this company likely experiences",
      "businessImpact": "How this pain affects their business",
      "quantifiedCost": "Estimated cost of this pain if possible",
      "rltxSolution": "How RLTX specifically solves this",
      "proofPoint": "Evidence or similar customer result"
    }
  ],
  "talkingPoints": {
    "executive": ["3-4 ROI/strategic talking points for C-suite"],
    "technical": ["3-4 capability/integration points for technical buyers"],
    "operational": ["3-4 efficiency/workflow points for operators"],
    "financial": ["3-4 cost/budget points for finance"]
  },
  "decisionMakers": {
    "targetTitles": ["List of 4-5 job titles to target"],
    "buyingCenter": "Description of who's involved in this type of purchase",
    "decisionProcess": "How this company likely makes decisions",
    "budgetOwner": "Who likely controls the budget",
    "influencers": ["Who influences the decision"],
    "potentialBlockers": ["Potential objectors or blockers"]
  },
  "competitive": {
    "currentSolutions": ["What they likely use today"],
    "likelyVendors": ["Competitors they might be evaluating"],
    "switchingCosts": "Low|Medium|High",
    "triggerEvents": ["Events that would trigger a purchase"],
    "competitiveAngle": "Our key differentiator for this company"
  },
  "dealIntel": {
    "estimatedDealSize": "Expected ACV range",
    "salesCycle": "Expected length",
    "budgetTiming": "When budgets are typically set",
    "entryStrategy": "Best way to start the relationship",
    "expansionPath": "How to grow the account over time"
  },
  "similarCustomers": [
    {
      "company": "Similar company name (can be hypothetical but realistic)",
      "sector": "Their sector",
      "useCase": "What they use RLTX for",
      "outcome": "Results they achieved",
      "relevance": "Why this is relevant to this lead"
    }
  ],
  "outreach": {
    "openingHook": "Compelling first sentence for outreach",
    "proofPoints": ["3-4 proof points to reference"],
    "discoveryQuestions": ["5-6 discovery questions to ask"],
    "objectionHandling": [
      {
        "objection": "Common objection",
        "response": "How to handle it",
        "proofPoint": "Evidence to support"
      }
    ],
    "timing": "Best time to reach out",
    "recommendedChannel": "Email|LinkedIn|Phone|Event"
  },
  "scores": {
    "overall": 1-100,
    "fit": 1-10,
    "urgency": 1-10,
    "accessibility": 1-10,
    "reasoning": "Brief explanation of scores"
  }
}

Generate realistic, specific content based on the company and sector. Be concrete, not generic. Return ONLY valid JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    // Parse Claude's response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    let generatedData: any;
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate sell sheet' },
        { status: 500 }
      );
    }

    // Construct the full sell sheet
    const sellSheet: SellSheet = {
      leadId,
      company: lead.company,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days

      productFit: {
        primaryProduct: productFit.primaryProduct,
        fitScore: productFit.score,
        fitExplanation: generatedData.productFit?.fitExplanation || '',
        useCaseMatch: generatedData.productFit?.useCaseMatch || productFit.useCaseMatch || '',
        competitorDisplacement: generatedData.productFit?.competitorDisplacement || '',
        reasons: productFit.reasons,
      },

      painPoints: generatedData.painPoints || [],
      talkingPoints: generatedData.talkingPoints || { executive: [], technical: [], operational: [], financial: [] },
      decisionMakers: generatedData.decisionMakers || {},
      competitive: generatedData.competitive || {},
      dealIntel: generatedData.dealIntel || {},
      similarCustomers: generatedData.similarCustomers || [],
      outreach: {
        ...generatedData.outreach,
        recommendedChannel: generatedData.outreach?.recommendedChannel || 'Email',
      },
      scores: {
        overall: generatedData.scores?.overall || productFit.score,
        fit: generatedData.scores?.fit || Math.floor(productFit.score / 10),
        urgency: generatedData.scores?.urgency || 5,
        accessibility: generatedData.scores?.accessibility || 5,
        reasoning: generatedData.scores?.reasoning || '',
      },
    };

    // Cache the sell sheet in the enrichment field
    if (supabase) {
      const existingEnrichment = lead.enrichment || {};
      await supabase
        .from('leads')
        .update({
          enrichment: {
            ...existingEnrichment,
            sellSheet,
          },
          enriched_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    return NextResponse.json({
      success: true,
      sellSheet,
      cached: false,
    });

  } catch (error) {
    console.error('Sell sheet generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate sell sheet' },
      { status: 500 }
    );
  }
}

// GET: Retrieve cached sell sheet
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leadId = params.id;

  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .select('enrichment')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    if (!lead.enrichment?.sellSheet) {
      return NextResponse.json({
        success: true,
        sellSheet: null,
        message: 'No sell sheet generated yet',
      });
    }

    return NextResponse.json({
      success: true,
      sellSheet: lead.enrichment.sellSheet,
      cached: true,
    });

  } catch (error) {
    console.error('Error fetching sell sheet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sell sheet' },
      { status: 500 }
    );
  }
}
