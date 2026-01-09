import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lead-engine/db';
import { leads } from '@lead-engine/db';
import { parseCSV } from '@lead-engine/shared';

// Column mapping from common CSV formats
const columnMappings: Record<string, keyof typeof leads.$inferInsert> = {
  // Company name variations
  'company': 'companyName',
  'company_name': 'companyName',
  'companyname': 'companyName',
  'name': 'companyName',
  'organization': 'companyName',

  // Domain
  'domain': 'domain',
  'website': 'website',
  'url': 'website',

  // Sector
  'sector': 'sector',
  'industry': 'sector',
  'category': 'sector',

  // Sub-sector
  'sub_sector': 'subSector',
  'subsector': 'subSector',
  'subcategory': 'subSector',

  // Revenue
  'revenue': 'revenue',
  'revenue_millions': 'revenue',
  'revenue_billions': 'revenue',

  // Employees
  'employees': 'employees',
  'employee_count': 'employees',
  'headcount': 'employees',

  // Location
  'headquarters': 'headquarters',
  'headquarters_city': 'headquarters',
  'hq': 'headquarters',
  'location': 'headquarters',
  'state': 'state',

  // RLTX specific
  'rltx_use_case': 'rltxUseCase',
  'use_case': 'rltxUseCase',
  'rltx_priority': 'rltxPriority',
  'priority': 'rltxPriority',
  'target_titles': 'targetTitles',

  // External ID
  'lead_id': 'externalId',
  'id': 'externalId',
  'external_id': 'externalId',
};

function normalizeColumnName(col: string): string {
  return col.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

function mapRow(row: Record<string, string>, sourceFile: string): typeof leads.$inferInsert | null {
  const mapped: Partial<typeof leads.$inferInsert> = {
    sourceFile,
    stage: 'raw',
  };

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key);
    const targetField = columnMappings[normalizedKey];

    if (targetField && value) {
      // Handle special cases
      if (targetField === 'revenue') {
        // Parse revenue - could be in millions or billions
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          // If value contains 'B' or 'billion', convert to millions
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
        // Parse comma-separated titles
        mapped.targetTitles = value.split(',').map((t) => t.trim()).filter(Boolean);
      } else if (targetField === 'rltxPriority') {
        // Normalize priority
        const priority = value.toLowerCase();
        if (priority.includes('critical')) {
          mapped.rltxPriority = 'critical';
        } else if (priority.includes('high')) {
          mapped.rltxPriority = 'high';
        } else if (priority.includes('medium')) {
          mapped.rltxPriority = 'medium';
        } else {
          mapped.rltxPriority = 'low';
        }
      } else {
        (mapped as any)[targetField] = value;
      }
    }
  }

  // Validate required fields
  if (!mapped.companyName || !mapped.sector) {
    return null;
  }

  // Extract domain from website if not present
  if (!mapped.domain && mapped.website) {
    try {
      const url = new URL(mapped.website.startsWith('http') ? mapped.website : `https://${mapped.website}`);
      mapped.domain = url.hostname.replace(/^www\./, '');
    } catch {
      // Ignore URL parsing errors
    }
  }

  return mapped as typeof leads.$inferInsert;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sourceFileName = formData.get('sourceFile') as string || file?.name || 'import';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid data rows found' },
        { status: 400 }
      );
    }

    // Map rows to lead records
    const mappedLeads = rows
      .map((row) => mapRow(row, sourceFileName))
      .filter((lead): lead is typeof leads.$inferInsert => lead !== null);

    if (mappedLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid leads found. Make sure CSV has company and sector columns.' },
        { status: 400 }
      );
    }

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    let imported = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (let i = 0; i < mappedLeads.length; i += batchSize) {
      const batch = mappedLeads.slice(i, i + batchSize);

      try {
        // Use ON CONFLICT to handle duplicates
        const result = await db.insert(leads).values(batch).onConflictDoNothing().returning();
        imported += result.length;
        duplicates += batch.length - result.length;
      } catch (error) {
        console.error('Batch insert error:', error);
        errors.push(`Error inserting batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: rows.length,
        imported,
        duplicates,
        errors: errors.length,
      },
      message: `Imported ${imported} leads. ${duplicates} duplicates skipped.`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import leads' },
      { status: 500 }
    );
  }
}
