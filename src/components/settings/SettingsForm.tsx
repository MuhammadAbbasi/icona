'use client';

import { useState, useEffect } from 'react';
import {
  User, Bell, Settings2, ShieldCheck, Mail, Phone, MapPin, Loader2, Sparkles,
  AlertTriangle, CheckCircle, RefreshCw, MessageSquare, Send, Share2, Link2, Check, Play, UserCheck, SendHorizontal, ToggleRight, Layers, Sliders
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';

interface SettingsData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    position: string | null;
    department: string | null;
    role: string;
    taskAssignNotifications: boolean;
    dailyTaskDigest: boolean;
    weeklyClientUpdates: boolean;
    projectCompletionAlert: boolean;
  };
  system: Record<string, string> | null;
}

export function SettingsForm() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'integrations' | 'features' | 'system'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [runningCron, setRunningCron] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState<SettingsData | null>(null);

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Personal Preference Toggles
  const [taskAssign, setTaskAssign] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklyClient, setWeeklyClient] = useState(true);
  const [completionAlert, setCompletionAlert] = useState(true);

  // Global System Settings State
  const [forgotEmail, setForgotEmail] = useState('');
  const [globalWeekly, setGlobalWeekly] = useState(true);
  const [budgetThreshold, setBudgetThreshold] = useState('90');
  const [minTxnAmount, setMinTxnAmount] = useState('100000');

  // Company Integration Credentials State (WhatsApp, Telegram, Slack, Odoo, Notion)
  const [useCustomWhatsapp, setUseCustomWhatsapp] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waWabaId, setWaWabaId] = useState('');
  const [waSenderPhone, setWaSenderPhone] = useState('');
  const [waToken, setWaToken] = useState('');
  const [testWaRecipient, setTestWaRecipient] = useState('+923211234567');

  const [useCustomTelegram, setUseCustomTelegram] = useState(false);
  const [tgBotUsername, setTgBotUsername] = useState('');
  const [tgBotToken, setTgBotToken] = useState('');
  const [trustedUsersList, setTrustedUsersList] = useState('');
  const [testTgTargetUser, setTestTgTargetUser] = useState('');

  const [slackWebhook, setSlackWebhook] = useState('');
  const [odooEndpoint, setOdooEndpoint] = useState('');
  const [notionToken, setNotionToken] = useState('');

  // Company Feature Matrix Toggles
  const [orgAiCopilot, setOrgAiCopilot] = useState(true);
  const [orgRomanUrdu, setOrgRomanUrdu] = useState(true);
  const [orgWhatsapp, setOrgWhatsapp] = useState(true);
  const [orgTelegram, setOrgTelegram] = useState(true);
  const [orgOdoo, setOrgOdoo] = useState(true);
  const [orgSlack, setOrgSlack] = useState(true);
  const [orgNotion, setOrgNotion] = useState(true);
  const [orgPrefilledModals, setOrgPrefilledModals] = useState(true);
  const [orgDeadlineEmails, setOrgDeadlineEmails] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json: SettingsData = await res.json();
          setData(json);
          
          setName(json.user.name || '');
          setPhone(json.user.phone || '');
          setAddress(json.user.address || '');

          setTaskAssign(json.user.taskAssignNotifications);
          setDailyDigest(json.user.dailyTaskDigest);
          setWeeklyClient(json.user.weeklyClientUpdates);
          setCompletionAlert(json.user.projectCompletionAlert);

          if (json.system) {
            setForgotEmail(json.system.forgot_password_email || '');
            setGlobalWeekly(json.system.global_weekly_client_updates === 'true');
            setBudgetThreshold(json.system.global_budget_alert_threshold || '90');
            setMinTxnAmount(json.system.global_min_txn_alert_amount || '100000');

            setUseCustomWhatsapp(json.system.use_custom_whatsapp === 'true');
            setWaPhoneId(json.system.whatsapp_phone_number_id || '');
            setWaWabaId(json.system.whatsapp_waba_id || '');
            setWaSenderPhone(json.system.whatsapp_sender_phone || '');
            setWaToken(json.system.whatsapp_access_token || '');
            setTestWaRecipient(json.system.test_wa_recipient || '+923211234567');

            setUseCustomTelegram(json.system.use_custom_telegram_bot === 'true');
            setTgBotUsername(json.system.telegram_bot_username || '');
            setTgBotToken(json.system.telegram_bot_token || '');
            setTrustedUsersList(json.system.trusted_telegram_users || '');
            setTestTgTargetUser(json.system.test_tg_target_user || '');

            setSlackWebhook(json.system.slack_webhook_url || '');
            setOdooEndpoint(json.system.odoo_sync_endpoint || '');
            setNotionToken(json.system.notion_integration_token || '');

            setOrgAiCopilot(json.system.org_flag_ai_copilot !== 'false');
            setOrgRomanUrdu(json.system.org_flag_roman_urdu !== 'false');
            setOrgWhatsapp(json.system.org_flag_whatsapp !== 'false');
            setOrgTelegram(json.system.org_flag_telegram !== 'false');
            setOrgOdoo(json.system.org_flag_odoo !== 'false');
            setOrgSlack(json.system.org_flag_slack !== 'false');
            setOrgNotion(json.system.org_flag_notion !== 'false');
            setOrgPrefilledModals(json.system.org_flag_prefilled_modals !== 'false');
            setOrgDeadlineEmails(json.system.org_flag_deadline_emails !== 'false');
          }
        } else {
          setError('Failed to fetch workspace settings.');
        }
      } catch (err) {
        setError('Network error loading settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPreferences: { name, phone, address },
        }),
      });

      if (res.ok) {
        setSuccess('Profile details saved successfully.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save profile details.');
      }
    } catch {
      setError('Network error saving profile details.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPreferences: {
            taskAssignNotifications: taskAssign,
            dailyTaskDigest: dailyDigest,
            weeklyClientUpdates: weeklyClient,
            projectCompletionAlert: completionAlert,
          },
        }),
      });

      if (res.ok) {
        setSuccess('Notification preferences updated.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to update preferences.');
      }
    } catch {
      setError('Network error saving preferences.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSystem() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemSettings: {
            forgot_password_email: forgotEmail.trim(),
            global_weekly_client_updates: String(globalWeekly),
            global_budget_alert_threshold: budgetThreshold,
            global_min_txn_alert_amount: minTxnAmount,
          },
        }),
      });

      if (res.ok) {
        setSuccess('Global system configuration updated.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save global settings.');
      }
    } catch {
      setError('Network error saving system settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveIntegrations() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemSettings: {
            use_custom_whatsapp: String(useCustomWhatsapp),
            whatsapp_phone_number_id: waPhoneId.trim(),
            whatsapp_waba_id: waWabaId.trim(),
            whatsapp_sender_phone: waSenderPhone.trim(),
            whatsapp_access_token: waToken.trim(),
            use_custom_telegram_bot: String(useCustomTelegram),
            telegram_bot_username: tgBotUsername.trim(),
            telegram_bot_token: tgBotToken.trim(),
            trusted_telegram_users: trustedUsersList.trim(),
            test_tg_target_user: testTgTargetUser.trim(),
            test_wa_recipient: testWaRecipient.trim(),
            slack_webhook_url: slackWebhook.trim(),
            odoo_sync_endpoint: odooEndpoint.trim(),
            notion_integration_token: notionToken.trim(),
          },
        }),
      });

      if (res.ok) {
        setSuccess('Company messaging & integration credentials saved successfully.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save company integrations.');
      }
    } catch {
      setError('Network error saving integration credentials.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOrgFeatureFlags() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemSettings: {
            org_flag_ai_copilot: String(orgAiCopilot),
            org_flag_roman_urdu: String(orgRomanUrdu),
            org_flag_whatsapp: String(orgWhatsapp),
            org_flag_telegram: String(orgTelegram),
            org_flag_odoo: String(orgOdoo),
            org_flag_slack: String(orgSlack),
            org_flag_notion: String(orgNotion),
            org_flag_prefilled_modals: String(orgPrefilledModals),
            org_flag_deadline_emails: String(orgDeadlineEmails),
          },
        }),
      });

      if (res.ok) {
        setSuccess('Organization feature flags & control matrix updated successfully.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save organization feature matrix.');
      }
    } catch {
      setError('Network error saving feature matrix.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(channel: string, payload: any) {
    setTestingChannel(channel);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, ...payload }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (channel === 'telegram' && json.resolvedChatId) {
          setTestTgTargetUser(String(json.resolvedChatId));
        }
        setSuccess(json.message);
      } else {
        setError(json.message || json.error || `Verification failed for ${channel}.`);
      }
    } catch {
      setError(`Network error verifying ${channel} connection.`);
    } finally {
      setTestingChannel(null);
    }
  }

  async function triggerDeadlineCron() {
    setRunningCron(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/cron/check-deadlines');
      const resJson = await res.json().catch(() => ({}));
      
      if (res.ok) {
        if (resJson.result?.simulated) {
          setSuccess('Deadline report run completed. [SMTP Simulated] Check the server logs for printout.');
        } else {
          setSuccess('Deadline check execution completed. Summary emails dispatched successfully.');
        }
      } else {
        setError(resJson.error || 'Failed to run deadline check report.');
      }
    } catch {
      setError('Network error running deadline check.');
    } finally {
      setRunningCron(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-sm text-muted-foreground">Loading workspace settings…</span>
      </div>
    );
  }

  if (!data) return null;

  const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(data.user.role);
  const isClient = data.user.role === 'CLIENT';

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
      {/* Side switch menu */}
      <div className="flex flex-col gap-1 rounded-lg border border-border/80 bg-card p-1.5 shadow-sm">
        <button
          onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" /> Personal Profile
        </button>
        <button
          onClick={() => { setActiveTab('preferences'); setError(''); setSuccess(''); }}
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4" /> Notification Preferences
        </button>
        {isStaff && (
          <>
            <button
              onClick={() => { setActiveTab('integrations'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'integrations'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Share2 className="h-4 w-4" /> Company Integrations
            </button>
            <button
              onClick={() => { setActiveTab('features'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'features'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Sliders className="h-4 w-4" /> Feature Control Matrix
            </button>
            <button
              onClick={() => { setActiveTab('system'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Settings2 className="h-4 w-4" /> Global Settings
            </button>
          </>
        )}
      </div>

      {/* Main forms container */}
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-lg px-4 py-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal info as it appears across workspace logs and sheets.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="set-name">Full Name *</Label>
                      <Input
                        id="set-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Farhan Khan"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="set-email">Email Address (Read-only)</Label>
                      <Input
                        id="set-email"
                        value={data.user.email}
                        disabled
                        className="bg-muted opacity-80"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="set-phone">Phone Number</Label>
                      <Input
                        id="set-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 3XX XXXXXXX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="set-role">Workspace Role</Label>
                      <Input
                        id="set-role"
                        value={data.user.role}
                        disabled
                        className="bg-muted opacity-80"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="set-address">Mailing/Home Address</Label>
                    <Input
                      id="set-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, city, region"
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving Details…</> : 'Save Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Update Password</CardTitle>
                <CardDescription>Ensure a safe password combination (minimum 8 characters with numbers).</CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'preferences' && (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Tailor notification channels for your account activity and task assignments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isClient ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-sm font-semibold">Task Assignment Emails</Label>
                      <p className="text-xs text-muted-foreground">
                        Send a real-time email notification whenever a project task or subtask is assigned to you.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taskAssign}
                      onChange={(e) => setTaskAssign(e.target.checked)}
                      className="h-4 w-4 mt-1 rounded border-input accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-start justify-between rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-sm font-semibold">Daily Overdue Digests</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive a daily morning email summary listing any of your assigned tasks that are past their due date.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={dailyDigest}
                      onChange={(e) => setDailyDigest(e.target.checked)}
                      className="h-4 w-4 mt-1 rounded border-input accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-sm font-semibold">Weekly Status Updates</Label>
                      <p className="text-xs text-muted-foreground">
                        Subscribe to receive a weekly email summary reporting BOQ progress and billing totals for your ongoing projects.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={weeklyClient}
                      onChange={(e) => setWeeklyClient(e.target.checked)}
                      className="h-4 w-4 mt-1 rounded border-input accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleSavePreferences} disabled={saving} className="w-full sm:w-auto">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving Toggles…</> : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Company Feature Matrix Tab */}
        {activeTab === 'features' && isStaff && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <CardTitle>Organization Feature Flags & Control Matrix</CardTitle>
              </div>
              <CardDescription>Enable or disable ERP modules, AI capabilities, and communication integrations for your firm.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">AI Copilot Chat Widget</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable AI Copilot assistant across your company&apos;s project dashboards and mobile apps.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgAiCopilot}
                    onChange={(e) => setOrgAiCopilot(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Roman Urdu & Urdu NLU Engine</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow site engineers to issue voice notes or text prompts in Roman Urdu (e.g. &quot;Cement kahan hai?&quot;).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgRomanUrdu}
                    onChange={(e) => setOrgRomanUrdu(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">WhatsApp Daily Site Digests</Label>
                    <p className="text-xs text-muted-foreground">
                      Send daily labor attendance and expense summaries to company project managers on WhatsApp.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgWhatsapp}
                    onChange={(e) => setOrgWhatsapp(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Telegram Field Supervisor Bot</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable field engineers to submit site photo receipts and attendance via Telegram.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgTelegram}
                    onChange={(e) => setOrgTelegram(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Odoo ERP Accounting & Ledger Sync</Label>
                    <p className="text-xs text-muted-foreground">
                      Synchronize subcontractor payouts and material bills with your firm&apos;s Odoo ERP accounting system.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgOdoo}
                    onChange={(e) => setOrgOdoo(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Slack Milestone & Blockage Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Post instant notifications to company Slack channels when project milestones or site blockages occur.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgSlack}
                    onChange={(e) => setOrgSlack(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Notion Site Inspection Archiver</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically export finished architectural quality inspection sheets to Notion databases.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgNotion}
                    onChange={(e) => setOrgNotion(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Modal 1-Click Pre-Filling Engine</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow the AI Assistant to trigger creation dialogs with pre-filled cost breakdown data.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgPrefilledModals}
                    onChange={(e) => setOrgPrefilledModals(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Automatic Overdue Task Email Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Dispatch daily reminder emails to team members with overdue construction tasks.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgDeadlineEmails}
                    onChange={(e) => setOrgDeadlineEmails(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <Button onClick={handleSaveOrgFeatureFlags} disabled={saving} className="mt-4">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving Matrix…</> : 'Save Feature Matrix'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Company Integrations Tab (Admins & Managers) */}
        {activeTab === 'integrations' && isStaff && (
          <div className="space-y-6">
            {/* WhatsApp Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  <CardTitle>Company WhatsApp Messaging Setup</CardTitle>
                </div>
                <CardDescription>Configure your firm&apos;s WhatsApp messaging rail for site digests and client alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                  <div>
                    <Label className="font-semibold text-sm">Messaging Rail Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      {useCustomWhatsapp
                        ? 'Using Company Dedicated WhatsApp Number (+92 3XX XXXXXXX)'
                        : 'Using Shared ICONA Platform Master Number (+92 42 111 ICONA)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={!useCustomWhatsapp ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseCustomWhatsapp(false)}
                      className="text-xs"
                    >
                      Shared ICONA Number
                    </Button>
                    <Button
                      type="button"
                      variant={useCustomWhatsapp ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseCustomWhatsapp(true)}
                      className="text-xs"
                    >
                      Custom Company Number
                    </Button>
                  </div>
                </div>

                {useCustomWhatsapp && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="wa-phone-id">Phone Number ID</Label>
                        <Input
                          id="wa-phone-id"
                          value={waPhoneId}
                          onChange={(e) => setWaPhoneId(e.target.value)}
                          placeholder="e.g. 1049283749201"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="wa-waba-id">WABA Account ID</Label>
                        <Input
                          id="wa-waba-id"
                          value={waWabaId}
                          onChange={(e) => setWaWabaId(e.target.value)}
                          placeholder="e.g. 9081237465928"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="wa-sender-phone">Sender Phone Number</Label>
                        <Input
                          id="wa-sender-phone"
                          value={waSenderPhone}
                          onChange={(e) => setWaSenderPhone(e.target.value)}
                          placeholder="+92 321 1234567"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="wa-token">Permanent Meta Access Token</Label>
                        <Input
                          id="wa-token"
                          type="password"
                          value={waToken}
                          onChange={(e) => setWaToken(e.target.value)}
                          placeholder="EAAGm0px4ZCS4BA..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted/40 rounded-lg border space-y-2 text-xs">
                  <Label htmlFor="test-wa-target" className="font-semibold">Test Verification Target Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-wa-target"
                      value={testWaRecipient}
                      onChange={(e) => setTestWaRecipient(e.target.value)}
                      placeholder="+92 3XX XXXXXXX"
                      className="bg-background text-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={testingChannel === 'whatsapp'}
                      onClick={() =>
                        handleTestConnection('whatsapp', {
                          phone: waSenderPhone || '+923211234567',
                          phoneId: waPhoneId,
                          wabaId: waWabaId,
                          token: waToken,
                          testTargetUser: testWaRecipient,
                        })
                      }
                      className="gap-1.5 text-xs whitespace-nowrap"
                    >
                      {testingChannel === 'whatsapp' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      Test WhatsApp Dispatch
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Telegram Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-sky-500" />
                  <CardTitle>Company Telegram Bot Setup</CardTitle>
                </div>
                <CardDescription>Configure your company&apos;s Telegram bot for site supervisors, photo logs, and attendance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                  <div>
                    <Label className="font-semibold text-sm">Telegram Bot Rail</Label>
                    <p className="text-xs text-muted-foreground">
                      {useCustomTelegram
                        ? `Using Custom Company Bot (${tgBotUsername || '@YourBot'})`
                        : 'Using Shared ICONA Master Platform Bot (@IconaMasterBot)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={!useCustomTelegram ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseCustomTelegram(false)}
                      className="text-xs"
                    >
                      Shared ICONA Bot
                    </Button>
                    <Button
                      type="button"
                      variant={useCustomTelegram ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseCustomTelegram(true)}
                      className="text-xs"
                    >
                      Custom Dedicated Bot
                    </Button>
                  </div>
                </div>

                {useCustomTelegram && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="tg-username">Bot Username</Label>
                        <Input
                          id="tg-username"
                          value={tgBotUsername}
                          onChange={(e) => setTgBotUsername(e.target.value)}
                          placeholder="@ApexBuildersBot"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tg-token">Telegram Bot Token (@BotFather)</Label>
                        <Input
                          id="tg-token"
                          type="password"
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                          placeholder="7192840192:AAH9f201jkl-xyz..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-2 border-t">
                  <Label htmlFor="trusted-users" className="flex items-center gap-1.5 font-semibold text-xs">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    Trusted Usernames, Telegram User IDs & Phone Numbers
                  </Label>
                  <Input
                    id="trusted-users"
                    value={trustedUsersList}
                    onChange={(e) => setTrustedUsersList(e.target.value)}
                    placeholder="@username, 987654321, +923001234567"
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separated list of trusted staff @usernames, numeric User IDs, or phone numbers permitted to command the bot.
                  </p>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border space-y-2 text-xs">
                  <Label htmlFor="test-tg-target" className="font-semibold">Verification Test Target User ID / Chat ID / Phone</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-tg-target"
                      value={testTgTargetUser}
                      onChange={(e) => setTestTgTargetUser(e.target.value)}
                      placeholder="Telegram User ID (e.g. 987654321) or @username"
                      className="bg-background text-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={testingChannel === 'telegram'}
                      onClick={() =>
                        handleTestConnection('telegram', {
                          username: tgBotUsername || '@ApexBuildersBot',
                          token: tgBotToken,
                          trustedUsers: trustedUsersList,
                          testTargetUser: testTgTargetUser,
                        })
                      }
                      className="gap-1.5 text-xs whitespace-nowrap"
                    >
                      {testingChannel === 'telegram' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-3.5 w-3.5 text-sky-500" />
                      )}
                      Test Telegram Verification
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    💡 <b>Telegram Tip:</b> Open <b>{tgBotUsername || '@yourbot'}</b> in Telegram and click <b>/start</b> first to grant permission, or use your numeric Telegram User ID (get it from <b>@userinfobot</b> on Telegram).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Other Tools (Slack, Odoo, Notion) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-indigo-600" />
                  <CardTitle>Slack, Odoo & Notion Credentials</CardTitle>
                </div>
                <CardDescription>Sync financial ledgers, inspection reports, and project blockages with third-party tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="slack-webhook">Slack Incoming Webhook URL</Label>
                  <Input
                    id="slack-webhook"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="odoo-endpoint">Odoo ERP REST Sync Endpoint</Label>
                  <Input
                    id="odoo-endpoint"
                    value={odooEndpoint}
                    onChange={(e) => setOdooEndpoint(e.target.value)}
                    placeholder="https://odoo.yourcompany.com/api/v1/sync"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notion-token">Notion Integration Internal Secret</Label>
                  <Input
                    id="notion-token"
                    type="password"
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="secret_3a82f9104bc2432aa924118837192aa..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button onClick={handleSaveIntegrations} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving Credentials…</> : 'Save Integration Credentials'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingChannel === 'slack'}
                    onClick={() =>
                      handleTestConnection('slack', {
                        webhookUrl: slackWebhook,
                      })
                    }
                    className="gap-2 text-xs"
                  >
                    {testingChannel === 'slack' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                    )}
                    Test Slack Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Global System Settings Tab */}
        {activeTab === 'system' && isStaff && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System & Notification Settings</CardTitle>
                <CardDescription>Global configurations applied across all workspace alerts and dispatch channels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sys-forgot-email">Password Reset Support Email Address *</Label>
                  <Input
                    id="sys-forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. support@icona.pk"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sys-budget-threshold">Project Budget Alert Warning (%)</Label>
                    <SelectSelect
                      id="sys-budget-threshold"
                      value={budgetThreshold}
                      onChange={setBudgetThreshold}
                      options={[
                        { label: '80% of budget reached', value: '80' },
                        { label: '90% of budget reached', value: '90' },
                        { label: '100% of budget reached', value: '100' },
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sys-min-txn">High-value Transaction Warning (PKR)</Label>
                    <Input
                      id="sys-min-txn"
                      type="number"
                      value={minTxnAmount}
                      onChange={(e) => setMinTxnAmount(e.target.value)}
                      placeholder="e.g. 100000"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSystem} disabled={saving} className="mt-2">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving Configuration…</> : 'Save Global Settings'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMTP & Report Operations</CardTitle>
                <CardDescription>Monitor mail servers, test integrations, and trigger manual reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-1 border-border/50">
                    <span className="text-muted-foreground">Sending Email:</span>
                    <span className="font-semibold text-foreground">admin@icona.pk</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={triggerDeadlineCron}
                  disabled={runningCron}
                  className="w-full sm:w-auto gap-2 text-xs"
                >
                  {runningCron ? (
                    <><Loader2 className="h-4.5 w-4.5 animate-spin" />Running deadline analysis…</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" /> Trigger Deadline Email Check</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
