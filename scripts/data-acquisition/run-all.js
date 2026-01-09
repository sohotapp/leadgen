#!/usr/bin/env node
/**
 * Master Data Acquisition Script
 * Runs all download scripts, transforms data, and imports to Supabase
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;

const SCRIPTS = [
  { name: 'GitHub Datasets', file: 'download-github-datasets.js', priority: 1 },
  { name: 'SEC EDGAR', file: 'download-sec-edgar.js', priority: 2 },
  { name: 'Wikidata SPARQL', file: 'download-wikidata.js', priority: 3 },
  { name: 'USASpending.gov', file: 'download-usaspending.js', priority: 4 },
  // { name: 'UK Companies House', file: 'download-uk-companies.js', priority: 5 }, // Large file, run separately
  // { name: 'People Data Labs', file: 'download-people-data-labs.js', priority: 6 }, // Very large, run separately
];

async function runScript(script) {
  const scriptPath = path.join(SCRIPTS_DIR, script.file);

  if (!fs.existsSync(scriptPath)) {
    console.log(`  Script not found: ${script.file}`);
    return false;
  }

  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${script.name}`);
    console.log('='.repeat(60));

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: SCRIPTS_DIR
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${script.name}: Complete`);
        resolve(true);
      } else {
        console.log(`\n${script.name}: Failed (exit code ${code})`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.log(`\n${script.name}: Error - ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('RLTX LEAD ENGINE - MASS DATA ACQUISITION');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Scripts to run: ${SCRIPTS.length}`);

  const startTime = Date.now();
  const results = [];

  // Run download scripts
  for (const script of SCRIPTS) {
    const success = await runScript(script);
    results.push({ name: script.name, success });
  }

  // Run transformer
  console.log('\n' + '='.repeat(60));
  console.log('TRANSFORMING DATA');
  console.log('='.repeat(60));

  try {
    require('./transform-to-leads.js').main();
  } catch (e) {
    console.log('Transform error:', e.message);
  }

  // Run Supabase import
  console.log('\n' + '='.repeat(60));
  console.log('IMPORTING TO SUPABASE');
  console.log('='.repeat(60));

  try {
    await require('./import-to-supabase.js').main();
  } catch (e) {
    console.log('Import error:', e.message);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('ACQUISITION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration} minutes`);
  console.log('\nResults:');
  results.forEach(r => {
    console.log(`  ${r.success ? '✓' : '✗'} ${r.name}`);
  });

  // Show what to run for large datasets
  console.log('\n--- LARGE DATASETS (run separately) ---');
  console.log('For maximum data, also run these (large downloads):');
  console.log('  node download-uk-companies.js      # 500MB, 5M+ companies');
  console.log('  node download-people-data-labs.js  # 2GB+, 22M+ companies');
  console.log('\nAfter running, re-run:');
  console.log('  node transform-to-leads.js');
  console.log('  node import-to-supabase.js');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
