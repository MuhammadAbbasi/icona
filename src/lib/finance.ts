// ── Project Treasury & Ledger ────────────────────────────────────────────────
// Pure, server/client-safe financial calculations for a project sub-ledger.
//
// Method (fund / "project bucket" accounting):
//   • Client payments (INCOME) fill the project cash bucket.
//   • Operational costs (EXPENSE) and owner withdrawals (DRAWING) are deducted
//     from RECEIVED cash — never from the theoretical contract budget.
//   • Owner drawings are EQUITY reductions, not operating expenses, so they are
//     excluded from "operational spend" and tracked per-owner.

export type TransactionType = 'INCOME' | 'EXPENSE' | 'DRAWING';

export interface LedgerEntry {
  type: string;
  amount: number;
  isPaid?: boolean | null;
  ownerId?: string | null;
  owner?: { id: string; name: string } | null;
}

export interface LoanEntry {
  amount: number;
  interestAmount: number;
  amountPaid: number;
}

export interface OwnerDistribution {
  ownerId: string;
  name: string;
  total: number;
}

export interface ProjectFinancials {
  budget: number;          // contract value (theoretical)
  revenue: number;         // Σ INCOME  (= cash received from client)
  received: number;        // alias of revenue, for clarity in the UI
  receivable: number;      // budget − revenue (still owed by client)
  expense: number;         // Σ EXPENSE (operational spend / OPEX, includes both paid and unpaid)
  drawings: number;        // Σ DRAWING (owner withdrawals / equity out)
  unpaidExpenses: number;  // Σ EXPENSE where isPaid == false
  totalLoansReceived: number; // Σ loan.amount (cash inflow)
  totalLoansRepaid: number;   // Σ loan.amountPaid
  loansOutstanding: number;   // Σ (amount + interestAmount - amountPaid)
  totalInvestmentsReceived: number; // Σ investment.amount (cash inflow)
  totalInvestmentsPaid: number;     // Σ investorPayout.amount
  totalPayables: number;      // unpaidExpenses + loansOutstanding
  cashOnHand: number;      // (revenue + totalLoansReceived + totalInvestmentsReceived) − ((expense - unpaidExpenses) + drawings + totalLoansRepaid + totalInvestmentsPaid)
  profitability: number;   // revenue − expense − interestCost (project net P&L)
  collectionPct: number;   // received / budget, clamped 0–100
  isDeficit: boolean;      // cash on hand < 0 (over-drawn the bucket)
  ownerBreakdown: OwnerDistribution[];
}

