// T-107 golden-file / characterization suite (start).
// Freezes TODAY's behaviour of the pure BOQ rollup math so the destructive
// refactors (T-201 Decimal, T-301 WorkItem tree) cannot change it silently.
// Zero-dependency: Node's built-in test runner + tsx. Run: `npm test`.
//
// NOTE: several assertions below capture the CURRENT *Float* behaviour on
// purpose (see "FLOAT DRIFT"). When T-201 converts money to Decimal, those
// specific assertions are expected to change to exact values, and that change
// is the visible proof the migration did its job. Do not "fix" them before T-201.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveQuantity,
  effectiveRate,
  lineAmount,
  sumAmounts,
  originalLineAmount,
  sumOriginalAmounts,
} from './utils';

test('effectiveQuantity: falls back to original, then 0', () => {
  assert.equal(effectiveQuantity({ quantity: 10 }), 10);
  assert.equal(effectiveQuantity({}), 0);
});

test('effectiveQuantity: precomputed override wins at latest round', () => {
  assert.equal(effectiveQuantity({ quantity: 10, effectiveQuantity: 15 }), 15);
});

test('effectiveQuantity: resolves latest revision at-or-before uptoIndex', () => {
  const item = {
    quantity: 10,
    quantityRevisions: [
      { revisionIndex: 1, quantity: 12 },
      { revisionIndex: 2, quantity: 8 },
    ],
  };
  assert.equal(effectiveQuantity(item, 1), 12); // round 1 only
  assert.equal(effectiveQuantity(item, 2), 8); // round 2
  assert.equal(effectiveQuantity(item, 0), 10); // before any revision -> original
});

test('effectiveRate: a revision that omits rate carries the original rate forward', () => {
  const item = { rate: 5, quantityRevisions: [{ revisionIndex: 1, quantity: 12 }] };
  assert.equal(effectiveRate(item), 5); // quantity changed, rate unchanged
});

test('effectiveRate: latest rate-changing revision wins', () => {
  const item = {
    rate: 5,
    quantityRevisions: [
      { revisionIndex: 1, quantity: 12, rate: 6 },
      { revisionIndex: 2, quantity: 8 }, // no rate -> 6 carries forward
    ],
  };
  assert.equal(effectiveRate(item), 6);
});

test('lineAmount = effective quantity x effective rate', () => {
  assert.equal(lineAmount({ quantity: 4, rate: 250 }), 1000);
  assert.equal(lineAmount({ quantity: 0, rate: 999 }), 0); // "Rate Only" contributes 0
});

test('originalLineAmount uses R0 baseline, ignoring revisions', () => {
  const item = { quantity: 10, rate: 5, quantityRevisions: [{ revisionIndex: 1, quantity: 99 }] };
  assert.equal(originalLineAmount(item), 50);
  assert.equal(sumOriginalAmounts([item, { quantity: 2, rate: 3 }]), 56);
});

test('sumAmounts: exact on well-behaved integers', () => {
  const items = [
    { quantity: 10, rate: 100 },
    { quantity: 5, rate: 200 },
    { quantity: 1, rate: 50 },
  ];
  assert.equal(sumAmounts(items), 2050);
});

test('FLOAT DRIFT (documents the T-201 bug): 0.1 + 0.2 !== 0.3 in the rollup', () => {
  const items = [
    { quantity: 1, rate: 0.1 },
    { quantity: 1, rate: 0.2 },
  ];
  // Current Float behaviour. T-201 (Decimal) target: exactly 0.3.
  assert.equal(sumAmounts(items), 0.30000000000000004);
  assert.notEqual(sumAmounts(items), 0.3);
});

test('FLOAT DRIFT (documents the T-201 bug): many-line cent drift compounds', () => {
  // 1000 lines each worth 0.01 should be exactly 10.00; Float drifts.
  const items = Array.from({ length: 1000 }, () => ({ quantity: 1, rate: 0.01 }));
  const total = sumAmounts(items);
  assert.notEqual(total, 10); // T-201 target: total === 10 exactly
  assert.ok(Math.abs(total - 10) < 1e-9); // drift is tiny but nonzero today
});
