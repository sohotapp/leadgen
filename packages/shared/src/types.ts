import { z } from 'zod';

// ============================================================================
// Lead Types
// ============================================================================

export const LeadStage = {
  RAW: 'raw',
  ENRICHED: 'enriched',
  CONTACTED: 'contacted',
  REPLIED: 'replied',
  MEETING_BOOKED: 'meeting_booked',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const;

export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

export const Priority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

export const Channel = {
  EMAIL: 'email',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  PHONE: 'phone',
} as const;

export type Channel = (typeof Channel)[keyof typeof Channel];

export const MessageStatus = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  REPLIED: 'replied',
  BOUNCED: 'bounced',
  FAILED: 'failed',
} as const;

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const EnrichmentSource = {
  PATTERN_GUESS: 'pattern_guess',
  SEC_EDGAR: 'sec_edgar',
  SAM_GOV: 'sam_gov',
  LINKEDIN: 'linkedin',
  WEBSITE: 'website',
  GOOGLE: 'google',
  MANUAL: 'manual',
} as const;

export type EnrichmentSource = (typeof EnrichmentSource)[keyof typeof EnrichmentSource];

// ============================================================================
// Sector Types
// ============================================================================

export const Sector = {
  DEFENSE: 'Defense',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  INTELLIGENCE: 'Intelligence',
  CONSULTING: 'Consulting',
  TECHNOLOGY: 'Technology',
  GOVERNMENT: 'Government',
  SUPPLY_CHAIN: 'Supply Chain',
  MEDIA: 'Media',
  RESEARCH: 'Research',
  PRIVATE_EQUITY: 'Private Equity',
  OTHER: 'Other',
} as const;

export type Sector = (typeof Sector)[keyof typeof Sector];

// ============================================================================
// Validation Schemas
// ============================================================================

export const leadFilterSchema = z.object({
  search: z.string().optional(),
  sector: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  stage: z.enum(['raw', 'enriched', 'contacted', 'replied', 'meeting_booked', 'closed_won', 'closed_lost']).optional(),
  hasContacts: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type LeadFilter = z.infer<typeof leadFilterSchema>;

export const enrichRequestSchema = z.object({
  leadIds: z.array(z.string().uuid()),
  sources: z.array(z.enum(['pattern_guess', 'sec_edgar', 'sam_gov', 'linkedin', 'website', 'google'])),
  options: z.object({
    skipExisting: z.boolean().default(true),
    maxContactsPerLead: z.number().min(1).max(10).default(5),
  }).optional(),
});

export type EnrichRequest = z.infer<typeof enrichRequestSchema>;

export const composeRequestSchema = z.object({
  leadId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  tone: z.enum(['direct', 'casual', 'formal', 'curious']).default('direct'),
  customInstructions: z.string().optional(),
});

export type ComposeRequest = z.infer<typeof composeRequestSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadWithContacts {
  id: string;
  companyName: string;
  domain: string | null;
  sector: string;
  subSector: string | null;
  revenue: number | null;
  employees: number | null;
  headquarters: string | null;
  state: string | null;
  website: string | null;
  rltxUseCase: string | null;
  rltxPriority: Priority;
  targetTitles: string[] | null;
  stage: LeadStage;
  notes: string | null;
  contactCount: number;
  contacts: ContactSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactSummary {
  id: string;
  fullName: string | null;
  title: string | null;
  email: string | null;
  emailVerified: boolean;
  linkedinUrl: string | null;
  isPrimary: boolean;
}

// ============================================================================
// Job Types
// ============================================================================

export interface EnrichmentJob {
  id: string;
  leadId: string;
  sources: EnrichmentSource[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    currentSource?: string;
  };
  result?: {
    contactsFound: number;
    emailsFound: number;
    phonesFound: number;
    linkedinFound: number;
  };
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SequenceJob {
  id: string;
  sequenceLeadId: string;
  step: number;
  channel: Channel;
  scheduledAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
