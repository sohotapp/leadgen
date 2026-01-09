#!/usr/bin/env node
/**
 * People Data Labs Free Company Dataset Downloader
 * Downloads 22M+ companies from PDL's free dataset
 * License: CC BY 4.0
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGunzip } = require('zlib');
const { DOWNLOADS_DIR, RAW_DIR, SOURCES } = require('./config');

const DOWNLOAD_URL = 'https://pdl-public-bucket.s3.amazonaws.com/free-company-dataset/free_company_dataset.csv';
const OUTPUT_FILE = path.join(DOWNLOADS_DIR, 'people_data_labs.csv');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${dest}`);

    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;
    let totalBytes = 0;

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`Redirecting to: ${response.headers.location}`);
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      totalBytes = parseInt(response.headers['content-length'], 10) || 0;
      console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : 'N/A';
        process.stdout.write(`\rDownloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB (${percent}%)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete!');
        resolve(dest);
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });

    request.setTimeout(300000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

async function processCSV(inputPath, outputPath, limit = null) {
  const readline = require('readline');
  const fs = require('fs');

  console.log(`\nProcessing CSV...`);

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let lineCount = 0;
  let headerWritten = false;

  for await (const line of rl) {
    if (!headerWritten) {
      output.write(line + '\n');
      headerWritten = true;
      continue;
    }

    lineCount++;

    // Filter for quality leads (has website, has industry)
    const fields = line.split(',');
    if (fields.length > 5) {
      output.write(line + '\n');
    }

    if (limit && lineCount >= limit) {
      console.log(`Reached limit of ${limit} records`);
      break;
    }

    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} records...`);
    }
  }

  output.end();
  console.log(`Total records processed: ${lineCount}`);
  return outputPath;
}

async function main() {
  console.log('='.repeat(60));
  console.log('PEOPLE DATA LABS - Free Company Dataset Downloader');
  console.log('22M+ Global Companies');
  console.log('='.repeat(60));

  // Ensure directories exist
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  try {
    // Check if already downloaded
    if (fs.existsSync(OUTPUT_FILE)) {
      const stats = fs.statSync(OUTPUT_FILE);
      console.log(`File already exists: ${OUTPUT_FILE}`);
      console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('Skipping download. Delete file to re-download.');
    } else {
      await downloadFile(DOWNLOAD_URL, OUTPUT_FILE);
    }

    // Count lines
    console.log('\nCounting records...');
    const countStream = fs.createReadStream(OUTPUT_FILE);
    const rl = require('readline').createInterface({ input: countStream });
    let count = 0;
    for await (const line of rl) {
      count++;
    }
    console.log(`Total records in file: ${count - 1}`); // minus header

    console.log('\nDone! File ready for processing.');
    return OUTPUT_FILE;

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, downloadFile };
