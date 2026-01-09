/**
 * Import existing CSV leads from the leads_data folder
 *
 * Usage:
 *   pnpm tsx scripts/import-existing-leads.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../packages/db/src/client';
import { leads } from '../packages/db/src/schema';
import { parseCSV } from '../packages/shared/src/utils';

const LEADS_DATA_DIR = path.join(__dirname, '../../leads_data');

// Column mapping from common CSV formats
const columnMappings: Record<string, string> = {
  'company': 'companyName',
  'company_name': 'companyName',
  'name': 'companyName',
  'organization': 'companyName',
  'domain': 'domain',
  'website': 'website',
  'url': 'website',
  'sector': 'sector',
  'industry': 'sector',
  'category': 'sector',
  'sub_sector': 'subSector',
  'subsector': 'subSector',
  'revenue': 'revenue',
  'revenue_millions': 'revenue',
  'revenue_billions': 'revenue',
  'employees': 'employees',
  'headquarters': 'headquarters',
  'headquarters_city': 'headquarters',
  'hq': 'headquarters',
  'state': 'state',
  'rltx_use_case': 'rltxUseCase',
  'use_case': 'rltxUseCase',
  'rltx_priority': 'rltxPriority',
  'priority': 'rltxPriority',
  'target_titles': 'targetTitles',
  'lead_id': 'externalId',
  'id': 'externalId',
};

function normalizeColumnName(col: string): string {
  return col.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

function mapRow(row: Record<string, string>, sourceFile: string): any | null {
  const mapped: any = {
    sourceFile,
    stage: 'raw',
  };

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key);
    const targetField = columnMappings[normalizedKey];

    if (targetField && value) {
      if (targetField === 'revenue') {
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          if (value.toLowerCase().includes('b')) {
            mapped.revenue = Math.round(num * 1000);
          } else {
            mapped.revenue = Math.round(num);
          }
        }
      } else if (targetField === 'employees') {
        const num = parseInt(value.replace(/[^0-9]/g, ''));
        if (!isNaN(num)) {
          mapped.employees = num;
        }
      } else if (targetField === 'targetTitles') {
        mapped.targetTitles = value.split(',').map((t) => t.trim()).filter(Boolean);
      } else if (targetField === 'rltxPriority') {
        const priority = value.toLowerCase();
        if (priority.includes('critical')) {
          mapped.rltxPriority = 'critical';
        } else if (priority.includes('high')) {
          mapped.rltxPriority = 'high';
        } else if (priority.includes('medium') || priority.includes('med')) {
          mapped.rltxPriority = 'medium';
        } else {
          mapped.rltxPriority = 'low';
        }
      } else {
        mapped[targetField] = value;
      }
    }
  }

  // Try to infer sector from filename if not in data
  if (!mapped.sector) {
    const fileName = sourceFile.toLowerCase();
    if (fileName.includes('defense') || fileName.includes('contractor')) {
      mapped.sector = 'Defense';
    } else if (fileName.includes('health')) {
      mapped.sector = 'Healthcare';
    } else if (fileName.includes('financ') || fileName.includes('bank')) {
      mapped.sector = 'Finance';
    } else if (fileName.includes('intel')) {
      mapped.sector = 'Intelligence';
    } else if (fileName.includes('consult')) {
      mapped.sector = 'Consulting';
    } else if (fileName.includes('gov')) {
      mapped.sector = 'Government';
    } else if (fileName.includes('tech') || fileName.includes('ai') || fileName.includes('saas')) {
      mapped.sector = 'Technology';
    } else if (fileName.includes('supply') || fileName.includes('logistic')) {
      mapped.sector = 'Supply Chain';
    } else if (fileName.includes('media') || fileName.includes('advert')) {
      mapped.sector = 'Media';
    } else if (fileName.includes('research') || fileName.includes('poll')) {
      mapped.sector = 'Research';
    } else if (fileName.includes('pe') || fileName.includes('vc') || fileName.includes('equity')) {
      mapped.sector = 'Private Equity';
    } else {
      mapped.sector = 'Other';
    }
  }

  if (!mapped.companyName) {
    return null;
  }

  // Extract domain from website if not present
  if (!mapped.domain && mapped.website) {
    try {
      const url = new URL(mapped.website.startsWith('http') ? mapped.website : `https://${mapped.website}`);
      mapped.domain = url.hostname.replace(/^www\./, '');
    } catch {
      // Ignore
    }
  }

  return mapped;
}

async function importFile(filePath: string): Promise<{ imported: number; skipped: number }> {
  const fileName = path.basename(filePath);
  console.log(`\nImporting: ${fileName}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCSV(content);

  if (rows.length === 0) {
    console.log(`  - No data rows found`);
    return { imported: 0, skipped: 0 };
  }

  const mappedLeads = rows
    .map((row) => mapRow(row, fileName))
    .filter((lead) => lead !== null);

  console.log(`  - Found ${rows.length} rows, ${mappedLeads.length} valid leads`);

  if (mappedLeads.length === 0) {
    return { imported: 0, skipped: rows.length };
  }

  // Insert in batches
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < mappedLeads.length; i += batchSize) {
    const batch = mappedLeads.slice(i, i + batchSize);

    try {
      const result = await db.insert(leads).values(batch).onConflictDoNothing().returning();
      imported += result.length;
    } catch (error) {
      console.error(`  - Batch error:`, error);
    }
  }

  console.log(`  - Imported ${imported} leads`);
  return { imported, skipped: mappedLeads.length - imported };
}

async function main() {
  console.log('='.repeat(60));
  console.log('RLTX Lead Engine - CSV Import Script');
  console.log('='.repeat(60));
  console.log(`\nLooking for CSV files in: ${LEADS_DATA_DIR}`);

  if (!fs.existsSync(LEADS_DATA_DIR)) {
    console.error(`\nError: Directory not found: ${LEADS_DATA_DIR}`);
    process.exit(1);
  }

  const csvFiles = fs.readdirSync(LEADS_DATA_DIR)
    .filter((f) => f.endsWith('.csv'))
    .sort();

  console.log(`\nFound ${csvFiles.length} CSV files`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of csvFiles) {
    const filePath = path.join(LEADS_DATA_DIR, file);
    const { imported, skipped } = await importFile(filePath);
    totalImported += imported;
    totalSkipped += skipped;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Import Complete');
  console.log('='.repeat(60));
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped/duplicates: ${totalSkipped}`);
}

main().catch(console.error);
