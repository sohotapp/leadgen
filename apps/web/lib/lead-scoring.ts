// RLTX Lead Scoring Service
// Multi-dimensional scoring: Fit, Size, Urgency, Accessibility

import { calculateProductFit, type ProductFitResult } from './product-fit-engine';
import type { RLTXProduct } from './sector-config';

export interface LeadScoreBreakdown {
  fit: number;        // 0-40 (40% weight)
  size: number;       // 0-25 (25% weight)
  urgency: number;    // 0-20 (20% weight)
  accessibility: number; // 0-15 (15% weight)
}

export interface LeadScoreResult {
  totalScore: number;  // 0-100
  breakdown: LeadScoreBreakdown;
  tier: 'Hot' | 'Warm' | 'Medium' | 'Low';
  productFit: ProductFitResult;
  nextAction: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  reasoning: string[];
}

export interface ScoredLead {
  id: string;
  company: string;
  sector: string;
  subSector: string | null;
  revenue: number | null;
  employees: number | null;
  source: string | null;
  priority: string;
  enriched: boolean;
  // Scoring
  score: number;
  tier: string;
  breakdown: LeadScoreBreakdown;
  productFit: ProductFitResult;
  nextAction: string;
  reasons: string[];
}

interface LeadInput {
  id: string;
  company: string;
  sector: string;
  subSector?: string | null;
  useCase?: string | null;
  revenue?: number | null;
  employees?: number | null;
  source?: string | null;
  priority?: string;
  enrichment?: any;
  enriched_at?: string | null;
}

// Thresholds
const REVENUE_TIERS = {
  enterprise: { min: 1, score: 25 },      // $1B+
  large: { min: 0.5, score: 20 },         // $500M+
  midMarket: { min: 0.1, score: 15 },     // $100M+
  growth: { min: 0.01, score: 10 },       // $10M+
  startup: { min: 0, score: 5 },          // Any
};

const EMPLOYEE_TIERS = {
  enterprise: { min: 10000, score: 25 },
  large: { min: 5000, score: 20 },
  midMarket: { min: 1000, score: 15 },
  growth: { min: 100, score: 10 },
  startup: { min: 0, score: 5 },
};

// High-value sources
const SOURCE_SCORES: Record<string, number> = {
  'defense': 20,
  'federal': 18,
  'intelligence': 20,
  'fortune': 15,
  'sp500': 15,
  'f500': 15,
  'unicorn': 12,
  'yc': 10,
  'vc': 8,
  'curated': 10,
};

/**
 * Calculate comprehensive lead score
 */
