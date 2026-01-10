// RLTX Sector Taxonomy Configuration
// Maps sectors, sub-sectors, and companies to RLTX products

export type RLTXProduct = 'FORESIGHT' | 'VERITAS' | 'POPULOUS';

export interface SubSector {
  name: string;
  keywords: string[];
  weight: number; // 0-100, higher = better fit
  signals: string[];
}

export interface SectorConfig {
  name: string;
  products: RLTXProduct[];
  primaryProduct: RLTXProduct;
  subSectors: Record<string, SubSector>;
  globalKeywords: string[];
  description: string;
}

// Comprehensive sector taxonomy
export const SECTOR_TAXONOMY: Record<string, SectorConfig> = {
  // ============================================
  // FORESIGHT - Defense & Intelligence
  // ============================================
  'Defense': {
    name: 'Defense',
    products: ['FORESIGHT'],
    primaryProduct: 'FORESIGHT',
    description: 'Defense contractors, military, aerospace',
    globalKeywords: ['defense', 'military', 'dod', 'pentagon', 'armed forces', 'warfare'],
    subSectors: {
      'Defense Prime': {
        name: 'Defense Prime',
        keywords: ['lockheed', 'raytheon', 'northrop', 'boeing defense', 'general dynamics', 'rtx', 'lmt', 'noc', 'gd'],
        weight: 100,
        signals: ['major_contract', 'dod_budget', 'clearance_hiring']
      },
      'Defense Tier 2': {
        name: 'Defense Tier 2',
        keywords: ['l3harris', 'leidos', 'saic', 'bae systems', 'booz allen', 'caci', 'peraton', 'parsons'],
        weight: 90,
        signals: ['subcontract_wins', 'capability_expansion']
      },
      'Defense Tech': {
        name: 'Defense Tech',
        keywords: ['anduril', 'shield ai', 'rebellion defense', 'palantir', 'second front', 'primer ai', 'scale ai defense', 'hadrian'],
        weight: 95,
        signals: ['funding_round', 'diu_contract', 'afwerx']
      },
      'Intelligence Contractor': {
        name: 'Intelligence Contractor',
        keywords: ['mantech', 'caci', 'parsons', 'peraton', 'keystone', 'intelligence', 'nsa', 'cia', 'dia', 'nro'],
        weight: 95,
        signals: ['ic_contract', 'clearance_hiring', 'classified']
      },
      'Federal SI': {
        name: 'Federal Systems Integrator',
        keywords: ['accenture federal', 'deloitte federal', 'ibm federal', 'aws govcloud', 'microsoft federal'],
        weight: 85,
        signals: ['federal_contract', 'fedramp', 'govcon']
      }
    }
  },

  'Aerospace': {
    name: 'Aerospace & Space',
    products: ['FORESIGHT'],
    primaryProduct: 'FORESIGHT',
    description: 'Aerospace, space, satellites',
    globalKeywords: ['aerospace', 'space', 'satellite', 'rocket', 'orbit', 'launch'],
    subSectors: {
      'Space Prime': {
        name: 'Space Prime',
        keywords: ['spacex', 'blue origin', 'boeing space', 'lockheed space', 'northrop space', 'ula'],
        weight: 95,
        signals: ['launch_contract', 'nasa_award', 'space_force']
      },
      'Satellite': {
        name: 'Satellite & Comms',
        keywords: ['starlink', 'oneweb', 'viasat', 'ses', 'intelsat', 'maxar', 'planet labs'],
        weight: 85,
        signals: ['constellation_expansion', 'spectrum_award']
      },
      'Space Tech': {
        name: 'Space Tech Startup',
        keywords: ['relativity', 'rocket lab', 'astra', 'firefly', 'astroscale', 'momentus'],
        weight: 90,
        signals: ['funding_round', 'launch_success']
      }
    }
  },

  'Intelligence': {
    name: 'Intelligence & National Security',
    products: ['FORESIGHT'],
    primaryProduct: 'FORESIGHT',
    description: 'Intelligence agencies, national security',
    globalKeywords: ['intelligence', 'national security', 'classified', 'sigint', 'humint', 'geoint'],
    subSectors: {
      'IC Agency': {
        name: 'Intelligence Community',
        keywords: ['nsa', 'cia', 'dia', 'nro', 'nga', 'fbi', 'dhs', 'odni'],
        weight: 100,
        signals: ['budget_increase', 'mission_expansion']
      },
      'FFRDC': {
        name: 'FFRDC & Labs',
        keywords: ['mitre', 'rand', 'aerospace corp', 'lincoln lab', 'sandia', 'los alamos', 'livermore', 'jhuapl', 'ida'],
        weight: 90,
        signals: ['research_grant', 'new_program']
      },
      'Think Tank': {
        name: 'Think Tank',
        keywords: ['brookings', 'csis', 'hudson', 'heritage', 'aei', 'cnas', 'atlantic council', 'carnegie'],
        weight: 75,
        signals: ['policy_report', 'government_testimony']
      }
    }
  },

  'Government': {
    name: 'Government & Federal',
    products: ['FORESIGHT', 'VERITAS'],
    primaryProduct: 'FORESIGHT',
    description: 'Federal, state, local government',
    globalKeywords: ['government', 'federal', 'agency', 'public sector', 'gsa'],
    subSectors: {
      'Federal Agency': {
        name: 'Federal Agency',
        keywords: ['dod', 'dhs', 'doe', 'hhs', 'usda', 'commerce', 'treasury', 'state dept'],
        weight: 90,
        signals: ['budget_allocation', 'modernization_initiative']
      },
      'Federal Contractor': {
        name: 'Federal Contractor',
        keywords: ['govcon', 'sam.gov', 'gsa schedule', 'idiq', 'bpa', 'gwac'],
        weight: 85,
        signals: ['contract_award', 'recompete']
      }
    }
  },

  // ============================================
  // VERITAS - Enterprise Research
  // ============================================
  'Financial Services': {
    name: 'Financial Services',
    products: ['VERITAS'],
    primaryProduct: 'VERITAS',
    description: 'Banks, hedge funds, asset managers, insurance',
    globalKeywords: ['financial', 'banking', 'investment', 'capital', 'fund', 'asset'],
    subSectors: {
      'Tier-1 Bank': {
        name: 'Tier-1 Bank',
        keywords: ['jpmorgan', 'goldman', 'morgan stanley', 'citi', 'bank of america', 'wells fargo', 'ubs', 'credit suisse', 'barclays', 'deutsche'],
        weight: 100,
        signals: ['research_team_hiring', 'quant_expansion', 'ai_initiative']
      },
      'Hedge Fund': {
        name: 'Hedge Fund',
        keywords: ['citadel', 'bridgewater', 'two sigma', 'de shaw', 'point72', 'millennium', 'aqr', 'renaissance', 'man group'],
        weight: 100,
        signals: ['aum_growth', 'strategy_launch', 'quant_hiring']
      },
      'Asset Manager': {
        name: 'Asset Manager',
        keywords: ['blackrock', 'vanguard', 'fidelity', 'state street', 'pimco', 'invesco', 'franklin templeton', 'schroders'],
        weight: 90,
        signals: ['fund_launch', 'research_expansion']
      },
      'PE/VC': {
        name: 'Private Equity / VC',
        keywords: ['blackstone', 'kkr', 'carlyle', 'apollo', 'tpg', 'sequoia', 'a16z', 'andreessen', 'accel', 'benchmark', 'greylock'],
        weight: 85,
        signals: ['new_fund', 'portfolio_growth', 'due_diligence_hiring']
      },
      'Sovereign Wealth': {
        name: 'Sovereign Wealth Fund',
        keywords: ['gic', 'adia', 'norges', 'temasek', 'cppib', 'qatar investment', 'mubadala', 'pif'],
        weight: 100,
        signals: ['allocation_shift', 'direct_investment']
      },
      'Insurance': {
        name: 'Insurance',
        keywords: ['aig', 'metlife', 'prudential', 'chubb', 'travelers', 'allstate', 'progressive', 'zurich', 'axa', 'allianz'],
        weight: 80,
        signals: ['actuarial_hiring', 'risk_model_update']
      }
    }
  },

  'Healthcare': {
    name: 'Healthcare & Life Sciences',
    products: ['VERITAS'],
    primaryProduct: 'VERITAS',
    description: 'Pharma, biotech, healthcare systems, CROs',
    globalKeywords: ['healthcare', 'pharmaceutical', 'biotech', 'medical', 'clinical', 'patient'],
    subSectors: {
      'Pharma': {
        name: 'Big Pharma',
        keywords: ['pfizer', 'merck', 'novartis', 'roche', 'j&j', 'johnson johnson', 'abbvie', 'lilly', 'astrazeneca', 'gsk', 'sanofi', 'bms'],
        weight: 95,
        signals: ['clinical_trial', 'fda_submission', 'research_hiring', 'pipeline_update']
      },
      'Biotech': {
        name: 'Biotech',
        keywords: ['moderna', 'regeneron', 'vertex', 'gilead', 'biogen', 'illumina', 'amgen', 'genentech'],
        weight: 90,
        signals: ['funding_round', 'trial_results', 'partnership']
      },
      'CRO': {
        name: 'Contract Research Org',
        keywords: ['iqvia', 'labcorp', 'ppd', 'syneos', 'parexel', 'icon', 'medpace', 'pra health'],
        weight: 90,
        signals: ['trial_win', 'capacity_expansion']
      },
      'Health System': {
        name: 'Health System',
        keywords: ['kaiser', 'hca', 'commonspirit', 'ascension', 'mayo clinic', 'cleveland clinic', 'mass general'],
        weight: 75,
        signals: ['population_health', 'value_based_care']
      },
      'Medical Device': {
        name: 'Medical Device',
        keywords: ['medtronic', 'abbott', 'boston scientific', 'stryker', 'edwards', 'intuitive surgical', 'dexcom'],
        weight: 80,
        signals: ['fda_approval', 'clinical_trial']
      }
    }
  },

  'Consulting': {
    name: 'Consulting & Professional Services',
    products: ['VERITAS', 'POPULOUS'],
    primaryProduct: 'VERITAS',
    description: 'Management consulting, advisory, professional services',
    globalKeywords: ['consulting', 'advisory', 'strategy', 'professional services'],
    subSectors: {
      'MBB': {
        name: 'MBB',
        keywords: ['mckinsey', 'bcg', 'bain', 'boston consulting'],
        weight: 100,
        signals: ['practice_launch', 'partner_hire', 'thought_leadership']
      },
      'Big 4': {
        name: 'Big 4 Advisory',
        keywords: ['deloitte', 'pwc', 'ey', 'kpmg', 'ernst young', 'pricewaterhouse'],
        weight: 90,
        signals: ['consulting_growth', 'digital_practice']
      },
      'Boutique Strategy': {
        name: 'Boutique Strategy',
        keywords: ['roland berger', 'oliver wyman', 'lek', 'at kearney', 'strategy&', 'simon kucher', 'alixpartners'],
        weight: 85,
        signals: ['new_office', 'sector_focus']
      },
      'Tech Consulting': {
        name: 'Tech Consulting',
        keywords: ['accenture', 'ibm consulting', 'capgemini', 'cognizant', 'infosys', 'wipro', 'tcs'],
        weight: 80,
        signals: ['ai_practice', 'digital_transformation']
      }
    }
  },

  'Market Research': {
    name: 'Market Research & Data',
    products: ['VERITAS'],
    primaryProduct: 'VERITAS',
    description: 'Market research firms, data providers, analytics',
    globalKeywords: ['market research', 'research', 'survey', 'insights', 'analytics', 'data'],
    subSectors: {
      'Research Firm': {
        name: 'Research Firm',
        keywords: ['nielsen', 'gartner', 'forrester', 'idc', 'ipsos', 'kantar', 'euromonitor', 'mintel'],
        weight: 95,
        signals: ['methodology_update', 'panel_expansion', 'ai_integration']
      },
      'Data Provider': {
        name: 'Data Provider',
        keywords: ['bloomberg', 'refinitiv', 'factset', 'sp global', 'moodys', 'morningstar', 'pitchbook'],
        weight: 85,
        signals: ['data_product_launch', 'coverage_expansion']
      },
      'Polling': {
        name: 'Polling & Opinion',
        keywords: ['gallup', 'pew', 'yougov', 'morning consult', 'qualtrics', 'surveymonkey'],
        weight: 80,
        signals: ['methodology_innovation', 'client_expansion']
      }
    }
  },

  // ============================================
  // POPULOUS - Self-Serve Simulation
  // ============================================
  'Technology': {
    name: 'Technology & SaaS',
    products: ['POPULOUS', 'VERITAS'],
    primaryProduct: 'POPULOUS',
    description: 'Tech companies, SaaS, software',
    globalKeywords: ['technology', 'software', 'saas', 'platform', 'tech', 'digital'],
    subSectors: {
      'Enterprise Software': {
        name: 'Enterprise Software',
        keywords: ['salesforce', 'servicenow', 'workday', 'adobe', 'sap', 'oracle', 'microsoft', 'google cloud', 'aws'],
        weight: 85,
        signals: ['product_launch', 'ai_feature', 'market_expansion']
      },
      'Growth SaaS': {
        name: 'Growth SaaS',
        keywords: ['snowflake', 'datadog', 'mongodb', 'confluent', 'databricks', 'dbt', 'fivetran'],
        weight: 90,
        signals: ['funding_round', 'ipo_prep', 'enterprise_push']
      },
      'AI/ML': {
        name: 'AI/ML Company',
        keywords: ['openai', 'anthropic', 'cohere', 'hugging face', 'scale ai', 'weights biases', 'anyscale'],
        weight: 95,
        signals: ['model_release', 'enterprise_contract', 'research_paper']
      },
      'VC-Backed Startup': {
        name: 'VC-Backed Startup',
        keywords: ['series a', 'series b', 'series c', 'unicorn', 'yc', 'techstars'],
        weight: 85,
        signals: ['funding_round', 'product_market_fit', 'team_growth']
      }
    }
  },

  'Media': {
    name: 'Media & Entertainment',
    products: ['POPULOUS', 'VERITAS'],
    primaryProduct: 'POPULOUS',
    description: 'Media, entertainment, streaming, gaming',
    globalKeywords: ['media', 'entertainment', 'content', 'streaming', 'gaming'],
    subSectors: {
      'Streaming': {
        name: 'Streaming',
        keywords: ['netflix', 'disney', 'hbo', 'paramount', 'peacock', 'hulu', 'amazon prime'],
        weight: 85,
        signals: ['subscriber_growth', 'content_investment', 'ad_tier']
      },
      'Gaming': {
        name: 'Gaming',
        keywords: ['activision', 'ea', 'take two', 'ubisoft', 'epic', 'riot', 'roblox', 'unity'],
        weight: 80,
        signals: ['game_launch', 'live_service', 'acquisition']
      },
      'Social': {
        name: 'Social Media',
        keywords: ['meta', 'tiktok', 'snapchat', 'twitter', 'x', 'linkedin', 'pinterest', 'reddit'],
        weight: 85,
        signals: ['user_growth', 'monetization', 'creator_economy']
      }
    }
  },

  'Advertising': {
    name: 'Advertising & Marketing',
    products: ['POPULOUS'],
    primaryProduct: 'POPULOUS',
    description: 'Advertising agencies, adtech, marketing',
    globalKeywords: ['advertising', 'marketing', 'agency', 'adtech', 'media buying'],
    subSectors: {
      'Agency Holding': {
        name: 'Agency Holding Co',
        keywords: ['wpp', 'omnicom', 'publicis', 'interpublic', 'dentsu', 'havas'],
        weight: 85,
        signals: ['account_win', 'digital_investment', 'data_capability']
      },
      'Creative Agency': {
        name: 'Creative Agency',
        keywords: ['droga5', 'wieden kennedy', 'bbdo', 'ddb', 'ogilvy', 'leo burnett', 'grey'],
        weight: 75,
        signals: ['campaign_launch', 'award_win', 'new_business']
      },
      'AdTech': {
        name: 'AdTech',
        keywords: ['the trade desk', 'criteo', 'liveramp', 'magnite', 'pubmatic', 'applovin'],
        weight: 85,
        signals: ['platform_update', 'privacy_solution', 'retail_media']
      }
    }
  },

  'Retail': {
    name: 'Retail & E-commerce',
    products: ['POPULOUS', 'VERITAS'],
    primaryProduct: 'POPULOUS',
    description: 'Retail, e-commerce, consumer goods',
    globalKeywords: ['retail', 'ecommerce', 'consumer', 'shopping', 'cpg'],
    subSectors: {
      'E-commerce': {
        name: 'E-commerce',
        keywords: ['amazon', 'shopify', 'etsy', 'wayfair', 'chewy', 'ebay'],
        weight: 85,
        signals: ['gmv_growth', 'fulfillment_expansion', 'ad_platform']
      },
      'Retail': {
        name: 'Major Retail',
        keywords: ['walmart', 'target', 'costco', 'kroger', 'home depot', 'lowes', 'best buy'],
        weight: 80,
        signals: ['digital_investment', 'media_network', 'personalization']
      },
      'CPG': {
        name: 'CPG',
        keywords: ['p&g', 'unilever', 'nestle', 'pepsico', 'coca cola', 'mondelez', 'kraft heinz', 'colgate'],
        weight: 85,
        signals: ['consumer_insights', 'dtc_launch', 'innovation_pipeline']
      },
      'DTC': {
        name: 'DTC Brand',
        keywords: ['warby parker', 'glossier', 'allbirds', 'casper', 'away', 'peloton'],
        weight: 75,
        signals: ['funding_round', 'retail_expansion', 'profitability']
      }
    }
  },

  'Political': {
    name: 'Political & Campaigns',
    products: ['POPULOUS'],
    primaryProduct: 'POPULOUS',
    description: 'Political campaigns, PACs, advocacy',
    globalKeywords: ['political', 'campaign', 'pac', 'advocacy', 'election', 'voter'],
    subSectors: {
      'Campaign': {
        name: 'Political Campaign',
        keywords: ['presidential', 'senate', 'congressional', 'gubernatorial', 'campaign'],
        weight: 90,
        signals: ['election_cycle', 'fundraising', 'polling']
      },
      'PAC': {
        name: 'PAC / Super PAC',
        keywords: ['pac', 'super pac', 'political action', 'advocacy'],
        weight: 85,
        signals: ['funding', 'ad_spend', 'endorsement']
      },
      'Political Tech': {
        name: 'Political Tech',
        keywords: ['ngp van', 'l2', 'civis', 'hawkfish', 'acronym', 'targeted victory'],
        weight: 85,
        signals: ['platform_update', 'data_partnership']
      }
    }
  }
};

