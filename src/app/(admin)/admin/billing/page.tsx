'use client';

import React, { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CreditCard, DollarSign, TrendingUp, Download, Receipt, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

export default function AdminBillingPage() {
  const [invoicingClient, setInvoicingClient] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceIssued, setInvoiceIssued] = useState(false);

  const handleIssueInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoicingClient && invoiceAmount) {
      setInvoiceIssued(true);
      setTimeout(() => setInvoiceIssued(false), 4000);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="Subscriptions & Billing Administration"
        subtitle="Manage SaaS recurring revenue, Paddle MoR integrations, renewal schedules, and Pakistani PKR tax invoices"
      />

      <main className="p-6 space-y-6 flex-1">
        {/* Revenue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Monthly Recurring Revenue</span>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">$2,450 USD</div>
            <span className="text-xs text-slate-500 mt-1 block">≈ PKR 686,000 / month</span>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" /> +14.2% month-over-month
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Annual Recurring Revenue</span>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">$29,400 USD</div>
            <span className="text-xs text-slate-500 mt-1 block">≈ PKR 8,232,000 / year</span>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
              Annual Contract Savings Active
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Active Tier Distribution</span>
            <div className="space-y-1 mt-2 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-600">Starter ($25/mo):</span>
                <span className="text-slate-900">4 clients</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Growth ($50/mo):</span>
                <span className="text-slate-900">6 clients</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Enterprise ($75/mo):</span>
                <span className="text-slate-900">3 clients</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoicing & Merchant of Record Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Invoicing Builder */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="w-5 h-5 text-[#2563EB]" />
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Issue Manual Tax Invoice (PKR)</h3>
                <p className="text-xs text-slate-500">For Pakistani clients paying via bank wire, pay order, or cheque</p>
              </div>
            </div>

            {invoiceIssued && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Invoice generated successfully! PDF copy ready for client delivery.</span>
              </div>
            )}

            <form onSubmit={handleIssueInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Builders Ltd"
                  value={invoicingClient}
                  onChange={(e) => setInvoicingClient(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 14000"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Period</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                    <option>Monthly Subscription</option>
                    <option>Annual Pre-Paid (2 Months Free)</option>
                    <option>Custom Enterprise Setup</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Generate Tax Invoice
              </button>
            </form>
          </div>

          {/* Paddle MoR Status */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Paddle Merchant of Record Integration</h3>
                <p className="text-xs text-slate-500">Automated global tax collection and international card checkout</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Webhook Engine</span>
                  <span className="text-[11px] text-slate-500">Listening to subscription.created / updated</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">CONNECTED</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Automatic Billing Status Sync</span>
                  <span className="text-[11px] text-slate-500">Updates Organization.billingStatus on event</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">ACTIVE</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Global Tax Registration</span>
                  <span className="text-[11px] text-slate-500">Managed by Paddle MoR</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">COMPLIANT</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
