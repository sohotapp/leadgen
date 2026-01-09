'use client';

import * as React from 'react';
import { cn, formatRelativeTime } from '@lead-engine/shared';
import { Button, Badge } from '@lead-engine/ui';
import { Mail, Linkedin, Twitter, MessageSquare, ThumbsUp, ThumbsDown, Minus, Archive, Clock, Reply } from 'lucide-react';

// Mock data
const messages = [
  {
    id: '1',
    company: 'Lockheed Martin',
    contact: 'James Smith',
    title: 'VP Strategy',
    email: 'j.smith@lockheedmartin.com',
    channel: 'email',
    subject: 'Re: Scenario simulation for LM\'s multi-domain ops',
    preview: 'This sounds interesting. Can you send more info on how this integrates with our existing simulation tools? We\'re currently using VBS4 for most training scenarios.',
    sentiment: 'positive',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unread: true,
    needsReply: true,
  },
  {
    id: '2',
    company: 'Northrop Grumman',
    contact: 'Sarah Chen',
    title: 'CTO',
    email: 's.chen@ngc.com',
    channel: 'email',
    subject: 'Re: Defense simulation infrastructure',
    preview: 'Who else are you working with in this space? We\'d need to understand your customer base before proceeding.',
    sentiment: 'neutral',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000),
    unread: true,
    needsReply: true,
  },
  {
    id: '3',
    company: 'Booz Allen Hamilton',
    contact: 'Michael Torres',
    title: 'Partner',
    email: 'm.torres@bah.com',
    channel: 'linkedin',
    subject: 'Connection accepted',
    preview: 'Thanks for connecting! I saw your message about simulation infrastructure. Let\'s find time to chat.',
    sentiment: 'positive',
    time: new Date(Date.now() - 8 * 60 * 60 * 1000),
    unread: false,
    needsReply: true,
  },
  {
    id: '4',
    company: 'RTX Corporation',
    contact: 'Amanda Lee',
    title: 'Director of Innovation',
    email: 'a.lee@rtx.com',
    channel: 'email',
    subject: 'Re: Simulation capabilities for RTX',
    preview: 'Unfortunately we\'re not looking at new vendors right now. Please reach back out in Q2.',
    sentiment: 'negative',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unread: false,
    needsReply: false,
  },
];

export default function InboxPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'needs_reply' | 'positive' | 'negative'>('all');

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'needs_reply') return msg.needsReply;
    if (filter === 'positive') return msg.sentiment === 'positive';
    if (filter === 'negative') return msg.sentiment === 'negative';
    return true;
  });

  const selectedMessage = messages.find((m) => m.id === selectedId);

  return (
    <div className="h-full flex">
      {/* Message List */}
      <div className="w-96 border-r border-border-subtle flex flex-col">
        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === 'needs_reply'}
            onClick={() => setFilter('needs_reply')}
            count={messages.filter((m) => m.needsReply).length}
          >
            Needs Reply
          </FilterButton>
          <FilterButton
            active={filter === 'positive'}
            onClick={() => setFilter('positive')}
          >
            Positive
          </FilterButton>
          <FilterButton
            active={filter === 'negative'}
            onClick={() => setFilter('negative')}
          >
            Negative
          </FilterButton>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto">
          {filteredMessages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              selected={message.id === selectedId}
              onClick={() => setSelectedId(message.id)}
            />
          ))}
        </div>
      </div>

      {/* Message Detail */}
      <div className="flex-1 flex flex-col">
        {selectedMessage ? (
          <MessageDetail message={selectedMessage} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a message to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}

function FilterButton({ active, onClick, count, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs rounded-md border transition-colors',
        active
          ? 'bg-accent-subtle text-accent-primary border-accent-primary'
          : 'bg-bg-secondary text-text-secondary border-border-default hover:border-border-strong'
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1 text-text-tertiary">({count})</span>
      )}
    </button>
  );
}

interface MessageRowProps {
  message: (typeof messages)[0];
  selected: boolean;
  onClick: () => void;
}

function MessageRow({ message, selected, onClick }: MessageRowProps) {
  const channelIcons = {
    email: <Mail className="w-4 h-4" />,
    linkedin: <Linkedin className="w-4 h-4" />,
    twitter: <Twitter className="w-4 h-4" />,
  };

  const sentimentIcons = {
    positive: <ThumbsUp className="w-3 h-3 text-status-success" />,
    negative: <ThumbsDown className="w-3 h-3 text-status-error" />,
    neutral: <Minus className="w-3 h-3 text-text-tertiary" />,
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-3 border-b border-border-subtle cursor-pointer transition-colors',
        selected ? 'bg-accent-subtle' : 'hover:bg-bg-tertiary',
        message.unread && 'bg-bg-secondary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-text-tertiary mt-0.5">
          {channelIcons[message.channel as keyof typeof channelIcons]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-sm', message.unread ? 'font-semibold text-text-primary' : 'text-text-primary')}>
              {message.contact}
            </span>
            <span className="text-xs text-text-tertiary">·</span>
            <span className="text-xs text-text-tertiary truncate">{message.company}</span>
            <span className="ml-auto">{sentimentIcons[message.sentiment as keyof typeof sentimentIcons]}</span>
          </div>
          <div className={cn('text-sm mb-1 truncate', message.unread ? 'font-medium text-text-primary' : 'text-text-secondary')}>
            {message.subject}
          </div>
          <div className="text-xs text-text-tertiary truncate">{message.preview}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-text-tertiary">
              {formatRelativeTime(message.time)}
            </span>
            {message.needsReply && (
              <span className="px-1.5 py-0.5 text-[10px] bg-status-warning/20 text-status-warning rounded">
                Needs Reply
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageDetailProps {
  message: (typeof messages)[0];
}

function MessageDetail({ message }: MessageDetailProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div>
          <h2 className="text-base font-medium text-text-primary">{message.contact}</h2>
          <div className="text-sm text-text-secondary">
            {message.title} at {message.company}
          </div>
          <div className="text-xs text-text-tertiary">{message.email}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<Archive className="w-4 h-4" />} size="sm">
            Archive
          </Button>
          <Button variant="ghost" icon={<Clock className="w-4 h-4" />} size="sm">
            Snooze
          </Button>
        </div>
      </div>

      {/* Message */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <div className="mb-4">
            <div className="text-sm font-medium text-text-primary mb-1">{message.subject}</div>
            <div className="text-xs text-text-tertiary">
              {message.time.toLocaleString()}
            </div>
          </div>
          <div className="text-sm text-text-primary whitespace-pre-wrap">
            {message.preview}
          </div>
        </div>
      </div>

      {/* Reply */}
      <div className="border-t border-border-subtle p-4">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">AI Suggested Reply</span>
            <Button variant="ghost" size="sm">Regenerate</Button>
          </div>
          <div className="text-sm text-text-secondary mb-3">
            {message.sentiment === 'positive'
              ? 'Great question. RLTX complements tools like VBS4—we handle the strategic scenario generation layer while VBS4 handles tactical visualization. Would love to show you a quick demo...'
              : 'Thanks for the feedback. Completely understand. I\'ll make a note to follow up in Q2. In the meantime, feel free to reach out if anything changes...'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Edit</Button>
            <Button variant="primary" icon={<Reply className="w-4 h-4" />} size="sm">
              Send Reply
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
