#!/usr/bin/env node
/**
 * UK Companies House Downloader
 * Downloads 5M+ UK company records
 * Free bulk data from gov.uk
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DOWNLOADS_DIR, RAW_DIR } = require('./config');

// Companies House updates monthly - find latest file
const BASE_URL = 'http://download.companieshouse.gov.uk/';

async function getLatestFile() {
  return new Promise((resolve, reject) => {
    console.log('Finding latest Companies House data file...');

    http.get(BASE_URL + 'en_output.html', (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        // Find BasicCompanyDataAsOneFile link
        const match = html.match(/BasicCompanyDataAsOneFile-\d{4}-\d{2}-\d{2}\.zip/);
        if (match) {
          console.log(`Found: ${match[0]}`);
          resolve(match[0]);
        } else {
          // Fallback to a recent date
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          resolve(`BasicCompanyDataAsOneFile-${year}-${month}-01.zip`);
        }
      });
    }).on('error', reject);
  });
}

async function downloadFile(filename) {
  const url = BASE_URL + filename;
  const outputPath = path.join(DOWNLOADS_DIR, 'uk_companies.zip');

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 100000000) { // > 100MB means it's valid
      console.log('UK Companies data already downloaded');
      return outputPath;
    }
  }

  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log('This is a large file (~500MB), please wait...');

    const file = fs.createWriteStream(outputPath);
    let downloadedBytes = 0;

    http.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'], 10) || 0;

      response.on('data', chunk => {
        downloadedBytes += chunk.length;
        const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : 'N/A';
        process.stdout.write(`\r  Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB (${percent}%)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n  Download complete');
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function extractAndProcess(zipPath) {
  const extractDir = path.join(DOWNLOADS_DIR, 'uk_companies_extract');
  const outputPath = path.join(RAW_DIR, 'uk_companies.csv');

  console.log('\nExtracting ZIP file...');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`, {
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024
    });
  } catch (e) {
    console.log('Extraction warning:', e.message);
  }

  // Find the CSV file
  const files = fs.readdirSync(extractDir);
  const csvFile = files.find(f => f.endsWith('.csv'));

  if (!csvFile) {
    console.log('No CSV file found in archive');
    return null;
  }

  const csvPath = path.join(extractDir, csvFile);
  console.log(`Found CSV: ${csvFile}`);

  // Process and filter the CSV
  console.log('Processing companies (filtering for active, quality leads)...');

  const readline = require('readline');
  const input = fs.createReadStream(csvPath);
  const output = fs.createWriteStream(outputPath);

  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let lineCount = 0;
  let validCount = 0;
  let headers = null;

  // Write our standardized header
  output.write('company,company_number,status,type,country,address,postcode,sic_codes,website,source\n');

  for await (const line of rl) {
    if (lineCount === 0) {
      // Parse headers
      headers = line.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      lineCount++;
      continue;
    }

    lineCount++;

    if (lineCount % 500000 === 0) {
      console.log(`  Processed ${lineCount} records, valid: ${validCount}...`);
    }

    try {
      // Parse line (handle quoted fields)
      const fields = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());

      // Map to indices
      const nameIdx = headers.findIndex(h => h.includes('companyname'));
      const numberIdx = headers.findIndex(h => h.includes('companynumber'));
      const statusIdx = headers.findIndex(h => h.includes('companystatus'));
      const typeIdx = headers.findIndex(h => h.includes('companytype') || h.includes('category'));
      const addressIdx = headers.findIndex(h => h.includes('regaddress'));
      const postcodeIdx = headers.findIndex(h => h.includes('postcode'));
      const sicIdx = headers.findIndex(h => h.includes('siccode'));
      const countryIdx = headers.findIndex(h => h.includes('countryoforigin'));
      const uriIdx = headers.findIndex(h => h.includes('uri'));

      const name = nameIdx >= 0 ? fields[nameIdx] : '';
      const status = statusIdx >= 0 ? fields[statusIdx] : '';

      // Filter: Only active companies with names
      if (!name || name.length < 2) continue;
      if (status && !status.toLowerCase().includes('active')) continue;

      validCount++;

      // Extract fields
      const companyNumber = numberIdx >= 0 ? fields[numberIdx] : '';
      const companyType = typeIdx >= 0 ? fields[typeIdx] : '';
      const address = addressIdx >= 0 ? fields[addressIdx] : '';
      const postcode = postcodeIdx >= 0 ? fields[postcodeIdx] : '';
      const sicCodes = sicIdx >= 0 ? fields[sicIdx] : '';
      const country = countryIdx >= 0 ? fields[countryIdx] : 'United Kingdom';
      const uri = uriIdx >= 0 ? fields[uriIdx] : '';

      // Format website from URI or company number
      const website = uri || (companyNumber ? `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}` : '');

      output.write(`"${name.replace(/"/g, '""')}","${companyNumber}","${status}","${companyType}","${country}","${address.replace(/"/g, '""')}","${postcode}","${sicCodes}","${website}","UK Companies House"\n`);

      // Limit to reasonable number for processing
      if (validCount >= 500000) {
        console.log('  Reached 500k active companies limit');
        break;
      }

    } catch (e) {
      // Skip malformed lines
    }
  }

  output.end();
  console.log(`\nTotal processed: ${lineCount}`);
  console.log(`Valid active companies: ${validCount}`);
  console.log(`Saved: ${outputPath}`);

  // Cleanup
  try {
    execSync(`rm -rf "${extractDir}"`, { stdio: 'pipe' });
  } catch (e) {}

  return outputPath;
}

async function main() {
  console.log('='.repeat(60));
  console.log('UK COMPANIES HOUSE - Bulk Data Downloader');
  console.log('5M+ UK Companies');
  console.log('='.repeat(60));

  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  try {
    const filename = await getLatestFile();
    const zipPath = await downloadFile(filename);
    await extractAndProcess(zipPath);

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);

    // Try alternate approach - use a known recent file
    console.log('\nTrying alternate file...');
    try {
      const zipPath = await downloadFile('BasicCompanyDataAsOneFile-2024-12-01.zip');
      await extractAndProcess(zipPath);
    } catch (e2) {
      console.error('Alternate also failed:', e2.message);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
