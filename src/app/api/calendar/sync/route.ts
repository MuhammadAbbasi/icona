import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import { syncCalendar } from '@/lib/calendar-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can trigger a calendar sync for their org
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - ADMIN or MANAGER required' }, { status: 403 });
    }

    if (!user.orgId) {
      return NextResponse.json({ error: 'No organization found for your account' }, { status: 400 });
    }

    const result = await syncCalendar(user.orgId);

    return NextResponse.json({
      success: true,
      message: `Calendar synced successfully. ${result.derivedCount} events derived from tasks, projects, and site visits.`,
      derivedCount: result.derivedCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[POST /api/calendar/sync] Error:', error);
    return NextResponse.json({ error: 'Failed to sync calendar' }, { status: 500 });
  }
}
