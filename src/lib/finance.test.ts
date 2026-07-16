// Guards the assistant's client-facing finance fence: a CLIENT must only ever
// see their own payment figures — never expenses, drawings or profitability.
// Zero-dependency: Node's built-in test runner + tsx. Run: `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFinancials, clientFinanceView } from './finance';

const ledger = [
  { type: 'INCOME', amount: 500_000, isPaid: true },
  { type: 'INCOME', amount: 250_000, isPaid: true },
  { type: 'EXPENSE', amount: 300_000, isPaid: true },
  { type: 'EXPENSE', amount: 50_000, isPaid: false },
  { type: 'DRAWING', amount: 100_000, isPaid: true, ownerId: 'u1', owner: { id: 'u1', name: 'Owner' } },
];

test('clientFinanceView exposes only payment fields', () => {
  const view = clientFinanceView(computeFinancials(1_000_000, ledger));

  assert.deepEqual(view, {
    budget: 1_000_000,
    received: 750_000,
    receivable: 250_000,
    collectionPct: 75,
  });

  // The fence itself: no internal figures may leak through this object.
  for (const key of ['expense', 'drawings', 'cashOnHand', 'profitability', 'unpaidExpenses']) {
    assert.equal(key in view, false, `client view must not contain "${key}"`);
  }
});
