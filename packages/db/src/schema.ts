import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Enums
// ============================================================================

export const leadStageEnum = pgEnum('lead_stage', [
  'raw',
  'enriched',
  'contacted',
  'replied',
  'meeting_booked',
  'closed_won',
  'closed_lost',
]);

export const priorityEnum = pgEnum('priority', ['critical', 'high', 'medium', 'low']);

export const channelEnum = pgEnum('channel', ['email', 'linkedin', 'twitter', 'phone']);

export const messageStatusEnum = pgEnum('message_status', [
  'draft',
  'queued',
  'sent',
  'delivered',
  'opened',
  'replied',
  'bounced',
  'failed',
]);

export const sequenceStatusEnum = pgEnum('sequence_status', [
  'active',
  'paused',
  'completed',
  'failed',
]);

export const enrichmentSourceEnum = pgEnum('enrichment_source', [
  'pattern_guess',
  'sec_edgar',
  'sam_gov',
  'linkedin',
  'website',
  'google',
  'manual',
]);

// ============================================================================
// Tables
// ============================================================================

// Leads - Core company data
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyName: text('company_name').notNull(),
    domain: text('domain'),
    sector: text('sector').notNull(),
    subSector: text('sub_sector'),
    revenue: integer('revenue'), // in millions USD
    employees: integer('employees'),
    headquarters: text('headquarters'),
    state: text('state'),
    website: text('website'),
    rltxUseCase: text('rltx_use_case'),
    rltxPriority: priorityEnum('rltx_priority').default('medium'),
    targetTitles: jsonb('target_titles').$type<string[]>(),
    stage: leadStageEnum('stage').default('raw'),
    notes: text('notes'),
    sourceFile: text('source_file'), // Which CSV it came from
    externalId: text('external_id'), // Original ID from CSV
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sectorIdx: index('leads_sector_idx').on(table.sector),
    priorityIdx: index('leads_priority_idx').on(table.rltxPriority),
    stageIdx: index('leads_stage_idx').on(table.stage),
    companyDomainIdx: uniqueIndex('leads_company_domain_idx').on(table.companyName, table.domain),
  })
);

// Contacts - Individual people at companies
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    fullName: text('full_name'),
    title: text('title'),
    email: text('email'),
    emailVerified: boolean('email_verified').default(false),
    emailVerifiedAt: timestamp('email_verified_at'),
    emailBounced: boolean('email_bounced').default(false),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    twitterHandle: text('twitter_handle'),
    source: enrichmentSourceEnum('source'),
    confidence: integer('confidence'), // 0-100
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    leadIdIdx: index('contacts_lead_id_idx').on(table.leadId),
    emailIdx: index('contacts_email_idx').on(table.email),
  })
);

