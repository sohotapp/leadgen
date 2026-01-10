import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { searchSimilarLeads, isVectorSearchAvailable } from '@/lib/vector-search';

const anthropic = new Anthropic();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Check for web search capability
const hasWebSearch = typeof anthropic.messages.create === 'function';

type Intent =
  | 'SEARCH_LOCAL'      // Search existing database
  | 'SEARCH_WEB'        // Discover new companies via web search
  | 'FILTER'            // Apply filters to the view
  | 'ENRICH'            // Enrich selected leads
  | 'ANALYZE'           // Analyze leads
  | 'SIMILAR'           // Find similar companies
  | 'CHAT';             // General question

interface IntentAnalysis {
  intent: Intent;
  confidence: number;
  searchQuery?: string;
  filters?: {
    sector?: string;
    priority?: string;
    search?: string;
  };
  explanation: string;
}

// Step 1: Analyze the user's intent
async function analyzeIntent(query: string, context: any): Promise<IntentAnalysis> {
  const prompt = `You are an AI assistant for a lead generation tool called RLTX Lead Engine. Analyze the user's query and determine their intent.

CONTEXT:
- User has ${context.totalLeads} leads in their database
- ${context.selectedCount} leads currently selected
- Available sectors: ${context.sectors?.slice(0, 15).join(', ')}
- Current filters: ${JSON.stringify(context.currentFilters)}

USER QUERY: "${query}"

Determine the intent. Respond with JSON only:

{
  "intent": "SEARCH_LOCAL" | "SEARCH_WEB" | "FILTER" | "ENRICH" | "ANALYZE" | "SIMILAR" | "CHAT",
  "confidence": 0.0-1.0,
  "searchQuery": "extracted search terms if applicable",
  "filters": {
    "sector": "sector name if filtering by sector",
    "priority": "Critical|High|Medium|Low if filtering by priority",
    "search": "search term if text searching"
  },
  "explanation": "brief explanation of what the user wants"
}

INTENT GUIDELINES:
- SEARCH_LOCAL: User wants to find leads in their existing database (e.g., "show defense contractors", "find healthcare companies")
- SEARCH_WEB: User wants to discover NEW companies not in database (e.g., "find AI startups", "discover companies doing X")
- FILTER: User wants to filter/sort the view (e.g., "show only Critical", "filter by defense sector")
- ENRICH: User wants to enrich leads (e.g., "enrich these", "get intel on selected")
- ANALYZE: User wants analysis (e.g., "which should I prioritize?", "summarize these leads")
- SIMILAR: User wants similar companies (e.g., "find companies like Anduril")
- CHAT: General questions (e.g., "what does this company do?", "help")

For SEARCH_WEB, extract specific search terms about company types, industries, characteristics.
For FILTER, extract the filter criteria.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    return { intent: 'CHAT', confidence: 0.5, explanation: 'Could not parse' };
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall through
  }

  return { intent: 'CHAT', confidence: 0.5, explanation: content.text };
}

// Step 2: Search local database (with optional vector search)
async function searchLocalDatabase(searchQuery: string, filters?: any, useVectorSearch = true) {
  // Try vector search first if available and query is semantic
  if (useVectorSearch && isVectorSearchAvailable() && searchQuery && searchQuery.length > 3) {
    try {
      const vectorResults = await searchSimilarLeads(searchQuery, {
        topK: 20,
        filter: filters?.sector ? { sector: filters.sector } : undefined,
      });

      if (vectorResults.length > 0) {
        // Fetch full lead data for vector results
        const leadIds = vectorResults.map(r => r.id);
        const { data, error } = await supabase
          .from('leads')
          .select('id, company, sector, sub_sector, city, state, country, website, revenue, employees, priority, use_case, source, enrichment, enriched_at, email, phone, linkedin')
          .in('id', leadIds);

        if (!error && data) {
          // Sort by vector similarity score
          const scoreMap = new Map(vectorResults.map(r => [r.id, r.score]));
          const sorted = data.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));

          return sorted.map(lead => ({
            id: lead.id,
            company: lead.company,
            sector: lead.sector,
            subSector: lead.sub_sector,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            website: lead.website,
            revenue: lead.revenue,
            employees: lead.employees,
            priority: lead.priority,
            useCase: lead.use_case,
            source: lead.source,
            enrichment: lead.enrichment,
            enrichedAt: lead.enriched_at,
            email: lead.email,
            phone: lead.phone,
            linkedin: lead.linkedin,
            vectorScore: scoreMap.get(lead.id),
          }));
        }
      }
    } catch (error) {
      console.warn('Vector search failed, falling back to text search:', error);
    }
  }

  // Fallback to traditional text search
  let query = supabase
    .from('leads')
    .select('id, company, sector, sub_sector, city, state, country, website, revenue, employees, priority, use_case, source, enrichment, enriched_at, email, phone, linkedin')
    .limit(20);

  // Apply text search
  if (searchQuery) {
    query = query.or(`company.ilike.%${searchQuery}%,sector.ilike.%${searchQuery}%,use_case.ilike.%${searchQuery}%`);
  }

  // Apply filters
  if (filters?.sector) {
    query = query.eq('sector', filters.sector);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  // Order by priority and company
  query = query.order('priority', { ascending: true }).order('company', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Local search error:', error);
    return [];
  }

  // Transform to camelCase
  return data?.map(lead => ({
    id: lead.id,
    company: lead.company,
    sector: lead.sector,
    subSector: lead.sub_sector,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    website: lead.website,
    revenue: lead.revenue,
    employees: lead.employees,
    priority: lead.priority,
    useCase: lead.use_case,
    source: lead.source,
    enrichment: lead.enrichment,
    enrichedAt: lead.enriched_at,
    email: lead.email,
    phone: lead.phone,
    linkedin: lead.linkedin,
  })) || [];
}

// Step 3: Web search for new companies with real web search
async function discoverCompaniesFromWeb(searchQuery: string): Promise<any[]> {
  // First, try to use web search to find real companies
  const webSearchPrompt = `Search the web to find real companies that match this criteria: "${searchQuery}"

Focus on finding:
1. Real company names with verified information
2. Companies that would be good enterprise B2B sales targets
3. Both established companies and promising startups
4. Companies in relevant industries for decision intelligence software

After searching, return a JSON array of the companies you found:

[
  {
    "company": "Company Name",
    "sector": "Industry/Sector",
    "description": "Brief description of what they do",
    "website": "company.com",
    "revenue": "$XB or $XM if found",
    "employees": "number if found",
    "location": "City, State/Country",
    "source": "Web Search",
    "confidence": 0.0-1.0,
    "relevanceReason": "Why this company matches"
  }
]

Return 5-15 companies. Only include companies you found with verified information.`;

  try {
    // Try with Claude's knowledge (web search requires beta API access)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: webSearchPrompt }],
    });

    // Extract text content from response (may have multiple blocks with web search results)
    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const companies = JSON.parse(jsonMatch[0]);

      // Check which companies are already in our database
      const companyNames = companies.map((c: any) => c.company?.toLowerCase()).filter(Boolean);
      const { data: existing } = await supabase
        .from('leads')
        .select('company')
        .in('company', companyNames);

      const existingNames = new Set((existing || []).map((e: any) => e.company.toLowerCase()));

      // Filter out companies already in DB
      return companies
        .filter((c: any) => c.company && !existingNames.has(c.company.toLowerCase()))
        .map((c: any) => ({
          ...c,
          alreadyInDb: false,
        }));
    }
  } catch (error: any) {
    // If web search not available, fall back to knowledge-based discovery
    console.warn('Web search failed, falling back to knowledge-based discovery:', error.message);

    // Fallback: Use Claude's knowledge
    const fallbackPrompt = `You are a company research assistant. Based on the search query, identify real companies that would match this criteria.

SEARCH QUERY: "${searchQuery}"

Return a JSON array of companies you know about that match this criteria:

[
  {
    "company": "Company Name",
    "sector": "Industry/Sector",
    "description": "Brief description",
    "website": "company.com",
    "revenue": "$XB or $XM if known",
    "employees": "approximate number",
    "location": "City, State/Country",
    "source": "AI Discovery",
    "confidence": 0.0-1.0,
    "relevanceReason": "Why this company matches"
  }
]

Return 5-15 companies. Only include companies you're confident exist.`;

    try {
      const fallbackResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: fallbackPrompt }],
      });

      const content = fallbackResponse.content[0];
      if (content.type !== 'text') return [];

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const companies = JSON.parse(jsonMatch[0]);
        const companyNames = companies.map((c: any) => c.company?.toLowerCase()).filter(Boolean);
        const { data: existing } = await supabase
          .from('leads')
          .select('company')
          .in('company', companyNames);

        const existingNames = new Set((existing || []).map((e: any) => e.company.toLowerCase()));

        return companies
          .filter((c: any) => c.company && !existingNames.has(c.company.toLowerCase()))
          .map((c: any) => ({
            ...c,
            alreadyInDb: false,
          }));
      }
    } catch {
      // Both methods failed
    }
  }

  return [];
}

