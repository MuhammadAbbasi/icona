import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndSendDeadlineEmails } from '@/lib/deadline-checker';
import { checkAndProcessArchivedPhotos } from '@/lib/photo-retention';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Determine if request is authenticated or a cron execution
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');

    // Bypass check if a CRON_SECRET is set in environment and matches the query param,
    // or if the requester is an ADMIN or MANAGER.
    const isCronSecretValid = process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
    const isAuthorizedStaff = session && ['ADMIN', 'MANAGER'].includes(session.user.role);

    if (!isCronSecretValid && !isAuthorizedStaff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [result, retentionResult] = await Promise.all([
      checkAndSendDeadlineEmails(),
      checkAndProcessArchivedPhotos(),
    ]);

    return NextResponse.json({
      message: 'Deadline and photo retention checks completed.',
      result,
      retentionResult,
    });
  } catch (error: any) {
    console.error('[GET /api/cron/check-deadlines] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
