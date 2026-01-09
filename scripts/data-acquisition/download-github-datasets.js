#!/usr/bin/env node
/**
 * GitHub Open Datasets Downloader
 * Downloads various company datasets from GitHub
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { DOWNLOADS_DIR, RAW_DIR } = require('./config');

const DATASETS = [
  {
    name: 'OpenData500 US Companies',
    url: 'https://raw.githubusercontent.com/GovLab/OpenData500/master/static/files/us/us_companies.csv',
    output: 'opendata500_us.csv'
  },
  {
    name: 'Fortune 500',
    url: 'https://raw.githubusercontent.com/cmusam/fortune500/master/csv/fortune500-2020.csv',
    output: 'fortune500.csv'
  },
  {
    name: 'Fortune 500 (Alt)',
    url: 'https://raw.githubusercontent.com/datasets/fortune500/master/data/fortune500.csv',
    output: 'fortune500_alt.csv'
  },
  {
    name: 'YC Companies',
    url: 'https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/data/y-combinator-companies.csv',
    output: 'yc_companies.csv'
  },
  {
    name: 'Tech Companies Bay Area',
    url: 'https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/data/companies-in-the-bay-area.csv',
    output: 'tech_companies_bay.csv'
  },
  {
    name: 'Unicorn Companies',
    url: 'https://raw.githubusercontent.com/lifeparticle/Unicorn-Companies/main/data/Unicorn_Companies.csv',
    output: 'unicorn_companies.csv'
  },
  {
    name: 'SaaS Companies',
    url: 'https://raw.githubusercontent.com/josephmisiti/awesome-saas-services/main/data/services.json',
    output: 'saas_services.json'
  },
  {
    name: 'AI Companies',
    url: 'https://raw.githubusercontent.com/jbhuang0604/awesome-computer-vision/master/README.md',
    output: 'ai_companies.md'
  }
];

async function downloadDataset(dataset) {
  const outputPath = path.join(DOWNLOADS_DIR, dataset.output);

  if (fs.existsSync(outputPath)) {
    console.log(`  Already exists: ${dataset.name}`);
    return outputPath;
  }

  return new Promise((resolve) => {
    console.log(`  Downloading: ${dataset.name}...`);

    https.get(dataset.url, {
      headers: { 'User-Agent': 'RLTX LeadEngine/1.0' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, {
          headers: { 'User-Agent': 'RLTX LeadEngine/1.0' }
        }, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            fs.writeFileSync(outputPath, data);
            console.log(`  Saved: ${dataset.output}`);
            resolve(outputPath);
          });
        }).on('error', () => resolve(null));
        return;
      }

      if (response.statusCode !== 200) {
        console.log(`  Failed: ${response.statusCode}`);
        resolve(null);
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        fs.writeFileSync(outputPath, data);
        console.log(`  Saved: ${dataset.output} (${(data.length / 1024).toFixed(1)} KB)`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      console.log(`  Error: ${err.message}`);
      resolve(null);
    });
  });
}

async function processDownloadedFiles() {
  console.log('\nProcessing downloaded files...');

  const allCompanies = [];

  // Process CSV files
  const csvFiles = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.csv'));

  for (const file of csvFiles) {
    const filePath = path.join(DOWNLOADS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      if (lines.length < 2) continue;

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').toLowerCase().trim());

      // Find company name column
      const nameIdx = headers.findIndex(h =>
        h.includes('company') || h.includes('name') || h.includes('title') || h === 'organization'
      );
      const websiteIdx = headers.findIndex(h => h.includes('website') || h.includes('url') || h.includes('domain'));
      const industryIdx = headers.findIndex(h => h.includes('industry') || h.includes('sector') || h.includes('category'));
      const locationIdx = headers.findIndex(h => h.includes('location') || h.includes('city') || h.includes('hq'));

      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split(',').map(f => f.replace(/"/g, '').trim());
        const name = nameIdx >= 0 ? fields[nameIdx] : '';

        if (name && name.length > 1) {
          allCompanies.push({
            company: name,
            website: websiteIdx >= 0 ? fields[websiteIdx] : '',
            industry: industryIdx >= 0 ? fields[industryIdx] : '',
            location: locationIdx >= 0 ? fields[locationIdx] : '',
            source: `GitHub: ${file}`
          });
        }
      }

      console.log(`  Processed ${file}: ${lines.length - 1} records`);
    } catch (e) {
      console.log(`  Error processing ${file}: ${e.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = allCompanies.filter(c => {
    const key = c.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal unique companies from GitHub: ${unique.length}`);

  // Save consolidated file
  const outputPath = path.join(RAW_DIR, 'github_companies.csv');
  const csvContent = [
    'company,website,industry,location,source',
    ...unique.map(c =>
      `"${c.company.replace(/"/g, '""')}","${c.website}","${c.industry}","${c.location}","${c.source}"`
    )
  ].join('\n');

  fs.writeFileSync(outputPath, csvContent);
  console.log(`Saved: ${outputPath}`);

  return unique;
}

async function main() {
  console.log('='.repeat(60));
  console.log('GITHUB DATASETS - Open Source Company Data');
  console.log('Fortune 500, YC, Unicorns, OpenData500, etc.');
  console.log('='.repeat(60));

  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  console.log('\nDownloading datasets...');

  for (const dataset of DATASETS) {
    await downloadDataset(dataset);
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  await processDownloadedFiles();

  console.log('\nDone!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
