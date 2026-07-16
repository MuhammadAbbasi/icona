// Unified request authentication for API routes. Accepts EITHER the web's NextAuth
// cookie session OR a mobile `Authorization: Bearer <accessJWT>`. Role gates in the
// routes stay identical — they just read from the returned user instead of the
// NextAuth session directly.

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/mobileAuth';

export interface ApiUser {
  id: string;
  role: string;
  status: string;
  companyId?: string | null;
  orgId?: string | null;
  orgPlanId?: string | null;
  via: 'cookie' | 'bearer';
}

export async function getApiUser(req: Request): Promise<ApiUser | null> {
  const authz = req.headers.get('authorization') ?? req.headers.get('Authorization');

  if (authz?.startsWith('Bearer ')) {
    const claims = await verifyAccessToken(authz.slice(7).trim());
    if (!claims) return null;
    // Revocation parity with the web: re-read live status/role from the DB so a
    // deactivated or role-changed account is rejected on the very next call.
    const fresh = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { role: true, status: true, companyId: true, orgId: true, org: { select: { planId: true } } },
    });
    if (!fresh || fresh.status === 'INACTIVE') return null;
    return {
      id: claims.sub,
      role: fresh.role,
      status: fresh.status,
      companyId: fresh.companyId,
      orgId: fresh.orgId,
      orgPlanId: fresh.org?.planId,
      via: 'bearer',
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    status: (session.user as { status?: string }).status ?? 'ACTIVE',
    companyId: (session.user as { companyId?: string }).companyId,
    orgId: (session.user as any).orgId,
    orgPlanId: (session.user as any).orgPlanId,
    via: 'cookie',
  };
}
