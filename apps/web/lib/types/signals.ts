// Intent Signal Types
// Signals that indicate buying intent or timing opportunities

export type SignalType =
  | 'hiring'
  | 'funding'
  | 'news'
  | 'contract'
  | 'tech_stack'
  | 'leadership'
  | 'expansion';

export type SignalStrength = 'strong' | 'moderate' | 'weak';

export interface IntentSignal {
  id: string;
  leadId: string;
  type: SignalType;
  title: string;
  description: string;
  url?: string;
  date?: string;
  relevanceScore: number; // 1-100
  productRelevance: 'FORESIGHT' | 'VERITAS' | 'POPULOUS' | 'ALL';
  strength: SignalStrength;
  detectedAt: string;
  metadata?: Record<string, any>;
}

export interface SignalDetectionResult {
  leadId: string;
  signals: IntentSignal[];
  totalScore: number;
  topSignalType?: SignalType;
  summary?: string;
}

// Hiring signal keywords by product
export const HIRING_KEYWORDS: Record<string, { keywords: string[]; product: 'FORESIGHT' | 'VERITAS' | 'POPULOUS' | 'ALL'; weight: number }> = {
  // FORESIGHT - Defense & Simulation
  'wargaming': { keywords: ['wargaming', 'war gaming', 'wargame analyst'], product: 'FORESIGHT', weight: 100 },
  'simulation_engineer': { keywords: ['simulation engineer', 'modeling and simulation', 'm&s engineer'], product: 'FORESIGHT', weight: 95 },
  'operations_research': { keywords: ['operations research', 'operations analyst', 'OR analyst', 'ORsa'], product: 'FORESIGHT', weight: 90 },
  'decision_scientist': { keywords: ['decision scientist', 'decision science', 'decision analyst'], product: 'FORESIGHT', weight: 85 },
  'synthetic_data': { keywords: ['synthetic data', 'data synthesis', 'synthetic environment'], product: 'FORESIGHT', weight: 80 },
  'digital_twin': { keywords: ['digital twin', 'digital twins'], product: 'FORESIGHT', weight: 85 },
  'psyop': { keywords: ['psyop', 'psychological operations', 'influence operations', 'information warfare'], product: 'FORESIGHT', weight: 90 },
  'adversary_modeling': { keywords: ['adversary modeling', 'threat modeling', 'red team'], product: 'FORESIGHT', weight: 85 },

  // VERITAS - Research & Insights
  'consumer_insights': { keywords: ['consumer insights', 'consumer researcher', 'consumer intelligence'], product: 'VERITAS', weight: 100 },
  'market_research': { keywords: ['market research', 'market researcher', 'market analyst'], product: 'VERITAS', weight: 95 },
  'research_director': { keywords: ['research director', 'director of research', 'head of research'], product: 'VERITAS', weight: 90 },
  'insights_manager': { keywords: ['insights manager', 'insights director', 'insights lead'], product: 'VERITAS', weight: 90 },
  'quant_researcher': { keywords: ['quantitative researcher', 'quant researcher', 'quantitative analyst'], product: 'VERITAS', weight: 85 },
  'data_scientist': { keywords: ['data scientist', 'senior data scientist', 'lead data scientist'], product: 'VERITAS', weight: 70 },

  // POPULOUS - Audience & Campaign
  'audience_analyst': { keywords: ['audience analyst', 'audience insights', 'audience researcher'], product: 'POPULOUS', weight: 100 },
  'campaign_analyst': { keywords: ['campaign analyst', 'campaign manager', 'campaign strategist'], product: 'POPULOUS', weight: 90 },
  'polling': { keywords: ['polling', 'pollster', 'survey researcher', 'opinion research'], product: 'POPULOUS', weight: 95 },
  'political_strategist': { keywords: ['political strategist', 'political consultant', 'political analyst'], product: 'POPULOUS', weight: 90 },

  // General AI/ML - All products
  'ai_ml': { keywords: ['ai engineer', 'ml engineer', 'machine learning', 'artificial intelligence'], product: 'ALL', weight: 60 },
};

