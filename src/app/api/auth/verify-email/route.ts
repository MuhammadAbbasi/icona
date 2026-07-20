import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';
import { hashResetCode, safeCompareHash } from '@/lib/password';

const ONBOARDING_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min: long enough to finish the wizard

// Clicked from the verification email. On success: mark verified, consume the
// token, and resume the flow at the onboarding wizard. Also mints a short-lived
// onboarding token so the wizard's final step can sign the user in without
// asking them to blindly retype the password they set at signup — clicking
// this link already proves they own the account.
export async function GET(request: Request) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:4266';
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

    const obRaw = crypto.randomBytes(32).toString('hex');
    await systemPrisma.onboardingToken.upsert({
      where: { email },
      update: { token: hashResetCode(obRaw), expiresAt: new Date(Date.now() + ONBOARDING_TOKEN_TTL_MS) },
      create: { email, token: hashResetCode(obRaw), expiresAt: new Date(Date.now() + ONBOARDING_TOKEN_TTL_MS) },
    });

    return NextResponse.redirect(
      `${base}/onboarding?orgId=${user.orgId}&email=${encodeURIComponent(email)}&ob=${obRaw}&verified=1`
    );
  } catch (error) {
    console.error('[GET /api/auth/verify-email] Error:', error);
    return fail;
  }
}
