// projectAccess.test.ts - asserts each role gets exactly the projects it should.
// This is the security boundary for the whole calendar feature.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProjectScope } from './projectAccess';
import type { ApiUser } from './apiAuth';

function makeUser(overrides: Partial<ApiUser> & { role: string }): ApiUser {
  return {
    id: 'user-test-001',
    status: 'ACTIVE',
    via: 'cookie',
    ...overrides,
  };
}

describe('getProjectScope', () => {
  it('ADMIN - unrestricted (only deletedAt: null)', () => {
    const scope = getProjectScope(makeUser({ role: 'ADMIN' }));
    assert.deepStrictEqual(scope, { deletedAt: null });
  });

  it('MANAGER - unrestricted (only deletedAt: null)', () => {
    const scope = getProjectScope(makeUser({ role: 'MANAGER' }));
    assert.deepStrictEqual(scope, { deletedAt: null });
  });

  it('SUPER_ADMIN - unrestricted (only deletedAt: null)', () => {
    const scope = getProjectScope(makeUser({ role: 'SUPER_ADMIN' }));
    assert.deepStrictEqual(scope, { deletedAt: null });
  });

  it('CLIENT without companyId - returns impossible filter (no projects)', () => {
    const scope = getProjectScope(makeUser({ role: 'CLIENT' }));
    assert.deepStrictEqual(scope, { id: '__none__' });
  });

  it('CLIENT with companyId - scoped to own company', () => {
    const scope = getProjectScope(makeUser({ role: 'CLIENT', companyId: 'company-abc' }));
    assert.deepStrictEqual(scope, { deletedAt: null, companyId: 'company-abc' });
  });

  it('EMPLOYEE - scoped to engaged projects OR assigned tasks', () => {
    const scope = getProjectScope(makeUser({ role: 'EMPLOYEE', id: 'emp-001' }));
    assert.ok(scope.OR, 'EMPLOYEE scope must have an OR clause');
    assert.strictEqual(scope.OR.length, 2, 'OR must have exactly 2 branches');
    assert.deepStrictEqual(scope.deletedAt, null);
    // engagedUsers check
    assert.deepStrictEqual(scope.OR[0], { engagedUsers: { some: { id: 'emp-001' } } });
    // assignedTasks check (nested through domain -> task -> assigneeId)
    assert.deepStrictEqual(scope.OR[1], {
      domains: { some: { tasks: { some: { assigneeId: 'emp-001' } } } },
    });
  });

  it('FREELANCER - same scope as EMPLOYEE (engaged or assigned)', () => {
    const scope = getProjectScope(makeUser({ role: 'FREELANCER', id: 'free-001' }));
    assert.ok(scope.OR, 'FREELANCER scope must have an OR clause');
    assert.strictEqual(scope.OR.length, 2);
    assert.deepStrictEqual(scope.deletedAt, null);
    assert.deepStrictEqual(scope.OR[0], { engagedUsers: { some: { id: 'free-001' } } });
  });

  it('SUBCONTRACTOR - scoped to subcontractor engagements via userId', () => {
    const scope = getProjectScope(makeUser({ role: 'SUBCONTRACTOR', id: 'sub-001' }));
    assert.deepStrictEqual(scope, {
      deletedAt: null,
      subcontractorEngagements: {
        some: { subcontractor: { userId: 'sub-001' } },
      },
    });
  });

  it('Unknown role - falls through to unrestricted (same as ADMIN)', () => {
    // The current code falls through to the unrestricted base for unknown roles.
    // This test documents the current behavior. If you change the default to
    // be restrictive, update this test accordingly.
    const scope = getProjectScope(makeUser({ role: 'UNKNOWN_ROLE_XYZ' }));
    assert.deepStrictEqual(scope, { deletedAt: null });
  });
});
