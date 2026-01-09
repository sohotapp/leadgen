import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { lead, message, history } = await request.json();

    const systemPrompt = `You are a research assistant for RLTX.ai, helping the sales team learn more about potential customers.

You are researching: ${lead.company}
Sector: ${lead.sector}
Location: ${lead.city || ''}, ${lead.state || ''} ${lead.country || ''}
Website: ${lead.website || 'Unknown'}
Revenue: ${lead.revenue ? `$${lead.revenue}B` : 'Unknown'}
Employees: ${lead.employees?.toLocaleString() || 'Unknown'}

${lead.enrichment ? `
Previous enrichment data:
${JSON.stringify(lead.enrichment, null, 2)}
` : ''}

Answer questions about this company based on your knowledge. Be concise but informative. If you don't know something, say so clearly. Focus on actionable insights that would help close a sale.`;

    const messages: Array<{role: 'user' | 'assistant', content: string}> = [
      ...(history || []),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      success: true,
      response: content.text,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