export const TXN_TYPE_CONFIG: Record<TransactionType, {
  label: string;
  /** small badge classes */
  badge: string;
  /** amount text colour */
  amount: string;
  /** sign shown before the figure */
  sign: '+' | '−';
}> = {
  INCOME:  { label: 'Income',  badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', amount: 'text-emerald-600 dark:text-emerald-400', sign: '+' },
  EXPENSE: { label: 'Expense', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',             amount: 'text-rose-600 dark:text-rose-400',       sign: '−' },
  DRAWING: { label: 'Payout', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         amount: 'text-amber-600 dark:text-amber-400',     sign: '−' },
};

// Category surfaced for paying a tracked worker/supervisor. Selecting it reveals
// the worker search-or-add picker in the New Transaction form.
export const WORKER_CATEGORY = 'Worker/Supervisor';

// Category presets surfaced in the New Transaction form, grouped by type.
export const CATEGORY_PRESETS: Record<TransactionType, string[]> = {
  INCOME:  ['Client Payment', 'Advance', 'Mobilization', 'Retention Release', 'Other'],
  EXPENSE: [WORKER_CATEGORY, 'Supplier', 'Transporter', 'Equipment', 'Utilities', 'Permits', 'Misc'],
  DRAWING: ['Partner Payout', 'Personal Use', 'Profit Distribution'],
};

export const PAYMENT_METHODS = ['Cash', 'Bank', 'Cheque', 'Online'] as const;

export function isTransactionType(v: string): v is TransactionType {
  return v === 'INCOME' || v === 'EXPENSE' || v === 'DRAWING';
}

/** Roll a flat list of ledger entries up into project health metrics. */
export interface InvestmentEntry {
  amount: number;
}

export interface InvestorPayoutEntry {
  amount: number;
}

export function computeFinancials(
  budget: number | null | undefined,
  entries: LedgerEntry[],
  loans?: LoanEntry[],
  investments?: InvestmentEntry[],
  investorPayouts?: InvestorPayoutEntry[],
  companyInvestmentsTotal?: number,
  companyPayoutsTotal?: number
): ProjectFinancials {
  const b = budget ?? 0;
  let revenue = 0, expense = 0, drawings = 0, unpaidExpenses = 0;
  const owners = new Map<string, OwnerDistribution>();

  for (const e of entries) {
    const amt = e.amount || 0;
    if (e.type === 'INCOME') {
      revenue += amt;
    } else if (e.type === 'EXPENSE') {
      expense += amt;
      if (e.isPaid === false) {
        unpaidExpenses += amt;
      }
    } else if (e.type === 'DRAWING') {
      drawings += amt;
      const id = e.ownerId ?? 'company';
      const name = e.owner?.name ?? 'Company Account / General Pool';
      const cur = owners.get(id) ?? { ownerId: id, name, total: 0 };
      cur.total += amt;
      owners.set(id, cur);
    }
  }

  let totalLoansReceived = 0;
  let totalLoansRepaid = 0;
  let loansOutstanding = 0;
  let interestCost = 0;

  if (loans) {
    for (const l of loans) {
      totalLoansReceived += l.amount || 0;
      interestCost += l.interestAmount || 0;
      totalLoansRepaid += l.amountPaid || 0;
      loansOutstanding += ((l.amount || 0) + (l.interestAmount || 0)) - (l.amountPaid || 0);
    }
  }

  let totalInvestmentsReceived = 0;
  if (investments) {
    for (const inv of investments) {
      totalInvestmentsReceived += inv.amount || 0;
    }
  }

  let totalInvestmentsPaid = 0;
  if (investorPayouts) {
    for (const pay of investorPayouts) {
      totalInvestmentsPaid += pay.amount || 0;
    }
  }

  const paidExpenses = expense - unpaidExpenses;
  const globalInvestments = companyInvestmentsTotal ?? 0;
  const globalPayouts = companyPayoutsTotal ?? 0;
  const cashOnHand = (revenue + totalLoansReceived + totalInvestmentsReceived + globalInvestments) - (paidExpenses + drawings + totalLoansRepaid + totalInvestmentsPaid + globalPayouts);
  const profitability = revenue - expense - interestCost;
  const totalPayables = unpaidExpenses + loansOutstanding;

  return {
    budget: b,
    revenue,
    received: revenue,
    receivable: b - revenue,
    expense,
    drawings,
    unpaidExpenses,
    totalLoansReceived,
    totalLoansRepaid,
    loansOutstanding,
    totalInvestmentsReceived,
    totalInvestmentsPaid,
    totalPayables,
    cashOnHand,
    profitability,
    collectionPct: b > 0 ? Math.min(100, Math.max(0, (revenue / b) * 100)) : 0,
    isDeficit: cashOnHand < 0,
    ownerBreakdown: Array.from(owners.values()).sort((a, z) => z.total - a.total),
  };
}

// ── Company overheads (G&A) ──────────────────────────────────────────────────
// Operating costs that belong to a MAIN company, not to any single project:
// office rent, utilities, marketing, prospecting travel, staff salaries.
// Pooled at the company level — never posted to a project ledger or budget.

export const OVERHEAD_CATEGORIES = [
  { value: 'RENT',      label: 'Office Rent' },
  { value: 'UTILITIES', label: 'Utilities / Bills' },
  { value: 'SALARIES',  label: 'Salaries' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'TRAVEL',    label: 'Travel / Business Dev' },
  { value: 'OFFICE',    label: 'Office Supplies' },
  { value: 'MISC',      label: 'Miscellaneous' },
] as const;

export type OverheadCategory = typeof OVERHEAD_CATEGORIES[number]['value'];

export const OVERHEAD_CATEGORY_LABEL: Record<string, string> =
  Object.fromEntries(OVERHEAD_CATEGORIES.map((c) => [c.value, c.label]));

// Overheads reuse the same payment methods as the project ledger.
export const OVERHEAD_PAYMENT_METHODS = PAYMENT_METHODS;

// Fallback monthly salary applied to active staff who have no salary on record,
// so a salary run never silently skips anyone.
export const DEFAULT_MONTHLY_SALARY = 120_000;

export interface CompanyPnl {
  income: number;          // Σ INCOME across the company's projects
  projectExpense: number;  // Σ EXPENSE (direct project costs)
  overheads: number;       // Σ OverheadExpense (company pool)
  drawings: number;        // Σ DRAWING (owner withdrawals / equity-out)
  operatingProfit: number; // income − projectExpense − overheads
  netAfterDrawings: number;// operatingProfit − drawings
  margin: number;          // operatingProfit / income, 0–100 (0 when no income)
}

/**
 * Company-level profit-and-loss. Direct project costs and overheads are both
 * subtracted from collected income; owner drawings are shown separately because
 * they are an equity reduction, not an operating expense.
 */
export function computeCompanyPnl(input: {
  income: number; projectExpense: number; overheads: number; drawings: number;
}): CompanyPnl {
  const { income, projectExpense, overheads, drawings } = input;
  const operatingProfit = income - projectExpense - overheads;
  return {
    income,
    projectExpense,
    overheads,
    drawings,
    operatingProfit,
    netAfterDrawings: operatingProfit - drawings,
    margin: income > 0 ? (operatingProfit / income) * 100 : 0,
  };
}
