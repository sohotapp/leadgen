const fs = require('fs');
const path = require('path');

// Fortune 500 and global enterprises
const fortune500Leads = [
  // RETAIL & CONSUMER
  { company: 'Walmart', sector: 'Retail', subSector: 'Mass Retail', city: 'Bentonville', state: 'AR', website: 'walmart.com', revenue: 648, employees: 2100000, priority: 'Critical', useCase: 'Supply chain simulation, demand forecasting, inventory optimization', titles: 'CTO, Chief Data Officer, EVP Technology', source: 'Fortune 500' },
  { company: 'Amazon', sector: 'Technology', subSector: 'E-commerce/Cloud', city: 'Seattle', state: 'WA', website: 'amazon.com', revenue: 575, employees: 1540000, priority: 'Critical', useCase: 'Logistics simulation, demand prediction, AWS AI services', titles: 'VP AI/ML, CTO, SVP AWS', source: 'Fortune 500' },
  { company: 'Costco', sector: 'Retail', subSector: 'Wholesale', city: 'Issaquah', state: 'WA', website: 'costco.com', revenue: 242, employees: 316000, priority: 'High', useCase: 'Inventory optimization, member analytics, supply chain', titles: 'CTO, SVP Technology', source: 'Fortune 500' },
  { company: 'Target', sector: 'Retail', subSector: 'Mass Retail', city: 'Minneapolis', state: 'MN', website: 'target.com', revenue: 107, employees: 440000, priority: 'High', useCase: 'Customer intelligence, demand simulation, fulfillment optimization', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Home Depot', sector: 'Retail', subSector: 'Home Improvement', city: 'Atlanta', state: 'GA', website: 'homedepot.com', revenue: 157, employees: 471000, priority: 'High', useCase: 'Supply chain modeling, customer analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Lowes', sector: 'Retail', subSector: 'Home Improvement', city: 'Mooresville', state: 'NC', website: 'lowes.com', revenue: 86, employees: 270000, priority: 'High', useCase: 'Inventory simulation, customer journey modeling', titles: 'CTO, Chief Digital Officer', source: 'Fortune 500' },
  { company: 'Kroger', sector: 'Retail', subSector: 'Grocery', city: 'Cincinnati', state: 'OH', website: 'kroger.com', revenue: 148, employees: 430000, priority: 'High', useCase: 'Demand forecasting, pricing optimization, supply chain', titles: 'CTO, Chief Digital Officer', source: 'Fortune 500' },
  { company: 'Walgreens Boots Alliance', sector: 'Retail', subSector: 'Pharmacy', city: 'Deerfield', state: 'IL', website: 'walgreensbootsalliance.com', revenue: 139, employees: 325000, priority: 'High', useCase: 'Healthcare analytics, pharmacy operations, patient engagement', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },

  // AUTOMOTIVE
  { company: 'General Motors', sector: 'Automotive', subSector: 'Auto Manufacturing', city: 'Detroit', state: 'MI', website: 'gm.com', revenue: 172, employees: 167000, priority: 'Critical', useCase: 'Autonomous vehicle simulation, manufacturing optimization, EV planning', titles: 'CTO, VP Autonomous, Chief Digital Officer', source: 'Fortune 500' },
  { company: 'Ford Motor', sector: 'Automotive', subSector: 'Auto Manufacturing', city: 'Dearborn', state: 'MI', website: 'ford.com', revenue: 176, employees: 177000, priority: 'Critical', useCase: 'EV transition modeling, autonomous simulation, supply chain', titles: 'CTO, Chief Product Officer', source: 'Fortune 500' },
  { company: 'Tesla', sector: 'Automotive', subSector: 'EV Manufacturing', city: 'Austin', state: 'TX', website: 'tesla.com', revenue: 97, employees: 140000, priority: 'Critical', useCase: 'Autopilot validation, manufacturing simulation, energy grid modeling', titles: 'CTO, VP Engineering, VP AI', source: 'Fortune 500' },
  { company: 'Toyota North America', sector: 'Automotive', subSector: 'Auto Manufacturing', city: 'Plano', state: 'TX', website: 'toyota.com', revenue: 267, employees: 372000, priority: 'High', useCase: 'Production simulation, autonomous systems, hybrid modeling', titles: 'CTO, VP Connected Technologies', source: 'Fortune 500' },
  { company: 'Stellantis', sector: 'Automotive', subSector: 'Auto Manufacturing', city: 'Auburn Hills', state: 'MI', website: 'stellantis.com', revenue: 189, employees: 281000, priority: 'High', useCase: 'Multi-brand strategy simulation, EV transition', titles: 'CTO, Chief Software Officer', source: 'Fortune 500' },

  // TELECOMMUNICATIONS
  { company: 'AT&T', sector: 'Telecommunications', subSector: 'Telecom', city: 'Dallas', state: 'TX', website: 'att.com', revenue: 120, employees: 160000, priority: 'High', useCase: 'Network optimization, customer churn simulation, 5G planning', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Verizon', sector: 'Telecommunications', subSector: 'Telecom', city: 'New York', state: 'NY', website: 'verizon.com', revenue: 134, employees: 117000, priority: 'High', useCase: 'Network simulation, customer analytics, edge computing', titles: 'CTO, Chief Digital Officer', source: 'Fortune 500' },
  { company: 'T-Mobile', sector: 'Telecommunications', subSector: 'Telecom', city: 'Bellevue', state: 'WA', website: 't-mobile.com', revenue: 80, employees: 71000, priority: 'High', useCase: 'Network planning, customer experience simulation', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Comcast', sector: 'Telecommunications', subSector: 'Cable/Media', city: 'Philadelphia', state: 'PA', website: 'comcast.com', revenue: 121, employees: 186000, priority: 'High', useCase: 'Content recommendation, network optimization, customer analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },

  // PHARMACEUTICALS & BIOTECH
  { company: 'Johnson & Johnson', sector: 'Healthcare', subSector: 'Pharmaceuticals', city: 'New Brunswick', state: 'NJ', website: 'jnj.com', revenue: 98, employees: 131000, priority: 'Critical', useCase: 'Drug discovery simulation, clinical trial modeling, supply chain', titles: 'CTO, Chief Data Officer, VP R&D', source: 'Fortune 500' },
  { company: 'Pfizer', sector: 'Healthcare', subSector: 'Pharmaceuticals', city: 'New York', state: 'NY', website: 'pfizer.com', revenue: 100, employees: 88000, priority: 'Critical', useCase: 'Clinical trial simulation, drug development modeling, manufacturing', titles: 'CTO, Chief Digital Officer, VP AI', source: 'Fortune 500' },
  { company: 'Merck', sector: 'Healthcare', subSector: 'Pharmaceuticals', city: 'Rahway', state: 'NJ', website: 'merck.com', revenue: 60, employees: 69000, priority: 'Critical', useCase: 'R&D simulation, clinical outcomes modeling, supply chain', titles: 'CTO, Chief Data Science Officer', source: 'Fortune 500' },
  { company: 'AbbVie', sector: 'Healthcare', subSector: 'Pharmaceuticals', city: 'North Chicago', state: 'IL', website: 'abbvie.com', revenue: 58, employees: 50000, priority: 'High', useCase: 'Drug pipeline simulation, market modeling', titles: 'CTO, VP Data Science', source: 'Fortune 500' },
  { company: 'Bristol-Myers Squibb', sector: 'Healthcare', subSector: 'Pharmaceuticals', city: 'New York', state: 'NY', website: 'bms.com', revenue: 46, employees: 34000, priority: 'High', useCase: 'Clinical development simulation, oncology modeling', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Eli Lilly', sector: 'Healthcare', subSector: 'Pharmaceuticals', city: 'Indianapolis', state: 'IN', website: 'lilly.com', revenue: 34, employees: 43000, priority: 'High', useCase: 'Drug discovery AI, clinical trial optimization', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Moderna', sector: 'Healthcare', subSector: 'Biotech', city: 'Cambridge', state: 'MA', website: 'modernatx.com', revenue: 19, employees: 5200, priority: 'Critical', useCase: 'mRNA platform simulation, clinical development, manufacturing', titles: 'CTO, Chief Digital Officer', source: 'Biotech' },
  { company: 'Regeneron', sector: 'Healthcare', subSector: 'Biotech', city: 'Tarrytown', state: 'NY', website: 'regeneron.com', revenue: 13, employees: 12000, priority: 'High', useCase: 'Drug discovery simulation, clinical modeling', titles: 'CTO, VP Data Science', source: 'Biotech' },
  { company: 'Gilead Sciences', sector: 'Healthcare', subSector: 'Biotech', city: 'Foster City', state: 'CA', website: 'gilead.com', revenue: 27, employees: 17000, priority: 'High', useCase: 'Antiviral research simulation, clinical development', titles: 'CTO, Chief Data Officer', source: 'Biotech' },

  // CONSUMER GOODS
  { company: 'Procter & Gamble', sector: 'Consumer Goods', subSector: 'Consumer Products', city: 'Cincinnati', state: 'OH', website: 'pg.com', revenue: 82, employees: 106000, priority: 'High', useCase: 'Consumer behavior simulation, supply chain optimization, brand analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'PepsiCo', sector: 'Consumer Goods', subSector: 'Food & Beverage', city: 'Purchase', state: 'NY', website: 'pepsico.com', revenue: 91, employees: 315000, priority: 'High', useCase: 'Demand forecasting, distribution optimization, consumer insights', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Coca-Cola', sector: 'Consumer Goods', subSector: 'Beverages', city: 'Atlanta', state: 'GA', website: 'coca-colacompany.com', revenue: 46, employees: 82000, priority: 'High', useCase: 'Consumer preference simulation, supply chain modeling', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Nike', sector: 'Consumer Goods', subSector: 'Apparel', city: 'Beaverton', state: 'OR', website: 'nike.com', revenue: 51, employees: 83700, priority: 'High', useCase: 'Demand prediction, supply chain simulation, consumer analytics', titles: 'CTO, Chief Digital Officer', source: 'Fortune 500' },
  { company: 'Colgate-Palmolive', sector: 'Consumer Goods', subSector: 'Consumer Products', city: 'New York', state: 'NY', website: 'colgatepalmolive.com', revenue: 19, employees: 34000, priority: 'Medium', useCase: 'Market simulation, supply chain optimization', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },

  // MEDIA & ENTERTAINMENT
  { company: 'Walt Disney', sector: 'Media', subSector: 'Entertainment', city: 'Burbank', state: 'CA', website: 'thewaltdisneycompany.com', revenue: 88, employees: 220000, priority: 'High', useCase: 'Content optimization, park operations, audience simulation', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Netflix', sector: 'Media', subSector: 'Streaming', city: 'Los Gatos', state: 'CA', website: 'netflix.com', revenue: 33, employees: 13000, priority: 'High', useCase: 'Content recommendation, viewer behavior simulation, production optimization', titles: 'VP Engineering, Chief Product Officer', source: 'Fortune 500' },
  { company: 'Warner Bros. Discovery', sector: 'Media', subSector: 'Entertainment', city: 'New York', state: 'NY', website: 'wbd.com', revenue: 41, employees: 40000, priority: 'Medium', useCase: 'Content strategy simulation, streaming optimization', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Paramount Global', sector: 'Media', subSector: 'Entertainment', city: 'New York', state: 'NY', website: 'paramount.com', revenue: 30, employees: 23000, priority: 'Medium', useCase: 'Content distribution simulation, audience analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Spotify', sector: 'Media', subSector: 'Streaming', city: 'Stockholm', state: '', website: 'spotify.com', revenue: 14, employees: 9800, priority: 'High', useCase: 'Recommendation engine, user behavior simulation, creator analytics', titles: 'CTO, VP Engineering', source: 'Tech' },

  // TRAVEL & HOSPITALITY
  { company: 'Marriott International', sector: 'Hospitality', subSector: 'Hotels', city: 'Bethesda', state: 'MD', website: 'marriott.com', revenue: 23, employees: 383000, priority: 'High', useCase: 'Revenue optimization, demand simulation, guest experience', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Hilton', sector: 'Hospitality', subSector: 'Hotels', city: 'McLean', state: 'VA', website: 'hilton.com', revenue: 10, employees: 178000, priority: 'High', useCase: 'Pricing simulation, loyalty analytics, operations optimization', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Delta Air Lines', sector: 'Transportation', subSector: 'Airlines', city: 'Atlanta', state: 'GA', website: 'delta.com', revenue: 58, employees: 100000, priority: 'High', useCase: 'Route optimization, demand forecasting, operations simulation', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'United Airlines', sector: 'Transportation', subSector: 'Airlines', city: 'Chicago', state: 'IL', website: 'united.com', revenue: 53, employees: 92000, priority: 'High', useCase: 'Network simulation, revenue management, operations', titles: 'CTO, Chief Digital Officer', source: 'Fortune 500' },
  { company: 'American Airlines', sector: 'Transportation', subSector: 'Airlines', city: 'Fort Worth', state: 'TX', website: 'aa.com', revenue: 54, employees: 129000, priority: 'High', useCase: 'Flight operations simulation, demand modeling', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Southwest Airlines', sector: 'Transportation', subSector: 'Airlines', city: 'Dallas', state: 'TX', website: 'southwest.com', revenue: 26, employees: 66000, priority: 'Medium', useCase: 'Operations optimization, customer analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Uber', sector: 'Transportation', subSector: 'Ride-sharing', city: 'San Francisco', state: 'CA', website: 'uber.com', revenue: 37, employees: 32000, priority: 'High', useCase: 'Marketplace simulation, demand prediction, autonomous planning', titles: 'CTO, VP Engineering', source: 'Tech' },
  { company: 'Airbnb', sector: 'Hospitality', subSector: 'Vacation Rental', city: 'San Francisco', state: 'CA', website: 'airbnb.com', revenue: 10, employees: 6900, priority: 'High', useCase: 'Marketplace dynamics, pricing optimization, trust simulation', titles: 'CTO, VP Engineering', source: 'Tech' },
  { company: 'Booking Holdings', sector: 'Travel', subSector: 'Online Travel', city: 'Norwalk', state: 'CT', website: 'bookingholdings.com', revenue: 21, employees: 22000, priority: 'High', useCase: 'Demand forecasting, pricing simulation, customer journey', titles: 'CTO, Chief Data Officer', source: 'Tech' },
  { company: 'Expedia Group', sector: 'Travel', subSector: 'Online Travel', city: 'Seattle', state: 'WA', website: 'expediagroup.com', revenue: 13, employees: 17200, priority: 'High', useCase: 'Travel demand simulation, pricing optimization', titles: 'CTO, Chief Data Officer', source: 'Tech' },

  // LOGISTICS & SHIPPING
  { company: 'FedEx', sector: 'Logistics', subSector: 'Shipping', city: 'Memphis', state: 'TN', website: 'fedex.com', revenue: 93, employees: 550000, priority: 'High', useCase: 'Route optimization, demand forecasting, autonomous delivery', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'UPS', sector: 'Logistics', subSector: 'Shipping', city: 'Atlanta', state: 'GA', website: 'ups.com', revenue: 100, employees: 500000, priority: 'High', useCase: 'Network simulation, delivery optimization, demand modeling', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'DHL', sector: 'Logistics', subSector: 'Shipping', city: 'Bonn', state: '', website: 'dhl.com', revenue: 94, employees: 600000, priority: 'High', useCase: 'Global logistics simulation, supply chain optimization', titles: 'CTO, Chief Digital Officer', source: 'Global' },
  { company: 'XPO Logistics', sector: 'Logistics', subSector: 'Freight', city: 'Greenwich', state: 'CT', website: 'xpo.com', revenue: 12, employees: 42000, priority: 'Medium', useCase: 'Freight optimization, network simulation', titles: 'CTO, Chief Data Officer', source: 'Logistics' },

  // INSURANCE
  { company: 'Berkshire Hathaway', sector: 'Finance', subSector: 'Insurance/Conglomerate', city: 'Omaha', state: 'NE', website: 'berkshirehathaway.com', revenue: 302, employees: 396000, priority: 'Critical', useCase: 'Insurance risk modeling, portfolio simulation, investment analytics', titles: 'CTO, Chief Risk Officer', source: 'Fortune 500' },
  { company: 'State Farm', sector: 'Insurance', subSector: 'P&C Insurance', city: 'Bloomington', state: 'IL', website: 'statefarm.com', revenue: 98, employees: 57000, priority: 'High', useCase: 'Claims simulation, risk modeling, customer analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Progressive', sector: 'Insurance', subSector: 'Auto Insurance', city: 'Mayfield Village', state: 'OH', website: 'progressive.com', revenue: 62, employees: 60000, priority: 'High', useCase: 'Pricing simulation, claims prediction, telematics analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Allstate', sector: 'Insurance', subSector: 'P&C Insurance', city: 'Northbrook', state: 'IL', website: 'allstate.com', revenue: 57, employees: 54000, priority: 'High', useCase: 'Risk simulation, customer lifecycle modeling', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'MetLife', sector: 'Insurance', subSector: 'Life Insurance', city: 'New York', state: 'NY', website: 'metlife.com', revenue: 71, employees: 43000, priority: 'High', useCase: 'Actuarial simulation, customer analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Prudential Financial', sector: 'Insurance', subSector: 'Life Insurance', city: 'Newark', state: 'NJ', website: 'prudential.com', revenue: 68, employees: 40000, priority: 'High', useCase: 'Risk modeling, retirement planning simulation', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'AIG', sector: 'Insurance', subSector: 'Commercial Insurance', city: 'New York', state: 'NY', website: 'aig.com', revenue: 52, employees: 26000, priority: 'High', useCase: 'Commercial risk simulation, claims analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Chubb', sector: 'Insurance', subSector: 'Commercial Insurance', city: 'Zurich', state: '', website: 'chubb.com', revenue: 49, employees: 40000, priority: 'High', useCase: 'Specialty risk modeling, underwriting simulation', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Travelers', sector: 'Insurance', subSector: 'P&C Insurance', city: 'New York', state: 'NY', website: 'travelers.com', revenue: 41, employees: 30000, priority: 'High', useCase: 'Risk simulation, claims prediction', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
  { company: 'Liberty Mutual', sector: 'Insurance', subSector: 'P&C Insurance', city: 'Boston', state: 'MA', website: 'libertymutual.com', revenue: 49, employees: 45000, priority: 'High', useCase: 'Claims simulation, risk analytics', titles: 'CTO, Chief Data Officer', source: 'Fortune 500' },
];

// Read existing leads
const leadsPath = path.join(__dirname, '../apps/web/data/leads.json');
const existingLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

// Create a set of existing company names (lowercase for comparison)
const existingCompanies = new Set(existingLeads.map(l => l.company.toLowerCase()));

// Filter out duplicates and add IDs
let newCount = 0;
const newLeads = fortune500Leads.filter(lead => {
  const exists = existingCompanies.has(lead.company.toLowerCase());
  if (!exists) {
    newCount++;
  }
  return !exists;
}).map(lead => ({
  id: `f500-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ...lead,
  country: lead.state ? 'USA' : '',
}));

// Combine and save
const allLeads = [...existingLeads, ...newLeads];
fs.writeFileSync(leadsPath, JSON.stringify(allLeads, null, 2));

console.log(`Added ${newCount} new Fortune 500 leads`);
console.log(`Total leads: ${allLeads.length}`);
