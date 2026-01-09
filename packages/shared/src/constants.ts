// ============================================================================
// Application Constants
// ============================================================================

export const APP_NAME = 'RLTX Lead Engine';
export const APP_VERSION = '0.1.0';

// ============================================================================
// Pagination
// ============================================================================

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// ============================================================================
// Enrichment
// ============================================================================

export const EMAIL_PATTERNS = [
  '{first}.{last}@{domain}',
  '{f}{last}@{domain}',
  '{first}{l}@{domain}',
  '{first}@{domain}',
  '{first}_{last}@{domain}',
  '{last}.{first}@{domain}',
  '{f}.{last}@{domain}',
  '{first}{last}@{domain}',
] as const;

export const ENRICHMENT_RATE_LIMITS = {
  pattern_guess: { maxPerMinute: 100, maxPerHour: 1000 },
  sec_edgar: { maxPerMinute: 10, maxPerHour: 100 },
  sam_gov: { maxPerMinute: 10, maxPerHour: 100 },
  linkedin: { maxPerMinute: 5, maxPerHour: 50 },
  website: { maxPerMinute: 20, maxPerHour: 200 },
  google: { maxPerMinute: 10, maxPerHour: 100 },
} as const;

// ============================================================================
// Sequences
// ============================================================================

export const DEFAULT_SEQUENCE_SETTINGS = {
  sendingWindow: {
    startHour: 9,
    endHour: 17,
    timezone: 'America/New_York',
  },
  skipWeekends: true,
  maxPerDay: 50,
  stopOnReply: true,
  stopOnBounce: true,
} as const;

export const SEQUENCE_STEP_DELAYS = {
  immediate: 0,
  sameDay: 0,
  nextDay: 1,
  threeDays: 3,
  oneWeek: 7,
  twoWeeks: 14,
} as const;

// ============================================================================
// Priority Config
// ============================================================================

export const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'priority-critical',
    bgColor: 'bg-priority-critical/20',
    textColor: 'text-priority-critical',
    order: 1,
  },
  high: {
    label: 'High',
    color: 'priority-high',
    bgColor: 'bg-priority-high/20',
    textColor: 'text-priority-high',
    order: 2,
  },
  medium: {
    label: 'Medium',
    color: 'priority-medium',
    bgColor: 'bg-priority-medium/20',
    textColor: 'text-priority-medium',
    order: 3,
  },
  low: {
    label: 'Low',
    color: 'priority-low',
    bgColor: 'bg-priority-low/20',
    textColor: 'text-priority-low',
    order: 4,
  },
} as const;

// ============================================================================
// Stage Config
// ============================================================================

export const STAGE_CONFIG = {
  raw: {
    label: 'Raw',
    color: 'text-tertiary',
    dotClass: 'stage-raw',
    order: 1,
  },
  enriched: {
    label: 'Enriched',
    color: 'status-info',
    dotClass: 'stage-enriched',
    order: 2,
  },
  contacted: {
    label: 'Contacted',
    color: 'status-warning',
    dotClass: 'stage-contacted',
    order: 3,
  },
  replied: {
    label: 'Replied',
    color: 'status-success',
    dotClass: 'stage-replied',
    order: 4,
  },
  meeting_booked: {
    label: 'Meeting',
    color: 'accent-primary',
    dotClass: 'stage-meeting',
    order: 5,
  },
  closed_won: {
    label: 'Won',
    color: 'status-success',
    dotClass: 'stage-replied',
    order: 6,
  },
  closed_lost: {
    label: 'Lost',
    color: 'status-error',
    dotClass: 'stage-raw',
    order: 7,
  },
} as const;

// ============================================================================
// Sector Config
// ============================================================================

export const SECTOR_CONFIG = {
  Defense: { icon: '🛡️', color: '#ef4444' },
  Healthcare: { icon: '🏥', color: '#22c55e' },
  Finance: { icon: '💰', color: '#3b82f6' },
  Intelligence: { icon: '🔍', color: '#8b5cf6' },
  Consulting: { icon: '📊', color: '#f97316' },
  Technology: { icon: '💻', color: '#06b6d4' },
  Government: { icon: '🏛️', color: '#64748b' },
  'Supply Chain': { icon: '📦', color: '#eab308' },
  Media: { icon: '📺', color: '#ec4899' },
  Research: { icon: '🔬', color: '#14b8a6' },
  'Private Equity': { icon: '🏦', color: '#6366f1' },
  Other: { icon: '📁', color: '#71717a' },
} as const;

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  // Global
  commandPalette: { key: 'k', meta: true, description: 'Open command palette' },
  showShortcuts: { key: '/', meta: true, description: 'Show keyboard shortcuts' },
  escape: { key: 'Escape', description: 'Close modal / Deselect' },

  // Navigation
  goToDashboard: { key: 'g d', description: 'Go to Dashboard' },
  goToLeads: { key: 'g l', description: 'Go to Leads' },
  goToSequences: { key: 'g s', description: 'Go to Sequences' },
  goToInbox: { key: 'g i', description: 'Go to Inbox' },
  goToSettings: { key: ',', meta: true, description: 'Open Settings' },

  // Lead actions
  moveDown: { key: 'j', description: 'Move to next lead' },
  moveUp: { key: 'k', description: 'Move to previous lead' },
  toggleSelect: { key: 'x', description: 'Toggle select current lead' },
  selectAll: { key: 'a', meta: true, description: 'Select all visible leads' },
  deselectAll: { key: 'a', meta: true, shift: true, description: 'Deselect all' },
  openLead: { key: 'Enter', description: 'Open lead detail' },
  enrichSelected: { key: 'e', meta: true, description: 'Enrich selected leads' },
  startSequence: { key: 's', meta: true, shift: true, description: 'Start sequence' },
  composeEmail: { key: 'e', meta: true, shift: true, description: 'AI compose email' },
  search: { key: '/', description: 'Focus search' },
  filter: { key: 'f', description: 'Open filter menu' },

  // Modal
  confirm: { key: 'Enter', meta: true, description: 'Confirm / Submit' },
  cancel: { key: 'Escape', description: 'Cancel / Close' },
} as const;
