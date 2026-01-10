// RLTX Product Fit Engine
// Calculates product fit scores for leads based on sector taxonomy

import {
  SECTOR_TAXONOMY,
  HIRING_SIGNALS,
  RLTXProduct,
  getSectorConfig,
  detectSubSector,
  type SectorConfig
} from './sector-config';

export interface ProductFitResult {
  primaryProduct: RLTXProduct;
  secondaryProduct: RLTXProduct | null;
  score: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  subSector: string | null;
  useCaseMatch: string | null;
}

export interface ProductScores {
  FORESIGHT: number;
  VERITAS: number;
  POPULOUS: number;
}

interface LeadData {
  company: string;
  sector: string;
  subSector?: string | null;
  useCase?: string | null;
  revenue?: number | null;
  employees?: number | null;
  source?: string | null;
  priority?: string;
}

// Revenue thresholds in billions
const REVENUE_THRESHOLDS = {
  enterprise: 1,      // $1B+
  midMarket: 0.1,     // $100M+
  growth: 0.01,       // $10M+
};

// Employee thresholds
const EMPLOYEE_THRESHOLDS = {
  enterprise: 5000,
  midMarket: 500,
  growth: 50,
};

/**
 * Calculate product fit for a lead
 */
export function calculateProductFit(lead: LeadData): ProductFitResult {
  const scores: ProductScores = {
    FORESIGHT: 0,
    VERITAS: 0,
    POPULOUS: 0,
  };

  const reasons: string[] = [];
  const combined = `${lead.company} ${lead.sector} ${lead.useCase || ''} ${lead.source || ''}`.toLowerCase();

  // 1. Sector-based scoring (highest weight)
  const sectorConfig = getSectorConfig(lead.sector);
  if (sectorConfig) {
    const primaryProduct = sectorConfig.primaryProduct;
    scores[primaryProduct] += 40;
    reasons.push(`${lead.sector} sector → ${primaryProduct}`);

    // Add secondary products
    for (const product of sectorConfig.products) {
      if (product !== primaryProduct) {
        scores[product] += 20;
      }
    }
  }

  // 2. Sub-sector detection and scoring
  let detectedSubSector: string | null = null;
  for (const [sectorKey, sectorCfg] of Object.entries(SECTOR_TAXONOMY)) {
    for (const [subKey, subConfig] of Object.entries(sectorCfg.subSectors)) {
      for (const keyword of subConfig.keywords) {
        if (combined.includes(keyword.toLowerCase())) {
          detectedSubSector = subConfig.name;
          const weight = Math.floor(subConfig.weight * 0.3); // Max 30 points
          scores[sectorCfg.primaryProduct] += weight;
          reasons.push(`${subConfig.name} match`);
          break;
        }
      }
      if (detectedSubSector) break;
    }
    if (detectedSubSector) break;
  }

  // 3. Keyword-based scoring
  // FORESIGHT keywords
  const foresightKeywords = [
    'defense', 'military', 'dod', 'intelligence', 'wargaming', 'simulation',
    'adversary', 'threat', 'security', 'classified', 'clearance', 'federal',
    'government', 'contractor', 'aerospace', 'space', 'national security'
  ];
  for (const kw of foresightKeywords) {
    if (combined.includes(kw)) {
      scores.FORESIGHT += 10;
      if (!reasons.some(r => r.includes(kw))) {
        reasons.push(`Keyword: ${kw}`);
      }
    }
  }

  // VERITAS keywords
  const veritasKeywords = [
    'research', 'survey', 'consumer', 'market', 'insights', 'analytics',
    'forecasting', 'risk', 'investment', 'financial', 'healthcare', 'pharma',
    'clinical', 'consulting', 'advisory'
  ];
  for (const kw of veritasKeywords) {
    if (combined.includes(kw)) {
      scores.VERITAS += 10;
      if (!reasons.some(r => r.includes(kw))) {
        reasons.push(`Keyword: ${kw}`);
      }
    }
  }

  // POPULOUS keywords
  const populousKeywords = [
    'audience', 'targeting', 'segmentation', 'advertising', 'media',
    'campaign', 'political', 'polling', 'retail', 'ecommerce', 'dtc',
    'consumer goods', 'cpg', 'gaming', 'streaming'
  ];
  for (const kw of populousKeywords) {
    if (combined.includes(kw)) {
      scores.POPULOUS += 10;
      if (!reasons.some(r => r.includes(kw))) {
        reasons.push(`Keyword: ${kw}`);
      }
    }
  }

  // 4. Source-based scoring
  const source = (lead.source || '').toLowerCase();
  if (source.includes('defense') || source.includes('federal') || source.includes('intelligence')) {
    scores.FORESIGHT += 15;
    reasons.push('Defense/Federal source');
  } else if (source.includes('fortune') || source.includes('sp500') || source.includes('financial')) {
    scores.VERITAS += 10;
    reasons.push('Enterprise source');
  } else if (source.includes('yc') || source.includes('unicorn') || source.includes('vc')) {
    scores.POPULOUS += 10;
    reasons.push('VC-backed source');
  }

  // 5. Size-based adjustments
  const revenue = lead.revenue || 0;
  const employees = lead.employees || 0;

  if (revenue >= REVENUE_THRESHOLDS.enterprise || employees >= EMPLOYEE_THRESHOLDS.enterprise) {
    // Enterprise = more likely VERITAS or FORESIGHT
    scores.VERITAS += 10;
    scores.FORESIGHT += 5;
    reasons.push('Enterprise size');
  } else if (revenue >= REVENUE_THRESHOLDS.midMarket || employees >= EMPLOYEE_THRESHOLDS.midMarket) {
    // Mid-market = balanced
    scores.VERITAS += 5;
    scores.POPULOUS += 5;
  } else if (revenue >= REVENUE_THRESHOLDS.growth || employees >= EMPLOYEE_THRESHOLDS.growth) {
    // Growth = more likely POPULOUS
    scores.POPULOUS += 10;
    reasons.push('Growth stage');
  }

  // Find primary and secondary products
  const sortedProducts = (Object.entries(scores) as [RLTXProduct, number][])
    .sort((a, b) => b[1] - a[1]);

  const primaryProduct = sortedProducts[0][0];
  const primaryScore = sortedProducts[0][1];
  const secondaryProduct = sortedProducts[1][1] > 20 ? sortedProducts[1][0] : null;

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, Math.max(0, primaryScore));

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (normalizedScore >= 60 && reasons.length >= 3) {
    confidence = 'high';
  } else if (normalizedScore >= 40 && reasons.length >= 2) {
    confidence = 'medium';
  }

  // Determine use case match
  let useCaseMatch: string | null = null;
  if (primaryProduct === 'FORESIGHT') {
    if (combined.includes('wargam') || combined.includes('simulation')) {
      useCaseMatch = 'Wargaming & simulation';
    } else if (combined.includes('intel') || combined.includes('adversar')) {
      useCaseMatch = 'Intelligence analysis';
    } else if (combined.includes('defense') || combined.includes('military')) {
      useCaseMatch = 'Defense planning';
    }
  } else if (primaryProduct === 'VERITAS') {
    if (combined.includes('market') || combined.includes('consumer')) {
      useCaseMatch = 'Market research replacement';
    } else if (combined.includes('invest') || combined.includes('risk')) {
      useCaseMatch = 'Investment research';
    } else if (combined.includes('clinical') || combined.includes('pharma')) {
      useCaseMatch = 'Clinical research';
    }
  } else if (primaryProduct === 'POPULOUS') {
    if (combined.includes('audience') || combined.includes('target')) {
      useCaseMatch = 'Audience modeling';
    } else if (combined.includes('campaign') || combined.includes('political')) {
      useCaseMatch = 'Campaign optimization';
    } else if (combined.includes('retail') || combined.includes('consumer')) {
      useCaseMatch = 'Consumer simulation';
    }
  }

  return {
    primaryProduct,
    secondaryProduct,
    score: normalizedScore,
    confidence,
    reasons: reasons.slice(0, 5), // Top 5 reasons
    subSector: detectedSubSector || lead.subSector || null,
    useCaseMatch,
  };
}

