// Tests for the SaaS entitlements layer (plan-limit enforcement).
// Zero-dependency: Node's built-in runner + tsx. Run: `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANS,
  checkLimit,
  assertWithinLimit,
  PlanLimitError,
  hasFeature,
  resolvePlanTier,
} from './entitlements';

test('prices mirror the marketing site (25 / 50 / 75)', () => {
  assert.equal(PLANS.starter.priceUsd, 25);
  assert.equal(PLANS.growth.priceUsd, 50);
  assert.equal(PLANS.enterprise.priceUsd, 75);
});

test('no plan (null tier) is never enforced: existing single tenant keeps working', () => {
  assert.equal(checkLimit(null, 'projects', 9999).allowed, true);
  assert.equal(hasFeature(null, 'investors'), true);
});

test('starter blocks the 6th project (hard limit, check-before-write)', () => {
  assert.equal(checkLimit('starter', 'projects', 4).allowed, true); // 5th is fine
  const atLimit = checkLimit('starter', 'projects', 5); // already has 5
  assert.equal(atLimit.allowed, false);
  assert.equal(atLimit.limit, 5);
  assert.match(atLimit.reason ?? '', /upgrade/i);
});

test('starter caps members at 3', () => {
  assert.equal(checkLimit('starter', 'members', 2).allowed, true);
  assert.equal(checkLimit('starter', 'members', 3).allowed, false);
});

test('growth/enterprise projects are unlimited', () => {
  assert.equal(checkLimit('growth', 'projects', 10_000).allowed, true);
  assert.equal(checkLimit('enterprise', 'projects', 10_000).allowed, true);
});

test('assertWithinLimit throws PlanLimitError exactly at the cap', () => {
  assert.doesNotThrow(() => assertWithinLimit('starter', 'projects', 4));
  assert.throws(() => assertWithinLimit('starter', 'projects', 5), PlanLimitError);
});

test('feature gating follows the tier', () => {
  assert.equal(hasFeature('starter', 'mobile'), false);
  assert.equal(hasFeature('growth', 'mobile'), true);
  assert.equal(hasFeature('growth', 'investors'), false);
  assert.equal(hasFeature('enterprise', 'investors'), true);
});

test('resolvePlanTier: valid id resolves, unknown/absent -> null (unenforced)', () => {
  delete process.env.ACTIVE_PLAN_TIER;
  assert.equal(resolvePlanTier('starter'), 'starter');
  assert.equal(resolvePlanTier('bogus'), null);
  assert.equal(resolvePlanTier(undefined), null);
});
