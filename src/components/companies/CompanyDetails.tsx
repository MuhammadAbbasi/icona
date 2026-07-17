'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Globe, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPKR } from '@/lib/utils';

interface Props {
  company: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
    users: { id: string; name: string; email: string; role: string; avatar: string | null }[];
  };
  projects: {
    id: string;
    name: string;
    status: string;
    progress: number;
    budget: number | null;
    company: { id: string; name: string } | null;
    ownerCompany: { id: string; name: string } | null;
  }[];
  transactions: {
    id: string;
    type: string;
    amount: number;
    date: string;
    category: string | null;
    description: string | null;
    project: { id: string; name: string } | null;
  }[];
}

const TXN_BADGE: Record<string, 'success' | 'danger' | 'warning'> = {
  INCOME: 'success',
  EXPENSE: 'danger',
  DRAWING: 'warning',
};

export function CompanyDetails({ company, projects, transactions }: Props) {
  const contact = [
    { icon: Mail, value: company.email, href: company.email ? `mailto:${company.email}` : null },
    { icon: Phone, value: company.phone, href: company.phone ? `tel:${company.phone}` : null },
    { icon: MapPin, value: company.address, href: null },
    { icon: Globe, value: company.website, href: company.website },
  ].filter((c) => c.value);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center justify-between font-semibold">
            Profile <Badge>{company.type}</Badge>
          </h3>
          <ul className="space-y-2.5 text-sm">
            {contact.map(({ icon: Icon, value, href }) => (
              <li key={value} className="flex items-center gap-2.5 text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {href ? <a href={href} className="truncate hover:text-foreground hover:underline">{value}</a> : <span className="truncate">{value}</span>}
              </li>
            ))}
            {contact.length === 0 && <li className="text-muted-foreground">No contact details.</li>}
          </ul>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-primary" /> Staff ({company.users.length})
          </h3>
          <ul className="divide-y divide-border">
            {company.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{u.name}</span>
                  <span className="ml-2 text-muted-foreground">{u.email}</span>
                </span>
                <Badge variant="secondary">{u.role}</Badge>
              </li>
            ))}
            {company.users.length === 0 && <li className="py-2 text-sm text-muted-foreground">No staff linked.</li>}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Projects ({projects.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Progress</th>
                <th className="py-2">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 pr-4">
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  </td>
                  <td className="py-2.5 pr-4"><Badge variant="outline">{p.status.replaceAll('_', ' ')}</Badge></td>
                  <td className="py-2.5 pr-4">{Math.round(p.progress)}%</td>
                  <td className="py-2.5">{p.budget != null ? formatPKR(p.budget) : '—'}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No related projects.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Transactions ({transactions.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 pr-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                  <td className="py-2.5 pr-4"><Badge variant={TXN_BADGE[t.type] ?? 'secondary'}>{t.type}</Badge></td>
                  <td className="py-2.5 pr-4">{t.project?.name ?? '—'}</td>
                  <td className="py-2.5 pr-4 max-w-[280px] truncate">{t.description || t.category || '—'}</td>
                  <td className="py-2.5 text-right font-medium whitespace-nowrap">{formatPKR(t.amount)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No transactions recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
