// SaaS entitlements layer.
//
// Best-practice pattern (see research): plans map to *entitlements* (limits +
// feature flags), enforced SERVER-SIDE, checked BEFORE any write (refuse before
// the side effect). This is the single source of truth for what each tier can
// do. Prices mirror the ICONA marketing site: Starter $25, Growth $50,
// Enterprise $75 per month.
//
// SAFETY: enforcement applies ONLY to a tenant that actually has a plan. The
// existing single-tenant instance has no org/plan, so `resolvePlanTier` returns
// null and every check is a no-op. It must never start refusing writes for the
// current customer. Real per-tenant enforcement switches on once tenancy
// (T-103) + billing (billing-onboarding) assign each org a plan.

export type PlanTier = 'starter' | 'growth' | 'enterprise';
export type Feature = 'crm' | 'mobile' | 'investors' | 'inventory';

export interface Entitlements {
  tier: PlanTier;
  priceUsd: number;
  limits: {
    projects: number | null; // null = unlimited
    members: number | null;
  };
  features: Feature[];
}

export const PLANS: Record<PlanTier, Entitlements> = {
  starter: { tier: 'starter', priceUsd: 25, limits: { projects: 5, members: 3 }, features: [] },
  growth: { tier: 'growth', priceUsd: 50, limits: { projects: null, members: 15 }, features: ['crm', 'mobile'] },
  enterprise: {
    tier: 'enterprise',
    priceUsd: 75,
    limits: { projects: null, members: null },
    features: ['crm', 'mobile', 'investors', 'inventory'],
  },
};

export type LimitedResource = keyof Entitlements['limits']; // 'projects' | 'members'

export interface LimitCheck {
  allowed: boolean;
  limit: number | null; // null = unlimited (or no plan -> unenforced)
  current: number;
  reason?: string;
}

/** Hard-limit check. Call BEFORE creating the resource (check-before-write).
 *  A null tier (no plan resolved) is always allowed: no enforcement. */
export function checkLimit(tier: PlanTier | null, resource: LimitedResource, currentCount: number): LimitCheck {
  if (tier === null) return { allowed: true, limit: null, current: currentCount };
  const limit = PLANS[tier].limits[resource];
  if (limit === null) return { allowed: true, limit: null, current: currentCount };
  const allowed = currentCount < limit;
  return {
    allowed,
    limit,
    current: currentCount,
    reason: allowed ? undefined : `Your ${tier} plan allows ${limit} ${resource}. Upgrade to add more.`,
  };
}

export class PlanLimitError extends Error {
  constructor(public check: LimitCheck) {
    super(check.reason ?? 'Plan limit reached');
    this.name = 'PlanLimitError';
  }
}

/** Throwing variant for server actions. Routes may prefer `checkLimit` + a 402. */
export function assertWithinLimit(tier: PlanTier | null, resource: LimitedResource, currentCount: number): void {
  const c = checkLimit(tier, resource, currentCount);
  if (!c.allowed) throw new PlanLimitError(c);
}

/** Feature gate. A null tier (no plan) has every feature (existing single tenant). */
export function hasFeature(tier: PlanTier | null, feature: Feature): boolean {
  if (tier === null) return true;
  return PLANS[tier].features.includes(feature);
}

/** Resolve the active tenant's plan tier.
 *  TENANCY SEAM: until org context (T-103) + billing assign plans, this returns
 *  null (no enforcement) unless ACTIVE_PLAN_TIER is set for a single-tenant
 *  deployment that opts in. Once orgs carry `planId`, resolve it from the org. */
export function resolvePlanTier(orgPlanId?: string | null): PlanTier | null {
  const candidate = orgPlanId ?? process.env.ACTIVE_PLAN_TIER;
  if (candidate) {
    const basePlan = candidate.split('_')[0];
    if (basePlan in PLANS) return basePlan as PlanTier;
  }
  return null;
}
