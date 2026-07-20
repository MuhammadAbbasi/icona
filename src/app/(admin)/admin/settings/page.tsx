'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Settings, ShieldCheck, Server, Database, Key, Save, MessageSquare, Send, Cpu, Play, Loader2, AlertCircle, UserCheck, SendHorizontal } from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; message: string } | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Form states
  const [masterWaPhone, setMasterWaPhone] = useState('+92 42 111 426 62');
  const [masterWaPhoneId, setMasterWaPhoneId] = useState('1092837465928');
  const [masterWaWabaId, setMasterWaWabaId] = useState('9018273645920');
  const [masterWaToken, setMasterWaToken] = useState('');
  const [testWaRecipient, setTestWaRecipient] = useState('+923211234567');

  const [masterTgUsername, setMasterTgUsername] = useState('@icona_admin_bot');
  const [masterTgToken, setMasterTgToken] = useState('');
  const [trustedTgUsers, setTrustedTgUsers] = useState('@icona_admin_bot, 987654321');
  const [testTgTargetUser, setTestTgTargetUser] = useState('987654321');

  // Fetch saved master settings on page mount/refresh
  useEffect(() => {
    async function loadMasterSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const json = await res.json();
          const s = json.settings || {};
          if (s.master_whatsapp_phone) setMasterWaPhone(s.master_whatsapp_phone);
          if (s.master_whatsapp_phone_id) setMasterWaPhoneId(s.master_whatsapp_phone_id);
          if (s.master_whatsapp_waba_id) setMasterWaWabaId(s.master_whatsapp_waba_id);
          if (s.master_whatsapp_token) setMasterWaToken(s.master_whatsapp_token);
          if (s.test_wa_recipient) setTestWaRecipient(s.test_wa_recipient);

          if (s.master_telegram_username) setMasterTgUsername(s.master_telegram_username);
          if (s.master_telegram_token) setMasterTgToken(s.master_telegram_token);
          if (s.trusted_telegram_users) setTrustedTgUsers(s.trusted_telegram_users);
          if (s.test_tg_target_user) setTestTgTargetUser(s.test_tg_target_user);
        }
      } catch (err) {
        console.error('Failed to load master settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMasterSettings();
  }, []);

  const handleSaveMasterSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaved(false);

    const payload = {
      master_whatsapp_phone: masterWaPhone,
      master_whatsapp_phone_id: masterWaPhoneId,
      master_whatsapp_waba_id: masterWaWabaId,
      master_whatsapp_token: masterWaToken,
      test_wa_recipient: testWaRecipient,
      master_telegram_username: masterTgUsername,
      master_telegram_token: masterTgToken,
      trusted_telegram_users: trustedTgUsers,
      test_tg_target_user: testTgTargetUser,
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (channel: string, payload: any) => {
    setTestingChannel(channel);
    setTestResult(null);

    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, ...payload }),
      });
      const json = await res.json();

      // If Telegram return valid botDetails, update username automatically
      if (channel === 'telegram') {
        if (json.botDetails?.username) {
          setMasterTgUsername(`@${json.botDetails.username}`);
        }
        if (json.resolvedChatId) {
          setTestTgTargetUser(String(json.resolvedChatId));
        }
      }

      setTestResult({
        channel,
        success: !!json.success,
        message: json.message || json.error || 'Connection verification completed.',
      });

      // Persist latest state after test
      await handleSaveMasterSettings();
    } catch {
      setTestResult({
        channel,
        success: false,
        message: 'Network error executing verification test.',
      });
    } finally {
      setTestingChannel(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB] mb-3" />
        <span className="text-xs text-slate-500 font-medium">Loading master integration credentials…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="System Settings & Master Platform Credentials"
        subtitle="Manage Super Admin credentials, ICONA master WhatsApp/Telegram rails, trusted access lists, and test verification"
      />

      <main className="p-6 space-y-6 flex-1 max-w-4xl">
        {saved && (
          <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Master platform integration credentials saved successfully across refreshes!</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {testResult.success ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* ICONA Master WhatsApp Credentials */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ICONA Master WhatsApp Business Cloud API</h3>
                <p className="text-xs text-slate-500">Shared platform number used by default for onboarded client messaging</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveMasterSettings} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master Sender Phone Number</label>
                <input
                  type="text"
                  value={masterWaPhone}
                  onChange={(e) => setMasterWaPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master Phone Number ID</label>
                <input
                  type="text"
                  value={masterWaPhoneId}
                  onChange={(e) => setMasterWaPhoneId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master WABA Account ID</label>
                <input
                  type="text"
                  value={masterWaWabaId}
                  onChange={(e) => setMasterWaWabaId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master Meta Access Token</label>
                <input
                  type="password"
                  value={masterWaToken}
                  onChange={(e) => setMasterWaToken(e.target.value)}
                  placeholder="Enter Meta Access Token..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Test Verification Input for WhatsApp */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="block font-semibold text-slate-700">Test Verification Target Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testWaRecipient}
                  onChange={(e) => setTestWaRecipient(e.target.value)}
                  placeholder="+92 3XX XXXXXXX"
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
                <button
                  type="button"
                  disabled={testingChannel === 'whatsapp'}
                  onClick={() =>
                    handleTestConnection('whatsapp', {
                      phone: masterWaPhone,
                      phoneId: masterWaPhoneId,
                      wabaId: masterWaWabaId,
                      token: masterWaToken || 'demo-token',
                      testTargetUser: testWaRecipient,
                    })
                  }
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {testingChannel === 'whatsapp' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <SendHorizontal className="w-3.5 h-3.5" />
                  )}
                  <span>Test WhatsApp Dispatch</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Master WhatsApp Credentials</span>
            </button>
          </form>
        </div>

        {/* ICONA Master Telegram Bot Credentials */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-sky-500" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ICONA Master Telegram Platform Bot</h3>
                <p className="text-xs text-slate-500">System bot used for Super Admin alerts and default client trial notifications</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveMasterSettings} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master Bot Username</label>
                <input
                  type="text"
                  value={masterTgUsername}
                  onChange={(e) => setMasterTgUsername(e.target.value)}
                  placeholder="@icona_admin_bot"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master Bot Token (@BotFather)</label>
                <input
                  type="password"
                  value={masterTgToken}
                  onChange={(e) => setMasterTgToken(e.target.value)}
                  placeholder="Paste token from @BotFather..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Trusted Usernames & User IDs Security Field */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-600" />
                Trusted Telegram Usernames, User IDs & Phone Numbers
              </label>
              <input
                type="text"
                value={trustedTgUsers}
                onChange={(e) => setTrustedTgUsers(e.target.value)}
                placeholder="@username, 987654321, +923001234567"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Comma-separated list of authorized Telegram User IDs, @usernames, or phones allowed to execute system actions.
              </p>
            </div>

            {/* Test Verification Input for Telegram */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="block font-semibold text-slate-700">Verification Test Target User ID / Chat ID / Phone</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testTgTargetUser}
                  onChange={(e) => setTestTgTargetUser(e.target.value)}
                  placeholder="Telegram User ID (e.g. 987654321) or @username"
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
                <button
                  type="button"
                  disabled={testingChannel === 'telegram'}
                  onClick={() =>
                    handleTestConnection('telegram', {
                      username: masterTgUsername,
                      token: masterTgToken,
                      trustedUsers: trustedTgUsers,
                      testTargetUser: testTgTargetUser,
                    })
                  }
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {testingChannel === 'telegram' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <SendHorizontal className="w-3.5 h-3.5" />
                  )}
                  <span>Test Telegram Verification</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                💡 <b>Telegram Tip:</b> Open <b>{masterTgUsername || '@yourbot'}</b> in Telegram and click <b>/start</b> first to allow the bot to message you, or use your numeric User ID (get it from <b>@userinfobot</b> on Telegram).
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Master Telegram Credentials</span>
            </button>
          </form>
        </div>

        {/* Environment Diagnostics */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Server className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Environment & Database Connection</h3>
              <p className="text-xs text-slate-500">Prisma database engine status & host details</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-medium block">Database Provider</span>
              <span className="font-bold text-slate-900 text-sm">MySQL / MariaDB</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-medium block">Prisma Engine Type</span>
              <span className="font-bold text-slate-900 text-sm">Binary Engine (CloudLinux RHEL)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-medium block">Framework Version</span>
              <span className="font-bold text-slate-900 text-sm">Next.js 14 App Router</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-medium block">System Timezone</span>
              <span className="font-bold text-slate-900 text-sm">Asia/Karachi (PKT)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
