import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { computeFinancials } from '@/lib/finance';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

const STAFF = ['ADMIN', 'MANAGER'];

/** GET — project ledger + rolled-up financials. ADMIN/MANAGER only. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user || !STAFF.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS_HEADERS });
  }

  const [project, transactions, loans, investments, investorPayouts, companyInvestments, companyPayouts] = await Promise.all([
    prisma.project.findUnique({ where: { id: params.id }, select: { budget: true, orgId: true } }),
    prisma.transaction.findMany({
      where: { projectId: params.id },
      orderBy: { date: 'desc' },
      select: {
        id: true, type: true, amount: true, date: true, category: true, description: true, paymentMethod: true,
        owner: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.loan.findMany({
      where: { projectId: params.id },
      select: { amount: true, interestAmount: true, amountPaid: true }
    }),
    prisma.investment.findMany({
      where: { projectId: params.id },
      select: { amount: true }
    }),
    prisma.investorPayout.findMany({
      where: { projectId: params.id },
      select: { amount: true }
    }),
    prisma.investment.findMany({
      where: { projectId: null },
      select: { amount: true }
    }),
    prisma.investorPayout.findMany({
      where: { projectId: null },
      select: { amount: true }
    })
  ]);

  // Transaction/Loan/Investment/InvestorPayout have no orgId of their own, so this
  // is the only fence protecting another org's full ledger — without it, any
  // ADMIN/MANAGER could read any org's financials by guessing a project id.
  if (!project || project.orgId !== user.orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
  }

  const companyInvestmentsTotal = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const companyPayoutsTotal = companyPayouts.reduce((sum, p) => sum + p.amount, 0);

  const financials = computeFinancials(
    project?.budget ?? 0,
    transactions,
    loans,
    investments,
    investorPayouts,
    companyInvestmentsTotal,
    companyPayoutsTotal
  );
  return NextResponse.json({ transactions, financials }, { headers: CORS_HEADERS });
}

/** POST — log INCOME/EXPENSE/DRAWING. ADMIN/MANAGER only. Soft escrow: warns, never blocks. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user || !STAFF.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS_HEADERS });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type;
  const amount = Number(body.amount);

  if (!['INCOME', 'EXPENSE', 'DRAWING'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400, headers: CORS_HEADERS });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400, headers: CORS_HEADERS });
  }
  if (type === 'DRAWING' && !body.ownerId) {
    return NextResponse.json({ error: 'Please select the owner for this drawing' }, { status: 400, headers: CORS_HEADERS });
  }

  let warning: string | undefined;
  if (type === 'EXPENSE' || type === 'DRAWING') {
    const [existing, loans, investments, investorPayouts, companyInvestments, companyPayouts] = await Promise.all([
      prisma.transaction.findMany({ where: { projectId: params.id }, select: { type: true, amount: true, isPaid: true } }),
      prisma.loan.findMany({ where: { projectId: params.id }, select: { amount: true, interestAmount: true, amountPaid: true } }),
      prisma.investment.findMany({ where: { projectId: params.id }, select: { amount: true } }),
      prisma.investorPayout.findMany({ where: { projectId: params.id }, select: { amount: true } }),
      prisma.investment.findMany({ where: { projectId: null }, select: { amount: true } }),
      prisma.investorPayout.findMany({ where: { projectId: null }, select: { amount: true } })
    ]);
    const companyInvestmentsTotal = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const companyPayoutsTotal = companyPayouts.reduce((sum, p) => sum + p.amount, 0);
    const { cashOnHand } = computeFinancials(
      0,
      existing,
      loans,
      investments,
      investorPayouts,
      companyInvestmentsTotal,
      companyPayoutsTotal
    );
    if (amount > cashOnHand) {
      const deficit = amount - cashOnHand;
      warning = `This ${type.toLowerCase()} exceeds available project cash by PKR ${deficit.toLocaleString('en-PK')}. Recorded as a deficit.`;
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      projectId: params.id,
      type,
      amount,
      date: body.date ? new Date(body.date) : new Date(),
      category: body.category || null,
      description: body.description || null,
      paymentMethod: body.paymentMethod || null,
      ownerId: type === 'DRAWING' ? (body.ownerId || null) : null,
      workerId: type === 'EXPENSE' ? (body.workerId || null) : null,
      recordedById: user.id,
    },
  });

  return NextResponse.json({ ok: true, transaction, warning }, { headers: CORS_HEADERS });
}
