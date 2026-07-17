// Small CSS-only product mocks, reused by the scroll showcase (laptop/phone
// screens), the module zigzag, and the how-it-works journey. All ink-themed.

const COLUMN_DATA = [
  {
    title: 'Under Review',
    dot: 'bg-sky-400',
    cards: [
      { name: 'DHA Villas - Phase 2', value: 'PKR 92.1M', progress: 0 },
      { name: 'Mall Road Renovation', value: 'PKR 18.6M', progress: 0 },
    ],
  },
  {
    title: 'Ongoing',
    dot: 'bg-amber-400',
    cards: [
      { name: 'Gulberg Heights - Tower A', value: 'PKR 186.4M', progress: 72 },
      { name: 'Canal Road Plaza', value: 'PKR 61.8M', progress: 45 },
    ],
  },
  {
    title: 'Completed',
    dot: 'bg-emerald-400',
    cards: [{ name: 'Model Town Grey Structure', value: 'PKR 44.2M', progress: 100 }],
  },
];

const KanbanCard = ({ card }) => (
  <div className="rounded-lg border border-ink-border bg-ink p-2.5">
    <p className="truncate text-[11px] font-semibold text-ink-foreground">{card.name}</p>
    <div className="mt-1.5 flex items-center justify-between">
      <span className="text-[10px] text-ink-muted">{card.value}</span>
      <span className="flex -space-x-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3.5 w-3.5 rounded-full border border-ink bg-gradient-to-br from-primary/70 to-sky-500/70" />
        ))}
      </span>
    </div>
    {card.progress > 0 && (
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-border">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500" style={{ width: `${card.progress}%` }} />
      </div>
    )}
  </div>
);

// The Kanban board; compact = phone layout with a bottom tab bar.
export const KanbanSnapshot = ({ compact = false }) => (
  <div className="flex h-full flex-col bg-ink-card p-2.5" aria-hidden="true">
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Project Board</span>
      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">Live</span>
    </div>
    <div className={`grid flex-1 gap-2 ${compact ? 'grid-cols-1 overflow-hidden' : 'grid-cols-3'}`}>
      {(compact ? COLUMN_DATA.slice(1, 2) : COLUMN_DATA).map((col) => (
        <div key={col.title} className="rounded-xl border border-ink-border bg-ink/60 p-2">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} /> {col.title}
          </p>
          <div className="space-y-2">
            {col.cards.map((c) => <KanbanCard key={c.name} card={c} />)}
          </div>
        </div>
      ))}
    </div>
    {compact && (
      <div className="mt-2 flex justify-around rounded-xl border border-ink-border bg-ink/80 px-2 py-1.5">
        {['Board', 'BOQ', 'Ledger', 'More'].map((t, i) => (
          <span key={t} className={`text-[9px] font-semibold ${i === 0 ? 'text-primary' : 'text-ink-muted'}`}>{t}</span>
        ))}
      </div>
    )}
  </div>
);

export const BoqSnapshot = () => (
  <div className="space-y-1.5 bg-ink-card p-3 text-[11px]" aria-hidden="true">
    <div className="flex justify-between rounded-md bg-primary/15 px-3 py-2 font-semibold text-primary">
      <span>Grey Structure</span>
      <span>PKR 84.6M</span>
    </div>
    {[
      ['Excavation & foundation', 'PKR 12.4M'],
      ['RCC frame - floors 1-6', 'PKR 48.9M'],
      ['Block masonry & plaster', 'PKR 23.3M'],
    ].map(([name, amount]) => (
      <div key={name} className="flex justify-between rounded-md border border-ink-border px-3 py-2 text-ink-muted">
        <span className="pl-3">{name}</span>
        <span className="font-medium text-ink-foreground">{amount}</span>
      </div>
    ))}
    <div className="flex justify-between px-3 pt-1.5 font-semibold text-ink-foreground">
      <span>Rolls up automatically</span>
      <span className="text-gradient">PKR 84.6M ✓</span>
    </div>
  </div>
);

export const BudgetSnapshot = () => (
  <div className="space-y-3 bg-ink-card p-3.5 text-[11px]" aria-hidden="true">
    {[
      ['Materials', 82],
      ['Labour', 64],
      ['Subcontractors', 97],
      ['Overheads', 108],
    ].map(([label, pct]) => (
      <div key={label}>
        <div className="mb-1 flex justify-between">
          <span className="text-ink-muted">{label}</span>
          <span className={`font-semibold ${pct > 100 ? 'text-red-400' : pct > 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {pct}% of budget
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-border">
          <div
            className={`h-full rounded-full ${pct > 100 ? 'bg-red-400' : pct > 90 ? 'bg-amber-400' : 'bg-gradient-to-r from-primary to-sky-500'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    ))}
    <div className="flex justify-between border-t border-ink-border pt-2 font-semibold">
      <span className="text-ink-muted">Cash on hand</span>
      <span className="text-ink-foreground">PKR 48.2M</span>
    </div>
  </div>
);

export const ClientSnapshot = () => (
  <div className="space-y-2 bg-ink-card p-3 text-[11px]" aria-hidden="true">
    <div className="flex items-center justify-between rounded-md border border-ink-border px-3 py-2">
      <span className="font-semibold text-ink-foreground">Gulberg Heights - Tower A</span>
      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">On track</span>
    </div>
    <div className="rounded-md border border-ink-border px-3 py-2">
      <div className="mb-1 flex justify-between text-ink-muted">
        <span>Overall progress</span>
        <span className="font-semibold text-ink-foreground">72%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-border">
        <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-primary to-sky-500" />
      </div>
    </div>
    {[
      ['BOQ Rev 3 (variation order)', 'View'],
      ['Progress photos - Week 32', 'View'],
    ].map(([doc, action]) => (
      <div key={doc} className="flex justify-between rounded-md border border-ink-border px-3 py-2 text-ink-muted">
        <span>{doc}</span>
        <span className="font-semibold text-primary">{action}</span>
      </div>
    ))}
  </div>
);

export const SNAPSHOTS = {
  kanban: KanbanSnapshot,
  boq: BoqSnapshot,
  budget: BudgetSnapshot,
  client: ClientSnapshot,
};
