const fs = require('fs');
const path = require('path');

const LEADS_DIR = '/Users/owenshar/Desktop/RLTX/Agent 0/leads_data';
const OUTPUT_FILE = '/Users/owenshar/Desktop/RLTX/Agent 0/lead-engine/apps/web/data/leads.json';

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.toLowerCase().replace(/[^a-z0-9]/g, '_')] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
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
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeRow(row, source) {
  // Try to extract company name from various possible column names
  const company = row.company || row.name || row.company_name || row.organization || '';
  if (!company) return null;

  // Extract sector/category
  const sector = row.sector || row.industry || row.category || row.primary_focus || row.type || 'Other';

  // Extract location
  const city = row.city || row.headquarters_city || row.headquarters || row.hq_city || '';
  const state = row.state || row.headquarters_state || row.hq_state || '';
  const country = row.country || 'USA';

  // Extract website
  let website = row.website || row.url || row.domain || '';
  website = website.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Extract revenue/valuation
  let revenue = null;
  if (row.revenue_billions) revenue = parseFloat(row.revenue_billions);
  else if (row.valuation_billions) revenue = parseFloat(row.valuation_billions);
  else if (row.fy2024_contract_value_millions) revenue = parseFloat(row.fy2024_contract_value_millions) / 1000;
  else if (row.revenue) revenue = parseFloat(row.revenue);

  // Extract employees
  let employees = null;
  if (row.employees) employees = parseInt(row.employees.toString().replace(/,/g, ''));

  // Extract priority/relevance
  let priority = 'Medium';
  const relevance = (row.rltx_priority || row.rltx_relevance || row.priority || '').toLowerCase();
  if (relevance.includes('critical') || relevance.includes('high')) priority = 'High';
  else if (relevance.includes('low')) priority = 'Low';
  else if (relevance.includes('critical')) priority = 'Critical';

  // Use case
  const useCase = row.rltx_use_case || row.use_case || row.description || row.notes || '';

  // Target titles
  const titles = row.target_titles || row.contact_strategy || '';

  return {
    id: `${source.substring(0,3).toUpperCase()}-${Math.random().toString(36).substr(2, 6)}`,
    company: company.trim(),
    sector: sector.trim(),
    subSector: row.sub_sector || row.subcategory || '',
    city: city.trim(),
    state: state.trim(),
    country: country.trim(),
    website: website.trim(),
    revenue: revenue,
    employees: employees,
    priority: priority,
    useCase: useCase.trim(),
    titles: titles.trim(),
    source: source.replace('.csv', '').replace(/_/g, ' ')
  };
}

// Main
const allLeads = [];
const seenCompanies = new Set();

const files = fs.readdirSync(LEADS_DIR).filter(f => f.endsWith('.csv'));

for (const file of files) {
  const content = fs.readFileSync(path.join(LEADS_DIR, file), 'utf-8');
  const rows = parseCSV(content);

  for (const row of rows) {
    const normalized = normalizeRow(row, file);
    if (normalized && normalized.company && !seenCompanies.has(normalized.company.toLowerCase())) {
      seenCompanies.add(normalized.company.toLowerCase());
      allLeads.push(normalized);
    }
  }
}

// Sort by priority then company name
const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
allLeads.sort((a, b) => {
  const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  if (pDiff !== 0) return pDiff;
  return a.company.localeCompare(b.company);
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allLeads, null, 2));
console.log(`Merged ${allLeads.length} unique leads from ${files.length} files`);