/**
 * Get all product scores for a lead (for comparison views)
 */
export function getAllProductScores(lead: LeadData): ProductScores {
  const result = calculateProductFit(lead);

  // Distribute scores based on primary/secondary
  const scores: ProductScores = {
    FORESIGHT: 0,
    VERITAS: 0,
    POPULOUS: 0,
  };

  scores[result.primaryProduct] = result.score;
  if (result.secondaryProduct) {
    scores[result.secondaryProduct] = Math.floor(result.score * 0.6);
  }

  return scores;
}

/**
 * Batch calculate product fit for multiple leads
 */
export function batchCalculateProductFit(leads: LeadData[]): Map<string, ProductFitResult> {
  const results = new Map<string, ProductFitResult>();

  for (const lead of leads) {
    const key = lead.company;
    results.set(key, calculateProductFit(lead));
  }

  return results;
}

/**
 * Get hiring signals relevant to a lead
 */
export function getRelevantHiringSignals(lead: LeadData): string[] {
  const productFit = calculateProductFit(lead);
  const signals = HIRING_SIGNALS[productFit.primaryProduct] || [];

  if (productFit.secondaryProduct) {
    const secondarySignals = HIRING_SIGNALS[productFit.secondaryProduct] || [];
    return [...new Set([...signals, ...secondarySignals])];
  }

  return signals;
}