// News/Event signal keywords
export const NEWS_KEYWORDS: Record<string, { keywords: string[]; product: 'FORESIGHT' | 'VERITAS' | 'POPULOUS' | 'ALL'; weight: number }> = {
  'contract_win': { keywords: ['awarded contract', 'contract win', 'wins contract', 'awarded $'], product: 'FORESIGHT', weight: 90 },
  'dod_contract': { keywords: ['dod contract', 'department of defense', 'pentagon contract', 'army contract', 'navy contract', 'air force contract'], product: 'FORESIGHT', weight: 100 },
  'funding': { keywords: ['series a', 'series b', 'series c', 'funding round', 'raises $', 'raised $', 'investment from'], product: 'ALL', weight: 85 },
  'acquisition': { keywords: ['acquires', 'acquisition', 'merger', 'acquired by'], product: 'ALL', weight: 80 },
  'leadership_change': { keywords: ['new cto', 'new cdo', 'appoints', 'names', 'hired as', 'joins as'], product: 'ALL', weight: 75 },
  'digital_transformation': { keywords: ['digital transformation', 'modernization', 'digital initiative', 'technology upgrade'], product: 'ALL', weight: 80 },
  'research_partnership': { keywords: ['research partnership', 'research collaboration', 'academic partnership'], product: 'VERITAS', weight: 85 },
  'clinical_trial': { keywords: ['clinical trial', 'phase 1', 'phase 2', 'phase 3', 'fda approval'], product: 'VERITAS', weight: 90 },
  'product_launch': { keywords: ['product launch', 'launches', 'new product', 'introducing'], product: 'ALL', weight: 70 },
  'expansion': { keywords: ['expansion', 'expanding', 'new office', 'opens', 'enters market'], product: 'ALL', weight: 75 },
};

// Tech stack signals
export const TECH_STACK_KEYWORDS: Record<string, { keywords: string[]; product: 'FORESIGHT' | 'VERITAS' | 'POPULOUS' | 'ALL'; weight: number; displacement: boolean }> = {
  'qualtrics': { keywords: ['qualtrics', 'qualtrics xm'], product: 'VERITAS', weight: 90, displacement: true },
  'surveymonkey': { keywords: ['surveymonkey', 'survey monkey'], product: 'VERITAS', weight: 85, displacement: true },
  'nielsen': { keywords: ['nielsen', 'nielsen data'], product: 'VERITAS', weight: 80, displacement: true },
  'gartner': { keywords: ['gartner', 'gartner research'], product: 'VERITAS', weight: 75, displacement: true },
  'anylogic': { keywords: ['anylogic'], product: 'FORESIGHT', weight: 85, displacement: true },
  'simul8': { keywords: ['simul8'], product: 'FORESIGHT', weight: 80, displacement: true },
  'arena_simulation': { keywords: ['arena simulation', 'rockwell arena'], product: 'FORESIGHT', weight: 80, displacement: true },
  'tableau': { keywords: ['tableau'], product: 'ALL', weight: 50, displacement: false },
  'powerbi': { keywords: ['power bi', 'powerbi'], product: 'ALL', weight: 50, displacement: false },
};

// Contract signal keywords (for defense)
export const CONTRACT_KEYWORDS: Record<string, { keywords: string[]; weight: number }> = {
  'sbir': { keywords: ['sbir', 'sttr', 'small business innovation'], weight: 85 },
  'prime_contract': { keywords: ['prime contractor', 'prime contract'], weight: 95 },
  'subcontract': { keywords: ['subcontractor', 'subcontract'], weight: 80 },
  'idiq': { keywords: ['idiq', 'indefinite delivery'], weight: 90 },
  'bpa': { keywords: ['bpa', 'blanket purchase'], weight: 75 },
  'gsa': { keywords: ['gsa schedule', 'gsa contract'], weight: 70 },
  'sam_gov': { keywords: ['sam.gov', 'system for award management'], weight: 80 },
};

export interface SignalScanRequest {
  leadId: string;
  company: string;
  sector: string;
  subSector?: string;
  website?: string;
  forceRefresh?: boolean;
}

export interface SignalScanResponse {
  success: boolean;
  signals: IntentSignal[];
  summary?: string;
  error?: string;
}
