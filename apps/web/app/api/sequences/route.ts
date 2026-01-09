import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lead-engine/db';
import { sequences, sequenceLeads, leads, contacts } from '@lead-engine/db';
import { eq, inArray, and, desc } from 'drizzle-orm';
import { addBusinessDays } from '@lead-engine/shared';

// Get all sequences
export async function GET(request: NextRequest) {
  try {
    const result = await db.query.sequences.findMany({
      orderBy: desc(sequences.createdAt),
      with: {
        sequenceLeads: {
          columns: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Calculate stats for each sequence
    const data = result.map((sequence) => {
      const stats = {
        enrolled: sequence.sequenceLeads.length,
        active: sequence.sequenceLeads.filter((sl) => sl.status === 'active').length,
        completed: sequence.sequenceLeads.filter((sl) => sl.status === 'completed').length,
        paused: sequence.sequenceLeads.filter((sl) => sl.status === 'paused').length,
      };

      return {
        ...sequence,
        stats,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sequences' },
      { status: 500 }
    );
  }
}

// Create a new sequence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newSequence = await db.insert(sequences).values({
      name: body.name,
      description: body.description,
      sector: body.sector,
      steps: body.steps || [
        { id: '1', type: 'email', delayDays: 0 },
        { id: '2', type: 'linkedin_connect', delayDays: 3 },
        { id: '3', type: 'email', delayDays: 4 },
        { id: '4', type: 'linkedin_message', delayDays: 5 },
        { id: '5', type: 'email', delayDays: 6 },
      ],
      settings: body.settings || {
        sendingWindow: {
          startHour: 9,
          endHour: 17,
          timezone: 'America/New_York',
        },
        skipWeekends: true,
        maxPerDay: 50,
        stopOnReply: true,
        stopOnBounce: true,
      },
      isActive: true,
    }).returning();

    return NextResponse.json({
      success: true,
      data: newSequence[0],
    });
  } catch (error) {
    console.error('Error creating sequence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sequence' },
      { status: 500 }
    );
  }
}

// Enroll leads in a sequence
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequenceId, leadIds } = body;

    if (!sequenceId || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Get sequence
    const sequence = await db.query.sequences.findFirst({
      where: eq(sequences.id, sequenceId),
    });

    if (!sequence) {
      return NextResponse.json(
        { success: false, error: 'Sequence not found' },
        { status: 404 }
      );
    }

    // Get leads with their primary contacts
    const leadsToEnroll = await db.query.leads.findMany({
      where: inArray(leads.id, leadIds),
      with: {
        contacts: {
          where: eq(contacts.isPrimary, true),
          limit: 1,
        },
      },
    });

    // Filter leads that have contacts
    const enrollableLeads = leadsToEnroll.filter((lead) => lead.contacts.length > 0);

    if (enrollableLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No leads with contacts to enroll' },
        { status: 400 }
      );
    }

    // Calculate first action time
    const now = new Date();
    const firstActionAt = addBusinessDays(now, 0);
    firstActionAt.setHours(9, 0, 0, 0); // Set to 9 AM

    // Create sequence lead entries
    const sequenceLeadEntries = enrollableLeads.map((lead) => ({
      sequenceId,
      leadId: lead.id,
      contactId: lead.contacts[0]?.id,
      currentStep: 0,
      status: 'active' as const,
      nextActionAt: firstActionAt,
    }));

    const enrolled = await db.insert(sequenceLeads)
      .values(sequenceLeadEntries)
      .onConflictDoNothing()
      .returning();

    // Update lead stages to contacted
    await db.update(leads)
      .set({ stage: 'contacted', updatedAt: new Date() })
      .where(inArray(leads.id, enrollableLeads.map((l) => l.id)));

    return NextResponse.json({
      success: true,
      data: {
        enrolled: enrolled.length,
        skipped: leadIds.length - enrolled.length,
        noContacts: leadsToEnroll.length - enrollableLeads.length,
      },
      message: `Enrolled ${enrolled.length} leads in sequence.`,
    });
  } catch (error) {
    console.error('Error enrolling leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enroll leads' },
      { status: 500 }
    );
  }
}
