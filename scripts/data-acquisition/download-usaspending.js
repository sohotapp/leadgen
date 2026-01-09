#!/usr/bin/env node
/**
 * USASpending.gov Federal Contracts Downloader
 * Downloads federal contractor data - defense, gov, civilian agencies
 * 50M+ contract records
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DOWNLOADS_DIR, RAW_DIR } = require('./config');

// Defense/Gov focused agencies
const AGENCIES = [
  { code: '097', name: 'Department of Defense' },
  { code: '021', name: 'Department of the Army' },
  { code: '017', name: 'Department of the Navy' },
  { code: '057', name: 'Department of the Air Force' },
  { code: '070', name: 'Department of Homeland Security' },
  { code: '089', name: 'Department of Energy' },
  { code: '075', name: 'Department of Health and Human Services' },
  { code: '012', name: 'Department of Agriculture' },
  { code: '069', name: 'Department of Transportation' },
  { code: '028', name: 'Department of Justice' },
  { code: '049', name: 'National Science Foundation' },
  { code: '080', name: 'NASA' },
  { code: '047', name: 'General Services Administration' }
];

const FISCAL_YEARS = ['2024', '2023', '2022'];

async function downloadUSASpendingArchive(agency, fiscalYear) {
  const url = `https://files.usaspending.gov/award_data_archive/FY${fiscalYear}_All_Contracts_Full_${agency.code}.zip`;
  const outputPath = path.join(DOWNLOADS_DIR, `usaspending_${agency.code}_FY${fiscalYear}.zip`);

  if (fs.existsSync(outputPath)) {
    console.log(`  Already exists: ${path.basename(outputPath)}`);
    return outputPath;
  }

  return new Promise((resolve, reject) => {
    console.log(`  Downloading: ${agency.name} FY${fiscalYear}...`);

    const file = fs.createWriteStream(outputPath);
    let downloadedBytes = 0;

    https.get(url, (response) => {
      if (response.statusCode === 404) {
        console.log(`  Not found: ${url}`);
        file.close();
        fs.unlinkSync(outputPath);
        resolve(null);
        return;
      }

      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(outputPath);
        // Follow redirect
        https.get(response.headers.location, (res2) => {
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`  Downloaded: ${path.basename(outputPath)}`);
            resolve(outputPath);
          });
        });
        return;
      }

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`  Downloaded: ${path.basename(outputPath)} (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      console.log(`  Error: ${err.message}`);
      resolve(null);
    });
  });
}

async function downloadContractorList() {
  // Alternative: Download pre-compiled contractor summary
  const url = 'https://www.usaspending.gov/data/cj_list.csv';
  const outputPath = path.join(DOWNLOADS_DIR, 'usaspending_contractors_summary.csv');

  if (fs.existsSync(outputPath)) {
    console.log(`Contractor summary already exists`);
    return outputPath;
  }

  return new Promise((resolve, reject) => {
    console.log('Downloading contractor summary list...');
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        resolve(null);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded contractor summary`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      resolve(null);
    });
  });
}

async function fetchTopContractors() {
  // Use the USASpending API to get top contractors
  const apiUrl = 'https://api.usaspending.gov/api/v2/recipient/';

  console.log('\nFetching top contractors via API...');

  const outputPath = path.join(RAW_DIR, 'usaspending_top_contractors.json');

  // Fetch top contractors by award amount
  const payload = JSON.stringify({
    order: 'desc',
    sort: 'amount',
    limit: 10000,
    page: 1
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.usaspending.gov',
      path: '/api/v2/recipient/state/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          fs.writeFileSync(outputPath, data);
          console.log(`Saved top contractors data`);
          resolve(outputPath);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function extractUniqueContractors(zipFiles) {
  console.log('\nExtracting unique contractors from downloaded files...');

  const contractors = new Map();
  const outputPath = path.join(RAW_DIR, 'usaspending_contractors.csv');

  for (const zipFile of zipFiles) {
    if (!zipFile || !fs.existsSync(zipFile)) continue;

    try {
      // Extract zip
      const extractDir = path.join(DOWNLOADS_DIR, 'temp_extract');
      fs.mkdirSync(extractDir, { recursive: true });

      console.log(`  Extracting: ${path.basename(zipFile)}...`);
      execSync(`unzip -o -q "${zipFile}" -d "${extractDir}" 2>/dev/null || true`, { stdio: 'pipe' });

      // Find CSV files
      const csvFiles = fs.readdirSync(extractDir).filter(f => f.endsWith('.csv'));

      for (const csvFile of csvFiles) {
        const csvPath = path.join(extractDir, csvFile);
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n');

        if (lines.length < 2) continue;

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
        const vendorNameIdx = headers.findIndex(h => h.includes('vendor') || h.includes('recipient_name') || h.includes('awardee'));
        const dunsIdx = headers.findIndex(h => h.includes('duns') || h.includes('uei'));
        const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('location'));
        const stateIdx = headers.findIndex(h => h.includes('state') && !h.includes('country'));
        const amountIdx = headers.findIndex(h => h.includes('obligat') || h.includes('amount') || h.includes('award'));
        const naicsIdx = headers.findIndex(h => h.includes('naics'));

        for (let i = 1; i < Math.min(lines.length, 100000); i++) {
          const fields = lines[i].split(',').map(f => f.replace(/"/g, '').trim());
          const vendorName = vendorNameIdx >= 0 ? fields[vendorNameIdx] : '';
          const duns = dunsIdx >= 0 ? fields[dunsIdx] : '';

          if (vendorName && vendorName.length > 2) {
            const key = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!contractors.has(key)) {
              contractors.set(key, {
                company: vendorName,
                duns: duns,
                state: stateIdx >= 0 ? fields[stateIdx] : '',
                naics: naicsIdx >= 0 ? fields[naicsIdx] : '',
                source: 'USASpending'
              });
            }
          }
        }
      }

      // Cleanup
      execSync(`rm -rf "${extractDir}"`, { stdio: 'pipe' });

    } catch (error) {
      console.log(`  Error processing ${zipFile}: ${error.message}`);
    }
  }

  // Write unique contractors
  console.log(`\nFound ${contractors.size} unique contractors`);

  const output = fs.createWriteStream(outputPath);
  output.write('company,duns,state,naics,source\n');

  for (const contractor of contractors.values()) {
    output.write(`"${contractor.company}","${contractor.duns}","${contractor.state}","${contractor.naics}","${contractor.source}"\n`);
  }

  output.end();
  console.log(`Saved to: ${outputPath}`);

  return outputPath;
}

async function main() {
  console.log('='.repeat(60));
  console.log('USASPENDING.GOV - Federal Contractors Downloader');
  console.log('Defense, Gov, Civilian Agencies');
  console.log('='.repeat(60));

  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  // Download contractor summary
  await downloadContractorList();

  // Fetch via API
  await fetchTopContractors();

  // Download archives for key agencies
  const downloadedFiles = [];

  console.log('\nDownloading agency contract archives...');
  for (const agency of AGENCIES.slice(0, 5)) { // Top 5 agencies
    for (const fy of FISCAL_YEARS.slice(0, 1)) { // Latest FY only for speed
      const file = await downloadUSASpendingArchive(agency, fy);
      if (file) downloadedFiles.push(file);
    }
  }

  // Extract unique contractors
  if (downloadedFiles.length > 0) {
    await extractUniqueContractors(downloadedFiles);
  }

  console.log('\nDone!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
