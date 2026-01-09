#!/usr/bin/env node
/**
 * Unified Lead Transformer
 * Transforms all raw data sources into standardized lead format
 * Deduplicates and enriches with sector classification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { RAW_DIR, PROCESSED_DIR, TARGET_SECTORS } = require('./config');

// Sector classification keywords
const SECTOR_KEYWORDS = {
  'Defense': ['defense', 'military', 'aerospace', 'arms', 'weapon', 'missile', 'navy', 'army', 'air force', 'dod', 'pentagon', 'lockheed', 'raytheon', 'northrop', 'boeing defense', 'general dynamics', 'bae systems'],
  'Government': ['government', 'federal', 'agency', 'department of', 'bureau', 'administration', 'national', 'state of', 'city of', 'county', 'public sector'],
  'Intelligence': ['intelligence', 'cia', 'nsa', 'nro', 'nga', 'dia', 'fbi', 'homeland', 'security', 'surveillance', 'palantir', 'booz allen'],
  'Healthcare': ['health', 'medical', 'hospital', 'pharma', 'biotech', 'clinical', 'patient', 'therapeutic', 'drug', 'vaccine', 'medicare', 'medicaid'],
  'Financial': ['bank', 'financial', 'insurance', 'investment', 'capital', 'asset', 'wealth', 'trading', 'hedge fund', 'private equity', 'venture capital', 'fintech'],
  'Technology': ['software', 'saas', 'cloud', 'platform', 'tech', 'digital', 'data', 'analytics', 'machine learning', 'artificial intelligence', 'ai', 'automation'],
  'Consulting': ['consulting', 'advisory', 'professional services', 'strategy', 'mckinsey', 'bcg', 'bain', 'deloitte', 'pwc', 'kpmg', 'accenture'],
  'Research': ['research', 'r&d', 'laboratory', 'institute', 'think tank', 'rand', 'mitre', 'university', 'academic'],
  'Energy': ['energy', 'oil', 'gas', 'petroleum', 'power', 'utility', 'renewable', 'solar', 'wind', 'nuclear'],
  'Manufacturing': ['manufacturing', 'industrial', 'factory', 'production', 'assembly', 'machinery', 'equipment'],
  'Telecommunications': ['telecom', 'communications', 'network', 'wireless', 'mobile', 'broadband', 'satellite'],
  'Retail': ['retail', 'store', 'shop', 'commerce', 'e-commerce', 'consumer', 'brand'],
  'Transportation': ['transport', 'logistics', 'shipping', 'freight', 'airline', 'aviation', 'rail', 'trucking'],
  'Media': ['media', 'entertainment', 'broadcast', 'publishing', 'advertising', 'marketing', 'content']
};

// Priority scoring based on relevance to RLTX
const PRIORITY_KEYWORDS = {
  'Critical': ['simulation', 'wargam', 'scenario', 'modeling', 'synthetic', 'digital twin', 'palantir', 'anduril', 'defense prime', 'intelligence'],
  'High': ['defense', 'government', 'federal', 'military', 'aerospace', 'healthcare analytics', 'financial modeling', 'ai/ml', 'decision'],
  'Medium': ['enterprise', 'consulting', 'research', 'technology', 'analytics', 'platform'],
  'Low': ['retail', 'restaurant', 'local', 'small business']
};

function generateLeadId(company, source) {
  const hash = crypto.createHash('md5').update(`${company.toLowerCase()}-${source}`).digest('hex');
  return `LEAD-${hash.substring(0, 8).toUpperCase()}`;
}

function classifySector(company, industry = '', description = '') {
  const text = `${company} ${industry} ${description}`.toLowerCase();

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return sector;
      }
    }
  }

  return 'Other';
}

function classifyPriority(company, sector, industry = '') {
  const text = `${company} ${sector} ${industry}`.toLowerCase();

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return priority;
      }
    }
  }

  // Default priority based on sector
  if (['Defense', 'Intelligence', 'Government'].includes(sector)) return 'High';
  if (['Healthcare', 'Financial', 'Technology'].includes(sector)) return 'Medium';

  return 'Low';
}

function extractWebsite(url) {
  if (!url) return '';
  // Clean and normalize URL
  let website = url.trim().toLowerCase();
  website = website.replace(/^https?:\/\//, '');
  website = website.replace(/^www\./, '');
  website = website.split('/')[0];
  return website;
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i]);
      if (fields.length > 0) {
        rows.push(fields);
      }
    } catch (e) {
      // Skip malformed lines
    }
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

async function processWikidataFile() {
  const filePath = path.join(RAW_DIR, 'wikidata_companies.json');
  if (!fs.existsSync(filePath)) return [];

  console.log('Processing Wikidata companies...');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  return data.map(c => ({
    id: generateLeadId(c.company, 'wikidata'),
    company: c.company,
    sector: c.sector || classifySector(c.company, c.industry),
    sub_sector: c.industry || null,
    city: null,
    state: null,
    country: c.country || null,
    website: extractWebsite(c.website),
    revenue: null,
    employees: c.employees ? parseInt(c.employees) : null,
    priority: classifyPriority(c.company, c.sector, c.industry),
    use_case: null,
    titles: null,
    source: 'Wikidata'
  }));
}

async function processSECFile() {
  const filePath = path.join(RAW_DIR, 'sec_companies.csv');
  if (!fs.existsSync(filePath)) return [];

  console.log('Processing SEC EDGAR companies...');
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);

  const companyIdx = headers.findIndex(h => h.toLowerCase().includes('company'));
  const tickerIdx = headers.findIndex(h => h.toLowerCase().includes('ticker'));
  const sicIdx = headers.findIndex(h => h.toLowerCase().includes('sicdescription'));

  return rows.map(row => {
    const company = row[companyIdx] || '';
    const industry = row[sicIdx] || '';

    return {
      id: generateLeadId(company, 'sec'),
      company: company,
      sector: classifySector(company, industry),
      sub_sector: industry || null,
      city: null,
      state: null,
      country: 'United States',
      website: null,
      revenue: null,
      employees: null,
      priority: classifyPriority(company, classifySector(company, industry), industry),
      use_case: null,
      titles: null,
      source: 'SEC EDGAR'
    };
  }).filter(l => l.company);
}

async function processUKCompaniesFile() {
  const filePath = path.join(RAW_DIR, 'uk_companies.csv');
  if (!fs.existsSync(filePath)) return [];

  console.log('Processing UK Companies House...');
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);

  const companyIdx = headers.findIndex(h => h.toLowerCase().includes('company'));
  const addressIdx = headers.findIndex(h => h.toLowerCase().includes('address'));
  const postcodeIdx = headers.findIndex(h => h.toLowerCase().includes('postcode'));
  const sicIdx = headers.findIndex(h => h.toLowerCase().includes('sic'));

  return rows.slice(0, 100000).map(row => { // Limit to 100k
    const company = row[companyIdx] || '';
    const sic = row[sicIdx] || '';

    return {
      id: generateLeadId(company, 'ukch'),
      company: company,
      sector: classifySector(company, sic),
      sub_sector: sic || null,
      city: null,
      state: row[postcodeIdx] || null,
      country: 'United Kingdom',
      website: null,
      revenue: null,
      employees: null,
      priority: classifyPriority(company, classifySector(company, sic)),
      use_case: null,
      titles: null,
      source: 'UK Companies House'
    };
  }).filter(l => l.company);
}

async function processUSASpendingFile() {
  const filePath = path.join(RAW_DIR, 'usaspending_contractors.csv');
  if (!fs.existsSync(filePath)) return [];

  console.log('Processing USASpending contractors...');
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);

  const companyIdx = headers.findIndex(h => h.toLowerCase().includes('company'));
  const stateIdx = headers.findIndex(h => h.toLowerCase().includes('state'));
  const naicsIdx = headers.findIndex(h => h.toLowerCase().includes('naics'));

  return rows.map(row => {
    const company = row[companyIdx] || '';
    const naics = row[naicsIdx] || '';

    return {
      id: generateLeadId(company, 'usaspending'),
      company: company,
      sector: 'Government', // Federal contractors
      sub_sector: naics || 'Federal Contractor',
      city: null,
      state: row[stateIdx] || null,
      country: 'United States',
      website: null,
      revenue: null,
      employees: null,
      priority: 'High', // Federal contractors are high priority
      use_case: 'Federal contracting',
      titles: null,
      source: 'USASpending.gov'
    };
  }).filter(l => l.company);
}

async function processGitHubFile() {
  const filePath = path.join(RAW_DIR, 'github_companies.csv');
  if (!fs.existsSync(filePath)) return [];

  console.log('Processing GitHub datasets...');
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);

  const companyIdx = headers.findIndex(h => h.toLowerCase().includes('company'));
  const websiteIdx = headers.findIndex(h => h.toLowerCase().includes('website'));
  const industryIdx = headers.findIndex(h => h.toLowerCase().includes('industry'));
  const locationIdx = headers.findIndex(h => h.toLowerCase().includes('location'));

  return rows.map(row => {
    const company = row[companyIdx] || '';
    const industry = row[industryIdx] || '';

    return {
      id: generateLeadId(company, 'github'),
      company: company,
      sector: classifySector(company, industry),
      sub_sector: industry || null,
      city: row[locationIdx] || null,
      state: null,
      country: null,
      website: extractWebsite(row[websiteIdx]),
      revenue: null,
      employees: null,
      priority: classifyPriority(company, classifySector(company, industry), industry),
      use_case: null,
      titles: null,
      source: 'GitHub Datasets'
    };
  }).filter(l => l.company);
}

async function main() {
  console.log('='.repeat(60));
  console.log('LEAD TRANSFORMER - Unified Data Processing');
  console.log('='.repeat(60));

  fs.mkdirSync(PROCESSED_DIR, { recursive: true });

  const allLeads = [];

  // Process each source
  const wikidataLeads = await processWikidataFile();
  console.log(`  Wikidata: ${wikidataLeads.length} leads`);
  allLeads.push(...wikidataLeads);

  const secLeads = await processSECFile();
  console.log(`  SEC EDGAR: ${secLeads.length} leads`);
  allLeads.push(...secLeads);

  const ukLeads = await processUKCompaniesFile();
  console.log(`  UK Companies: ${ukLeads.length} leads`);
  allLeads.push(...ukLeads);

  const usaLeads = await processUSASpendingFile();
  console.log(`  USASpending: ${usaLeads.length} leads`);
  allLeads.push(...usaLeads);

  const githubLeads = await processGitHubFile();
  console.log(`  GitHub: ${githubLeads.length} leads`);
  allLeads.push(...githubLeads);

  console.log(`\nTotal raw leads: ${allLeads.length}`);

  // Deduplicate by company name
  console.log('\nDeduplicating...');
  const seen = new Map();

  for (const lead of allLeads) {
    const key = lead.company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/(inc|llc|ltd|corp|corporation|company|co|plc|limited)$/g, '')
      .trim();

    if (key.length < 2) continue;

    if (!seen.has(key)) {
      seen.set(key, lead);
    } else {
      // Merge: prefer lead with more data
      const existing = seen.get(key);
      if (lead.website && !existing.website) existing.website = lead.website;
      if (lead.employees && !existing.employees) existing.employees = lead.employees;
      if (lead.revenue && !existing.revenue) existing.revenue = lead.revenue;
      if (lead.city && !existing.city) existing.city = lead.city;
      if (lead.state && !existing.state) existing.state = lead.state;
      if (lead.country && !existing.country) existing.country = lead.country;
      // Keep higher priority
      const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
      if (priorityOrder.indexOf(lead.priority) < priorityOrder.indexOf(existing.priority)) {
        existing.priority = lead.priority;
      }
    }
  }

  const uniqueLeads = Array.from(seen.values());
  console.log(`Unique leads: ${uniqueLeads.length}`);

  // Sort by priority
  const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
  uniqueLeads.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  // Generate stats
  const stats = {
    total: uniqueLeads.length,
    bySector: {},
    byPriority: {},
    bySource: {},
    byCountry: {}
  };

  for (const lead of uniqueLeads) {
    stats.bySector[lead.sector] = (stats.bySector[lead.sector] || 0) + 1;
    stats.byPriority[lead.priority] = (stats.byPriority[lead.priority] || 0) + 1;
    stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
    if (lead.country) {
      stats.byCountry[lead.country] = (stats.byCountry[lead.country] || 0) + 1;
    }
  }

  console.log('\n--- STATS ---');
  console.log('By Priority:');
  Object.entries(stats.byPriority).sort((a, b) => priorityOrder[a[0]] - priorityOrder[b[0]]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()}`);
  });

  console.log('\nBy Sector (top 10):');
  Object.entries(stats.bySector).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()}`);
  });

  console.log('\nBy Source:');
  Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()}`);
  });

  // Save as JSON
  const jsonPath = path.join(PROCESSED_DIR, 'all_leads.json');
  fs.writeFileSync(jsonPath, JSON.stringify(uniqueLeads, null, 2));
  console.log(`\nSaved JSON: ${jsonPath}`);

  // Save as CSV
  const csvPath = path.join(PROCESSED_DIR, 'all_leads.csv');
  const csvHeaders = 'id,company,sector,sub_sector,city,state,country,website,revenue,employees,priority,use_case,titles,source';
  const csvRows = uniqueLeads.map(l =>
    `"${l.id}","${(l.company || '').replace(/"/g, '""')}","${l.sector}","${(l.sub_sector || '').replace(/"/g, '""')}","${l.city || ''}","${l.state || ''}","${l.country || ''}","${l.website || ''}","${l.revenue || ''}","${l.employees || ''}","${l.priority}","${(l.use_case || '').replace(/"/g, '""')}","${(l.titles || '').replace(/"/g, '""')}","${l.source}"`
  );

  fs.writeFileSync(csvPath, [csvHeaders, ...csvRows].join('\n'));
  console.log(`Saved CSV: ${csvPath}`);

  // Save stats
  const statsPath = path.join(PROCESSED_DIR, 'stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`Saved stats: ${statsPath}`);

  console.log('\n' + '='.repeat(60));
  console.log(`TRANSFORMATION COMPLETE: ${uniqueLeads.length.toLocaleString()} leads`);
  console.log('='.repeat(60));

  return uniqueLeads;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
