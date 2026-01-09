'use client';

import * as React from 'react';
import { cn, formatRelativeTime } from '@lead-engine/shared';
import { Button, Progress, Spinner } from '@lead-engine/ui';
import { Play, Pause, CheckCircle, XCircle, Clock, Database, Mail, Linkedin, Globe, Search } from 'lucide-react';

// Mock data
const enrichmentJobs = [
  {
    id: '1',
    status: 'completed',
    totalLeads: 47,
    processedLeads: 47,
    startedAt: new Date(Date.now() - 15 * 60 * 1000),
    completedAt: new Date(Date.now() - 10 * 60 * 1000),
    results: {
      emailsFound: 34,
      phonesFound: 12,
      linkedinFound: 42,
    },
    sources: ['pattern_guess', 'sec_edgar', 'linkedin', 'website'],
  },
  {
    id: '2',
    status: 'processing',
    totalLeads: 100,
    processedLeads: 67,
    startedAt: new Date(Date.now() - 5 * 60 * 1000),
    currentLead: 'Boeing Defense Systems',
    currentSource: 'SEC EDGAR',
    results: {
      emailsFound: 45,
      phonesFound: 8,
      linkedinFound: 58,
    },
    sources: ['pattern_guess', 'sec_edgar', 'sam_gov', 'linkedin'],
  },
];

const enrichmentQueue = [
  { id: '3', leadCount: 50, sector: 'Healthcare', status: 'queued' },
  { id: '4', leadCount: 75, sector: 'Finance', status: 'queued' },
];

export default function EnrichmentPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Enrichment</h1>
          <p className="text-sm text-text-secondary">
            Find contact information for your leads
          </p>
        </div>
        <Button variant="primary" icon={<Play className="w-4 h-4" />}>
          New Enrichment Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Total Leads"
          value="1,714"
        />
        <StatCard
          icon={<Mail className="w-5 h-5" />}
          label="Emails Found"
          value="847"
          color="success"
        />
        <StatCard
          icon={<Linkedin className="w-5 h-5" />}
          label="LinkedIn Found"
          value="1,203"
          color="info"
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          label="Enrichment Rate"
          value="62%"
          color="primary"
        />
      </div>

      {/* Active Jobs */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-text-primary mb-3">Active Jobs</h2>
        <div className="space-y-4">
          {enrichmentJobs.map((job) => (
            <EnrichmentJobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      {/* Queue */}
      <div>
        <h2 className="text-sm font-medium text-text-primary mb-3">Queue</h2>
        <div className="space-y-2">
          {enrichmentQueue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-text-tertiary" />
                <div>
                  <div className="text-sm text-text-primary">
                    {item.leadCount} {item.sector} leads
                  </div>
                  <div className="text-xs text-text-tertiary">Waiting in queue</div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Sources Info */}
      <div className="mt-8 p-4 bg-bg-secondary border border-border-subtle rounded-lg">
        <h3 className="text-sm font-medium text-text-primary mb-3">Data Sources</h3>
        <div className="grid grid-cols-2 gap-4">
          <SourceInfo
            name="Email Pattern Guess"
            description="Guess email patterns and verify with SMTP"
            hitRate="~65%"
            speed="Fast"
          />
          <SourceInfo
            name="SEC EDGAR"
            description="Extract executive names from SEC filings"
            hitRate="~40%"
            speed="Medium"
          />
          <SourceInfo
            name="SAM.gov"
            description="Government contractor POC information"
            hitRate="~35%"
            speed="Medium"
          />
          <SourceInfo
            name="LinkedIn"
            description="Public profile information"
            hitRate="~70%"
            speed="Slow"
          />
          <SourceInfo
            name="Company Website"
            description="Scrape team and about pages"
            hitRate="~30%"
            speed="Medium"
          />
          <SourceInfo
            name="Google Search"
            description="Search for leaked emails"
            hitRate="~20%"
            speed="Slow"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: 'default' | 'success' | 'info' | 'primary';
}

function StatCard({ icon, label, value, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-text-tertiary',
    success: 'text-status-success',
    info: 'text-status-info',
    primary: 'text-accent-primary',
  };

  return (
    <div className="p-4 bg-bg-secondary border border-border-subtle rounded-lg">
      <div className={cn('mb-2', colorClasses[color])}>{icon}</div>
      <div className="text-2xl font-semibold text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}

interface EnrichmentJobCardProps {
  job: (typeof enrichmentJobs)[0];
}

function EnrichmentJobCard({ job }: EnrichmentJobCardProps) {
  const isProcessing = job.status === 'processing';
  const progress = (job.processedLeads / job.totalLeads) * 100;

  return (
    <div className="p-4 bg-bg-secondary border border-border-subtle rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Spinner size="sm" />
          ) : job.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-status-success" />
          ) : (
            <XCircle className="w-5 h-5 text-status-error" />
          )}
          <div>
            <div className="text-sm font-medium text-text-primary">
              {isProcessing ? 'Enriching...' : 'Completed'}
            </div>
            <div className="text-xs text-text-tertiary">
              {job.processedLeads} / {job.totalLeads} leads
            </div>
          </div>
        </div>

        {isProcessing && (
          <Button variant="ghost" icon={<Pause className="w-4 h-4" />} size="sm">
            Pause
          </Button>
        )}
      </div>

      {/* Progress */}
      <Progress value={job.processedLeads} max={job.totalLeads} showLabel className="mb-3" />

      {/* Current status */}
      {isProcessing && job.currentLead && (
        <div className="flex items-center gap-2 mb-3 text-xs text-text-tertiary">
          <Search className="w-3 h-3" />
          <span>
            {job.currentLead} · {job.currentSource}
          </span>
        </div>
      )}

      {/* Results */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Mail className="w-3 h-3 text-status-success" />
          <span className="text-text-secondary">{job.results.emailsFound} emails</span>
        </div>
        <div className="flex items-center gap-1">
          <Linkedin className="w-3 h-3 text-status-info" />
          <span className="text-text-secondary">{job.results.linkedinFound} profiles</span>
        </div>
        <div className="text-text-tertiary">
          {job.results.phonesFound} phones
        </div>
      </div>

      {/* Sources used */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
        <span className="text-xs text-text-tertiary">Sources:</span>
        {job.sources.map((source) => (
          <span
            key={source}
            className="px-1.5 py-0.5 text-[10px] bg-bg-tertiary text-text-secondary rounded"
          >
            {source.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

interface SourceInfoProps {
  name: string;
  description: string;
  hitRate: string;
  speed: string;
}

function SourceInfo({ name, description, hitRate, speed }: SourceInfoProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 mt-1.5 bg-accent-primary rounded-full" />
      <div>
        <div className="text-sm font-medium text-text-primary">{name}</div>
        <div className="text-xs text-text-tertiary mb-1">{description}</div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-status-success">{hitRate} hit rate</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-text-tertiary">{speed}</span>
        </div>
      </div>
    </div>
  );
}