// Product descriptions for UI
export const PRODUCT_INFO: Record<RLTXProduct, { name: string; description: string; tagline: string }> = {
  FORESIGHT: {
    name: 'FORESIGHT',
    description: 'Multi-agent population simulation for defense and intelligence applications',
    tagline: 'Wargaming, PSYOP modeling, adversary simulation'
  },
  VERITAS: {
    name: 'VERITAS',
    description: 'AI-powered enterprise research replacement',
    tagline: 'Consumer insights in hours, not months'
  },
  POPULOUS: {
    name: 'POPULOUS',
    description: 'Self-serve simulation platform for audience modeling',
    tagline: 'Audience simulation and decision analysis'
  }
};

// Hiring keywords that indicate intent for each product
export const HIRING_SIGNALS: Record<RLTXProduct, string[]> = {
  FORESIGHT: [
    'simulation engineer', 'wargaming', 'wargame analyst', 'operations research',
    'modeling simulation', 'synthetic environment', 'digital twin',
    'adversary modeling', 'threat analyst', 'intelligence analyst',
    'psyop', 'influence operations', 'information warfare',
    'defense analyst', 'military analyst', 'strategic planner'
  ],
  VERITAS: [
    'consumer insights', 'market research', 'research director',
    'survey research', 'quantitative research', 'qualitative research',
    'customer insights', 'voice of customer', 'voc analyst',
    'research analyst', 'insights manager', 'consumer intelligence',
    'market intelligence', 'competitive intelligence', 'brand research'
  ],
  POPULOUS: [
    'audience analyst', 'targeting analyst', 'media planning',
    'programmatic', 'data scientist marketing', 'customer analytics',
    'segmentation', 'propensity modeling', 'lookalike modeling',
    'attribution analyst', 'marketing analytics', 'growth analyst'
  ]
};

