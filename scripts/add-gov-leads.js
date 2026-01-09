const fs = require('fs');

const OUTPUT_FILE = '/Users/owenshar/Desktop/RLTX/Agent 0/lead-engine/apps/web/data/leads.json';

// Additional government agencies and small business federal contractors
const newLeads = [
  // Federal Agencies - Program Offices
  { company: "U.S. Army Futures Command", sector: "Government", subSector: "Defense", city: "Austin", state: "TX", website: "armyfuturescommand.com", priority: "Critical", useCase: "Multi-domain operations simulation, future force design", titles: "Program Managers, S&T Directors", source: "Federal Agency" },
  { company: "U.S. Space Force", sector: "Government", subSector: "Defense", city: "Colorado Springs", state: "CO", website: "spaceforce.mil", priority: "Critical", useCase: "Space domain awareness simulation", titles: "Chief Technology Officer, S&T Directors", source: "Federal Agency" },
  { company: "U.S. Cyber Command", sector: "Government", subSector: "Defense", city: "Fort Meade", state: "MD", website: "cybercom.mil", priority: "Critical", useCase: "Cyber warfare simulation, threat modeling", titles: "J6, Technology Directors", source: "Federal Agency" },
  { company: "Office of Naval Research", sector: "Government", subSector: "Research", city: "Arlington", state: "VA", website: "onr.navy.mil", priority: "Critical", useCase: "Naval research simulation, autonomy testing", titles: "Program Officers, Division Directors", source: "Federal Agency" },
  { company: "Air Force Research Laboratory", sector: "Government", subSector: "Research", city: "Wright-Patterson AFB", state: "OH", website: "afrl.af.mil", priority: "Critical", useCase: "Aerospace simulation, directed energy modeling", titles: "Division Chiefs, Program Managers", source: "Federal Agency" },
  { company: "Army Research Laboratory", sector: "Government", subSector: "Research", city: "Adelphi", state: "MD", website: "arl.army.mil", priority: "Critical", useCase: "Ground systems simulation, materials modeling", titles: "Division Chiefs, Research Directors", source: "Federal Agency" },
  { company: "SOCOM - Special Operations Command", sector: "Government", subSector: "Defense", city: "Tampa", state: "FL", website: "socom.mil", priority: "Critical", useCase: "SOF mission planning simulation", titles: "J8 Acquisition, Technology Directors", source: "Federal Agency" },
  { company: "Defense Innovation Unit (DIU)", sector: "Government", subSector: "Defense", city: "Mountain View", state: "CA", website: "diu.mil", priority: "Critical", useCase: "Commercial tech adoption for DoD", titles: "Portfolio Directors, Program Managers", source: "Federal Agency" },
  { company: "IARPA", sector: "Government", subSector: "Intelligence", city: "Washington", state: "DC", website: "iarpa.gov", priority: "Critical", useCase: "Advanced research for IC", titles: "Program Managers", source: "Federal Agency" },
  { company: "In-Q-Tel", sector: "Government", subSector: "Intelligence", city: "Arlington", state: "VA", website: "iqt.org", priority: "Critical", useCase: "IC technology investment", titles: "Partners, Technology Directors", source: "Federal Agency" },
  { company: "National Geospatial-Intelligence Agency", sector: "Government", subSector: "Intelligence", city: "Springfield", state: "VA", website: "nga.mil", priority: "High", useCase: "Geospatial analysis simulation", titles: "S&T Directors, Division Chiefs", source: "Federal Agency" },
  { company: "Defense Threat Reduction Agency", sector: "Government", subSector: "Defense", city: "Fort Belvoir", state: "VA", website: "dtra.mil", priority: "High", useCase: "WMD threat modeling", titles: "S&T Directors, Program Managers", source: "Federal Agency" },
  { company: "Missile Defense Agency", sector: "Government", subSector: "Defense", city: "Redstone Arsenal", state: "AL", website: "mda.mil", priority: "Critical", useCase: "Missile defense simulation", titles: "Chief Engineer, Program Directors", source: "Federal Agency" },
  { company: "National Nuclear Security Administration", sector: "Government", subSector: "Energy", city: "Washington", state: "DC", website: "energy.gov/nnsa", priority: "High", useCase: "Nuclear security simulation", titles: "Program Directors, Lab Liaisons", source: "Federal Agency" },

  // National Labs
  { company: "Sandia National Laboratories", sector: "Government", subSector: "Research", city: "Albuquerque", state: "NM", website: "sandia.gov", priority: "Critical", useCase: "National security simulation, systems analysis", titles: "Division Directors, Technical Staff", source: "National Lab" },
  { company: "Los Alamos National Laboratory", sector: "Government", subSector: "Research", city: "Los Alamos", state: "NM", website: "lanl.gov", priority: "Critical", useCase: "Weapons simulation, HPC modeling", titles: "Division Leaders, Program Directors", source: "National Lab" },
  { company: "Lawrence Livermore National Laboratory", sector: "Government", subSector: "Research", city: "Livermore", state: "CA", website: "llnl.gov", priority: "Critical", useCase: "National security computation", titles: "Associate Directors, Program Leaders", source: "National Lab" },
  { company: "Oak Ridge National Laboratory", sector: "Government", subSector: "Research", city: "Oak Ridge", state: "TN", website: "ornl.gov", priority: "High", useCase: "Scientific simulation, AI/ML research", titles: "Division Directors, Group Leaders", source: "National Lab" },
  { company: "Argonne National Laboratory", sector: "Government", subSector: "Research", city: "Lemont", state: "IL", website: "anl.gov", priority: "High", useCase: "Computational science, energy modeling", titles: "Division Directors, Senior Scientists", source: "National Lab" },
  { company: "Pacific Northwest National Laboratory", sector: "Government", subSector: "Research", city: "Richland", state: "WA", website: "pnnl.gov", priority: "High", useCase: "National security analytics", titles: "Division Directors, Technical Group Managers", source: "National Lab" },
  { company: "Idaho National Laboratory", sector: "Government", subSector: "Research", city: "Idaho Falls", state: "ID", website: "inl.gov", priority: "High", useCase: "Nuclear energy simulation", titles: "Division Directors, Program Managers", source: "National Lab" },
  { company: "Brookhaven National Laboratory", sector: "Government", subSector: "Research", city: "Upton", state: "NY", website: "bnl.gov", priority: "Medium", useCase: "Particle physics simulation, data science", titles: "Department Chairs, Group Leaders", source: "National Lab" },

  // FFRDCs and Think Tanks
  { company: "MITRE Corporation", sector: "Government", subSector: "FFRDC", city: "Bedford", state: "MA", website: "mitre.org", priority: "Critical", useCase: "Systems engineering, cyber simulation", titles: "Division Chiefs, Principal Engineers", source: "FFRDC" },
  { company: "RAND Corporation", sector: "Government", subSector: "Think Tank", city: "Santa Monica", state: "CA", website: "rand.org", priority: "Critical", useCase: "Policy simulation, wargaming", titles: "Senior Researchers, Project Leaders", source: "Think Tank" },
  { company: "Institute for Defense Analyses", sector: "Government", subSector: "FFRDC", city: "Alexandria", state: "VA", website: "ida.org", priority: "High", useCase: "Defense analysis, operational testing", titles: "Division Directors, Research Staff", source: "FFRDC" },
  { company: "Center for Naval Analyses", sector: "Government", subSector: "FFRDC", city: "Arlington", state: "VA", website: "cna.org", priority: "High", useCase: "Naval operations research", titles: "Division Directors, Senior Analysts", source: "FFRDC" },
  { company: "Aerospace Corporation", sector: "Government", subSector: "FFRDC", city: "El Segundo", state: "CA", website: "aerospace.org", priority: "High", useCase: "Space systems analysis", titles: "Principal Directors, Senior Scientists", source: "FFRDC" },
  { company: "Center for Strategic and International Studies", sector: "Government", subSector: "Think Tank", city: "Washington", state: "DC", website: "csis.org", priority: "High", useCase: "Strategic simulation, policy analysis", titles: "Senior Fellows, Program Directors", source: "Think Tank" },
  { company: "Atlantic Council", sector: "Government", subSector: "Think Tank", city: "Washington", state: "DC", website: "atlanticcouncil.org", priority: "High", useCase: "Geopolitical scenario planning", titles: "Senior Fellows, Directors", source: "Think Tank" },
  { company: "Brookings Institution", sector: "Government", subSector: "Think Tank", city: "Washington", state: "DC", website: "brookings.edu", priority: "Medium", useCase: "Policy simulation, economic modeling", titles: "Senior Fellows, Program Directors", source: "Think Tank" },
  { company: "Hudson Institute", sector: "Government", subSector: "Think Tank", city: "Washington", state: "DC", website: "hudson.org", priority: "Medium", useCase: "Defense policy simulation", titles: "Senior Fellows, Directors", source: "Think Tank" },
  { company: "Center for a New American Security", sector: "Government", subSector: "Think Tank", city: "Washington", state: "DC", website: "cnas.org", priority: "High", useCase: "National security wargaming", titles: "Senior Fellows, Program Directors", source: "Think Tank" },

  // Small Business Defense Contractors (8(a), HUBZone, SDVOSB)
  { company: "Torch Technologies", sector: "Defense", subSector: "Small Business", city: "Huntsville", state: "AL", website: "torchtechnologies.com", priority: "High", useCase: "Defense simulation, systems engineering", titles: "CEO, VP Technology", source: "Small Business" },
  { company: "Parsons Corporation", sector: "Defense", subSector: "Engineering", city: "Centreville", state: "VA", website: "parsons.com", revenue: 4.2, employees: 16000, priority: "High", useCase: "Defense infrastructure simulation", titles: "CTO, VP Defense", source: "Federal Contractor" },
  { company: "Jacobs Solutions", sector: "Defense", subSector: "Engineering", city: "Dallas", state: "TX", website: "jacobs.com", revenue: 16, employees: 60000, priority: "High", useCase: "Critical infrastructure simulation", titles: "CTO, VP Federal", source: "Federal Contractor" },
  { company: "ManTech International", sector: "Defense", subSector: "IT Services", city: "Herndon", state: "VA", website: "mantech.com", revenue: 2.6, employees: 10000, priority: "High", useCase: "Cyber simulation, IT modernization", titles: "CTO, VP Innovation", source: "Federal Contractor" },
  { company: "CACI International", sector: "Defense", subSector: "IT Services", city: "Reston", state: "VA", website: "caci.com", revenue: 7.1, employees: 23000, priority: "High", useCase: "Intelligence simulation, cyber", titles: "CTO, VP Technology", source: "Federal Contractor" },
  { company: "Peraton", sector: "Defense", subSector: "IT Services", city: "Herndon", state: "VA", website: "peraton.com", revenue: 7, employees: 22000, priority: "High", useCase: "Space, intel, defense simulation", titles: "CTO, SVP Technology", source: "Federal Contractor" },
  { company: "Science Applications International Corporation (SAIC)", sector: "Defense", subSector: "IT Services", city: "Reston", state: "VA", website: "saic.com", revenue: 7.4, employees: 26000, priority: "High", useCase: "Defense IT, simulation", titles: "CTO, VP Innovation", source: "Federal Contractor" },
  { company: "Maxar Technologies", sector: "Defense", subSector: "Space", city: "Westminster", state: "CO", website: "maxar.com", revenue: 1.8, employees: 4600, priority: "High", useCase: "Geospatial simulation, satellite", titles: "CTO, VP Government", source: "Federal Contractor" },
  { company: "Leonardo DRS", sector: "Defense", subSector: "Electronics", city: "Arlington", state: "VA", website: "leonardodrs.com", revenue: 2.8, employees: 8000, priority: "High", useCase: "Combat systems simulation", titles: "CTO, VP Engineering", source: "Federal Contractor" },
  { company: "Sierra Nevada Corporation", sector: "Defense", subSector: "Aerospace", city: "Sparks", state: "NV", website: "sncorp.com", revenue: 2.5, employees: 4500, priority: "High", useCase: "Space systems simulation", titles: "CTO, VP Technology", source: "Federal Contractor" },
  { company: "V2X (Vectrus + Vertex)", sector: "Defense", subSector: "Services", city: "Colorado Springs", state: "CO", website: "v2x.com", revenue: 3.5, employees: 14000, priority: "Medium", useCase: "Base operations simulation", titles: "CTO, VP Innovation", source: "Federal Contractor" },
  { company: "KeyW (Jacobs)", sector: "Defense", subSector: "Cyber", city: "Hanover", state: "MD", website: "keywcorp.com", priority: "High", useCase: "Cyber simulation, intel", titles: "CTO, VP Technology", source: "Federal Contractor" },
  { company: "ECS Federal", sector: "Defense", subSector: "IT Services", city: "Fairfax", state: "VA", website: "ecstech.com", revenue: 1, employees: 3500, priority: "Medium", useCase: "Federal IT modernization", titles: "CTO, VP Federal", source: "Federal Contractor" },
  { company: "Akima", sector: "Defense", subSector: "Services", city: "Herndon", state: "VA", website: "akima.com", revenue: 1.5, employees: 9000, priority: "Medium", useCase: "Federal services, IT", titles: "CEO, VP Technology", source: "Small Business - Alaska Native Corp" },
  { company: "Chenega Corporation", sector: "Defense", subSector: "Services", city: "Anchorage", state: "AK", website: "chenega.com", revenue: 1.2, employees: 6000, priority: "Medium", useCase: "Federal IT, security", titles: "CEO, VP Technology", source: "Small Business - Alaska Native Corp" },
  { company: "Applied Insight", sector: "Defense", subSector: "IT Services", city: "Tysons", state: "VA", website: "youraipartner.com", priority: "High", useCase: "AI/ML for defense", titles: "CEO, CTO", source: "Small Business" },
  { company: "Two Six Technologies", sector: "Defense", subSector: "Cyber", city: "Arlington", state: "VA", website: "twosixtech.com", priority: "High", useCase: "Cyber R&D, AI research", titles: "CEO, CTO", source: "Small Business" },
  { company: "Novetta (Accenture Federal)", sector: "Defense", subSector: "Analytics", city: "McLean", state: "VA", website: "novetta.com", priority: "High", useCase: "Advanced analytics, ML", titles: "CTO, VP Engineering", source: "Federal Contractor" },
  { company: "BlackSky", sector: "Defense", subSector: "Space", city: "Herndon", state: "VA", website: "blacksky.com", priority: "High", useCase: "Geospatial intelligence", titles: "CTO, VP Government", source: "Small Business" },
  { company: "HawkEye 360", sector: "Defense", subSector: "Space", city: "Herndon", state: "VA", website: "he360.com", priority: "High", useCase: "RF geolocation analytics", titles: "CEO, CTO", source: "Small Business" },
  { company: "Spire Global", sector: "Defense", subSector: "Space", city: "Vienna", state: "VA", website: "spire.com", priority: "High", useCase: "Space data analytics", titles: "CTO, VP Government", source: "Small Business" },
  { company: "Planet Labs", sector: "Defense", subSector: "Space", city: "San Francisco", state: "CA", website: "planet.com", revenue: 0.2, employees: 900, priority: "High", useCase: "Earth observation simulation", titles: "CTO, VP Federal", source: "Small Business" },
  { company: "Capella Space", sector: "Defense", subSector: "Space", city: "San Francisco", state: "CA", website: "capellaspace.com", priority: "High", useCase: "SAR imaging analytics", titles: "CEO, CTO", source: "Small Business" },

  // SBA Certified Small Businesses - 8(a)
  { company: "Spathe Systems", sector: "Defense", subSector: "IT Services", city: "Tampa", state: "FL", website: "spathesystems.com", priority: "Medium", useCase: "SOCOM IT, special ops support", titles: "CEO, VP Technology", source: "Small Business - 8(a)" },
  { company: "Govini", sector: "Defense", subSector: "Analytics", city: "Arlington", state: "VA", website: "govini.com", priority: "High", useCase: "Defense market analytics", titles: "CEO, CTO", source: "Small Business" },
  { company: "Rebellion Defense", sector: "Defense", subSector: "AI", city: "Washington", state: "DC", website: "rebelliondefense.com", priority: "Critical", useCase: "Defense AI/ML platform", titles: "CEO, CTO", source: "Defense Tech Startup" },
  { company: "Primer AI", sector: "Defense", subSector: "NLP", city: "San Francisco", state: "CA", website: "primer.ai", priority: "Critical", useCase: "Intel analysis automation", titles: "CEO, CTO", source: "Defense Tech Startup" },
  { company: "Vannevar Labs", sector: "Defense", subSector: "AI", city: "Palo Alto", state: "CA", website: "vannevarlabs.com", priority: "Critical", useCase: "National security AI", titles: "CEO, CTO", source: "Defense Tech Startup" },
  { company: "Epirus", sector: "Defense", subSector: "Directed Energy", city: "Hawthorne", state: "CA", website: "epirusinc.com", priority: "High", useCase: "Counter-drone systems", titles: "CEO, CTO", source: "Defense Tech Startup" },
  { company: "Saronic Technologies", sector: "Defense", subSector: "Autonomy", city: "Austin", state: "TX", website: "saronic.com", priority: "High", useCase: "Autonomous naval systems", titles: "CEO, CTO", source: "Defense Tech Startup" },
  { company: "Hermeus", sector: "Defense", subSector: "Aerospace", city: "Atlanta", state: "GA", website: "hermeus.com", priority: "High", useCase: "Hypersonic aircraft", titles: "CEO, CTO", source: "Defense Tech Startup" },
  { company: "Skydio", sector: "Defense", subSector: "Drones", city: "San Mateo", state: "CA", website: "skydio.com", priority: "High", useCase: "Autonomous drones", titles: "CEO, VP Government", source: "Defense Tech Startup" },
  { company: "Saildrone", sector: "Defense", subSector: "Autonomy", city: "Alameda", state: "CA", website: "saildrone.com", priority: "High", useCase: "Autonomous maritime", titles: "CEO, VP Defense", source: "Defense Tech Startup" },

  // Civilian Federal Agencies
  { company: "GSA 18F / Technology Transformation Services", sector: "Government", subSector: "Technology", city: "Washington", state: "DC", website: "18f.gsa.gov", priority: "High", useCase: "Federal IT modernization", titles: "Executive Director, Directors", source: "Federal Agency" },
  { company: "U.S. Digital Service", sector: "Government", subSector: "Technology", city: "Washington", state: "DC", website: "usds.gov", priority: "High", useCase: "Government tech transformation", titles: "Administrator, Directors", source: "Federal Agency" },
  { company: "Centers for Medicare & Medicaid Services", sector: "Government", subSector: "Healthcare", city: "Baltimore", state: "MD", website: "cms.gov", revenue: 1400, priority: "High", useCase: "Healthcare simulation, fraud detection", titles: "CTO, Chief Data Officer", source: "Federal Agency" },
  { company: "Social Security Administration", sector: "Government", subSector: "Benefits", city: "Baltimore", state: "MD", website: "ssa.gov", priority: "Medium", useCase: "Benefits modeling, fraud detection", titles: "CTO, CIO", source: "Federal Agency" },
  { company: "Internal Revenue Service", sector: "Government", subSector: "Finance", city: "Washington", state: "DC", website: "irs.gov", priority: "Medium", useCase: "Tax modeling, fraud detection", titles: "CTO, Deputy Commissioner IT", source: "Federal Agency" },
  { company: "Federal Emergency Management Agency", sector: "Government", subSector: "Emergency", city: "Washington", state: "DC", website: "fema.gov", priority: "High", useCase: "Disaster simulation, response modeling", titles: "CTO, Chief Data Officer", source: "Federal Agency" },
  { company: "National Weather Service", sector: "Government", subSector: "Science", city: "Silver Spring", state: "MD", website: "weather.gov", priority: "Medium", useCase: "Weather simulation, forecasting", titles: "Director, Chief Scientist", source: "Federal Agency" },
  { company: "U.S. Patent and Trademark Office", sector: "Government", subSector: "IP", city: "Alexandria", state: "VA", website: "uspto.gov", priority: "Medium", useCase: "IP analytics, AI examination", titles: "CTO, CIO", source: "Federal Agency" },
  { company: "Bureau of Labor Statistics", sector: "Government", subSector: "Statistics", city: "Washington", state: "DC", website: "bls.gov", priority: "Medium", useCase: "Economic simulation, forecasting", titles: "Commissioner, Division Chiefs", source: "Federal Agency" },
  { company: "Census Bureau", sector: "Government", subSector: "Statistics", city: "Suitland", state: "MD", website: "census.gov", priority: "Medium", useCase: "Population simulation, synthetic data", titles: "Director, Chief Scientist", source: "Federal Agency" },
];

// Load existing leads
const existingLeads = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
const existingCompanies = new Set(existingLeads.map(l => l.company.toLowerCase()));

// Add new leads (deduped)
let added = 0;
for (const lead of newLeads) {
  if (!existingCompanies.has(lead.company.toLowerCase())) {
    existingLeads.push({
      id: `GOV-${Math.random().toString(36).substr(2, 6)}`,
      company: lead.company,
      sector: lead.sector,
      subSector: lead.subSector || '',
      city: lead.city,
      state: lead.state,
      country: 'USA',
      website: lead.website,
      revenue: lead.revenue || null,
      employees: lead.employees || null,
      priority: lead.priority,
      useCase: lead.useCase,
      titles: lead.titles,
      source: lead.source
    });
    existingCompanies.add(lead.company.toLowerCase());
    added++;
  }
}

// Sort by priority
const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
existingLeads.sort((a, b) => {
  const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  if (pDiff !== 0) return pDiff;
  return a.company.localeCompare(b.company);
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingLeads, null, 2));
console.log(`Added ${added} new government/small business leads. Total: ${existingLeads.length}`);
