'use client';

import * as React from 'react';
import { cn } from '@lead-engine/shared';
import { Button, Input } from '@lead-engine/ui';
import { Mail, Linkedin, Key, Bell, User, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">
          Configure your account and integrations
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {/* Profile */}
        <SettingsSection
          icon={<User className="w-5 h-5" />}
          title="Profile"
          description="Your account information"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <Input defaultValue="Owen" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email</label>
              <Input defaultValue="owen@rltx.ai" />
            </div>
          </div>
        </SettingsSection>

        {/* Email Integration */}
        <SettingsSection
          icon={<Mail className="w-5 h-5" />}
          title="Email"
          description="Connect your email for outreach"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 rounded flex items-center justify-center">
                  <Mail className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Gmail</div>
                  <div className="text-xs text-text-tertiary">owen@rltx.ai</div>
                </div>
              </div>
              <Button variant="secondary" size="sm">Disconnect</Button>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Daily sending limit
              </label>
              <Input type="number" defaultValue="50" className="w-32" />
              <p className="text-xs text-text-tertiary mt-1">
                Maximum emails to send per day
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* LinkedIn Integration */}
        <SettingsSection
          icon={<Linkedin className="w-5 h-5" />}
          title="LinkedIn"
          description="Connect LinkedIn for multi-channel outreach"
        >
          <div className="p-3 bg-bg-tertiary rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                  <Linkedin className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">LinkedIn</div>
                  <div className="text-xs text-text-tertiary">Not connected</div>
                </div>
              </div>
              <Button variant="primary" size="sm">Connect</Button>
            </div>
          </div>
        </SettingsSection>

        {/* API Keys */}
        <SettingsSection
          icon={<Key className="w-5 h-5" />}
          title="API Keys"
          description="Manage your API integrations"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Anthropic API Key
              </label>
              <Input type="password" placeholder="sk-ant-..." />
              <p className="text-xs text-text-tertiary mt-1">
                Used for AI email generation
              </p>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Database URL
              </label>
              <Input type="password" placeholder="postgres://..." />
            </div>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          icon={<Bell className="w-5 h-5" />}
          title="Notifications"
          description="Configure your notification preferences"
        >
          <div className="space-y-3">
            <NotificationToggle
              label="Email replies"
              description="Get notified when a lead replies"
              defaultChecked
            />
            <NotificationToggle
              label="Enrichment complete"
              description="Get notified when enrichment jobs finish"
              defaultChecked
            />
            <NotificationToggle
              label="Sequence complete"
              description="Get notified when sequences finish"
            />
          </div>
        </SettingsSection>
      </div>

      {/* Save Button */}
      <div className="mt-8 pt-6 border-t border-border-subtle">
        <Button variant="primary" icon={<Save className="w-4 h-4" />}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-text-tertiary">{icon}</div>
        <div>
          <h2 className="text-base font-medium text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="ml-9">{children}</div>
    </div>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  defaultChecked?: boolean;
}

function NotificationToggle({ label, description, defaultChecked }: NotificationToggleProps) {
  const [checked, setChecked] = React.useState(defaultChecked ?? false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-text-primary">{label}</div>
        <div className="text-xs text-text-tertiary">{description}</div>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={cn(
          'w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-accent-primary' : 'bg-bg-tertiary'
        )}
      >
        <div
          className={cn(
            'w-4 h-4 bg-white rounded-full transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
