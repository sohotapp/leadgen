import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lead-engine/db';
import { leads, contacts } from '@lead-engine/db';
import { eq, ilike, and, or, desc, asc, sql, count } from 'drizzle-orm';
import { leadFilterSchema } from '@lead-engine/shared';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query params
    const filters = leadFilterSchema.parse({
      search: searchParams.get('search') || undefined,
      sector: searchParams.get('sector') || undefined,
      priority: searchParams.get('priority') || undefined,
      stage: searchParams.get('stage') || undefined,
      hasContacts: searchParams.get('hasContacts') === 'true'
        ? true
        : searchParams.get('hasContacts') === 'false'
          ? false
          : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
    });

    // Build where conditions
    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          ilike(leads.companyName, `%${filters.search}%`),
          ilike(leads.sector, `%${filters.search}%`),
          ilike(leads.subSector, `%${filters.search}%`)
        )
      );
    }

    if (filters.sector) {
      conditions.push(eq(leads.sector, filters.sector));
    }

    if (filters.priority) {
      conditions.push(eq(leads.rltxPriority, filters.priority as any));
    }

    if (filters.stage) {
      conditions.push(eq(leads.stage, filters.stage as any));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated results with contact counts
    const offset = (filters.page - 1) * filters.limit;

    const result = await db.query.leads.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: filters.limit,
      offset,
      orderBy: filters.sortBy
        ? filters.sortOrder === 'asc'
          ? asc(leads[filters.sortBy as keyof typeof leads] as any)
          : desc(leads[filters.sortBy as keyof typeof leads] as any)
        : desc(leads.createdAt),
      with: {
        contacts: {
          columns: {
            id: true,
            email: true,
            emailVerified: true,
            isPrimary: true,
          },
        },
      },
    });

    // Transform results
    const data = result.map((lead) => ({
      ...lead,
      contactCount: lead.contacts.length,
      primaryContactEmail: lead.contacts.find((c) => c.isPrimary)?.email
        || lead.contacts.find((c) => c.emailVerified)?.email
        || lead.contacts[0]?.email
        || null,
    }));

    // Filter by hasContacts if needed
    const filteredData = filters.hasContacts !== undefined
      ? data.filter((lead) =>
          filters.hasContacts ? lead.contactCount > 0 : lead.contactCount === 0
        )
      : data;

    return NextResponse.json({
      success: true,
      data: filteredData,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newLead = await db.insert(leads).values({
      companyName: body.companyName,
      domain: body.domain,
      sector: body.sector,
      subSector: body.subSector,
      revenue: body.revenue,
      employees: body.employees,
      headquarters: body.headquarters,
      state: body.state,
      website: body.website,
      rltxUseCase: body.rltxUseCase,
      rltxPriority: body.rltxPriority || 'medium',
      targetTitles: body.targetTitles,
      stage: 'raw',
    }).returning();

    return NextResponse.json({
      success: true,
      data: newLead[0],
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
