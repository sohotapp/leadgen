import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const RLTX_CONTEXT = `
# RLTX.AI - COMPANY CONTEXT

## Who We Are
RLTX is an AI-powered operational intelligence firm that builds decision infrastructure for high-stakes organizations. We're "the decision layer for complex systems" that transforms companies into AI-Native powerhouses. Our motto: "Before you commit, we've already run it."

## Our Products

### FORESIGHT (Defense & National Security)
- Multi-agent simulation environment for military commanders and intelligence analysts
- Spawns thousands to millions of autonomous AI agents with behavioral profiles
- Applications: wargaming, PSYOP/information warfare simulation, intelligence analysis
- Test messaging campaigns against synthetic populations, model adversary decision-making

### VERITAS (Enterprise Research)
- Replaces traditional research cycles with rapid synthetic simulation
- 90%+ correlation to real survey data through validated methodology
- Use cases: brand tracking, concept testing, market entry analysis, M&A due diligence
- Delivers results in hours rather than months

### POPULOUS (Consumer & Enterprise)
- Self-serve platform for simulating audiences at scale
- For brands, consulting firms, and research agencies
- Eliminates traditional research delays and sampling bias

## Our Technology Stack
1. **Data Foundation**: Unified causal graph, entity resolution, time-travel native for counterfactuals
2. **Operational Ontology**: Decision physics from actual choice-making, executable authority logic
3. **Behavioral Models**: Synthetic decision-makers with utility functions, belief structures
4. **Simulation Engine**: Parallel computation across millions of agents, full causal audit trails
5. **Prediction + Execution**: Probability-weighted outcomes, sensitivity analysis, closed-loop learning

## Target Customers
- Frontier AI labs (safety infrastructure)
- Defense/National Security (CDAO, Army Futures Command, SOCOM, CIA, DIA)
- Tier-1 financial institutions (risk workflows, client intelligence)
- Sovereign wealth and institutional capital
- Industrial manufacturers (unified operations)
- Enterprise SaaS (customer intelligence)
- Healthcare systems (patient data unification, clinical AI)

## Key Value Propositions
- We own entire missions, not point solutions
- Combine frontier research talent with operational domain experts
- Build production infrastructure with audit trails for regulated environments
- "AI initiatives fail because data is fragmented, not because models are wrong"
- Entity resolution and unified knowledge graphs across disconnected systems
`;

export async function POST(request: NextRequest) {
  try {
    const { lead } = await request.json();

    const prompt = `You are a strategic sales intelligence analyst for RLTX.ai. Your job is to deeply analyze a potential customer and create a comprehensive enrichment report that will help the sales team understand exactly how to approach this company.

${RLTX_CONTEXT}

---

# TARGET COMPANY TO ANALYZE

Company: ${lead.company}
Sector: ${lead.sector}
Sub-Sector: ${lead.subSector || 'N/A'}
Location: ${lead.city}, ${lead.state} ${lead.country || ''}
Website: ${lead.website || 'N/A'}
Revenue: ${lead.revenue ? `$${lead.revenue}B` : 'N/A'}
Employees: ${lead.employees?.toLocaleString() || 'N/A'}
Source: ${lead.source || 'N/A'}
Initial Use Case: ${lead.useCase || 'N/A'}
Target Titles: ${lead.titles || 'N/A'}

---

# YOUR TASK

Think deeply about this company. Research from your knowledge what they do, their challenges, and how RLTX can help. Provide a comprehensive analysis.

Return a JSON object with these exact fields:

{
  "companyOverview": {
    "description": "2-3 sentence description of what this company does",
    "businessModel": "How they make money",
    "marketPosition": "Leader/Challenger/Niche/Emerging",
    "recentNews": "Any notable recent developments, acquisitions, or initiatives you know of"
  },

  "painPoints": [
    {
      "pain": "Specific pain point this company likely faces",
      "impact": "Business impact of this pain (cost, time, risk)",
      "rltxSolution": "How RLTX specifically solves this"
    }
  ],

  "rltxFit": {
    "primaryProduct": "FORESIGHT | VERITAS | POPULOUS",
    "useCases": ["List of 3-5 specific use cases for this company"],
    "valueProposition": "Specific value prop tailored to this company",
    "estimatedImpact": "Quantified benefit (e.g., 'reduce analysis time by 80%')",
    "competitiveAngle": "What they're likely using now and why RLTX is better"
  },

  "contacts": {
    "targetTitles": ["Best titles to reach out to"],
    "emailPatterns": ["firstname.lastname@domain.com", "flastname@domain.com"],
    "linkedInUrl": "https://linkedin.com/company/...",
    "decisionProcess": "How decisions are likely made (committee, single buyer, etc.)"
  },

  "outreachStrategy": {
    "hook": "Opening line that would resonate with this company",
    "proofPoints": ["Relevant case studies or similar customers"],
    "objections": ["Likely objections and how to handle them"],
    "timing": "Best time to reach out (fiscal year, budget cycles, etc.)",
    "channel": "Email | LinkedIn | Phone | Event"
  },

  "competitiveIntel": {
    "currentSolutions": ["What they likely use now"],
    "vendors": ["Known or likely vendors"],
    "switchingCosts": "Low | Medium | High",
    "triggerEvents": ["Events that would make them consider RLTX"]
  },

  "dealIntel": {
    "estimatedDealSize": "$X - $Y range",
    "salesCycle": "X-Y months",
    "budget": "Which budget this would come from",
    "champions": "Type of person who would champion this internally"
  },

  "score": {
    "fitScore": 1-10,
    "urgencyScore": 1-10,
    "accessibilityScore": 1-10,
    "overallPriority": "Critical | High | Medium | Low",
    "reasoning": "Why this score"
  }
}

Think step by step. Be specific to this exact company, not generic. Use your knowledge of the industry and company.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    let enrichedData;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichedData = JSON.parse(jsonMatch[0]);
      } else {
        enrichedData = { rawResponse: content.text };
      }
    } catch {
      enrichedData = { rawResponse: content.text };
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      company: lead.company,
      enrichedAt: new Date().toISOString(),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      data: enrichedData,
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enrich lead' },
      { status: 500 }
    );
  }
}
