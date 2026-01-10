import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { IntentSignal, SignalType, SignalStrength } from '@/lib/types/signals';
import { HIRING_KEYWORDS, NEWS_KEYWORDS, TECH_STACK_KEYWORDS, CONTRACT_KEYWORDS } from '@/lib/types/signals';

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

// Generate a UUID
function generateId(): string {
  return 'sig_' + Math.random().toString(36).substring(2, 15);
}

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

    // Check for cached signals (if not force refresh)
    if (!forceRefresh && lead.enrichment?.signals) {
      const cachedSignals = lead.enrichment.signals;
      const detectedAt = new Date(cachedSignals.detectedAt);
      const daysSince = (Date.now() - detectedAt.getTime()) / (1000 * 60 * 60 * 24);

      // Cache for 7 days
      if (daysSince < 7) {
        return NextResponse.json({
          success: true,
          signals: cachedSignals.signals,
          summary: cachedSignals.summary,
          cached: true,
        });
      }
    }

    // Build context for AI signal detection
    const signalKeywordsContext = buildKeywordsContext();

    // Generate signals with Claude
    const prompt = `You are a B2B sales intelligence analyst detecting buying signals for RLTX, an AI company selling:
- FORESIGHT: Defense/intel simulation (wargaming, PSYOP modeling)
- VERITAS: Enterprise research replacement (consumer insights)
- POPULOUS: Self-serve audience simulation

LEAD INFORMATION:
- Company: ${lead.company}
- Sector: ${lead.sector}
- Sub-sector: ${lead.sub_sector || 'Unknown'}
- Revenue: ${lead.revenue ? `$${lead.revenue}B` : 'Unknown'}
- Employees: ${lead.employees?.toLocaleString() || 'Unknown'}
- Website: ${lead.website || 'Unknown'}
- Use Case Notes: ${lead.use_case || 'None'}

${lead.enrichment?.companyOverview ? `EXISTING INTEL:
${JSON.stringify(lead.enrichment.companyOverview, null, 2)}` : ''}

SIGNAL KEYWORDS TO LOOK FOR:
${signalKeywordsContext}

Based on this company's profile and what you know about them, identify likely intent signals. Think about:
1. What hiring signals might this company have? (roles they'd need)
2. What recent news/events might be relevant?
3. What tech stack might they use that RLTX could replace?
4. What contracts/funding might be relevant?
5. What trigger events might create buying urgency?

Generate realistic, specific signals. Return JSON array:
[
  {
    "type": "hiring|funding|news|contract|tech_stack|leadership|expansion",
    "title": "Brief signal title",
    "description": "Why this signal matters for selling RLTX",
    "relevanceScore": 1-100,
    "productRelevance": "FORESIGHT|VERITAS|POPULOUS|ALL",
    "strength": "strong|moderate|weak",
    "reasoning": "Why this signal indicates buying intent"
  }
]

Generate 3-6 relevant signals. Be specific to this company. Return ONLY valid JSON array.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    // Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    let detectedSignals: IntentSignal[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        detectedSignals = parsed.map((s: any) => ({
          id: generateId(),
          leadId,
          type: s.type as SignalType,
          title: s.title,
          description: s.description,
          relevanceScore: s.relevanceScore || 50,
          productRelevance: s.productRelevance || 'ALL',
          strength: s.strength as SignalStrength || 'moderate',
          detectedAt: new Date().toISOString(),
          metadata: { reasoning: s.reasoning },
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse signals:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse signal detection' },
        { status: 500 }
      );
    }

    // Generate summary
    const topSignal = detectedSignals.reduce((best, s) =>
      s.relevanceScore > (best?.relevanceScore || 0) ? s : best
    , null as IntentSignal | null);

    const summary = topSignal
      ? `Top signal: ${topSignal.title} (${topSignal.strength} - ${topSignal.productRelevance})`
      : 'No strong signals detected';

    // Cache signals in enrichment
    if (supabase) {
      const existingEnrichment = lead.enrichment || {};
      await supabase
        .from('leads')
        .update({
          enrichment: {
            ...existingEnrichment,
            signals: {
              signals: detectedSignals,
              summary,
              detectedAt: new Date().toISOString(),
            },
          },
        })
        .eq('id', leadId);
    }

    return NextResponse.json({
      success: true,
      signals: detectedSignals,
      summary,
      cached: false,
    });

  } catch (error) {
    console.error('Signal detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect signals' },
      { status: 500 }
    );
  }
}

// GET: Retrieve cached signals
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

    if (!lead.enrichment?.signals) {
      return NextResponse.json({
        success: true,
        signals: [],
        message: 'No signals detected yet',
      });
    }

    return NextResponse.json({
      success: true,
      signals: lead.enrichment.signals.signals,
      summary: lead.enrichment.signals.summary,
      cached: true,
    });

  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}

// Build keywords context for AI
function buildKeywordsContext(): string {
  const lines: string[] = [];

  lines.push('HIRING SIGNALS:');
  Object.entries(HIRING_KEYWORDS).forEach(([key, config]) => {
    lines.push(`- ${config.keywords.join(', ')} → ${config.product} (weight: ${config.weight})`);
  });

  lines.push('\nNEWS SIGNALS:');
  Object.entries(NEWS_KEYWORDS).forEach(([key, config]) => {
    lines.push(`- ${config.keywords.join(', ')} → ${config.product} (weight: ${config.weight})`);
  });

  lines.push('\nTECH STACK (displacement opportunities):');
  Object.entries(TECH_STACK_KEYWORDS).filter(([, c]) => c.displacement).forEach(([key, config]) => {
    lines.push(`- ${config.keywords.join(', ')} → ${config.product}`);
  });

  lines.push('\nCONTRACT SIGNALS (Defense):');
  Object.entries(CONTRACT_KEYWORDS).forEach(([key, config]) => {
    lines.push(`- ${config.keywords.join(', ')}`);
  });

  return lines.join('\n');
}