// Step 4: Generate response based on intent
async function generateResponse(
  intent: IntentAnalysis,
  localResults: any[],
  discoveredCompanies: any[],
  context: any
): Promise<string> {
  const prompt = `You are a helpful AI assistant for the RLTX Lead Engine. Generate a brief, helpful response for the user.

INTENT: ${intent.intent}
EXPLANATION: ${intent.explanation}

RESULTS:
- Local database results: ${localResults.length} leads found
- Web discovery results: ${discoveredCompanies.length} new companies discovered

CONTEXT:
- Total leads in database: ${context.totalLeads}
- Currently selected: ${context.selectedCount}

Generate a brief (1-3 sentences) response that:
1. Acknowledges what the user asked for
2. Summarizes what was found
3. Suggests a next action if relevant

Keep it concise and professional. No markdown formatting.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : 'Here are the results.';
}

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Step 1: Analyze intent
    const intent = await analyzeIntent(query, context);
    console.log('Intent:', intent);

    let localResults: any[] = [];
    let discoveredCompanies: any[] = [];
    let suggestedFilters: any = null;

    // Step 2: Execute based on intent
    switch (intent.intent) {
      case 'SEARCH_LOCAL':
        localResults = await searchLocalDatabase(intent.searchQuery || query, intent.filters);
        break;

      case 'SEARCH_WEB':
        // Search both local and web
        localResults = await searchLocalDatabase(intent.searchQuery || query);
        discoveredCompanies = await discoverCompaniesFromWeb(intent.searchQuery || query);
        break;

      case 'FILTER':
        suggestedFilters = intent.filters;
        // Also return some results for the filter
        localResults = await searchLocalDatabase('', intent.filters);
        break;

      case 'SIMILAR':
        // For similar, we search for companies in the same sector
        if (context.selectedLeads?.[0]?.sector) {
          localResults = await searchLocalDatabase('', { sector: context.selectedLeads[0].sector });
          discoveredCompanies = await discoverCompaniesFromWeb(
            `companies similar to ${context.selectedLeads[0].company} in ${context.selectedLeads[0].sector}`
          );
        }
        break;

      case 'ANALYZE':
      case 'CHAT':
        // For these, we might still want to show relevant results
        if (intent.searchQuery) {
          localResults = await searchLocalDatabase(intent.searchQuery);
        }
        break;

      case 'ENRICH':
        // Return message about enriching
        break;
    }

    // Step 3: Generate response
    const message = await generateResponse(intent, localResults, discoveredCompanies, context);

    return NextResponse.json({
      success: true,
      message,
      intent: intent.intent,
      localResults: localResults.length > 0 ? localResults : undefined,
      discoveredCompanies: discoveredCompanies.length > 0 ? discoveredCompanies : undefined,
      suggestedFilters,
    });

  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
