'use client';

import { useState, useEffect } from 'react';
import {
  User, Bell, Settings2, ShieldCheck, Mail, Phone, MapPin, Loader2, Sparkles,
  AlertTriangle, CheckCircle, RefreshCw
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
  system: {
    forgot_password_email: string;
    global_weekly_client_updates: string;
    global_budget_alert_threshold: string;
    global_min_txn_alert_amount: string;
  } | null;
}

export function SettingsForm() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'system'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // Global Settings State
  const [forgotEmail, setForgotEmail] = useState('');
  const [globalWeekly, setGlobalWeekly] = useState(true);
  const [budgetThreshold, setBudgetThreshold] = useState('90');
  const [minTxnAmount, setMinTxnAmount] = useState('100000');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json: SettingsData = await res.json();
          setData(json);
          
          // Set user details
          setName(json.user.name || '');
          setPhone(json.user.phone || '');
          setAddress(json.user.address || '');

          // Set preferences
          setTaskAssign(json.user.taskAssignNotifications);
          setDailyDigest(json.user.dailyTaskDigest);
          setWeeklyClient(json.user.weeklyClientUpdates);
          setCompletionAlert(json.user.projectCompletionAlert);

          // Set system settings
          if (json.system) {
            setForgotEmail(json.system.forgot_password_email || '');
            setGlobalWeekly(json.system.global_weekly_client_updates === 'true');
            setBudgetThreshold(json.system.global_budget_alert_threshold || '90');
            setMinTxnAmount(json.system.global_min_txn_alert_amount || '100000');
          }
        } else {
          setError('Failed to fetch user settings.');
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

  const isStaff = ['ADMIN', 'MANAGER'].includes(data.user.role);
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
                        placeholder="e.g. Irshad Ahmed"
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

                  {data.user.position && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg border border-border/50 text-xs text-muted-foreground">
                      <div><b>Job Title:</b> {data.user.position}</div>
                      <div><b>Department:</b> {data.user.department || 'General'}</div>
                    </div>
                  )}

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
                // Staff Toggles
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
                      className="h-4 w-4 mt-1 rounded border-input accent-primary flex-shrink-0 cursor-pointer"
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
                      className="h-4 w-4 mt-1 rounded border-input accent-primary flex-shrink-0 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                // Client Toggles
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
                      className="h-4 w-4 mt-1 rounded border-input accent-primary flex-shrink-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-start justify-between rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-sm font-semibold">Project Completion Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive an email notification when one of your client projects is marked as completed on the board.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={completionAlert}
                      onChange={(e) => setCompletionAlert(e.target.checked)}
                      className="h-4 w-4 mt-1 rounded border-input accent-primary flex-shrink-0 cursor-pointer"
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
                    placeholder="e.g. support@icon.com"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    All forgot password verification codes generated by users are sent to this address to prevent unauthorized self-service credential takeovers.
                  </p>
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

                <div className="flex items-start justify-between rounded-lg border p-4 bg-muted/20 mt-2">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-semibold">Weekly Client Reports</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable the global cron jobs that compile and dispatch weekly status progress reports to active client subscribers.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={globalWeekly}
                    onChange={(e) => setGlobalWeekly(e.target.checked)}
                    className="h-4 w-4 mt-1 rounded border-input accent-primary flex-shrink-0 cursor-pointer"
                  />
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
                    <span className="font-semibold text-foreground">erp@icon.muhammadabbasi.com</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 border-border/50">
                    <span className="text-muted-foreground">Report Receivers:</span>
                    <span className="font-semibold text-foreground">info@icon.muhammadabbasi.com, muhammadabbasi.llm@gmail.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMTP Server Host:</span>
                    <span className="font-medium text-foreground">{process.env.SMTP_HOST || 'mail.icon.muhammadabbasi.com (Placeholder)'}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={triggerDeadlineCron}
                    disabled={runningCron}
                    className="flex-1 gap-2 text-xs"
                  >
                    {runningCron ? (
                      <><Loader2 className="h-4.5 w-4.5 animate-spin" />Running deadline analysis…</>
                    ) : (
                      <><RefreshCw className="h-4 w-4" /> Trigger Deadline Email Check</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline sub-select wrapper to avoid complex radix select configs in standard views
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
