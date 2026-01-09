'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatCompactNumber, formatPercentage } from '@lead-engine/shared';
import { Button, Progress } from '@lead-engine/ui';
import {
  Users,
  Sparkles,
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  ArrowRight,
  Play,
} from 'lucide-react';

// Mock data - would come from API
const stats = {
  totalLeads: 1714,
  enrichedLeads: 847,
  contactedLeads: 234,
  repliedLeads: 28,
  meetingsBooked: 6,
};

const recentActivity = [
  { id: 1, type: 'reply', company: 'Lockheed Martin', contact: 'James Smith', time: '2h ago' },
  { id: 2, type: 'enriched', company: 'RTX Corporation', contacts: 3, time: '4h ago' },
  { id: 3, type: 'sent', company: 'Northrop Grumman', count: 5, time: '6h ago' },
  { id: 4, type: 'meeting', company: 'Booz Allen', contact: 'Sarah Chen', time: '1d ago' },
];

const activeSequences = [
  { id: 1, name: 'Defense Initial Outreach', active: 89, replyRate: 12.3 },
  { id: 2, name: 'Healthcare Simulation Intro', active: 67, replyRate: 8.1 },
  { id: 3, name: 'Finance Risk Modeling', active: 45, replyRate: 11.2 },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">
            Overview of your lead generation pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Sparkles className="w-4 h-4" />}>
            Enrich Leads
          </Button>
          <Button variant="primary" icon={<Play className="w-4 h-4" />}>
            New Sequence
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Leads"
          value={stats.totalLeads}
          icon={<Users className="w-5 h-5" />}
          href="/leads"
        />
        <StatCard
          label="Enriched"
          value={stats.enrichedLeads}
          percentage={(stats.enrichedLeads / stats.totalLeads) * 100}
          icon={<Sparkles className="w-5 h-5" />}
          color="info"
        />
        <StatCard
          label="Contacted"
          value={stats.contactedLeads}
          percentage={(stats.contactedLeads / stats.totalLeads) * 100}
          icon={<Mail className="w-5 h-5" />}
          color="warning"
        />
        <StatCard
          label="Replied"
          value={stats.repliedLeads}
          percentage={(stats.repliedLeads / stats.contactedLeads) * 100}
          icon={<MessageSquare className="w-5 h-5" />}
          color="success"
        />
        <StatCard
          label="Meetings"
          value={stats.meetingsBooked}
          icon={<Calendar className="w-5 h-5" />}
          color="primary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="col-span-2 bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <h2 className="text-sm font-medium text-text-primary mb-4">Pipeline Funnel</h2>
          <div className="space-y-3">
            <FunnelRow
              label="Sent"
              value={456}
              percentage={100}
              color="bg-text-tertiary"
            />
            <FunnelRow
              label="Delivered"
              value={442}
              percentage={97}
              color="bg-status-info"
            />
            <FunnelRow
              label="Opened"
              value={267}
              percentage={60}
              color="bg-status-warning"
            />
            <FunnelRow
              label="Replied"
              value={54}
              percentage={12}
              color="bg-status-success"
            />
            <FunnelRow
              label="Meeting Booked"
              value={12}
              percentage={2.6}
              color="bg-accent-primary"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-primary">Recent Activity</h2>
            <Link
              href="/inbox"
              className="text-xs text-accent-primary hover:text-accent-hover"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>

        {/* Active Sequences */}
        <div className="col-span-2 bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-primary">Active Sequences</h2>
            <Link
              href="/sequences"
              className="text-xs text-accent-primary hover:text-accent-hover"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {activeSequences.map((sequence) => (
              <div
                key={sequence.id}
                className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {sequence.name}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {sequence.active} leads active
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-status-success">
                      {formatPercentage(sequence.replyRate)}
                    </div>
                    <div className="text-xs text-text-tertiary">reply rate</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-tertiary" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <h2 className="text-sm font-medium text-text-primary mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction
              icon={<Sparkles className="w-4 h-4" />}
              label="Enrich raw leads"
              description="Find contacts for 867 leads"
              onClick={() => {}}
            />
            <QuickAction
              icon={<Mail className="w-4 h-4" />}
              label="Reply to messages"
              description="4 replies pending"
              onClick={() => {}}
            />
            <QuickAction
              icon={<TrendingUp className="w-4 h-4" />}
              label="Import new leads"
              description="Add more companies"
              onClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  percentage?: number;
  icon: React.ReactNode;
  color?: 'default' | 'info' | 'warning' | 'success' | 'primary';
  href?: string;
}

function StatCard({ label, value, percentage, icon, color = 'default', href }: StatCardProps) {
  const colorClasses = {
    default: 'text-text-tertiary',
    info: 'text-status-info',
    warning: 'text-status-warning',
    success: 'text-status-success',
    primary: 'text-accent-primary',
  };

  const content = (
    <div className="p-4 bg-bg-secondary border border-border-subtle rounded-lg hover:border-border-strong transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className={cn('', colorClasses[color])}>{icon}</span>
        {percentage !== undefined && (
          <span className="text-xs text-text-tertiary">{formatPercentage(percentage)}</span>
        )}
      </div>
      <div className="text-2xl font-semibold text-text-primary">
        {formatCompactNumber(value)}
      </div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface FunnelRowProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

function FunnelRow({ label, value, percentage, color }: FunnelRowProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm text-text-secondary">{label}</div>
      <div className="flex-1">
        <div
          className={cn('h-6 rounded', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-20 text-right">
        <span className="text-sm font-medium text-text-primary">{value}</span>
        <span className="text-xs text-text-tertiary ml-1">({formatPercentage(percentage, 0)})</span>
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: {
    id: number;
    type: string;
    company: string;
    contact?: string;
    contacts?: number;
    count?: number;
    time: string;
  };
}

function ActivityItem({ activity }: ActivityItemProps) {
  const icons = {
    reply: <MessageSquare className="w-4 h-4 text-status-success" />,
    enriched: <Sparkles className="w-4 h-4 text-status-info" />,
    sent: <Mail className="w-4 h-4 text-status-warning" />,
    meeting: <Calendar className="w-4 h-4 text-accent-primary" />,
  };

  const descriptions = {
    reply: `${activity.contact} replied`,
    enriched: `Found ${activity.contacts} contacts`,
    sent: `${activity.count} emails sent`,
    meeting: `Meeting with ${activity.contact}`,
  };

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icons[activity.type as keyof typeof icons]}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{activity.company}</div>
        <div className="text-xs text-text-tertiary">
          {descriptions[activity.type as keyof typeof descriptions]}
        </div>
      </div>
      <div className="text-xs text-text-tertiary">{activity.time}</div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickAction({ icon, label, description, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg hover:bg-bg-elevated transition-colors text-left"
    >
      <div className="text-text-tertiary">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="text-xs text-text-tertiary">{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-text-tertiary" />
    </button>
  );
}
