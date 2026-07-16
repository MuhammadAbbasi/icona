import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';
import { hashResetCode, safeCompareHash } from '@/lib/password';

// Clicked from the verification email. On success: mark verified, consume the
// token, and resume the flow at the onboarding wizard.
export async function GET(request: Request) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const fail = NextResponse.redirect(`${base}/login?error=VerificationInvalid`);

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') ?? '';
    const email = (searchParams.get('email') ?? '').toLowerCase().trim();
    if (!token || !email) return fail;

    const record = await systemPrisma.emailVerificationToken.findUnique({ where: { email } });
    if (!record || record.expiresAt < new Date()) return fail;
    if (!safeCompareHash(hashResetCode(token), record.token)) return fail;

    const user = await systemPrisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
      select: { orgId: true },
    });
    await systemPrisma.emailVerificationToken.delete({ where: { email } });

    return NextResponse.redirect(
      `${base}/onboarding?orgId=${user.orgId}&email=${encodeURIComponent(email)}&verified=1`
    );
  } catch (error) {
    console.error('[GET /api/auth/verify-email] Error:', error);
    return fail;
  }
}
