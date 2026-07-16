// Projects loans, loan repayments, investments, investor payouts and company
// overheads into the ledger - a non-invasive mirror of those workflows.
// Per user decision: loan interest is recognized upfront (capitalized into the
// per-loan Loans Payable), matching totalPayable = amount + interestAmount.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { postJournal } from './postJournal';
import { reverseEntry } from './reverse';
import { moneyAccountId } from './projector';
import { ensureLoanLedger, ensureInvestorLedger } from './provision';
import type { PostLineInput } from './types';

type Client = typeof prisma | Prisma.TransactionClient;

// Re-post helper: reverse a stale POSTED entry for this voucher then post fresh.
async function repost(
  voucherType: string,
  voucherId: string,
  key: string,
  build: () => Parameters<typeof postJournal>[0],
  client: Client,
) {
  const posted = await client.journalEntry.findFirst({ where: { voucherType, voucherId, status: 'POSTED' } });
  if (posted && posted.idempotencyKey === key) return posted;
  if (posted) await reverseEntry(posted.id, 'projection update', client);
  return postJournal(build(), client);
}

/** Loan drawdown: Dr Bank (principal) + Dr Interest Expense (interest) /
 *  Cr Loans Payable (totalPayable). */
export async function projectLoan(
  loan: { id: string; provider: string | null; amount: number; interestAmount: number; receivedDate: Date; bankAccountId: string | null; lenderId: string | null; projectId: string },
  client: Client = prisma,
) {
  const principal = new Prisma.Decimal(loan.amount);
  if (principal.lte(0)) return null;
  const interest = new Prisma.Decimal(loan.interestAmount ?? 0);
  const total = principal.add(interest);

  const projectName = (await client.project.findUnique({ where: { id: loan.projectId }, select: { name: true } }))?.name ?? null;
  const loanLedger = await ensureLoanLedger({ id: loan.id, provider: loan.provider, projectName }, client);
  const bankId = await moneyAccountId(loan.bankAccountId, client);
  const key = `LOAN:${loan.id}:${principal.toString()}|${interest.toString()}|${bankId}|${loanLedger.id}`;

  return repost('LOAN_DRAW', loan.id, key, () => {
    const lines: PostLineInput[] = [
      { accountId: bankId, side: 'D', amount: principal.toString(), projectId: loan.projectId, partyType: 'LENDER', partyId: loan.lenderId },
    ];
    if (interest.gt(0)) {
      lines.push({ accountCode: '5600', side: 'D', amount: interest.toString(), projectId: loan.projectId });
    }
    lines.push({ accountId: loanLedger.id, side: 'C', amount: total.toString(), projectId: loan.projectId, partyType: 'LENDER', partyId: loan.lenderId, againstVoucherType: 'LOAN', againstVoucherId: loan.id });
    return {
      postingDate: loan.receivedDate, voucherType: 'LOAN_DRAW', voucherId: loan.id, idempotencyKey: key,
      projectId: loan.projectId, memo: `Loan draw - ${loan.provider ?? loan.id}`, lines,
    };
  }, client);
}

/** Loan repayment: Dr Loans Payable / Cr Bank (or Cash). */
export async function projectLoanRepayment(
  rep: { id: string; loanId: string; amount: number; date: Date; bankAccountId: string | null; projectId: string; provider: string | null },
  client: Client = prisma,
) {
  const amount = new Prisma.Decimal(rep.amount);
  if (amount.lte(0)) return null;
  const projectName = (await client.project.findUnique({ where: { id: rep.projectId }, select: { name: true } }))?.name ?? null;
  const loanLedger = await ensureLoanLedger({ id: rep.loanId, provider: rep.provider, projectName }, client);
  const bankId = await moneyAccountId(rep.bankAccountId, client);
  const key = `LOANREPAY:${rep.id}:${amount.toString()}|${bankId}`;

  return repost('LOAN_REPAYMENT', rep.id, key, () => ({
    postingDate: rep.date, voucherType: 'LOAN_REPAYMENT', voucherId: rep.id, idempotencyKey: key,
    projectId: rep.projectId, memo: 'Loan repayment',
    lines: [
      { accountId: loanLedger.id, side: 'D', amount: amount.toString(), projectId: rep.projectId, againstVoucherType: 'LOAN', againstVoucherId: rep.loanId },
      { accountId: bankId, side: 'C', amount: amount.toString(), projectId: rep.projectId },
    ],
  }), client);
}