export function calculateLeadScore(lead: LeadInput): LeadScoreResult {
  const reasoning: string[] = [];

  // 1. Product Fit Score (40% weight, max 40 points)
  const productFit = calculateProductFit({
    company: lead.company,
    sector: lead.sector,
    subSector: lead.subSector,
    useCase: lead.useCase,
    revenue: lead.revenue,
    employees: lead.employees,
    source: lead.source,
    priority: lead.priority,
  });

  const fitScore = Math.floor(productFit.score * 0.4);
  if (productFit.confidence === 'high') {
    reasoning.push(`Strong ${productFit.primaryProduct} fit`);
  } else if (productFit.confidence === 'medium') {
    reasoning.push(`${productFit.primaryProduct} opportunity`);
  }

  // 2. Size Score (25% weight, max 25 points)
  let sizeScore = 0;
  const revenue = lead.revenue || 0;
  const employees = lead.employees || 0;

  // Revenue scoring
  let revenueScore = 0;
  for (const [tier, config] of Object.entries(REVENUE_TIERS)) {
    if (revenue >= config.min) {
      revenueScore = config.score;
      break;
    }
  }

  // Employee scoring
  let employeeScore = 0;
  for (const [tier, config] of Object.entries(EMPLOYEE_TIERS)) {
    if (employees >= config.min) {
      employeeScore = config.score;
      break;
    }
  }

  // Take the higher of revenue or employee score
  sizeScore = Math.max(revenueScore, employeeScore);

  if (revenue >= 1) {
    reasoning.push(`$${revenue}B+ revenue`);
  } else if (revenue >= 0.1) {
    reasoning.push(`$${(revenue * 1000).toFixed(0)}M revenue`);
  }
  if (employees >= 5000) {
    reasoning.push(`${employees.toLocaleString()} employees`);
  }

  // 3. Urgency Score (20% weight, max 20 points)
  let urgencyScore = 0;

  // Priority-based urgency
  const priority = lead.priority || 'Medium';
  if (priority === 'Critical') {
    urgencyScore += 15;
    reasoning.push('Critical priority');
  } else if (priority === 'High') {
    urgencyScore += 10;
    reasoning.push('High priority');
  } else if (priority === 'Medium') {
    urgencyScore += 5;
  }

  // Source quality adds urgency (better sources = more likely to respond)
  const source = (lead.source || '').toLowerCase();
  for (const [keyword, score] of Object.entries(SOURCE_SCORES)) {
    if (source.includes(keyword)) {
      urgencyScore += Math.min(5, Math.floor(score / 4));
      reasoning.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} source`);
      break;
    }
  }

  urgencyScore = Math.min(20, urgencyScore);

  // 4. Accessibility Score (15% weight, max 15 points)
  let accessibilityScore = 5; // Base score

  // Enriched leads are more accessible
  const isEnriched = !!lead.enrichment || !!lead.enriched_at;
  if (isEnriched) {
    accessibilityScore += 10;
    reasoning.push('Enriched');
  }

  // Known use case improves accessibility
  if (lead.useCase && lead.useCase.length > 20) {
    accessibilityScore += 5;
  }

  accessibilityScore = Math.min(15, accessibilityScore);

  // Calculate total score
  const totalScore = fitScore + sizeScore + urgencyScore + accessibilityScore;

  // Determine tier
  let tier: 'Hot' | 'Warm' | 'Medium' | 'Low' = 'Low';
  if (totalScore >= 65) {
    tier = 'Hot';
  } else if (totalScore >= 45) {
    tier = 'Warm';
  } else if (totalScore >= 25) {
    tier = 'Medium';
  }

  // Determine next action
  let nextAction = 'Review';
  if (tier === 'Hot' && !isEnriched) {
    nextAction = 'Enrich now';
  } else if (tier === 'Hot' && isEnriched) {
    nextAction = 'Ready for outreach';
  } else if (tier === 'Warm' && !isEnriched) {
    nextAction = 'Queue for enrichment';
  } else if (tier === 'Warm' && isEnriched) {
    nextAction = 'Nurture';
  } else if (tier === 'Medium') {
    nextAction = 'Research needed';
  }

  // Determine priority
  let calculatedPriority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
  if (totalScore >= 75) {
    calculatedPriority = 'Critical';
  } else if (totalScore >= 55) {
    calculatedPriority = 'High';
  } else if (totalScore >= 35) {
    calculatedPriority = 'Medium';
  } else {
    calculatedPriority = 'Low';
  }

  return {
    totalScore,
    breakdown: {
      fit: fitScore,
      size: sizeScore,
      urgency: urgencyScore,
      accessibility: accessibilityScore,
    },
    tier,
    productFit,
    nextAction,
    priority: calculatedPriority,
    reasoning: reasoning.slice(0, 6),
  };
}

/**
 * Score and sort multiple leads
 */
export function scoreAndSortLeads(leads: LeadInput[]): ScoredLead[] {
  const scoredLeads: ScoredLead[] = leads.map(lead => {
    const result = calculateLeadScore(lead);

    return {
      id: lead.id,
      company: lead.company,
      sector: lead.sector,
      subSector: result.productFit.subSector,
      revenue: lead.revenue || null,
      employees: lead.employees || null,
      source: lead.source || null,
      priority: result.priority,
      enriched: !!lead.enrichment || !!lead.enriched_at,
      score: result.totalScore,
      tier: result.tier,
      breakdown: result.breakdown,
      productFit: result.productFit,
      nextAction: result.nextAction,
      reasons: result.reasoning,
    };
  });

  // Sort by score descending
  scoredLeads.sort((a, b) => b.score - a.score);

  return scoredLeads;
}

/**
 * Group scored leads by product
 */
export function groupByProduct(leads: ScoredLead[]): Record<RLTXProduct, ScoredLead[]> {
  const groups: Record<RLTXProduct, ScoredLead[]> = {
    FORESIGHT: [],
    VERITAS: [],
    POPULOUS: [],
  };

  for (const lead of leads) {
    const product = lead.productFit.primaryProduct;
    groups[product].push(lead);
  }

  // Sort each group by score
  for (const product of Object.keys(groups) as RLTXProduct[]) {
    groups[product].sort((a, b) => b.score - a.score);
  }

  return groups;
}

/**
 * Group scored leads by tier
 */
export function groupByTier(leads: ScoredLead[]): Record<string, ScoredLead[]> {
  const groups: Record<string, ScoredLead[]> = {
    Hot: [],
    Warm: [],
    Medium: [],
    Low: [],
  };

  for (const lead of leads) {
    groups[lead.tier].push(lead);
  }

  return groups;
}

/**
 * Get action items from scored leads
 */
export function getActionItems(leads: ScoredLead[]): Array<{ action: string; count: number; priority: 'high' | 'medium' | 'low'; leads: ScoredLead[] }> {
  const actionGroups: Record<string, ScoredLead[]> = {};

  for (const lead of leads) {
    if (!actionGroups[lead.nextAction]) {
      actionGroups[lead.nextAction] = [];
    }
    actionGroups[lead.nextAction].push(lead);
  }

  const actionItems = Object.entries(actionGroups).map(([action, actionLeads]) => {
    let priority: 'high' | 'medium' | 'low' = 'low';
    if (action === 'Enrich now' || action === 'Ready for outreach') {
      priority = 'high';
    } else if (action === 'Queue for enrichment' || action === 'Nurture') {
      priority = 'medium';
    }

    return {
      action,
      count: actionLeads.length,
      priority,
      leads: actionLeads.slice(0, 10), // Top 10 per action
    };
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actionItems;
}

/**
 * Get top leads per product
 */
export function getTopByProduct(leads: ScoredLead[], limit = 1): Record<RLTXProduct, ScoredLead | null> {
  const byProduct = groupByProduct(leads);

  return {
    FORESIGHT: byProduct.FORESIGHT[0] || null,
    VERITAS: byProduct.VERITAS[0] || null,
    POPULOUS: byProduct.POPULOUS[0] || null,
  };
}

/**
 * Calculate pipeline stats
 */
export function calculatePipelineStats(leads: ScoredLead[]) {
  const byTier = groupByTier(leads);
  const byProduct = groupByProduct(leads);

  return {
    total: leads.length,
    enriched: leads.filter(l => l.enriched).length,
    pending: leads.filter(l => !l.enriched).length,
    byTier: {
      hot: byTier.Hot.length,
      warm: byTier.Warm.length,
      medium: byTier.Medium.length,
      low: byTier.Low.length,
    },
    byProduct: {
      FORESIGHT: byProduct.FORESIGHT.length,
      VERITAS: byProduct.VERITAS.length,
      POPULOUS: byProduct.POPULOUS.length,
    },
    averageScore: leads.length > 0
      ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
      : 0,
  };
}
