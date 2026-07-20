import { getApiUser, ApiUser } from '@/lib/apiAuth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requireAdminUser(req?: Request): Promise<ApiUser | { error: string; status: number }> {
  let user: ApiUser | null = null;
  if (req) {
    user = await getApiUser(req);
  } else {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      user = {
        id: session.user.id,
        role: session.user.role,
        status: (session.user as any).status ?? 'ACTIVE',
        companyId: (session.user as any).companyId,
        orgId: (session.user as any).orgId,
        orgPlanId: (session.user as any).orgPlanId,
        via: 'cookie',
      };
    }
  }

  if (!user) {
    return { error: 'Unauthorized. Please log in.', status: 401 };
  }

  // Platform-wide super admin console only. A tenant's own ADMIN (the role
  // every signup gets automatically) must NEVER pass this gate - it would let
  // any customer read and edit every other tenant's billing/status/plan.
  if (user.role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden. Super Admin access required.', status: 403 };
  }

  return user;
}
