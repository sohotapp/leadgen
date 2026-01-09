#!/usr/bin/env node
/**
 * Wikidata SPARQL Company Data Downloader
 * Fetches companies from Wikidata's structured database
 * 500K+ companies with rich metadata
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { RAW_DIR } = require('./config');

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

// SPARQL queries for different company types
const QUERIES = {
  // All business enterprises with key data
  allCompanies: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?industryLabel ?founded ?employees ?revenue ?website ?headquarters
    WHERE {
      ?company wdt:P31/wdt:P279* wd:Q4830453.  # Instance of business enterprise

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P452 ?industry. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P2139 ?revenue. }
      OPTIONAL { ?company wdt:P856 ?website. }
      OPTIONAL { ?company wdt:P159 ?headquarters. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 50000
    OFFSET {OFFSET}
  `,

  // Defense contractors specifically
  defenseCompanies: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?founded ?employees ?website
    WHERE {
      { ?company wdt:P31 wd:Q1762059. }  # Defense contractor
      UNION
      { ?company wdt:P452 wd:Q728937. }  # Aerospace industry
      UNION
      { ?company wdt:P452 wd:Q54262518. } # Defense industry
      UNION
      { ?company wdt:P452 wd:Q192776. }  # Arms industry

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 10000
  `,

  // Technology companies
  techCompanies: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?industryLabel ?founded ?employees ?website
    WHERE {
      { ?company wdt:P452 wd:Q11661. }   # Information technology
      UNION
      { ?company wdt:P452 wd:Q80228. }   # Software industry
      UNION
      { ?company wdt:P452 wd:Q7397. }    # Software
      UNION
      { ?company wdt:P31 wd:Q2083958. }  # Software company

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P452 ?industry. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 50000
  `,

  // Healthcare/Pharma companies
  healthcareCompanies: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?founded ?employees ?website
    WHERE {
      { ?company wdt:P452 wd:Q507443. }   # Pharmaceutical industry
      UNION
      { ?company wdt:P452 wd:Q171047. }   # Health care
      UNION
      { ?company wdt:P31 wd:Q4830453; wdt:P452 wd:Q11190. }  # Medical

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 20000
  `,

  // Financial services
  financialCompanies: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?founded ?employees ?website
    WHERE {
      { ?company wdt:P452 wd:Q837171. }   # Financial services
      UNION
      { ?company wdt:P31 wd:Q22687. }     # Bank
      UNION
      { ?company wdt:P452 wd:Q43015. }    # Finance
      UNION
      { ?company wdt:P31 wd:Q1345573. }   # Investment bank

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 20000
  `,

  // Consulting firms
  consultingCompanies: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?founded ?employees ?website
    WHERE {
      { ?company wdt:P31 wd:Q783794. }    # Consulting company
      UNION
      { ?company wdt:P452 wd:Q268592. }   # Management consulting

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 10000
  `,

  // Government agencies (for context)
  governmentAgencies: `
    SELECT DISTINCT ?agency ?agencyLabel ?countryLabel ?website
    WHERE {
      { ?agency wdt:P31 wd:Q327333. }     # Government agency
      UNION
      { ?agency wdt:P31 wd:Q2659904. }    # Government organization

      ?agency wdt:P17 ?country.
      FILTER (?country IN (wd:Q30, wd:Q145, wd:Q16, wd:Q142, wd:Q183))  # US, UK, Canada, France, Germany

      OPTIONAL { ?agency wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 5000
  `,

  // Unicorn startups
  unicornStartups: `
    SELECT DISTINCT ?company ?companyLabel ?countryLabel ?industryLabel ?founded ?website
    WHERE {
      ?company wdt:P31 wd:Q66763547.  # Unicorn startup

      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P452 ?industry. }
      OPTIONAL { ?company wdt:P571 ?founded. }
      OPTIONAL { ?company wdt:P856 ?website. }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 5000
  `
};

async function executeQuery(query, name) {
  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${WIKIDATA_ENDPOINT}?query=${encodedQuery}&format=json`;

    console.log(`  Executing: ${name}...`);

    const options = {
      hostname: 'query.wikidata.org',
      path: `/sparql?query=${encodedQuery}&format=json`,
      method: 'GET',
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'RLTX-LeadEngine/1.0 (https://rltx.ai)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const results = json.results?.bindings || [];
          console.log(`  Found: ${results.length} records`);
          resolve(results);
        } catch (e) {
          console.log(`  Parse error: ${e.message}`);
          resolve([]);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`  Error: ${err.message}`);
      resolve([]);
    });

    req.setTimeout(120000, () => {
      req.destroy();
      console.log(`  Timeout`);
      resolve([]);
    });

    req.end();
  });
}

function transformWikidataResults(results, sector) {
  return results.map(r => ({
    company: r.companyLabel?.value || r.agencyLabel?.value || '',
    wikidata_id: r.company?.value?.split('/').pop() || r.agency?.value?.split('/').pop() || '',
    country: r.countryLabel?.value || '',
    industry: r.industryLabel?.value || '',
    sector: sector,
    founded: r.founded?.value?.split('T')[0] || '',
    employees: r.employees?.value || '',
    revenue: r.revenue?.value || '',
    website: r.website?.value || '',
    source: 'Wikidata'
  })).filter(c => c.company && c.company.length > 1);
}

async function main() {
  console.log('='.repeat(60));
  console.log('WIKIDATA - SPARQL Company Data Downloader');
  console.log('Structured data from Wikipedia');
  console.log('='.repeat(60));

  fs.mkdirSync(RAW_DIR, { recursive: true });

  const allCompanies = [];

  // Execute each query
  for (const [queryName, query] of Object.entries(QUERIES)) {
    console.log(`\nQuery: ${queryName}`);

    // For allCompanies query, paginate
    if (queryName === 'allCompanies') {
      for (let offset = 0; offset < 200000; offset += 50000) {
        const paginatedQuery = query.replace('{OFFSET}', offset.toString());
        const results = await executeQuery(paginatedQuery, `${queryName} (offset ${offset})`);
        const transformed = transformWikidataResults(results, 'General');
        allCompanies.push(...transformed);

        if (results.length < 50000) break;

        // Rate limit
        await new Promise(r => setTimeout(r, 2000));
      }
    } else {
      const sectorMap = {
        defenseCompanies: 'Defense',
        techCompanies: 'Technology',
        healthcareCompanies: 'Healthcare',
        financialCompanies: 'Financial',
        consultingCompanies: 'Consulting',
        governmentAgencies: 'Government',
        unicornStartups: 'Startup'
      };

      const results = await executeQuery(query, queryName);
      const transformed = transformWikidataResults(results, sectorMap[queryName] || 'Other');
      allCompanies.push(...transformed);

      // Rate limit
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Deduplicate by company name
  const seen = new Set();
  const unique = allCompanies.filter(c => {
    const key = c.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total unique companies: ${unique.length}`);

  // Save as JSON
  const jsonPath = path.join(RAW_DIR, 'wikidata_companies.json');
  fs.writeFileSync(jsonPath, JSON.stringify(unique, null, 2));
  console.log(`Saved JSON: ${jsonPath}`);

  // Save as CSV
  const csvPath = path.join(RAW_DIR, 'wikidata_companies.csv');
  const csvContent = [
    'company,wikidata_id,country,industry,sector,founded,employees,revenue,website,source',
    ...unique.map(c =>
      `"${c.company.replace(/"/g, '""')}","${c.wikidata_id}","${c.country}","${c.industry}","${c.sector}","${c.founded}","${c.employees}","${c.revenue}","${c.website}","${c.source}"`
    )
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent);
  console.log(`Saved CSV: ${csvPath}`);

  console.log('\nDone!');
  return unique;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, executeQuery };
