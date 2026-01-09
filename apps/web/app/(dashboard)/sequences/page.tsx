'use client';

import * as React from 'react';
import { cn, formatPercentage } from '@lead-engine/shared';
import { Button, Progress } from '@lead-engine/ui';
import { Plus, Play, Pause, MoreHorizontal, Mail, Linkedin, Clock } from 'lucide-react';

// Mock data
const sequences = [
  {
    id: '1',
    name: 'Defense Initial Outreach',
    description: '5-step sequence for defense contractors',
    status: 'active',
    steps: [
      { type: 'email', delay: 0 },
      { type: 'linkedin', delay: 3 },
      { type: 'email', delay: 4 },
      { type: 'linkedin', delay: 5 },
      { type: 'email', delay: 6 },
    ],
    stats: {
      enrolled: 89,
      active: 67,
      completed: 12,
      replied: 11,
      bounced: 3,
    },
  },
  {
    id: '2',
    name: 'Healthcare Simulation Intro',
    description: '4-step sequence for healthcare companies',
    status: 'active',
    steps: [
      { type: 'email', delay: 0 },
      { type: 'email', delay: 3 },
      { type: 'linkedin', delay: 5 },
      { type: 'email', delay: 7 },
    ],
    stats: {
      enrolled: 67,
      active: 45,
      completed: 15,
      replied: 5,
      bounced: 2,
    },
  },
  {
    id: '3',
    name: 'Finance Risk Modeling',
    description: '4-step sequence for financial services',
    status: 'paused',
    steps: [
      { type: 'email', delay: 0 },
      { type: 'linkedin', delay: 2 },
      { type: 'email', delay: 5 },
      { type: 'email', delay: 10 },
    ],
    stats: {
      enrolled: 45,
      active: 0,
      completed: 30,
      replied: 5,
      bounced: 1,
    },
  },
];

export default function SequencesPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Sequences</h1>
          <p className="text-sm text-text-secondary">
            Automated multi-step outreach campaigns
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
          New Sequence
        </Button>
      </div>

      {/* Sequence List */}
      <div className="space-y-4">
        {sequences.map((sequence) => (
          <SequenceCard key={sequence.id} sequence={sequence} />
        ))}
      </div>
    </div>
  );
}

interface SequenceCardProps {
  sequence: (typeof sequences)[0];
}

function SequenceCard({ sequence }: SequenceCardProps) {
  const replyRate = (sequence.stats.replied / sequence.stats.enrolled) * 100;
  const completionRate = (sequence.stats.completed / sequence.stats.enrolled) * 100;

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-text-primary">{sequence.name}</h3>
            <span
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium uppercase rounded',
                sequence.status === 'active'
                  ? 'bg-status-success/20 text-status-success'
                  : 'bg-status-warning/20 text-status-warning'
              )}
            >
              {sequence.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">{sequence.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {sequence.status === 'active' ? (
            <Button variant="secondary" icon={<Pause className="w-4 h-4" />} size="sm">
              Pause
            </Button>
          ) : (
            <Button variant="secondary" icon={<Play className="w-4 h-4" />} size="sm">
              Resume
            </Button>
          )}
          <Button variant="ghost" icon={<MoreHorizontal className="w-4 h-4" />} size="sm" />
        </div>
      </div>

      {/* Steps visualization */}
      <div className="flex items-center gap-1 mb-4">
        {sequence.steps.map((step, i) => (
          <React.Fragment key={i}>
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full',
                'bg-bg-tertiary border border-border-default'
              )}
            >
              {step.type === 'email' ? (
                <Mail className="w-4 h-4 text-text-secondary" />
              ) : (
                <Linkedin className="w-4 h-4 text-text-secondary" />
              )}
            </div>
            {i < sequence.steps.length - 1 && (
              <div className="flex items-center gap-1 px-1">
                <div className="w-8 h-px bg-border-default" />
                <span className="text-[10px] text-text-tertiary">{step.delay}d</span>
                <div className="w-8 h-px bg-border-default" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div>
          <div className="text-lg font-semibold text-text-primary">
            {sequence.stats.enrolled}
          </div>
          <div className="text-xs text-text-tertiary">Enrolled</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-status-info">
            {sequence.stats.active}
          </div>
          <div className="text-xs text-text-tertiary">Active</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-text-secondary">
            {sequence.stats.completed}
          </div>
          <div className="text-xs text-text-tertiary">Completed</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-status-success">
            {sequence.stats.replied}
          </div>
          <div className="text-xs text-text-tertiary">
            Replied ({formatPercentage(replyRate)})
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold text-status-error">
            {sequence.stats.bounced}
          </div>
          <div className="text-xs text-text-tertiary">Bounced</div>
        </div>
      </div>
    </div>
  );
}
