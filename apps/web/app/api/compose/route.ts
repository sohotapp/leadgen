import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@lead-engine/db';
import { leads, contacts } from '@lead-engine/db';
import { eq } from 'drizzle-orm';
import { composeRequestSchema } from '@lead-engine/shared';

const anthropic = new Anthropic();

// Sector-specific prompts
const sectorPrompts: Record<string, string> = {
  Defense: `You're reaching out to a defense contractor. Reference their work in areas like:
    - War gaming and scenario simulation
    - Multi-domain operations
    - Training and readiness systems
    - Autonomous systems
    Focus on scalability, security, and integration with existing DoD systems.`,

  Healthcare: `You're reaching out to a healthcare company. Reference their work in areas like:
    - Population health simulation
    - Clinical trial modeling
    - Claims prediction and fraud detection
    - Patient flow optimization
    Focus on compliance, data privacy, and real-world evidence.`,

  Finance: `You're reaching out to a financial services company. Reference their work in areas like:
    - Risk scenario modeling
    - Trading strategy backtesting
    - Fraud detection
    - Regulatory stress testing
    Focus on speed, accuracy, and regulatory compliance.`,

  Intelligence: `You're reaching out to an intelligence community contractor. Reference their work in areas like:
    - Threat modeling
    - Geopolitical scenario simulation
    - Pattern detection at scale
    Focus on security clearances, scalability, and accuracy.`,

  Consulting: `You're reaching out to a consulting firm. Reference their work in areas like:
    - Strategic scenario planning
    - Market simulation
    - PE portfolio simulation
    Focus on client value, speed of insight, and competitive advantage.`,
};

const toneInstructions: Record<string, string> = {
  direct: 'Be direct and concise. Get to the point quickly. No fluff.',
  casual: 'Be conversational and friendly. Use casual language but stay professional.',
  formal: 'Be professional and formal. Use proper business language.',
  curious: 'Lead with genuine curiosity. Ask questions. Show interest in their work.',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, contactId, templateId, tone, customInstructions } = composeRequestSchema.parse(body);

    // Get lead data
    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
      with: {
        contacts: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Get contact if specified
    const contact = contactId
      ? lead.contacts.find((c) => c.id === contactId)
      : lead.contacts.find((c) => c.isPrimary) || lead.contacts[0];

    // Build the prompt
    const sectorContext = sectorPrompts[lead.sector] || sectorPrompts['Consulting'];
    const toneContext = toneInstructions[tone] || toneInstructions['direct'];

    const systemPrompt = `You are an expert cold email writer for RLTX.ai, a simulation and synthetic data platform. Your emails are known for being highly personalized, concise, and effective.

RLTX Value Propositions:
- Run thousands of simulation scenarios in hours instead of weeks
- Generate synthetic populations for testing at scale
- Multi-domain conflict modeling and scenario planning
- Risk scenario modeling and stress testing
- Integrate with existing enterprise systems

${sectorContext}

TONE: ${toneContext}

CONSTRAINTS:
- 50-100 words maximum for the body (not including subject)
- No generic openers like "I hope this finds you well" or "I wanted to reach out"
- Lead with a specific insight about their company or industry
- One clear call-to-action (15-minute call)
- Sound human, not salesy or AI-generated
- No buzzwords or jargon
- Use their first name only

OUTPUT FORMAT:
Subject: [compelling subject line, 5-8 words]

[Email body]

Best,
Owen`;

    const userPrompt = `Write a cold email for:

Company: ${lead.companyName}
Sector: ${lead.sector}
Sub-sector: ${lead.subSector || 'N/A'}
Revenue: ${lead.revenue ? `$${lead.revenue}M` : 'N/A'}
RLTX Use Case: ${lead.rltxUseCase || 'Simulation and scenario modeling'}
Target Title: ${contact?.title || lead.targetTitles?.[0] || 'Executive'}
Contact Name: ${contact?.firstName || 'there'}

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const text = content.text;

    // Extract subject and body
    const subjectMatch = text.match(/Subject:\s*(.+?)(?:\n|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Quick question about simulation';

    const bodyMatch = text.match(/Subject:.*?\n\n([\s\S]*?)(?:\n\nBest,|$)/i);
    const body = bodyMatch ? bodyMatch[1].trim() : text;

    return NextResponse.json({
      success: true,
      data: {
        subject,
        body: body + '\n\nBest,\nOwen',
        leadId,
        contactId: contact?.id,
        contact: contact ? {
          name: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
          title: contact.title,
        } : null,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Compose error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compose email' },
      { status: 500 }
    );
  }
}

// Batch compose endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds, tone, customInstructions } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No lead IDs provided' },
        { status: 400 }
      );
    }

    // Limit batch size
    const batchLeadIds = leadIds.slice(0, 10);
    const results = [];

    for (const leadId of batchLeadIds) {
      try {
        // Make internal request to single compose endpoint
        const composeRequest = new NextRequest(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({
            leadId,
            tone: tone || 'direct',
            customInstructions,
          }),
        });

        const response = await POST(composeRequest);
        const data = await response.json();

        results.push({
          leadId,
          success: data.success,
          data: data.data,
          error: data.error,
        });
      } catch (error) {
        results.push({
          leadId,
          success: false,
          error: 'Failed to compose',
        });
      }

      // Add small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: batchLeadIds.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error('Batch compose error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to batch compose' },
      { status: 500 }
    );
  }
}
