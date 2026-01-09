'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@lead-engine/shared';
import { CountBadge } from '@lead-engine/ui';
import {
  LayoutDashboard,
  Users,
  Zap,
  Inbox,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
  Heart,
  DollarSign,
  Eye,
  Briefcase,
  Building2,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  shortcut?: string;
  children?: { label: string; href: string; icon?: React.ReactNode; count?: number }[];
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="w-4 h-4" />,
    shortcut: 'G D',
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: <Users className="w-4 h-4" />,
    shortcut: 'G L',
    children: [
      { label: 'All Leads', href: '/leads' },
      { label: 'Defense', href: '/leads?sector=Defense', icon: <Shield className="w-3 h-3" /> },
      { label: 'Healthcare', href: '/leads?sector=Healthcare', icon: <Heart className="w-3 h-3" /> },
      { label: 'Finance', href: '/leads?sector=Finance', icon: <DollarSign className="w-3 h-3" /> },
      { label: 'Intelligence', href: '/leads?sector=Intelligence', icon: <Eye className="w-3 h-3" /> },
      { label: 'Consulting', href: '/leads?sector=Consulting', icon: <Briefcase className="w-3 h-3" /> },
      { label: 'Other Sectors', href: '/leads?sector=Other', icon: <Building2 className="w-3 h-3" /> },
    ],
  },
  {
    label: 'Sequences',
    href: '/sequences',
    icon: <Zap className="w-4 h-4" />,
    shortcut: 'G S',
  },
  {
    label: 'Inbox',
    href: '/inbox',
    icon: <Inbox className="w-4 h-4" />,
    badge: 4,
    shortcut: 'G I',
  },
  {
    label: 'Enrichment',
    href: '/enrich',
    icon: <Sparkles className="w-4 h-4" />,
    shortcut: 'G E',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['Leads']);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]);
  };

  return (
    <aside className="w-[200px] h-screen flex flex-col bg-bg-primary border-r border-border-subtle">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <div className="w-6 h-6 bg-accent-primary rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">R</span>
        </div>
        <span className="font-semibold text-text-primary">RLTX</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navigation.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                    'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                    isActive(item.href) && 'text-text-primary bg-bg-tertiary'
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {expandedItems.includes(item.label) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                {expandedItems.includes(item.label) && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1 text-xs rounded-md transition-colors',
                          'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary',
                          pathname === child.href.split('?')[0] &&
                            pathname.includes(child.href.split('=')[1] || '') &&
                            'text-text-primary bg-bg-tertiary border-l-2 border-l-accent-primary'
                        )}
                      >
                        {child.icon}
                        <span className="flex-1">{child.label}</span>
                        {child.count !== undefined && (
                          <span className="text-[10px] text-text-tertiary">{child.count}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                  'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  isActive(item.href) &&
                    'text-text-primary bg-bg-tertiary border-l-2 border-l-accent-primary -ml-0.5 pl-[14px]'
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && <CountBadge count={item.badge} />}
                {item.shortcut && (
                  <kbd className="text-[9px] text-text-tertiary">{item.shortcut}</kbd>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border-subtle p-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
            'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
            pathname === '/settings' && 'text-text-primary bg-bg-tertiary'
          )}
        >
          <Settings className="w-4 h-4" />
          <span className="flex-1">Settings</span>
          <kbd className="text-[9px] text-text-tertiary">⌘,</kbd>
        </Link>
      </div>
    </aside>
  );
}
