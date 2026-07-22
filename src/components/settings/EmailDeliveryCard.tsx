'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Per-company outbound email. Gmail / Outlook / Yahoo / dedicated all send over
// SMTP; the server fills host/port from the provider, so the admin only supplies
// their address + app-password (and a host, for a custom server).
type Provider = 'gmail' | 'outlook' | 'yahoo' | 'custom';

const PROVIDER_LABELS: { value: Provider; label: string; hint: string }[] = [
  { value: 'gmail', label: 'Google / Gmail', hint: 'Use a Google App Password (Account → Security → App passwords), not your login password.' },
  { value: 'outlook', label: 'Outlook / Live / Hotmail', hint: 'Use an app password if two-step verification is on.' },
  { value: 'yahoo', label: 'Yahoo', hint: 'Generate an app password in Yahoo Account Security.' },
  { value: 'custom', label: 'Dedicated / other SMTP', hint: 'Enter your mail server host and port (587 STARTTLS or 465 TLS).' },
];

export function EmailDeliveryCard() {
  const [provider, setProvider] = useState<Provider>('gmail');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/email');
        if (res.ok) {
          const { config } = await res.json();
          if (config) {
            setProvider(config.provider ?? 'gmail');
            setFromName(config.fromName ?? '');
            setFromEmail(config.fromEmail ?? '');
            setUser(config.user ?? '');
            setPassword(config.password ?? ''); // masked '••••••••' if one is stored
            setHost(config.host ?? '');
            setPort(String(config.port ?? '587'));
            setSecure(Boolean(config.secure));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, fromName, fromEmail, user, password, host, port, secure }),
      });
      const j = await res.json();
      setMsg(res.ok ? { ok: true, text: 'Email settings saved.' } : { ok: false, text: j.error || 'Save failed.' });
    } catch {
      setMsg({ ok: false, text: 'Network error while saving.' });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings/email', { method: 'POST' });
      const j = await res.json();
      setMsg(res.ok ? { ok: true, text: j.message || 'Test email sent.' } : { ok: false, text: j.error || 'Test failed.' });
    } catch {
      setMsg({ ok: false, text: 'Network error while sending test.' });
    } finally {
      setTesting(false);
    }
  }

  const hint = PROVIDER_LABELS.find((p) => p.value === provider)?.hint;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email Delivery</CardTitle>
        <CardDescription>
          Send ICONA emails from your own company mailbox. Replies come back to your address.
          Leave this blank to use the platform default sender.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email-provider">Provider</Label>
                <select
                  id="email-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as Provider)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PROVIDER_LABELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-from-name">From name</Label>
                <Input id="email-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Apex Builders" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-from">From email</Label>
                <Input id="email-from" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="projects@yourcompany.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-user">SMTP username</Label>
                <Input id="email-user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="usually the same as From email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-pass">Password / app-password</Label>
                <Input id="email-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              {provider === 'custom' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-host">SMTP host</Label>
                    <Input id="email-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="mail.yourcompany.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-port">Port</Label>
                    <Input id="email-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
                    Use implicit TLS (port 465). Leave off for STARTTLS (587).
                  </label>
                </>
              )}
            </div>

            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

            {msg && (
              <div className={`flex items-center gap-2 text-sm ${msg.ok ? 'text-success' : 'text-destructive'}`}>
                {msg.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {msg.text}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Email Settings'}
              </Button>
              <Button variant="outline" onClick={sendTest} disabled={testing} className="gap-2">
                {testing ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send Test Email</>}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
