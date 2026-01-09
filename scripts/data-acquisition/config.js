// Data Acquisition Configuration
const path = require('path');

const BASE_DIR = __dirname;
const DOWNLOADS_DIR = path.join(BASE_DIR, 'downloads');
const RAW_DIR = path.join(BASE_DIR, 'raw');
const PROCESSED_DIR = path.join(BASE_DIR, 'processed');

// Supabase config
const SUPABASE_URL = 'https://fsbdquldclxyjqyfnlac.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_2XlStCoUEwlmFgUtjEnj5w_S0W-0uSn';

// Data sources
const SOURCES = {
  PEOPLE_DATA_LABS: {
    name: 'People Data Labs',
    url: 'https://pdl-public-bucket.s3.amazonaws.com/free-company-dataset/free_company_dataset.csv',
    estimatedRecords: 22000000,
    format: 'csv'
  },
  USA_SPENDING: {
    name: 'USASpending.gov',
    baseUrl: 'https://files.usaspending.gov/generated_downloads',
    archiveUrl: 'https://files.usaspending.gov/award_data_archive',
    estimatedRecords: 5000000,
    format: 'csv'
  },
  SAM_GOV: {
    name: 'SAM.gov Entity Extracts',
    apiUrl: 'https://api.sam.gov/entity-information/v3/entities',
    publicExtractUrl: 'https://sam.gov/api/prod/fileextractservices/v1/api/download',
    estimatedRecords: 400000,
    format: 'json'
  },
  UK_COMPANIES_HOUSE: {
    name: 'UK Companies House',
    url: 'http://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-2025-01-01.zip',
    estimatedRecords: 5000000,
    format: 'csv'
  },
  SEC_EDGAR: {
    name: 'SEC EDGAR',
    submissionsUrl: 'https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip',
    companyFactsUrl: 'https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip',
    estimatedRecords: 10000,
    format: 'json'
  },
  GSA_ELIBRARY: {
    name: 'GSA eLibrary',
    apiUrl: 'https://api.sam.gov/prod/sgs/v1/search/',
    estimatedRecords: 25000,
    format: 'json'
  },
  WIKIDATA: {
    name: 'Wikidata Companies',
    endpoint: 'https://query.wikidata.org/sparql',
    estimatedRecords: 500000,
    format: 'json'
  },
  GITHUB_DATASETS: {
    name: 'GitHub Open Datasets',
    repos: [
      'https://raw.githubusercontent.com/GovLab/OpenData500/master/static/files/us/us_companies.csv',
      'https://raw.githubusercontent.com/datasets/fortune500/master/data/fortune500.csv'
    ],
    estimatedRecords: 1000,
    format: 'csv'
  }
};

// Target sectors for filtering
const TARGET_SECTORS = [
  'defense', 'military', 'aerospace', 'government', 'federal',
  'intelligence', 'security', 'cybersecurity', 'healthcare',
  'pharmaceutical', 'biotech', 'financial', 'banking', 'insurance',
  'technology', 'software', 'saas', 'ai', 'artificial intelligence',
  'consulting', 'professional services', 'research', 'analytics',
  'manufacturing', 'energy', 'telecommunications'
];

// NAICS codes of interest
const TARGET_NAICS = [
  '541330', // Engineering Services
  '541511', // Custom Computer Programming
  '541512', // Computer Systems Design
  '541519', // Other Computer Related Services
  '541690', // Other Scientific and Technical Consulting
  '541711', // Research and Development in Biotechnology
  '541712', // Research and Development in Physical Sciences
  '541720', // Research and Development in Social Sciences
  '334111', // Electronic Computer Manufacturing
  '334511', // Search and Navigation Equipment
  '336411', // Aircraft Manufacturing
  '336414', // Guided Missile and Space Vehicle Manufacturing
  '517110', // Wired Telecommunications Carriers
  '518210', // Data Processing and Hosting
  '522110', // Commercial Banking
  '524114', // Direct Health and Medical Insurance
  '541614', // Process Management Consulting
  '561110', // Office Administrative Services
];

module.exports = {
  BASE_DIR,
  DOWNLOADS_DIR,
  RAW_DIR,
  PROCESSED_DIR,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SOURCES,
  TARGET_SECTORS,
  TARGET_NAICS
};
