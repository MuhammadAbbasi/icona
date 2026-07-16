// Shared types for the double-entry ledger posting service.
// See docs/finance-system-plan.md and docs/finance-implementation-tracker.md.

export type Side = 'D' | 'C';

export interface PostLineInput {
  /** Resolve the ledger account by chart-of-accounts code (preferred)... */
  accountCode?: string;
  /** ...or directly by id. */
  accountId?: string;
  side: Side;
  /** Always a positive magnitude; direction is `side`, never the sign. */
  amount: number | string;
  projectId?: string | null;
  costCode?: string | null;
  partyType?: string | null; // SUPPLIER | CLIENT | LENDER | INVESTOR | WORKER | OWNER
  partyId?: string | null;
  /** Links a settling line back to the bill/loan/invoice it pays. */
  againstVoucherType?: string | null;
  againstVoucherId?: string | null;
  memo?: string | null;
}

export interface PostInput {
  postingDate: Date;
  voucherType: string; // BILL | PAYMENT | PAY_ORDER | RECEIPT | BANK_TRANSFER | LOAN_DRAW | LOAN_REPAYMENT | INVOICE | CASH | JOURNAL | OPENING
  voucherId?: string | null;
  /** Unique per source event (e.g. "BILL:<id>"): re-posting is a no-op. */
  idempotencyKey: string;
  projectId?: string | null;
  memo?: string | null;
  createdById?: string | null;
  /** Set only by reverseEntry(): marks this entry as the reversal of another. */
  reversalOfId?: string | null;
  lines: PostLineInput[];
}