// Sequences - Multi-step outreach templates
export const sequences = pgTable('sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  sector: text('sector'), // Optional sector targeting
  steps: jsonb('steps').$type<SequenceStep[]>().notNull(),
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings').$type<SequenceSettings>(),
  stats: jsonb('stats').$type<SequenceStats>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sequence Leads - Tracks lead progress through a sequence
export const sequenceLeads = pgTable(
  'sequence_leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceId: uuid('sequence_id')
      .references(() => sequences.id, { onDelete: 'cascade' })
      .notNull(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    currentStep: integer('current_step').default(0).notNull(),
    status: sequenceStatusEnum('status').default('active'),
    pausedReason: text('paused_reason'),
    nextActionAt: timestamp('next_action_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sequenceIdIdx: index('sequence_leads_sequence_id_idx').on(table.sequenceId),
    leadIdIdx: index('sequence_leads_lead_id_idx').on(table.leadId),
    statusIdx: index('sequence_leads_status_idx').on(table.status),
    nextActionIdx: index('sequence_leads_next_action_idx').on(table.nextActionAt),
  })
);

// Messages - Individual outreach messages
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceLeadId: uuid('sequence_lead_id').references(() => sequenceLeads.id, {
      onDelete: 'cascade',
    }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    channel: channelEnum('channel').notNull(),
    direction: text('direction').default('outbound').notNull(), // outbound, inbound
    subject: text('subject'),
    body: text('body').notNull(),
    status: messageStatusEnum('status').default('draft'),
    stepNumber: integer('step_number'),
    externalId: text('external_id'), // Gmail message ID, etc.
    threadId: text('thread_id'), // For threading replies
    sentiment: text('sentiment'), // positive, negative, neutral
    aiGenerated: boolean('ai_generated').default(false),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    scheduledAt: timestamp('scheduled_at'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    openedAt: timestamp('opened_at'),
    repliedAt: timestamp('replied_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    sequenceLeadIdIdx: index('messages_sequence_lead_id_idx').on(table.sequenceLeadId),
    leadIdIdx: index('messages_lead_id_idx').on(table.leadId),
    statusIdx: index('messages_status_idx').on(table.status),
    directionIdx: index('messages_direction_idx').on(table.direction),
    threadIdIdx: index('messages_thread_id_idx').on(table.threadId),
  })
);

// Enrichment Logs - Track enrichment attempts
export const enrichmentLogs = pgTable(
  'enrichment_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    source: enrichmentSourceEnum('source').notNull(),
    status: text('status').notNull(), // success, failed, no_data
    dataFound: jsonb('data_found').$type<Record<string, unknown>>(),
    contactsCreated: integer('contacts_created').default(0),
    error: text('error'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    leadIdIdx: index('enrichment_logs_lead_id_idx').on(table.leadId),
  })
);

// Email Templates - Reusable email templates
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  sector: text('sector'), // Optional sector targeting
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  aiPrompt: text('ai_prompt'), // Custom prompt for AI generation
  variables: jsonb('variables').$type<string[]>(), // Available variables
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// Relations
// ============================================================================

export const leadsRelations = relations(leads, ({ many }) => ({
  contacts: many(contacts),
  sequenceLeads: many(sequenceLeads),
  messages: many(messages),
  enrichmentLogs: many(enrichmentLogs),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  lead: one(leads, {
    fields: [contacts.leadId],
    references: [leads.id],
  }),
  sequenceLeads: many(sequenceLeads),
  messages: many(messages),
}));

export const sequencesRelations = relations(sequences, ({ many }) => ({
  sequenceLeads: many(sequenceLeads),
}));

export const sequenceLeadsRelations = relations(sequenceLeads, ({ one, many }) => ({
  sequence: one(sequences, {
    fields: [sequenceLeads.sequenceId],
    references: [sequences.id],
  }),
  lead: one(leads, {
    fields: [sequenceLeads.leadId],
    references: [leads.id],
  }),
  contact: one(contacts, {
    fields: [sequenceLeads.contactId],
    references: [contacts.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sequenceLead: one(sequenceLeads, {
    fields: [messages.sequenceLeadId],
    references: [sequenceLeads.id],
  }),
  lead: one(leads, {
    fields: [messages.leadId],
    references: [leads.id],
  }),
  contact: one(contacts, {
    fields: [messages.contactId],
    references: [contacts.id],
  }),
}));

export const enrichmentLogsRelations = relations(enrichmentLogs, ({ one }) => ({
  lead: one(leads, {
    fields: [enrichmentLogs.leadId],
    references: [leads.id],
  }),
}));

// ============================================================================
// Types
// ============================================================================

export interface SequenceStep {
  id: string;
  type: 'email' | 'linkedin_connect' | 'linkedin_message' | 'twitter_dm' | 'wait';
  delayDays: number;
  templateId?: string;
  subject?: string;
  body?: string;
  aiPrompt?: string;
}

export interface SequenceSettings {
  sendingWindow: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
  skipWeekends: boolean;
  maxPerDay: number;
  stopOnReply: boolean;
  stopOnBounce: boolean;
}

export interface SequenceStats {
  totalEnrolled: number;
  active: number;
  completed: number;
  replied: number;
  bounced: number;
  meetingsBooked: number;
}

// Export types from schema
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type SequenceLead = typeof sequenceLeads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type EnrichmentLog = typeof enrichmentLogs.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