/** Investment received: Dr Bank / Cr Investor Capital (equity). */
export async function projectInvestment(
  inv: { id: string; investorId: string; investorName: string | null; amount: number; date: Date; bankAccountId: string | null; projectId: string | null },
  client: Client = prisma,
) {
  const amount = new Prisma.Decimal(inv.amount);
  if (amount.lte(0)) return null;
  const investorLedger = await ensureInvestorLedger({ id: inv.investorId, name: inv.investorName }, client);
  const bankId = await moneyAccountId(inv.bankAccountId, client);
  const key = `INVEST:${inv.id}:${amount.toString()}|${bankId}`;

  return repost('INVESTMENT', inv.id, key, () => ({
    postingDate: inv.date, voucherType: 'INVESTMENT', voucherId: inv.id, idempotencyKey: key,
    projectId: inv.projectId, memo: 'Investment received',
    lines: [
      { accountId: bankId, side: 'D', amount: amount.toString(), projectId: inv.projectId, partyType: 'INVESTOR', partyId: inv.investorId },
      { accountId: investorLedger.id, side: 'C', amount: amount.toString(), projectId: inv.projectId, partyType: 'INVESTOR', partyId: inv.investorId, againstVoucherType: 'INVESTMENT', againstVoucherId: inv.id },
    ],
  }), client);
}

/** Investor payout: Dr Investor Capital / Cr Bank. */
export async function projectInvestorPayout(
  p: { id: string; investorId: string; investorName: string | null; amount: number; date: Date; bankAccountId: string | null; projectId: string | null },
  client: Client = prisma,
) {
  const amount = new Prisma.Decimal(p.amount);
  if (amount.lte(0)) return null;
  const investorLedger = await ensureInvestorLedger({ id: p.investorId, name: p.investorName }, client);
  const bankId = await moneyAccountId(p.bankAccountId, client);
  const key = `PAYOUT:${p.id}:${amount.toString()}|${bankId}`;

  return repost('INVESTOR_PAYOUT', p.id, key, () => ({
    postingDate: p.date, voucherType: 'INVESTOR_PAYOUT', voucherId: p.id, idempotencyKey: key,
    projectId: p.projectId, memo: 'Investor payout',
    lines: [
      { accountId: investorLedger.id, side: 'D', amount: amount.toString(), projectId: p.projectId, partyType: 'INVESTOR', partyId: p.investorId },
      { accountId: bankId, side: 'C', amount: amount.toString(), projectId: p.projectId },
    ],
  }), client);
}

/** Company overhead (G&A / salaries): Dr expense / Cr Bank or Cash. */
export async function projectOverhead(
  o: { id: string; category: string; amount: number; date: Date; bankAccountId: string | null },
  client: Client = prisma,
) {
  const amount = new Prisma.Decimal(o.amount);
  if (amount.lte(0)) return null;
  const expenseCode = o.category === 'SALARIES' ? '5700' : '5500'; // Salaries vs Overheads
  const bankId = await moneyAccountId(o.bankAccountId, client);
  const key = `OVH:${o.id}:${amount.toString()}|${expenseCode}|${bankId}`;

  return repost('OVERHEAD', o.id, key, () => ({
    postingDate: o.date, voucherType: 'OVERHEAD', voucherId: o.id, idempotencyKey: key,
    memo: `Overhead - ${o.category}`,
    lines: [
      { accountCode: expenseCode, side: 'D', amount: amount.toString() },
      { accountId: bankId, side: 'C', amount: amount.toString() },
    ],
  }), client);
}

/** Project all loans, repayments, investments, payouts and (on a global run)
 *  overheads. Returns per-type counts. */
export async function projectFinance(projectId: string | null = null, client: Client = prisma) {
  const loans = await client.loan.findMany({ where: projectId ? { projectId } : {} });
  for (const l of loans) await projectLoan(l as any, client);

  const reps = await client.loanRepayment.findMany({
    where: projectId ? { loan: { projectId } } : {},
    include: { loan: { select: { projectId: true, provider: true } } },
  });
  for (const r of reps) await projectLoanRepayment({ ...r, projectId: r.loan.projectId, provider: r.loan.provider } as any, client);

  const invs = await client.investment.findMany({
    where: projectId ? { projectId } : {},
    include: { investor: { select: { name: true } } },
  });
  for (const i of invs) await projectInvestment({ ...i, investorName: i.investor?.name ?? null } as any, client);

  const payouts = await client.investorPayout.findMany({
    where: projectId ? { projectId } : {},
    include: { investor: { select: { name: true } } },
  });
  for (const p of payouts) await projectInvestorPayout({ ...p, investorName: p.investor?.name ?? null } as any, client);

  // Overheads are company-wide (no project) - only on a global run.
  let overheads = 0;
  if (!projectId) {
    const ovh = await client.overheadExpense.findMany({});
    for (const o of ovh) await projectOverhead(o as any, client);
    overheads = ovh.length;
  }

  return { loans: loans.length, repayments: reps.length, investments: invs.length, payouts: payouts.length, overheads };
}
