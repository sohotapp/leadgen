import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lead-engine/db';
import { leads, contacts, enrichmentLogs } from '@lead-engine/db';
import { eq, inArray } from 'drizzle-orm';
import { enrichRequestSchema, generateEmailPatterns, extractDomainFromUrl } from '@lead-engine/shared';

// Email verification via SMTP check (simplified)
async function verifyEmail(email: string): Promise<boolean> {
  // In production, this would do actual SMTP verification
  // For now, we'll simulate with basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  // Simulate verification delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulate ~70% verification rate
  return Math.random() > 0.3;
}

// Pattern guess enrichment
async function enrichWithPatternGuess(
  leadData: { id: string; companyName: string; domain: string | null; website: string | null; targetTitles: string[] | null },
): Promise<{ contacts: any[]; log: any }> {
  const startTime = Date.now();
  const foundContacts: any[] = [];

  const domain = leadData.domain || extractDomainFromUrl(leadData.website || '');

  if (!domain) {
    return {
      contacts: [],
      log: {
        leadId: leadData.id,
        source: 'pattern_guess',
        status: 'no_data',
        error: 'No domain found',
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Generate common executive names for target titles
  const commonFirstNames = ['John', 'Michael', 'James', 'David', 'Robert', 'Sarah', 'Jennifer', 'Lisa', 'Michelle', 'Emily'];
  const commonLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];

  // Try a few combinations
  for (let i = 0; i < 3; i++) {
    const firstName = commonFirstNames[Math.floor(Math.random() * commonFirstNames.length)];
    const lastName = commonLastNames[Math.floor(Math.random() * commonLastNames.length)];

    const patterns = generateEmailPatterns(firstName, lastName, domain);

    for (const email of patterns.slice(0, 2)) {
      const verified = await verifyEmail(email);

      if (verified) {
        foundContacts.push({
          leadId: leadData.id,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`,
          title: leadData.targetTitles?.[0] || 'Executive',
          email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          source: 'pattern_guess',
          confidence: 70,
          isPrimary: foundContacts.length === 0,
        });
        break;
      }
    }

    if (foundContacts.length >= 2) break;
  }

  return {
    contacts: foundContacts,
    log: {
      leadId: leadData.id,
      source: 'pattern_guess',
      status: foundContacts.length > 0 ? 'success' : 'no_data',
      dataFound: { emailsFound: foundContacts.length },
      contactsCreated: foundContacts.length,
      durationMs: Date.now() - startTime,
    },
  };
}

// SEC EDGAR enrichment (simplified simulation)
async function enrichWithSECEdgar(
  leadData: { id: string; companyName: string; domain: string | null },
): Promise<{ contacts: any[]; log: any }> {
  const startTime = Date.now();

  // Simulate SEC lookup delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate finding executive names ~40% of the time
  if (Math.random() > 0.6) {
    return {
      contacts: [],
      log: {
        leadId: leadData.id,
        source: 'sec_edgar',
        status: 'no_data',
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Simulate found executives
  const executives = [
    { firstName: 'Robert', lastName: 'CEO', title: 'Chief Executive Officer' },
    { firstName: 'Jennifer', lastName: 'CFO', title: 'Chief Financial Officer' },
  ];

  const domain = leadData.domain;
  const foundContacts = [];

  if (domain) {
    for (const exec of executives) {
      const email = `${exec.firstName.toLowerCase()}.${exec.lastName.toLowerCase()}@${domain}`;
      foundContacts.push({
        leadId: leadData.id,
        firstName: exec.firstName,
        lastName: exec.lastName,
        fullName: `${exec.firstName} ${exec.lastName}`,
        title: exec.title,
        email,
        emailVerified: false,
        source: 'sec_edgar',
        confidence: 60,
      });
    }
  }

  return {
    contacts: foundContacts,
    log: {
      leadId: leadData.id,
      source: 'sec_edgar',
      status: foundContacts.length > 0 ? 'success' : 'no_data',
      dataFound: { executivesFound: foundContacts.length },
      contactsCreated: foundContacts.length,
      durationMs: Date.now() - startTime,
    },
  };
}

// LinkedIn enrichment (simplified simulation)
async function enrichWithLinkedIn(
  leadData: { id: string; companyName: string; targetTitles: string[] | null },
): Promise<{ contacts: any[]; log: any }> {
  const startTime = Date.now();

  // Simulate LinkedIn search delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simulate finding profiles ~70% of the time
  if (Math.random() > 0.3) {
    const foundContacts = [{
      leadId: leadData.id,
      firstName: 'LinkedIn',
      lastName: 'User',
      fullName: 'LinkedIn User',
      title: leadData.targetTitles?.[0] || 'Director',
      linkedinUrl: `https://linkedin.com/in/${leadData.companyName.toLowerCase().replace(/\s+/g, '-')}-exec`,
      source: 'linkedin',
      confidence: 80,
    }];

    return {
      contacts: foundContacts,
      log: {
        leadId: leadData.id,
        source: 'linkedin',
        status: 'success',
        dataFound: { profilesFound: 1 },
        contactsCreated: 1,
        durationMs: Date.now() - startTime,
      },
    };
  }

  return {
    contacts: [],
    log: {
      leadId: leadData.id,
      source: 'linkedin',
      status: 'no_data',
      durationMs: Date.now() - startTime,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds, sources, options } = enrichRequestSchema.parse(body);

    // Get lead data
    const leadsData = await db.query.leads.findMany({
      where: inArray(leads.id, leadIds),
      columns: {
        id: true,
        companyName: true,
        domain: true,
        website: true,
        targetTitles: true,
      },
      with: {
        contacts: {
          columns: { id: true },
        },
      },
    });

    // Filter out leads that already have contacts if skipExisting is true
    const leadsToEnrich = options?.skipExisting
      ? leadsData.filter((lead) => lead.contacts.length === 0)
      : leadsData;

    const results = {
      processed: 0,
      contactsFound: 0,
      emailsFound: 0,
      linkedinFound: 0,
      phonesFound: 0,
    };

    // Process each lead
    for (const lead of leadsToEnrich) {
      const allContacts: any[] = [];
      const allLogs: any[] = [];

      // Run enrichment sources
      for (const source of sources) {
        let enrichmentResult;

        switch (source) {
          case 'pattern_guess':
            enrichmentResult = await enrichWithPatternGuess(lead);
            break;
          case 'sec_edgar':
            enrichmentResult = await enrichWithSECEdgar(lead);
            break;
          case 'linkedin':
            enrichmentResult = await enrichWithLinkedIn(lead);
            break;
          default:
            continue;
        }

        allContacts.push(...enrichmentResult.contacts);
        allLogs.push(enrichmentResult.log);

        // Respect maxContactsPerLead
        if (options?.maxContactsPerLead && allContacts.length >= options.maxContactsPerLead) {
          break;
        }
      }

      // Insert contacts
      if (allContacts.length > 0) {
        const contactsToInsert = allContacts.slice(0, options?.maxContactsPerLead || 5);
        await db.insert(contacts).values(contactsToInsert);

        results.contactsFound += contactsToInsert.length;
        results.emailsFound += contactsToInsert.filter((c) => c.email).length;
        results.linkedinFound += contactsToInsert.filter((c) => c.linkedinUrl).length;

        // Update lead stage to enriched
        await db.update(leads)
          .set({ stage: 'enriched', updatedAt: new Date() })
          .where(eq(leads.id, lead.id));
      }

      // Insert enrichment logs
      if (allLogs.length > 0) {
        await db.insert(enrichmentLogs).values(allLogs);
      }

      results.processed++;
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Enriched ${results.processed} leads. Found ${results.contactsFound} contacts.`,
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enrich leads' },
      { status: 500 }
    );
  }
}
