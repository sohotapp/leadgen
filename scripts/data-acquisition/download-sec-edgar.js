#!/usr/bin/env node
/**
 * SEC EDGAR Public Companies Downloader
 * Downloads all US public company data
 * 10K+ public companies
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DOWNLOADS_DIR, RAW_DIR } = require('./config');

const SUBMISSIONS_URL = 'https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip';
const CIK_LOOKUP_URL = 'https://www.sec.gov/files/company_tickers.json';

// Rate limit: 10 requests per second max
const REQUEST_DELAY = 150;

async function downloadWithUserAgent(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);

    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;

    const options = new URL(url);
    options.headers = {
      'User-Agent': 'RLTX LeadEngine/1.0 (lead-engine@rltx.ai)',
      'Accept-Encoding': 'gzip, deflate'
    };

    https.get(url, {
      headers: {
        'User-Agent': 'RLTX LeadEngine/1.0 (lead-engine@rltx.ai)'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadWithUserAgent(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.on('data', chunk => {
        downloadedBytes += chunk.length;
        process.stdout.write(`\r  Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(' - Complete');
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadCompanyTickers() {
  const outputPath = path.join(RAW_DIR, 'sec_company_tickers.json');

  if (fs.existsSync(outputPath)) {
    console.log('Company tickers already downloaded');
    return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }

  return new Promise((resolve, reject) => {
    console.log('Downloading SEC company tickers...');

    https.get(CIK_LOOKUP_URL, {
      headers: { 'User-Agent': 'RLTX LeadEngine/1.0 (lead-engine@rltx.ai)' }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
          console.log(`Downloaded ${Object.keys(json).length} company tickers`);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function downloadSubmissions() {
  const zipPath = path.join(DOWNLOADS_DIR, 'sec_submissions.zip');
  const extractDir = path.join(DOWNLOADS_DIR, 'sec_submissions');

  if (fs.existsSync(extractDir) && fs.readdirSync(extractDir).length > 0) {
    console.log('Submissions already extracted');
    return extractDir;
  }

  if (!fs.existsSync(zipPath)) {
    await downloadWithUserAgent(SUBMISSIONS_URL, zipPath);
  }

  console.log('Extracting submissions...');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`, { stdio: 'pipe' });
    console.log('Extraction complete');
  } catch (e) {
    console.log('Extraction error:', e.message);
  }

  return extractDir;
}

async function processSubmissions(submissionsDir) {
  console.log('\nProcessing SEC submissions...');

  const companies = [];
  const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} submission files`);

  let processed = 0;
  for (const file of files.slice(0, 15000)) { // Process up to 15k
    try {
      const content = fs.readFileSync(path.join(submissionsDir, file), 'utf8');
      const data = JSON.parse(content);

      if (data.name) {
        companies.push({
          company: data.name,
          cik: data.cik,
          ticker: data.tickers?.[0] || '',
          sic: data.sic || '',
          sicDescription: data.sicDescription || '',
          state: data.stateOfIncorporation || '',
          fiscalYearEnd: data.fiscalYearEnd || '',
          website: data.website || '',
          phone: data.phone || '',
          category: data.category || '',
          source: 'SEC EDGAR'
        });
      }

      processed++;
      if (processed % 1000 === 0) {
        console.log(`  Processed ${processed}/${files.length}...`);
      }
    } catch (e) {
      // Skip invalid files
    }
  }

  return companies;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SEC EDGAR - Public Companies Downloader');
  console.log('All US Public Companies');
  console.log('='.repeat(60));

  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  // Download company tickers (quick list)
  const tickers = await downloadCompanyTickers();

  // Transform tickers to companies
  const tickerCompanies = Object.values(tickers).map(t => ({
    company: t.title,
    cik: t.cik_str,
    ticker: t.ticker,
    source: 'SEC EDGAR'
  }));

  console.log(`\nTotal companies from tickers: ${tickerCompanies.length}`);

  // Save ticker companies
  const csvPath = path.join(RAW_DIR, 'sec_companies.csv');
  const csvContent = [
    'company,cik,ticker,sic,sicDescription,state,website,source',
    ...tickerCompanies.map(c =>
      `"${(c.company || '').replace(/"/g, '""')}","${c.cik || ''}","${c.ticker || ''}","","","","","${c.source}"`
    )
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent);
  console.log(`Saved: ${csvPath}`);

  // Optionally download full submissions (large file ~5GB)
  console.log('\nNote: Full submissions download is ~5GB. Skipping for speed.');
  console.log('Run with --full flag to download complete submission data.');

  if (process.argv.includes('--full')) {
    const submissionsDir = await downloadSubmissions();
    const fullCompanies = await processSubmissions(submissionsDir);

    const fullCsvPath = path.join(RAW_DIR, 'sec_companies_full.csv');
    const fullContent = [
      'company,cik,ticker,sic,sicDescription,state,website,source',
      ...fullCompanies.map(c =>
        `"${(c.company || '').replace(/"/g, '""')}","${c.cik || ''}","${c.ticker || ''}","${c.sic || ''}","${(c.sicDescription || '').replace(/"/g, '""')}","${c.state || ''}","${c.website || ''}","${c.source}"`
      )
    ].join('\n');

    fs.writeFileSync(fullCsvPath, fullContent);
    console.log(`Saved full data: ${fullCsvPath}`);
  }

  console.log('\nDone!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
