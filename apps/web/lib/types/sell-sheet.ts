// RLTX Sell Sheet Types
// Comprehensive contextual selling intelligence for each lead

import type { RLTXProduct } from '../sector-config';

export interface SellSheet {
  // Metadata
  leadId: string;
  company: string;
  generatedAt: string;
  expiresAt: string;

  // Product Fit Analysis
  productFit: {
    primaryProduct: RLTXProduct;
    fitScore: number;
    fitExplanation: string;
    useCaseMatch: string;
    competitorDisplacement: string;
    reasons: string[];
  };

  // Detailed Pain Points
  painPoints: PainPoint[];

  // Stakeholder-Specific Talking Points
  talkingPoints: {
    executive: string[];
    technical: string[];
    operational: string[];
    financial: string[];
  };

  // Decision Maker Intelligence
  decisionMakers: {
    targetTitles: string[];
    buyingCenter: string;
    decisionProcess: string;
    budgetOwner: string;
    influencers: string[];
    potentialBlockers: string[];
  };

  // Competitive Intelligence
  competitive: {
    currentSolutions: string[];
    likelyVendors: string[];
    switchingCosts: 'Low' | 'Medium' | 'High';
    triggerEvents: string[];
    competitiveAngle: string;
  };

  // Deal Intelligence
  dealIntel: {
    estimatedDealSize: string;
    salesCycle: string;
    budgetTiming: string;
    entryStrategy: string;
    expansionPath: string;
  };

  // Similar Customer References
  similarCustomers: SimilarCustomer[];

  // Outreach Strategy
  outreach: {
    openingHook: string;
    proofPoints: string[];
    discoveryQuestions: string[];
    objectionHandling: ObjectionResponse[];
    timing: string;
    recommendedChannel: 'Email' | 'LinkedIn' | 'Phone' | 'Event';
  };

  // Scores
  scores: {
    overall: number;
    fit: number;
    urgency: number;
    accessibility: number;
    reasoning: string;
  };
}

export interface PainPoint {
  category: 'operational' | 'strategic' | 'financial' | 'competitive';
  pain: string;
  businessImpact: string;
  quantifiedCost?: string;
  rltxSolution: string;
  proofPoint: string;
}

export interface SimilarCustomer {
  company: string;
  sector: string;
  useCase: string;
  outcome: string;
  relevance: string;
}

export interface ObjectionResponse {
  objection: string;
  response: string;
  proofPoint?: string;
}

// Partial sell sheet for preview/quick view
export interface SellSheetPreview {
  leadId: string;
  company: string;
  productFit: {
    primaryProduct: RLTXProduct;
    fitScore: number;
    reasons: string[];
  };
  topPainPoint: PainPoint;
  openingHook: string;
  nextAction: string;
}

// Request/Response types for API
export interface GenerateSellSheetRequest {
  leadId: string;
  forceRefresh?: boolean;
}

export interface GenerateSellSheetResponse {
  success: boolean;
  sellSheet?: SellSheet;
  cached?: boolean;
  error?: string;
}