// Helper function to find sector config by sector name
export function getSectorConfig(sectorName: string): SectorConfig | null {
  const normalized = sectorName.toLowerCase();
  for (const [key, config] of Object.entries(SECTOR_TAXONOMY)) {
    if (key.toLowerCase() === normalized || config.name.toLowerCase() === normalized) {
      return config;
    }
    // Check if it matches any sub-sector
    for (const subKey of Object.keys(config.subSectors)) {
      if (subKey.toLowerCase() === normalized) {
        return config;
      }
    }
  }
  return null;
}

// Helper function to detect sub-sector from company info
export function detectSubSector(company: string, sector: string, useCase: string): { subSector: string; confidence: number } | null {
  const combined = `${company} ${sector} ${useCase}`.toLowerCase();

  for (const [sectorKey, sectorConfig] of Object.entries(SECTOR_TAXONOMY)) {
    for (const [subKey, subConfig] of Object.entries(sectorConfig.subSectors)) {
      for (const keyword of subConfig.keywords) {
        if (combined.includes(keyword.toLowerCase())) {
          return {
            subSector: subConfig.name,
            confidence: subConfig.weight
          };
        }
      }
    }
  }

  return null;
}

// Get all sector names for filtering
export function getAllSectors(): string[] {
  return Object.keys(SECTOR_TAXONOMY);
}

// Get all sub-sectors for a sector
export function getSubSectors(sectorName: string): string[] {
  const config = getSectorConfig(sectorName);
  if (!config) return [];
  return Object.values(config.subSectors).map(s => s.name);
}
